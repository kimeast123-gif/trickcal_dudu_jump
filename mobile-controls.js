'use strict';
// ============================================================================
// TEST25 (FIX8.3) Mobile 360° Virtual Joystick, Controller Options &
// Landscape/Portrait View Mode State Machine (`WEB_PORTRAIT` / `GAME_LANDSCAPE` / `GAME_PAUSED`)
// - Reuses unified logical input router: `pressInput(code, sourceId)`, `releaseInput(code, sourceId)`, `releaseAllInputs(reason)`.
// - Replaces the 3 directional buttons on mobile with a single 360° virtual joystick (`#vjoy-base` + `#vjoy-knob`)
//   mapping angle/vector to `ArrowLeft`, `ArrowRight`, and `ArrowDown` (simultaneous down-left / down-right supported;
//   upward drag never triggers jump).
// - Provides persistent user options (`localStorage` key `dudu_mobile_ctrl_prefs_v1`):
//   1. `stickPosition`: `'bottom'` (기본 좌하단/우하단) | `'top'` (좌상단/우상단, HUD 비침범 오프셋)
//   2. `buttonSwap` ('버튼 좌우 배치 바꾸기'): `'normal'` (기본) | `'swapped'` (반전: 스틱 우측 / 점프·대시 좌측)
//   3. `stickSize`: `'small'` | `'medium'` | `'large'`
// - Implements strict 3-state view machine (`WEB_PORTRAIT`, `GAME_LANDSCAPE`, `GAME_PAUSED`) + idempotent `ensurePaused(reason)`:
//   * `WEB_PORTRAIT`: pauses active game without toggle bug, releases all inputs, unlocks page scroll & restores scrollY,
//     shows non-blocking inline notice inside `#game`.
//   * `GAME_LANDSCAPE`: locks page scroll, activates CSS landscape focus mode (`100vw × visualViewport.height`, 16:9 contain),
//     prevents browser touch pan/zoom inside `#game`, and requires explicit user click to resume after portrait pause.
// ============================================================================

const inputSourceMap = new Map();
const DOUBLE_TAP_MS = 230, DOUBLE_TAP_HOLD_MS = 190;
const doubleTapState = { ArrowLeft: { press: 0, release: 0 }, ArrowRight: { press: 0, release: 0 } }; // Map<logicalCode, Set<sourceId>>
const MOBILE_PREFS_KEY = 'dudu_mobile_ctrl_prefs_v1';

const mobilePrefs = {
  stickPosition: 'bottom', // 'bottom' | 'top'
  buttonSwap: 'normal',    // 'normal' | 'swapped'
  stickSize: 'medium',     // 'small' | 'medium' | 'large'
  actionSize: 'small',     // jump/dash buttons independently sized (RENEWAL: default small)
  dashMode: 'both',        // 'button' | 'both' (double-tap + button) | 'tap' (double-tap only, mobile dash button hidden)
  kbDoubleTapDash: true    // v1.6.7: PC option, double-tap a direction key to dash (checkbox under the dash key)
};

const mobileUIState = {
  viewMode: 'PC_DEFAULT',       // 'WEB_PORTRAIT' | 'GAME_LANDSCAPE' | 'GAME_PAUSED' | 'PC_DEFAULT'
  fullscreenMode: 'inline',     // 'native' | 'css_focus' | 'inline'
  lastPauseReason: null,        // 'portrait' | 'manual' | 'blur' | 'visibility' | 'options' | 'fullscreen_exit' | null
  pausedByPortrait: false,
  scrollLocked: false,
  savedScrollY: 0,
  joyActive: false,
  joyPointerId: null,
  joyVector: { dx: 0, dy: 0, nx: 0, ny: 0, angleDeg: 0 },
  activeStickDirs: { left: false, right: false, down: false },
  prefs: mobilePrefs
};
window.__mobileUIState = mobileUIState;

function pressInput(code, sourceId = 'touch') {
  if (!code) return;
  let sources = inputSourceMap.get(code);
  if (!sources) {
    sources = new Set();
    inputSourceMap.set(code, sources);
  }
  const wasEmpty = sources.size === 0;
  sources.add(sourceId);

  if (wasEmpty) {
    keys.add(code);
    if (typeof p !== 'undefined' && p.guardStun > 0) return;
    if ((code === 'ArrowLeft' || code === 'ArrowRight') && mobilePrefs.kbDoubleTapDash !== false && String(sourceId).startsWith('kb_')) {
      // RENEWAL: double-tap a direction to dash (keyboard and joystick flick share this path).
      // Only a short tap followed quickly by a second press counts, so walking and inching never dash by accident.
      const now = performance.now();
      const st = doubleTapState[code];
      const wasTap = st.release > st.press && (st.release - st.press) <= DOUBLE_TAP_HOLD_MS;
      if (wasTap && now - st.release <= DOUBLE_TAP_MS && state === 'playing') {
        dashRequest = true;
        st.press = 0; st.release = 0;
      } else {
        st.press = now;
      }
    }

    if (code === 'Space') {
      if (state !== 'playing') return;
      if (keys.has('ArrowDown') && p.ground && p.on?.thin && !p.on?.dropThroughDisabled) {
        p.drop = p.on; p.y += 3; p.ground = false; p.on = null; p.coyote = 0; p.jumps = 1; p.vy = 70; p.buffer = 0; p.jumpHeld = false;
        lookDownHold = 0;
      } else {
        p.buffer = 0.12;
      }
    } else if (code === 'ShiftLeft') {
      if (state === 'playing') dashRequest = true;
    } else if (code === 'KeyR') {
      if (state !== 'playing') return;
      if (typeof triggerActiveModeRetry === 'function') {
        triggerActiveModeRetry();
      } else if (typeof gameMode !== 'undefined' && gameMode === 'challenge' && typeof retryChallengeStage === 'function') {
        retryChallengeStage();
      } else if (typeof gameMode !== 'undefined' && gameMode === 'world' && typeof retryWorld1StageCheckpoint === 'function') {
        retryWorld1StageCheckpoint();
      } else if (typeof chooseSection === 'function') {
        chooseSection(checkpoint);
      }
    } else if (code === 'Escape') {
      if (typeof pause === 'function') pause();
    }
  }
}

function releaseInput(code, sourceId = 'touch') {
  if (!code) return;
  const sources = inputSourceMap.get(code);
  if (sources) {
    sources.delete(sourceId);
    if (sources.size === 0) {
      keys.delete(code);
      if (doubleTapState[code] && doubleTapState[code].press) doubleTapState[code].release = performance.now();
      if (code === 'Space' && typeof p !== 'undefined') {
        // A thumb tap is shorter than a key press; give touch taps a minimum hold so they never feel swallowed.
        const minHold = String(sourceId).startsWith('touch_') ? 0.11 : 0;
        if (minHold && p.hold < minHold && p.vy < 0) {
          p.touchHoldGrace = minHold - p.hold;
        } else {
          if (p.hold < (p.jumps === 2 ? 0.22 : 0.24)) p.jumpCut = true;
          p.jumpHeld = false;
        }
      }
    }
  } else {
    keys.delete(code);
  }
}

function resetJoystickVisualAndState() {
  mobileUIState.joyActive = false;
  mobileUIState.joyPointerId = null;
  mobileUIState.joyVector = { dx: 0, dy: 0, nx: 0, ny: 0, angleDeg: 0 };
  mobileUIState.activeStickDirs = { left: false, right: false, down: false };
  const baseEl = typeof $ === 'function' ? $('vjoy-base') : document.getElementById('vjoy-base');
  const knobEl = typeof $ === 'function' ? $('vjoy-knob') : document.getElementById('vjoy-knob');
  if (baseEl) {
    baseEl.classList.remove('active');
    baseEl.setAttribute('data-dir-left', 'false');
    baseEl.setAttribute('data-dir-right', 'false');
    baseEl.setAttribute('data-dir-down', 'false');
  }
  if (knobEl) {
    knobEl.style.transform = 'translate3d(0px, 0px, 0px)';
  }
}

function releaseAllInputs(reason = 'reset') {
  inputSourceMap.clear();
  if (typeof keys !== 'undefined') keys.clear();
  if (typeof p !== 'undefined') {
    p.jumpHeld = false;
  }
  if (typeof dashRequest !== 'undefined') {
    dashRequest = false;
  }
  resetJoystickVisualAndState();
  if (typeof VJ !== 'undefined') {
    VJ.active = false; VJ.pointerId = null; VJ.dirs = { left: false, right: false, down: false };
    const c = document.getElementById('vjoy-container'); if (c) c.style.transform = '';
  }
  if (typeof touchButtonPointers !== 'undefined') touchButtonPointers.clear();
  document.querySelectorAll('.vbtn').forEach(btn => btn.classList.remove('active'));
}

// Idempotent pause helper: NEVER resumes gameplay if already paused!
function ensurePaused(reason = 'manual') {
  releaseAllInputs(reason);
  if (typeof state === 'undefined') return false;

  if (state === 'playing') {
    state = 'paused';
    mobileUIState.lastPauseReason = reason;
    if (reason === 'portrait') {
      mobileUIState.pausedByPortrait = true;
    }
    const subtitle = reason === 'portrait' ? '화면을 가로로 돌리면 계속할 수 있습니다.' : '';
    const btnLabel = '계속하기';
    if (typeof modal === 'function') {
      modal('', '일시정지', subtitle, btnLabel);
    }
    syncMobileViewMode();
    return true;
  }

  if (state === 'opening' || state === 'ending' || state === 'popup') {
    if (typeof scenePaused !== 'undefined') scenePaused = true;
    mobileUIState.lastPauseReason = reason;
    if (reason === 'portrait') mobileUIState.pausedByPortrait = true;
    syncMobileViewMode();
    return true;
  }

  if (state === 'paused') {
    // Already paused — keep paused and only update reason if portrait
    if (reason === 'portrait') {
      mobileUIState.pausedByPortrait = true;
      mobileUIState.lastPauseReason = 'portrait';
    }
    syncMobileViewMode();
    return false;
  }
  return false;
}

window.pressInput = pressInput;
window.releaseInput = releaseInput;
window.releaseAllInputs = releaseAllInputs;
window.ensurePaused = ensurePaused;

// ============================================================================
// [A-03 & A-04]: Custom PC Keyboard Binding System (`dudu_keyboard_bindings_v1`)
// ============================================================================
const PC_KEYBIND_STORAGE_KEY = 'dudu_keyboard_bindings_v1';
const DEFAULT_PC_KEYBINDS = Object.freeze({
  version: 1,
  MOVE_LEFT: 'ArrowLeft',
  MOVE_RIGHT: 'ArrowRight',
  DOWN_LOOK: 'ArrowDown',
  JUMP: 'Space',
  DASH: 'ShiftLeft',
  RETRY: 'KeyR',
  PAUSE: 'Escape'
});

const ACTION_TO_LOGICAL_CODE = Object.freeze({
  MOVE_LEFT: 'ArrowLeft',
  MOVE_RIGHT: 'ArrowRight',
  DOWN_LOOK: 'ArrowDown',
  JUMP: 'Space',
  DASH: 'ShiftLeft',
  RETRY: 'KeyR',
  PAUSE: 'Escape'
});

const ACTION_LABELS_KO = Object.freeze({
  MOVE_LEFT: '왼쪽 이동',
  MOVE_RIGHT: '오른쪽 이동',
  DOWN_LOOK: '아래보기 / 숙이기',
  JUMP: '점프 / 2단 점프',
  DASH: '순간 대시',
  RETRY: '구간 다시 시작',
  PAUSE: '일시정지'
});

const FORBIDDEN_KEY_CODES = new Set([
  'Tab', 'CapsLock', 'ContextMenu', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight',
  'ControlLeft', 'ControlRight', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8',
  'F9', 'F10', 'F11', 'F12', 'PrintScreen', 'ScrollLock', 'Pause', 'NumLock'
]);

const pcKeybinds = { ...DEFAULT_PC_KEYBINDS };
let capturingKeyAction = null;
let keybindStatusMsg = '';

function formatKeyCodeLabel(code) {
  if (!code) return '-';
  const map = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'SPACE',
    ShiftLeft: 'L SHIFT',
    ShiftRight: 'R SHIFT',
    Enter: 'ENTER',
    Backspace: 'BACKSPACE',
    Escape: 'ESC',
     semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Minus: '-',
    Equal: '='
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  return code.toUpperCase();
}

function isValidCustomKeyCode(code) {
  if (!code || typeof code !== 'string') return false;
  if (FORBIDDEN_KEY_CODES.has(code)) return false;
  return /^(Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Enter|Backspace|Escape|Key[A-Z]|Digit[0-9]|Numpad[0-9A-Za-z]+|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Minus|Equal)$/.test(code);
}

function loadPcKeybinds() {
  Object.assign(pcKeybinds, DEFAULT_PC_KEYBINDS);
  let repairedCorruptStorage = false;
  try {
    const raw = localStorage.getItem(PC_KEYBIND_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const seen = new Set();
        let validAll = true;
        const temp = { version: 1 };
        for (const act of Object.keys(ACTION_TO_LOGICAL_CODE)) {
          const candidate = parsed[act] || DEFAULT_PC_KEYBINDS[act];
          // [#1 P1 Fix]: Escape is strictly reserved for PAUSE and never allowed on non-PAUSE actions
          if (!isValidCustomKeyCode(candidate) || seen.has(candidate) || (candidate === 'Escape' && act !== 'PAUSE')) {
            validAll = false;
            repairedCorruptStorage = true;
            break;
          }
          seen.add(candidate);
          temp[act] = candidate;
        }
        if (validAll) {
          Object.assign(pcKeybinds, temp);
        }
      } else {
        repairedCorruptStorage = true;
      }
    }
  } catch (e) {
    Object.assign(pcKeybinds, DEFAULT_PC_KEYBINDS);
    repairedCorruptStorage = true;
  }
  if (repairedCorruptStorage) {
    try {
      localStorage.setItem(PC_KEYBIND_STORAGE_KEY, JSON.stringify(pcKeybinds));
    } catch (e) {}
  }
  syncAllKeybindLabels();
}

function savePcKeybinds() {
  try {
    localStorage.setItem(PC_KEYBIND_STORAGE_KEY, JSON.stringify(pcKeybinds));
  } catch (e) {}
  syncAllKeybindLabels();
}

function resetPcKeybindsToDefault() {
  releaseAllInputs('keybind_reset');
  capturingKeyAction = null;
  Object.assign(pcKeybinds, DEFAULT_PC_KEYBINDS);
  keybindStatusMsg = '기본 조작키로 초기화되었습니다.';
  savePcKeybinds();
}

function setPcKeybind(action, physicalCode) {
  if (!ACTION_TO_LOGICAL_CODE[action]) return { ok: false, reason: 'invalid_action' };
  // [#1 P1 Fix]: Reject Escape on any action other than PAUSE at the API level as well as UI level
  if (physicalCode === 'Escape' && action !== 'PAUSE') {
    keybindStatusMsg = 'ESC 키는 일시정지 전용 비상키로 예약되어 다른 행동에 지정할 수 없어요.';
    syncAllKeybindLabels();
    return { ok: false, reason: 'escape_reserved_for_pause' };
  }
  if (!isValidCustomKeyCode(physicalCode)) {
    keybindStatusMsg = '브라우저 예약 키는 지정할 수 없어요.';
    syncAllKeybindLabels();
    return { ok: false, reason: 'forbidden_key' };
  }
  // RENEWAL: a key already in use is swapped with the action that held it, instead of being rejected.
  let swappedWith = null;
  for (const otherAct of Object.keys(ACTION_TO_LOGICAL_CODE)) {
    if (otherAct !== action && pcKeybinds[otherAct] === physicalCode) swappedWith = otherAct;
  }
  if (swappedWith && pcKeybinds[action] === 'Escape' && swappedWith !== 'PAUSE') {
    keybindStatusMsg = 'ESC는 일시정지 전용이라 바꿀 수 없어요.';
    syncAllKeybindLabels();
    return { ok: false, reason: 'escape_reserved_for_pause' };
  }
  releaseAllInputs('keybind_change');
  const previous = pcKeybinds[action];
  pcKeybinds[action] = physicalCode;
  if (swappedWith) pcKeybinds[swappedWith] = previous;
  capturingKeyAction = null;
  keybindStatusMsg = swappedWith
    ? `${ACTION_LABELS_KO[action]}: ${formatKeyCodeLabel(physicalCode)}, ${ACTION_LABELS_KO[swappedWith]}: ${formatKeyCodeLabel(previous)}로 서로 바꿨어요.`
    : `${ACTION_LABELS_KO[action]}: ${formatKeyCodeLabel(physicalCode)}로 바꿨어요.`;
  savePcKeybinds();
  return { ok: true, action, code: physicalCode };
}

function resolvePhysicalKeyToLogicalCode(physicalCode) {
  if (!physicalCode) return null;
  // [#1 P1 Fix]: Escape is ALWAYS guaranteed to resolve to 'Escape' (emergency pause) regardless of PAUSE binding
  if (physicalCode === 'Escape') return 'Escape';
  // 1. User primary bindings take strict priority
  for (const [act, boundCode] of Object.entries(pcKeybinds)) {
    if (act === 'version') continue;
    if (boundCode === physicalCode) {
      return ACTION_TO_LOGICAL_CODE[act];
    }
  }
  // 2. Non-conflicting secondary convenience aliases (WASD, ShiftRight, KeyP when PAUSE is default Escape)
  const boundSet = new Set(Object.values(pcKeybinds));
  if (physicalCode === 'KeyP' && pcKeybinds.PAUSE === 'Escape' && !boundSet.has('KeyP')) return 'Escape';
  if (physicalCode === 'KeyA' && !boundSet.has('KeyA')) return 'ArrowLeft';
  if (physicalCode === 'KeyD' && !boundSet.has('KeyD')) return 'ArrowRight';
  if (physicalCode === 'KeyS' && !boundSet.has('KeyS')) return 'ArrowDown';
  if (physicalCode === 'KeyW' && !boundSet.has('KeyW')) return 'Space';
  if (physicalCode === 'ShiftRight' && !boundSet.has('ShiftRight')) return 'ShiftLeft';
  if (physicalCode === 'ArrowUp' && !boundSet.has('ArrowUp')) return 'Space';
  return null;
}

// RENEWAL: in-game hints name the player's actual controls, not hard-coded defaults.
function duduKeyText(text) {
  if (!text || typeof text !== 'string' || text.indexOf('{') < 0) return text;
  const touch = typeof isMobileOrTabletViewport === 'function' && isMobileOrTabletViewport();
  const k = getKeybindSummaryLabels();
  const tapDash = mobilePrefs.dashMode === 'tap';
  const map = touch
    ? { MOVE: '스틱', JUMP: '점프', DOWN: '스틱 ↓', DASH: tapDash ? '스틱 두 번 밀기' : '대시' }
    : { MOVE: `${k.l} ${k.r}`, JUMP: k.j, DOWN: k.d, DASH: k.dash };
  return text.replace(/\{(MOVE|JUMP|DOWN|DASH)\}/g, (_, t) => map[t]);
}
window.duduKeyText = duduKeyText;

// v1.4: the summary is rebuilt only when a binding actually changes (it was rebuilt several times per frame).
const _kbSummaryCache = { keys: null, val: null };
function getKeybindSummaryLabels() {
  const k = pcKeybinds, c = _kbSummaryCache.keys;
  if (c && c[0] === k.MOVE_LEFT && c[1] === k.MOVE_RIGHT && c[2] === k.DOWN_LOOK && c[3] === k.JUMP && c[4] === k.DASH && c[5] === k.RETRY && c[6] === k.PAUSE) return _kbSummaryCache.val;
  const val = computeKeybindSummaryLabels();
  _kbSummaryCache.keys = [k.MOVE_LEFT, k.MOVE_RIGHT, k.DOWN_LOOK, k.JUMP, k.DASH, k.RETRY, k.PAUSE];
  _kbSummaryCache.val = val;
  return val;
}
function computeKeybindSummaryLabels() {
  const l = formatKeyCodeLabel(pcKeybinds.MOVE_LEFT);
  const r = formatKeyCodeLabel(pcKeybinds.MOVE_RIGHT);
  const d = formatKeyCodeLabel(pcKeybinds.DOWN_LOOK);
  const j = formatKeyCodeLabel(pcKeybinds.JUMP);
  const dash = formatKeyCodeLabel(pcKeybinds.DASH);
  const retry = formatKeyCodeLabel(pcKeybinds.RETRY);
  const pauseKey = formatKeyCodeLabel(pcKeybinds.PAUSE);
  const boundSet = new Set(Object.values(pcKeybinds));
  // [#6 P2 Fix]: Keep pauseLabel 100% consistent with whether secondary 'P' shortcut is actually active
  let pauseLabel;
  if (pcKeybinds.PAUSE === 'Escape') {
    pauseLabel = boundSet.has('KeyP') ? 'ESC' : 'ESC / P';
  } else {
    pauseLabel = `${pauseKey} / ESC`;
  }
  return { l, r, d, j, dash, retry, pauseKey, pauseLabel };
}

function syncAllKeybindLabels() {
  const k = getKeybindSummaryLabels();
  // 1. Update Keybind Option Buttons inside #mobileSettingsModal
  for (const act of Object.keys(ACTION_TO_LOGICAL_CODE)) {
    const btn = document.getElementById(`keybindBtn-${act}`);
    if (btn) {
      const isCap = capturingKeyAction === act;
      btn.textContent = isCap ? '키 입력 대기 중…' : formatKeyCodeLabel(pcKeybinds[act]);
      btn.classList.toggle('is-capturing', isCap);
    }
  }
  const statusEl = document.getElementById('pcKeybindStatusMsg');
  if (statusEl) {
    statusEl.textContent = keybindStatusMsg || '';
  }
  // 2. Update modalKeys & below keys bar
  const modalKeysEl = document.querySelector('.modalKeys');
  if (modalKeysEl) {
    modalKeysEl.textContent = `${k.l} ${k.r} 이동, ${k.j} 점프, ${k.d}+${k.j} 내려가기, ${k.d} 꾹 눌러 아래보기, ${k.dash} 대시` + (mobilePrefs.kbDoubleTapDash !== false ? ' (방향 두 번으로도 대시)' : '');
  }
  const belowKeysEl = document.querySelector('.below .keys');
  if (belowKeysEl) {
    belowKeysEl.innerHTML = `
      <span><kbd>${k.l}</kbd><kbd>${k.r}</kbd> 이동</span>
      <span><kbd>${k.j}</kbd> 점프 / 2단 점프</span>
      <span><kbd>${k.d}</kbd> 길게 눌러 아래보기</span>
      <span><kbd>${k.d}</kbd> + <kbd>${k.j}</kbd> 얇은 발판 내려가기</span>
      <span><kbd>${k.dash}</kbd> 대시${mobilePrefs.kbDoubleTapDash !== false ? ' (방향 두 번도 가능)' : ''}</span>
      <span><kbd>${k.retry}</kbd> 구간 다시 시작</span>
      <span><kbd>${k.pauseLabel}</kbd> 쉬어가기</span>
    `;
  }
  // 3. Update retry buttons
  const retryBtn = document.getElementById('retry');
  if (retryBtn) retryBtn.textContent = `현재 구간 다시 시작 (${k.retry})`;
  const chRetryBtn = document.getElementById('chRetryBtn');
  if (chRetryBtn) chRetryBtn.textContent = `현재 스테이지 다시 시작 (${k.retry})`;

  // 4. Update Lobby Key Help Modal badges if mounted
  const khMove = document.getElementById('lobbyKeyBadgeMove');
  const khJump = document.getElementById('lobbyKeyBadgeJump');
  const khDash = document.getElementById('lobbyKeyBadgeDash');
  const khLook = document.getElementById('lobbyKeyBadgeLook');
  const khDrop = document.getElementById('lobbyKeyBadgeDrop');
  const khRetry = document.getElementById('lobbyKeyBadgeRetry');
  const khPause = document.getElementById('lobbyKeyBadgePause');
  if (khMove) khMove.textContent = `${k.l} / ${k.r} (보조 A / D)`;
  if (khJump) khJump.textContent = `${k.j}`;
  if (khDash) khDash.textContent = `${k.dash}`;
  if (khLook) khLook.textContent = `${k.d} 길게 누르기`;
  if (khDrop) khDrop.textContent = `${k.d} + ${k.j}`;
  if (khRetry) khRetry.textContent = `${k.retry}`;
  if (khPause) khPause.textContent = `${k.pauseLabel}`;
}

function ensurePcKeybindSettingsUI() {
  const modalCard = document.querySelector('#mobileSettingsModal .mobileSettingsCard');
  const footer = modalCard?.querySelector('.mobileSettingsFooter');
  if (!modalCard || !footer || document.getElementById('pcKeybindSection')) return;

  const sec = document.createElement('div');
  sec.id = 'pcKeybindSection';
  sec.className = 'pcKeybindSection';
  // v1.6.7: the double-tap dash switch sits in the grid cell right under the dash key
  const tapDashRow = `
    <label class="pcKeybindRow pcKeybindCheckRow" for="kbDoubleTapDashChk">
      <span class="pcKeybindActionName">방향키 두 번 대시</span>
      <input type="checkbox" id="kbDoubleTapDashChk" class="pcKeybindCheck" ${mobilePrefs.kbDoubleTapDash !== false ? 'checked' : ''}>
    </label>`;
  const rowsHtml = Object.keys(ACTION_TO_LOGICAL_CODE).map(act => `
    <div class="pcKeybindRow">
      <span class="pcKeybindActionName">${ACTION_LABELS_KO[act]}</span>
      <button type="button" class="pcKeybindCaptureBtn" id="keybindBtn-${act}" data-keybind-action="${act}">
        ${formatKeyCodeLabel(pcKeybinds[act])}
      </button>
    </div>
  ` + (act === 'RETRY' ? tapDashRow : '')).join('');

  sec.innerHTML = `
    <div class="soundSettingDivider" aria-hidden="true"></div>
    <div class="pcKeybindHeaderRow">
      <span class="mobileSettingLabel pcKeybindSectionTitle">PC 키보드 조작 설정</span>
      <button type="button" class="pcKeybindResetBtn" id="resetPcKeybindsBtn">기본값 복원</button>
    </div>
    <div class="pcKeybindGrid" role="group" aria-label="PC 조작키 설정">
      ${rowsHtml}
    </div>
    <div class="pcKeybindHintRow">
      <span id="pcKeybindStatusMsg" class="pcKeybindStatusMsg" aria-live="polite"></span>
    </div>
  `;
  // [#6 P2 Fix]: Place PC Keybind settings right below Sound Volume on PC (above Mobile Controller section) so no scrolling is required on PC
  const soundGroup = modalCard.querySelector('.soundVolumeGroup');
  if (!isMobileOrTabletViewport() && soundGroup && soundGroup.nextSibling) {
    modalCard.insertBefore(sec, soundGroup.nextSibling);
  } else {
    modalCard.insertBefore(sec, footer);
  }

  sec.querySelectorAll('[data-keybind-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const act = btn.getAttribute('data-keybind-action');
      if (capturingKeyAction === act) {
        capturingKeyAction = null;
        keybindStatusMsg = '키 변경이 취소되었습니다.';
      } else {
        capturingKeyAction = act;
        keybindStatusMsg = `[${ACTION_LABELS_KO[act]}]에 사용할 새 키를 눌러 주세요… (ESC: 취소)`;
      }
      syncAllKeybindLabels();
    });
  });

  const tapChk = document.getElementById('kbDoubleTapDashChk');
  if (tapChk) {
    tapChk.addEventListener('click', e => e.stopPropagation());
    tapChk.addEventListener('change', () => {
      mobilePrefs.kbDoubleTapDash = tapChk.checked;
      doubleTapState.ArrowLeft.press = doubleTapState.ArrowLeft.release = 0;
      doubleTapState.ArrowRight.press = doubleTapState.ArrowRight.release = 0;
      saveMobilePrefs();
      if (typeof syncAllKeybindLabels === 'function') syncAllKeybindLabels();
    });
  }
  const resetBtn = document.getElementById('resetPcKeybindsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      resetPcKeybindsToDefault();
    });
  }
  syncAllKeybindLabels();
}

window.pcKeybinds = pcKeybinds;
window.loadPcKeybinds = loadPcKeybinds;
window.savePcKeybinds = savePcKeybinds;
window.setPcKeybind = setPcKeybind;
window.resetPcKeybindsToDefault = resetPcKeybindsToDefault;
window.resolvePhysicalKeyToLogicalCode = resolvePhysicalKeyToLogicalCode;
window.getKeybindSummaryLabels = getKeybindSummaryLabels;
window.syncAllKeybindLabels = syncAllKeybindLabels;
window.isCapturingKeybind = () => Boolean(capturingKeyAction);


// Load & Save Controller Preferences
function loadMobilePrefs() {
  try {
    const raw = localStorage.getItem(MOBILE_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.stickPosition === 'bottom' || parsed.stickPosition === 'top')) {
        mobilePrefs.stickPosition = parsed.stickPosition;
      }
      if (parsed && (parsed.buttonSwap === 'normal' || parsed.buttonSwap === 'swapped')) {
        mobilePrefs.buttonSwap = parsed.buttonSwap;
      }
      if (parsed && (parsed.stickSize === 'small' || parsed.stickSize === 'medium' || parsed.stickSize === 'large')) {
        mobilePrefs.stickSize = parsed.stickSize;
      }
      if (parsed && ['small','medium','large'].includes(parsed.actionSize)) mobilePrefs.actionSize=parsed.actionSize;
      if (parsed && ['button','both','tap'].includes(parsed.dashMode)) mobilePrefs.dashMode=parsed.dashMode;
      if (parsed && typeof parsed.kbDoubleTapDash === 'boolean') mobilePrefs.kbDoubleTapDash = parsed.kbDoubleTapDash;
    }
  } catch (e) {
    // Ignore storage errors in private mode
  }
  applyMobilePrefsToDOM();
}

function saveMobilePrefs() {
  try {
    localStorage.setItem(MOBILE_PREFS_KEY, JSON.stringify(mobilePrefs));
  } catch (e) {
    // Ignore storage errors in private mode
  }
  applyMobilePrefsToDOM();
}

function applyMobilePrefsToDOM() {
  const ctrlEl = typeof $ === 'function' ? $('mobileControls') : document.getElementById('mobileControls');
  if (ctrlEl) {
    ctrlEl.setAttribute('data-stick-pos', mobilePrefs.stickPosition);
    ctrlEl.setAttribute('data-btn-swap', mobilePrefs.buttonSwap);
    ctrlEl.setAttribute('data-stick-size', mobilePrefs.stickSize);
    ctrlEl.setAttribute('data-action-size', mobilePrefs.actionSize);
    ctrlEl.setAttribute('data-dash-mode', mobilePrefs.dashMode);
  }
  document.querySelectorAll('[data-opt-dash-mode]').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-opt-dash-mode') === mobilePrefs.dashMode);
  });
  // Update button labels in settings dialog so '상단/하단' reflects current left/right side clearly
  const isSwapped = mobilePrefs.buttonSwap === 'swapped';
  const btnBottom = document.getElementById('optStickBottom');
  const btnTop = document.getElementById('optStickTop');
  if (btnBottom) btnBottom.textContent = isSwapped ? '우하단 (기본)' : '좌하단 (기본)';
  if (btnTop) btnTop.textContent = isSwapped ? '우상단' : '좌상단';

  document.querySelectorAll('[data-opt-stick-pos]').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-opt-stick-pos') === mobilePrefs.stickPosition);
  });
  document.querySelectorAll('[data-opt-btn-swap]').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-opt-btn-swap') === mobilePrefs.buttonSwap);
  });
  document.querySelectorAll('[data-opt-stick-size]').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-opt-stick-size') === mobilePrefs.stickSize);
  });
  document.querySelectorAll('[data-opt-action-size]').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-opt-action-size') === mobilePrefs.actionSize);
  });
}

function setMobilePref(key, value) {
  if (key === 'stickPosition' && (value === 'bottom' || value === 'top')) {
    mobilePrefs.stickPosition = value;
  } else if (key === 'buttonSwap' && (value === 'normal' || value === 'swapped')) {
    mobilePrefs.buttonSwap = value;
  } else if (key === 'stickSize' && (value === 'small' || value === 'medium' || value === 'large')) {
    mobilePrefs.stickSize = value;
  } else if (key === 'actionSize' && ['small','medium','large'].includes(value)) {
    mobilePrefs.actionSize = value;
  } else if (key === 'dashMode' && ['button','both','tap'].includes(value)) {
    mobilePrefs.dashMode = value;
  }
  saveMobilePrefs();
}
window.setMobilePref = setMobilePref;

// Detect whether current viewport is a mobile/tablet environment
function isMobileOrTabletViewport() {
  // Device classification is independent of resizable browser window dimensions.
  // Desktop Chrome in a narrow window (or with DevTools open) must retain PC controls.
  const ua=navigator.userAgent||'';
  const uaMobile=Boolean(navigator.userAgentData?.mobile);
  const nativeMobile=/Android|iPhone|iPad|iPod|Mobile|Windows Phone|Silk|Kindle|PlayBook/i.test(ua);
  const ipadDesktopUA=navigator.platform==='MacIntel' && (navigator.maxTouchPoints||0)>1;
  return Boolean(uaMobile || nativeMobile || ipadDesktopUA);
}

function updateVisualViewportVars() {
  const vv = window.visualViewport;
  const vvw = vv ? Math.round(vv.width) : window.innerWidth;
  const vvh = vv ? Math.round(vv.height) : window.innerHeight;
  document.documentElement.style.setProperty('--vvw', `${vvw}px`);
  document.documentElement.style.setProperty('--vvh', `${vvh}px`);
}

function lockLandscapePageScroll() {
  if (!mobileUIState.scrollLocked) {
    mobileUIState.savedScrollY = window.scrollY || window.pageYOffset || 0;
    mobileUIState.scrollLocked = true;
  }
  document.documentElement.classList.add('mobile-landscape-lock');
  document.body.classList.add('mobile-game-landscape');
  document.body.classList.remove('mobile-web-portrait');
}

function unlockPortraitPageScroll() {
  const wasLocked = mobileUIState.scrollLocked;
  const targetY = mobileUIState.savedScrollY || 0;
  document.documentElement.classList.remove('mobile-landscape-lock');
  document.body.classList.remove('mobile-game-landscape');
  document.body.classList.add('mobile-web-portrait');
  mobileUIState.scrollLocked = false;
  if (wasLocked) {
    window.scrollTo(0, targetY);
  }
}

// State Machine: WEB_PORTRAIT / GAME_LANDSCAPE / GAME_PAUSED
function syncMobileViewMode() {
  updateVisualViewportVars();
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  const isMobile = isMobileOrTabletViewport();
  const isPortrait = isMobile && (h > w);
  const rotatePrompt = typeof $ === 'function' ? $('portraitWarning') : document.getElementById('portraitWarning');

  document.body.classList.toggle('is-mobile-device', isMobile);

  if (!isMobile) {
    // PC Default layout
    if (rotatePrompt) rotatePrompt.hidden = true;
    document.documentElement.classList.remove('mobile-landscape-lock');
    document.body.classList.remove('mobile-game-landscape', 'mobile-web-portrait');
    mobileUIState.scrollLocked = false;
    mobileUIState.viewMode = (typeof state !== 'undefined' && state === 'paused') ? 'GAME_PAUSED' : 'PC_DEFAULT';
    mobileUIState.fullscreenMode = document.fullscreenElement ? 'native' : 'inline';
    return mobileUIState.viewMode;
  }

  if (isPortrait) {
    // Transition into WEB_PORTRAIT
    const prevMode = mobileUIState.viewMode;
    mobileUIState.viewMode = 'WEB_PORTRAIT';
    mobileUIState.fullscreenMode = 'inline';
    if (rotatePrompt) rotatePrompt.hidden = false;

    // Exit native fullscreen if somehow still active in portrait
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    // Unlock page scrolling & restore previous scrollY without jumping to top
    unlockPortraitPageScroll();

    // Pause gameplay idempotently & release all inputs
    if (prevMode !== 'WEB_PORTRAIT' || (typeof state !== 'undefined' && state === 'playing')) {
      ensurePaused('portrait');
    } else {
      releaseAllInputs('portrait');
    }
    return mobileUIState.viewMode;
  }

  // Mobile Landscape: GAME_LANDSCAPE (or GAME_PAUSED inside landscape container if paused)
  if (rotatePrompt) rotatePrompt.hidden = true;
  lockLandscapePageScroll();
  mobileUIState.fullscreenMode = (document.fullscreenElement || document.webkitFullscreenElement) ? 'native' : 'css_focus';

  // CRITICAL: Returning from WEB_PORTRAIT to Landscape NEVER auto-resumes gameplay!
  // The player must explicitly click '계속 플레이 →' / '계속 모험하기' to resume.
  if (typeof state !== 'undefined' && state === 'paused') {
    mobileUIState.viewMode = 'GAME_PAUSED';
  } else {
    mobileUIState.viewMode = 'GAME_LANDSCAPE';
  }
  return mobileUIState.viewMode;
}
window.syncMobileViewMode = syncMobileViewMode;

// Browser-Aware Fullscreen / Landscape Focus Mode Handler (User Gesture Only)
async function requestGameFullscreenOrFocus(triggerSource = 'button') {
  const gameEl = typeof $ === 'function' ? $('game') : document.getElementById('game');
  if (!gameEl) return { mode: 'inline', nativeSupported: false };

  // Toggle off if already in native fullscreen and user clicked the #full button
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl && (triggerSource === 'hud_btn' || triggerSource === 'opt_btn')) {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch (e) {}
    releaseAllInputs('fullscreen_exit');
    syncMobileViewMode();
    return { mode: mobileUIState.fullscreenMode, nativeSupported: true };
  }

  // Try Native Fullscreen API once inside user gesture (Android Chrome / Desktop)
  const reqFs = gameEl.requestFullscreen || gameEl.webkitRequestFullscreen;
  let nativeSuccess = false;
  if (reqFs) {
    try {
      await reqFs.call(gameEl);
      nativeSuccess = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    } catch (err) {
      nativeSuccess = false;
    }
  }

  // Optionally try orientation lock if supported (never fail if rejected)
  if (screen.orientation && typeof screen.orientation.lock === 'function') {
    try {
      await screen.orientation.lock('landscape');
    } catch (e) {
      // Orientation lock is optional and unsupported on iOS Safari / desktop
    }
  }

  // Whether native fullscreen succeeded (Android Chrome) or is unsupported/blocked (iPhone Safari),
  // ensure CSS landscape focus mode is active on mobile landscape without looping requests!
  updateVisualViewportVars();
  if (isMobileOrTabletViewport() && window.innerWidth >= window.innerHeight) {
    lockLandscapePageScroll();
  }
  mobileUIState.fullscreenMode = nativeSuccess ? 'native' : (isMobileOrTabletViewport() ? 'css_focus' : 'inline');
  syncMobileViewMode();
  return { mode: mobileUIState.fullscreenMode, nativeSupported: Boolean(reqFs), nativeSuccess };
}
window.requestGameFullscreenOrFocus = requestGameFullscreenOrFocus;

// 360° Virtual Joystick Direction Solver
function updateJoystickFromPoint(clientX, clientY) {
  const baseEl = typeof $ === 'function' ? $('vjoy-base') : document.getElementById('vjoy-base');
  const knobEl = typeof $ === 'function' ? $('vjoy-knob') : document.getElementById('vjoy-knob');
  if (!baseEl || !knobEl) return;

  const rect = baseEl.getBoundingClientRect();
  const radius = Math.max(32, rect.width * 0.5);
  const cx = rect.left + radius;
  const cy = rect.top + radius;

  const rawDx = clientX - cx;
  const rawDy = clientY - cy;
  const dist = Math.hypot(rawDx, rawDy);
  const maxKnobDist = radius * 0.62;
  const clampScale = dist > maxKnobDist ? (maxKnobDist / dist) : 1.0;
  const kx = rawDx * clampScale;
  const ky = rawDy * clampScale;

  knobEl.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0px)`;

  const nx = rawDx / radius;
  const ny = rawDy / radius;
  const normDist = dist / radius;
  const angleDeg = (Math.atan2(rawDy, rawDx) * 180 / Math.PI + 360) % 360;

  mobileUIState.joyVector = {
    dx: Number(rawDx.toFixed(1)),
    dy: Number(rawDy.toFixed(1)),
    nx: Number(nx.toFixed(3)),
    ny: Number(ny.toFixed(3)),
    angleDeg: Number(angleDeg.toFixed(1))
  };

  // Deadzone & Hysteresis Thresholds
  const deadZone = 0.18;
  const prev = mobileUIState.activeStickDirs;
  const hEnter = 0.20, hExit = 0.14;
  const dEnter = 0.34, dExit = 0.25;

  let wantLeft = false;
  let wantRight = false;
  let wantDown = false;

  if (normDist >= deadZone) {
    if (prev.left) {
      wantLeft = nx < -hExit;
    } else {
      wantLeft = nx < -hEnter;
    }
    if (prev.right) {
      wantRight = nx > hExit;
    } else {
      wantRight = nx > hEnter;
    }
    if ( wantLeft && wantRight ) {
      wantLeft = nx < 0;
      wantRight = nx > 0;
    }
    // Downward input (look-down / platform drop-through); upward movement NEVER activates ArrowDown or Space
    if (prev.down) {
      wantDown = ny > dExit;
    } else {
      wantDown = ny > dEnter;
    }
  }

  // Strictly release previous direction keys BEFORE pressing new direction keys!
  if (prev.left && !wantLeft) releaseInput('ArrowLeft', 'vjoy');
  if (prev.right && !wantRight) releaseInput('ArrowRight', 'vjoy');
  if (prev.down && !wantDown) releaseInput('ArrowDown', 'vjoy');

  if (!prev.left && wantLeft) pressInput('ArrowLeft', 'vjoy');
  if (!prev.right && wantRight) pressInput('ArrowRight', 'vjoy');
  if (!prev.down && wantDown) pressInput('ArrowDown', 'vjoy');

  mobileUIState.activeStickDirs = { left: wantLeft, right: wantRight, down: wantDown };
  baseEl.setAttribute('data-dir-left', String(wantLeft));
  baseEl.setAttribute('data-dir-right', String(wantRight));
  baseEl.setAttribute('data-dir-down', String(wantDown));
}
window.updateJoystickFromPoint = updateJoystickFromPoint;

function endJoystickTracking() {
  const prev = mobileUIState.activeStickDirs;
  if (prev.left) releaseInput('ArrowLeft', 'vjoy');
  if (prev.right) releaseInput('ArrowRight', 'vjoy');
  if (prev.down) releaseInput('ArrowDown', 'vjoy');
  resetJoystickVisualAndState();
}

let _optionsReturnContext = { fromLobbyKeyHelp: false, triggerEl: null };

function syncPcKeybindSectionOrder() {
  const modalCard = document.querySelector('#mobileSettingsModal .mobileSettingsCard');
  const sec = document.getElementById('pcKeybindSection');
  const footer = modalCard?.querySelector('.mobileSettingsFooter');
  const soundGroup = modalCard?.querySelector('.soundVolumeGroup');
  if (!modalCard || !sec || !footer) return;
  if (!isMobileOrTabletViewport() && soundGroup && soundGroup.nextSibling) {
    if (sec.previousElementSibling !== soundGroup) {
      modalCard.insertBefore(sec, soundGroup.nextSibling);
    }
  } else {
    if (sec.nextElementSibling !== footer) {
      modalCard.insertBefore(sec, footer);
    }
  }
}

function openMobileSettingsModal(opts = {}) {
  if (typeof state !== 'undefined' && state === 'playing') {
    ensurePaused('options');
  } else {
    releaseAllInputs('options');
  }
  _optionsReturnContext = {
    fromLobbyKeyHelp: Boolean(opts && opts.fromLobbyKeyHelp),
    triggerEl: (opts && opts.triggerEl) ? opts.triggerEl : (document.activeElement || null)
  };
  ensurePcKeybindSettingsUI();
  syncPcKeybindSectionOrder();
  capturingKeyAction = null;
  applyMobilePrefsToDOM();
  syncAllKeybindLabels();
  const modalEl = document.getElementById('mobileSettingsModal');
  if (modalEl) {
    modalEl.hidden = false;
    const card = modalEl.querySelector('.mobileSettingsCard');
    if (card) card.scrollTop = 0;
  }
}

function closeMobileSettingsModal() {
  capturingKeyAction = null;
  releaseAllInputs('close_options');
  syncAllKeybindLabels();
  const modalEl = document.getElementById('mobileSettingsModal');
  if (modalEl) modalEl.hidden = true;

  // [#6 P2 Fix]: Restore Lobby Key Help modal and focus when options was opened from Key Help
  if (_optionsReturnContext && _optionsReturnContext.fromLobbyKeyHelp) {
    const host = document.getElementById('lobbyPanelHost');
    const lobby = document.getElementById('duduTitleLobby');
    if (host && lobby && !lobby.classList.contains('is-hidden')) {
      host.hidden = false;
      const btn = document.getElementById('openKeybindFromHelpBtn') || _optionsReturnContext.triggerEl;
      if (btn && typeof btn.focus === 'function') {
        try { btn.focus(); } catch (e) {}
      }
      _optionsReturnContext = { fromLobbyKeyHelp: false, triggerEl: null };
      return;
    }
  }
  const prevTrigger = _optionsReturnContext?.triggerEl;
  _optionsReturnContext = { fromLobbyKeyHelp: false, triggerEl: null };
  if (prevTrigger && typeof prevTrigger.focus === 'function' && document.contains(prevTrigger)) {
    try { prevTrigger.focus(); } catch (e) {}
  }
}

window.openMobileSettingsModal = openMobileSettingsModal;
window.closeMobileSettingsModal = closeMobileSettingsModal;

let mobileControlsInitialized = false;

function setupMobileControls() {
  if (mobileControlsInitialized) return;
  mobileControlsInitialized = true;

  loadMobilePrefs();
  ensurePcKeybindSettingsUI();
  loadPcKeybinds();
  setupTouchInputLayer();

  // 1. Setup 360° Virtual Joystick (#vjoy-base)
  const joyBase = document.getElementById('vjoy-base');
  if (joyBase) {
    joyBase.addEventListener('pointerdown', e => {
      if (mobileUIState.viewMode === 'WEB_PORTRAIT') return;
      e.preventDefault();
      e.stopPropagation();
      try { joyBase.setPointerCapture(e.pointerId); } catch (err) {}
      mobileUIState.joyActive = true;
      mobileUIState.joyPointerId = e.pointerId;
      joyBase.classList.add('active');
      updateJoystickFromPoint(e.clientX, e.clientY);
    });

    joyBase.addEventListener('pointermove', e => {
      if (!mobileUIState.joyActive || e.pointerId !== mobileUIState.joyPointerId) return;
      e.preventDefault();
      e.stopPropagation();
      updateJoystickFromPoint(e.clientX, e.clientY);
    });

    const onJoyEnd = e => {
      if (!mobileUIState.joyActive || (e.pointerId !== undefined && e.pointerId !== mobileUIState.joyPointerId)) return;
      e.preventDefault();
      endJoystickTracking();
    };

    joyBase.addEventListener('pointerup', onJoyEnd);
    joyBase.addEventListener('pointercancel', onJoyEnd);
    joyBase.addEventListener('lostpointercapture', onJoyEnd);
  }

  // 2. Setup Action Buttons (Jump, Dash) & Legacy fallback buttons
  const bindings = [
    { el: document.getElementById('vbtn-jump'), code: 'Space' },
    { el: document.getElementById('vbtn-dash'), code: 'ShiftLeft' },
    { el: document.getElementById('vbtn-left'), code: 'ArrowLeft' },
    { el: document.getElementById('vbtn-right'), code: 'ArrowRight' },
    { el: document.getElementById('vbtn-down'), code: 'ArrowDown' }
  ];

  bindings.forEach(({ el, code }) => {
    if (!el) return;
    const activePointers = new Set();

    el.addEventListener('pointerdown', e => {
      if (mobileUIState.viewMode === 'WEB_PORTRAIT') return;
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      activePointers.add(e.pointerId);
      el.classList.add('active');
      touchButtonPointers.set(e.pointerId, { code, source: `touch_${e.pointerId}`, el });
      pressInput(code, `touch_${e.pointerId}`);
    });

    const onPointerEnd = e => {
      if (activePointers.has(e.pointerId)) {
        activePointers.delete(e.pointerId);
        touchButtonPointers.delete(e.pointerId);
        releaseInput(code, `touch_${e.pointerId}`);
      }
      if (activePointers.size === 0) {
        el.classList.remove('active');
      }
    };

    el.addEventListener('pointerup', onPointerEnd);
    el.addEventListener('pointercancel', onPointerEnd);
    el.addEventListener('lostpointercapture', onPointerEnd);
  });

  // Prevent browser default touch gestures inside #game ONLY when in GAME_LANDSCAPE
  const gameEl = document.getElementById('game');
  if (gameEl) {
    gameEl.addEventListener('contextmenu', e => {
      if (isMobileOrTabletViewport()) e.preventDefault();
    });
  }

  // 3. Wire Mobile Controller Settings UI
  const optBtn = document.getElementById('mobileOptBtn');
  const modalOptBtn = document.getElementById('modalMobileOptBtn');
  const closeOptBtn = document.getElementById('closeMobileOptBtn');
  const confirmOptBtn = document.getElementById('confirmMobileOptBtn');
  const optFsBtn = document.getElementById('optToggleFullscreenBtn');
  const landscapeFocusBtn = document.getElementById('landscapeFocusBtn');

  if (optBtn) optBtn.addEventListener('click', e => { e.stopPropagation(); openMobileSettingsModal(); });
  if (modalOptBtn) modalOptBtn.addEventListener('click', e => { e.stopPropagation(); openMobileSettingsModal(); });
  if (closeOptBtn) closeOptBtn.addEventListener('click', e => { e.stopPropagation(); closeMobileSettingsModal(); });
  if (confirmOptBtn) confirmOptBtn.addEventListener('click', e => { e.stopPropagation(); closeMobileSettingsModal(); });
  if (optFsBtn) optFsBtn.addEventListener('click', e => { e.stopPropagation(); requestGameFullscreenOrFocus('opt_btn'); });
  if (landscapeFocusBtn) landscapeFocusBtn.addEventListener('click', e => { e.stopPropagation(); requestGameFullscreenOrFocus('modal_btn'); });

  document.querySelectorAll('[data-opt-stick-pos]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setMobilePref('stickPosition', btn.getAttribute('data-opt-stick-pos'));
    });
  });
  document.querySelectorAll('[data-opt-btn-swap]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setMobilePref('buttonSwap', btn.getAttribute('data-opt-btn-swap'));
    });
  });
  document.querySelectorAll('[data-opt-stick-size]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setMobilePref('stickSize', btn.getAttribute('data-opt-stick-size'));
    });
  });
  document.querySelectorAll('[data-opt-action-size]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setMobilePref('actionSize', btn.getAttribute('data-opt-action-size'));
    });
  });
  document.querySelectorAll('[data-opt-dash-mode]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setMobilePref('dashMode', btn.getAttribute('data-opt-dash-mode'));
      if (typeof syncAllKeybindLabels === 'function') syncAllKeybindLabels();
    });
  });

  // 4. Touch on story cutscene to advance
  const storyEl = document.getElementById('story');
  if (storyEl) {
    storyEl.addEventListener('pointerdown', e => {
      if (typeof storyAdvance === 'function') storyAdvance();
    });
  }

  // 5. Orientation, Resize, Fullscreen & Visibility Listeners (Single Registered Instance)
  const onViewportChange = () => {
    syncMobileViewMode();
  };

  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
  }
  document.addEventListener('fullscreenchange', () => {
    releaseAllInputs('fullscreenchange');
    syncMobileViewMode();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    releaseAllInputs('fullscreenchange');
    syncMobileViewMode();
  });

  syncMobileViewMode();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileControls);
} else {
  setupMobileControls();
}

// ============================================================================
// v1.1.1 TOUCH INPUT LAYER
// - Floating stick: a touch anywhere in the stick zone becomes the stick's center.
// - Down only on a deliberate, near-vertical pull, so a diagonal thumb never turns a jump into a drop.
// - Stick dash only on two deliberate flicks (out, back to center, out again), never on thumb wobble.
// - Safety net: document-level release tracking, and "no fingers on screen" clears every touch input.
// ============================================================================
const VJ = {
  active: false, pointerId: null, ox: 0, oy: 0, homeX: 0, homeY: 0,
  dirs: { left: false, right: false, down: false },
  flick: { phase: 'idle', dir: 0, outAt: 0, lastFlickDir: 0, lastFlickAt: 0, returned: false }
};
const VJ_DEAD_ENTER = 12, VJ_DEAD_EXIT = 7;
const touchButtonPointers = new Map(); // pointerId -> { code, source, el }

function vjRadius() {
  const c = document.getElementById('vjoy-container');
  return c ? Math.max(36, c.getBoundingClientRect().width * 0.5) : 54;
}
function vjSetVisual(cx, cy, kx, ky) {
  const c = document.getElementById('vjoy-container');
  const knob = document.getElementById('vjoy-knob');
  const base = document.getElementById('vjoy-base');
  if (c) c.style.transform = (cx === null) ? '' : `translate3d(${(cx - VJ.homeX).toFixed(1)}px, ${(cy - VJ.homeY).toFixed(1)}px, 0)`;
  if (knob) knob.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0)`;
  if (base) base.classList.toggle('active', cx !== null);
}
function vjApplyDirs(want) {
  const prev = VJ.dirs;
  if (prev.left && !want.left) releaseInput('ArrowLeft', 'vjoy');
  if (prev.right && !want.right) releaseInput('ArrowRight', 'vjoy');
  if (prev.down && !want.down) releaseInput('ArrowDown', 'vjoy');
  if (!prev.left && want.left) pressInput('ArrowLeft', 'vjoy');
  if (!prev.right && want.right) pressInput('ArrowRight', 'vjoy');
  if (!prev.down && want.down) pressInput('ArrowDown', 'vjoy');
  VJ.dirs = want;
  mobileUIState.activeStickDirs = { ...want };
  const base = document.getElementById('vjoy-base');
  if (base) {
    base.setAttribute('data-dir-left', String(want.left));
    base.setAttribute('data-dir-right', String(want.right));
    base.setAttribute('data-dir-down', String(want.down));
  }
}
function vjFlickUpdate(nxAbs, dirSign, now) {
  if (mobilePrefs.dashMode === 'button') return;
  const f = VJ.flick;
  if (nxAbs < 0.3) {
    if (f.phase === 'out') { f.phase = 'idle'; f.returned = true; }
    return;
  }
  if (nxAbs > 0.72 && f.phase !== 'out') {
    f.phase = 'out';
    if (f.returned && f.lastFlickDir === dirSign && now - f.lastFlickAt <= 300 && state === 'playing') {
      dashRequest = true;
      f.lastFlickDir = 0; f.lastFlickAt = 0; f.returned = false;
    } else {
      f.lastFlickDir = dirSign; f.lastFlickAt = now; f.returned = false;
    }
  }
}
function vjUpdate(clientX, clientY) {
  const R = vjRadius();
  let dx = clientX - VJ.ox, dy = clientY - VJ.oy;
  let dist = Math.hypot(dx, dy);
  // The center follows a thumb dragged far past the rim, so reversing direction responds at once.
  const follow = R * 1.2;
  if (dist > follow) {
    const k = (dist - follow) / dist;
    VJ.ox += dx * k; VJ.oy += dy * k;
    dx = clientX - VJ.ox; dy = clientY - VJ.oy; dist = Math.hypot(dx, dy);
  }
  const prev = VJ.dirs;
  const hEnter = VJ_DEAD_ENTER, hExit = VJ_DEAD_EXIT;
  let left = prev.left ? dx < -hExit : dx < -hEnter;
  let right = prev.right ? dx > hExit : dx > hEnter;
  if (left && right) { left = dx < 0; right = dx > 0; }
  // Down: a deliberate pull, at least 55% of the radius and within ~40 degrees of straight down.
  const steep = dy > 0 && Math.abs(dx) <= dy * 0.84;
  const down = prev.down ? (dy > R * 0.42 && Math.abs(dx) <= dy * 1.0) : (dy > R * 0.55 && steep);
  vjApplyDirs({ left, right, down });
  vjFlickUpdate(Math.abs(dx) / R, Math.sign(dx), performance.now());
  const kScale = dist > R * 0.62 ? (R * 0.62) / dist : 1;
  vjSetVisual(VJ.ox, VJ.oy, dx * kScale, dy * kScale);
  mobileUIState.joyVector = { dx, dy, nx: dx / R, ny: dy / R, angleDeg: (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360 };
}
function vjEnd() {
  if (!VJ.active && !VJ.dirs.left && !VJ.dirs.right && !VJ.dirs.down) return;
  VJ.active = false; VJ.pointerId = null;
  mobileUIState.joyActive = false; mobileUIState.joyPointerId = null;
  vjApplyDirs({ left: false, right: false, down: false });
  vjSetVisual(null, null, 0, 0);
  VJ.flick.phase = 'idle';
}
function releaseAllTouchSources() {
  vjEnd();
  for (const [pid, info] of touchButtonPointers) {
    releaseInput(info.code, info.source);
    if (info.el) info.el.classList.remove('active');
  }
  touchButtonPointers.clear();
}
window.releaseAllTouchSources = releaseAllTouchSources;

function setupTouchInputLayer() {
  const zone = document.getElementById('vjoy-zone');
  const container = document.getElementById('vjoy-container');
  if (!zone || !container) return;
  const measureHome = () => {
    container.style.transform = '';
    const r = container.getBoundingClientRect();
    VJ.homeX = r.left + r.width / 2; VJ.homeY = r.top + r.height / 2;
  };
  zone.addEventListener('pointerdown', e => {
    if (mobileUIState.viewMode === 'WEB_PORTRAIT') return;
    if (VJ.active) return; // one thumb drives the stick
    e.preventDefault(); e.stopPropagation();
    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    measureHome();
    const R = vjRadius();
    const zr = zone.getBoundingClientRect();
    VJ.ox = Math.max(zr.left + R, Math.min(zr.right - R, e.clientX));
    VJ.oy = Math.max(zr.top + R, Math.min(zr.bottom - R, e.clientY));
    VJ.active = true; VJ.pointerId = e.pointerId;
    mobileUIState.joyActive = true; mobileUIState.joyPointerId = e.pointerId;
    vjUpdate(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', e => {
    if (!VJ.active || e.pointerId !== VJ.pointerId) return;
    e.preventDefault();
    vjUpdate(e.clientX, e.clientY);
  });
  const end = e => { if (VJ.active && e.pointerId === VJ.pointerId) vjEnd(); };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);

  // Safety net 1: any pointer that ends anywhere releases whatever it was holding.
  const docEnd = e => {
    if (VJ.active && e.pointerId === VJ.pointerId) vjEnd();
    const info = touchButtonPointers.get(e.pointerId);
    if (info) {
      touchButtonPointers.delete(e.pointerId);
      releaseInput(info.code, info.source);
      if (info.el && ![...touchButtonPointers.values()].some(v => v.el === info.el)) info.el.classList.remove('active');
    }
  };
  document.addEventListener('pointerup', docEnd, true);
  document.addEventListener('pointercancel', docEnd, true);
  // Safety net 2: no fingers on the screen means nothing can be held.
  const noFingers = e => { if (e.touches && e.touches.length === 0) releaseAllTouchSources(); };
  document.addEventListener('touchend', noFingers, true);
  document.addEventListener('touchcancel', noFingers, true);
  window.addEventListener('orientationchange', releaseAllTouchSources);
  window.addEventListener('resize', () => { if (!VJ.active) measureHome(); });
}


// ============================================================================
// v1.3 NO-ZOOM GUARD AND AUTO FULLSCREEN
// iOS Safari ignores user-scalable=no, so double-tap and pinch zoom are also blocked here.
// Android: the first tap on the game in landscape enters native fullscreen once. If the player leaves it,
// it is not forced again (the fullscreen button still works).
// ============================================================================
(function setupNoZoomAndAutoFullscreen() {
  const INTERACTIVE = 'button, a, input, select, textarea, label, [role="button"], .optChoiceBtn';
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = performance.now();
    const t = e.target;
    const interactive = t && t.closest && t.closest(INTERACTIVE);
    if (!interactive && now - lastTouchEnd < 350 && e.cancelable) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false, capture: true });
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  }
  document.addEventListener('dblclick', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  // iOS loupe and callout: block text selection and the long-press menu while the game is in landscape play.
  const inGame = () => document.body.classList.contains('mobile-game-landscape');
  document.addEventListener('selectstart', e => { if (inGame() && !(e.target.closest && e.target.closest('input, textarea'))) e.preventDefault(); });
  document.addEventListener('contextmenu', e => { if (inGame()) e.preventDefault(); });
  // Two-finger pinch on browsers without gesture events
  document.addEventListener('touchmove', e => {
    if (e.touches && e.touches.length > 1 && e.scale !== undefined && e.scale !== 1 && e.cancelable) e.preventDefault();
  }, { passive: false });

  let autoFsTried = false;
  document.addEventListener('touchend', e => {
    if (autoFsTried) return;
    if (e.touches && e.touches.length > 0) return; // switch only when no finger is holding a control
    if (typeof isMobileOrTabletViewport !== 'function' || !isMobileOrTabletViewport()) return;
    if (window.innerWidth < window.innerHeight) return;
    if (typeof state === 'undefined' || (state !== 'playing' && state !== 'paused')) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) { autoFsTried = true; return; }
    if (window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) { autoFsTried = true; return; }
    const gameEl = document.getElementById('game');
    if (!gameEl || !(gameEl.requestFullscreen || gameEl.webkitRequestFullscreen)) { autoFsTried = true; return; }
    autoFsTried = true;
    if (typeof requestGameFullscreenOrFocus === 'function') requestGameFullscreenOrFocus('auto_first_tap');
  }, { passive: true });
})();
