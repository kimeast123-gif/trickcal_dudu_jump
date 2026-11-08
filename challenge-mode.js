'use strict';
// TEST18 Challenge Mode Controller & Unified Modal Button Router (<추억의 인내의 숲>):
// - Section 1-3 & 7-2 (P0): Single unified button routers (`dispatchPrimaryAction`, `dispatchRestartAction`, `dispatchReturnToMenu`) bound once to `#start`, `#restart`, and `#chBackStoryBtn` / `#modalBackStoryBtn`.
// - Never invokes `beginEvent()` or shows `opening.png` / `popup.png` during any Challenge Mode completion, retry, pause, or restart!
// - Section 7-3: Uses versioned storage key `dudu_challenge_records_test18_v1` while reading/preserving legacy `dudu_test17_challenge_records_v1` untouched.

const CHALLENGE_STORAGE_KEY_V18 = 'dudu_challenge_records_test21_v1';
const CHALLENGE_LEGACY_KEY_V17 = 'dudu_test17_challenge_records_v1';

const challengeState = {
  active: false,
  gameVersion: 'TEST21',
  runSeed: 101,
  attemptIndex: 0,
  checkpoint: 0,
  stageElapsed: 0,
  totalElapsed: 0,
  stageTimes: [0, 0, 0],
  deaths: 0,
  stageDeaths: [0, 0, 0],
  hits: 0,
  stageHits: [0, 0, 0],
  unlockedStage: 3,
  records: {
    gameVersion: 'TEST21',
    bestStageTimes: [null, null, null],
    bestTotalTime: null,
    clears: 0,
    lastSeed: 101
  },
  legacyV17Records: null
};
window.challengeState = challengeState;

function loadChallengeRecords() {
  try {
    const legacyRaw = localStorage.getItem(CHALLENGE_LEGACY_KEY_V17);
    if (legacyRaw) {
      challengeState.legacyV17Records = JSON.parse(legacyRaw);
    }
    const raw = localStorage.getItem(CHALLENGE_STORAGE_KEY_V18);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        challengeState.records.bestStageTimes = Array.isArray(parsed.bestStageTimes) ? parsed.bestStageTimes : [null, null, null];
        challengeState.records.bestTotalTime = typeof parsed.bestTotalTime === 'number' ? parsed.bestTotalTime : null;
        challengeState.records.clears = typeof parsed.clears === 'number' ? parsed.clears : 0;
      }
    }
  } catch {}
}

function saveChallengeRecords() {
  try {
    challengeState.records.gameVersion = 'TEST21';
    challengeState.records.lastSeed = challengeState.runSeed;
    localStorage.setItem(CHALLENGE_STORAGE_KEY_V18, JSON.stringify(challengeState.records));
  } catch {}
}

function formatChallengeStopwatch(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const mins = Math.floor(s / 60);
  const rem = (s % 60).toFixed(1).padStart(4, '0');
  return `${String(mins).padStart(2, '0')}:${rem}`;
}

function updateChallengeHud() {
  const isCh = (typeof gameMode !== 'undefined' && gameMode === 'challenge');
  const chHud = $('challengeHud');
  const chNav = $('challengeNav');
  const evClock = $('eventClock');
  const spPill = $('specialPill');
  const coinPill = document.querySelector('.pill.coins');
  const prNav = document.querySelector('.practiceNav');
  const encNav = document.querySelector('.encounterNav');
  const modalBackBtn = $('modalBackStoryBtn');
  const startChBtn = $('startChallengeBtn');

  if (chHud) chHud.hidden = !isCh;
  if (chNav) chNav.hidden = !isCh;
  if (evClock) evClock.hidden = isCh;
  if (spPill) spPill.hidden = isCh;
  if (coinPill) coinPill.hidden = isCh;
  if (prNav) prNav.hidden = isCh;
  if (encNav) encNav.hidden = isCh;
  if (modalBackBtn) modalBackBtn.hidden = !isCh;
  if (startChBtn) startChBtn.hidden = isCh;

  if (!isCh) return;
  const st = challengeLevels[challengeStageIndex];
  if (!st) return;

  $('routeLabel').textContent = `챌린지 · ${challengeStageIndex + 1} / ${challengeLevels.length}`;
  $('zoneTitle').textContent = st.name;

  if ($('chTimer')) $('chTimer').textContent = formatChallengeStopwatch(challengeState.stageElapsed);
  if ($('chTotalTimer')) $('chTotalTimer').textContent = `누적 ${formatChallengeStopwatch(challengeState.totalElapsed)}`;
  if ($('chRetries')) $('chRetries').textContent = `재시도 ${challengeState.stageDeaths[challengeStageIndex]} · 피격 ${challengeState.stageHits[challengeStageIndex]}`;
}

function resetChallengePlayer(fullStageReset = false) {
  const st = challengeLevels[challengeStageIndex];
  if (!st) return;
  if (fullStageReset) {
    challengeState.checkpoint = 0;
    challengeState.stageElapsed = 0;
  } else {
    challengeState.attemptIndex++;
  }
  checkpoint = challengeState.checkpoint;
  resetPlatforms();
  const dest = st.sections[challengeState.checkpoint] || st.sections[0] || { x: 175, y: 580 };
  Object.assign(p, {
    x: dest.x, y: dest.y, prevX: dest.x, prevY: dest.y, vx: 0, vy: 0, ground: true,
    jumps: 0, coyote: 0.1, buffer: 0, drop: null, hold: 0, jumpHeld: false, jumpCut: false,
    dash: 0, dashCooldown: 0, airDashUsed: false, jumpHeight: 0, jumpOrigin: dest.y,
    knock: 0, knockVX: 0, guardStun: 0, guardKnock: 0, invulnerable: 0.65
  });
  p.on = platforms.find(a => a.collidable !== false && !a.ceiling && !a.wall && dest.x >= a.x && dest.x <= a.x + a.w && Math.abs(a.y - dest.y) < 8) || platforms[0];
  const initCam = computeInitialCameraForPoint(dest.x, dest.y);
  cam = initCam.cam;
  camY = initCam.camY;
  syncRenderCoords();
  spin = 0; particles = []; trail = []; keys.clear(); dashRequest = false; cancelRest();
  visual.reset = true;
  resetChallengeHazards();
  updateChallengeHud();
}

function loadChallengeStage(stageIdx, { resetTotal = false, customSeed = null } = {}) {
  if (state === 'loading') return;
  leaveEvent();
  clearRegionTransitionLayer();

  gameMode = 'challenge';
  challengeState.active = true;
  if (customSeed !== null) challengeState.runSeed = customSeed;
  if (resetTotal) {
    challengeState.totalElapsed = 0;
    challengeState.stageTimes = [0, 0, 0];
    challengeState.deaths = 0;
    challengeState.stageDeaths = [0, 0, 0];
    challengeState.hits = 0;
    challengeState.stageHits = [0, 0, 0];
    challengeState.attemptIndex = 0;
  }

  challengeStageIndex = Math.max(0, Math.min(challengeLevels.length - 1, stageIdx));
  const st = challengeLevels[challengeStageIndex];
  END = st.worldWidth;
  platforms.length = 0;
  for (const a of st.platforms) {
    add(a.x, a.y, a.w, a.h, a.thin, {
      ...a,
      motion: a.motion ? { ...a.motion } : null,
      blink: a.blink ? { ...a.blink } : null,
      visual: a.visual ? { ...a.visual } : makeVisualMeta(st, a.x, a.y, a.w, a.skin, a)
    });
  }
  sections.splice(0, sections.length, ...st.sections.map(s => ({ ...s })));
  flags.splice(0, flags.length, ...sections.slice(1).map(s => ({ x: s.x, y: s.y })));
  coins = [];
  specialCoins = [];

  challengeState.checkpoint = 0;
  checkpoint = 0;
  challengeState.stageElapsed = 0;
  levelClock = 0;
  resetChallengePlayer(true);

  state = 'playing';
  $('overlay').hidden = true;
  last = performance.now();
  acc = 0;
  playTrack(0, true);
  updateChallengeHud();
  canvas.focus();
}

function startChallengeMode(stageIdx = 0, customSeed = null) {
  loadChallengeRecords();
  loadChallengeStage(stageIdx, { resetTotal: stageIdx === 0, customSeed });
}

function retryChallengeStage() {
  if (gameMode !== 'challenge') return;
  resetChallengePlayer(false);
  state = 'playing';
  $('overlay').hidden = true;
  last = performance.now();
  acc = 0;
  canvas.focus();
}

function returnToStoryMenu() {
  leaveEvent();
  clearRegionTransitionLayer();
  gameMode = 'story';
  challengeState.active = false;
  challengeGuards = [];
  challengeBarriers = [];
  challengeTurrets = [];
  challengeDarts = [];
  resetJourney();
  state = 'ready';
  updateChallengeHud();
  updateHud();
  updateRegionHud();
  modal(
    '해가 지기 전에 집으로',
    '준비됐나요, 두두?',
    '15분 동안 두두와 산책하고 집으로 돌아가요.<br>일반 경로의 왕사탕을 따라가면 누구나 완주할 수 있고, 황금 크레파스 9개는 숙련자 도전이에요!<br>← → 이동 · SPACE 점프 · ↓+SPACE 발판 내려가기 · ↓ 아래보기 · L SHIFT 대시',
    '스토리 모드 시작하기 →'
  );
  $('restart').hidden = true;
}

function startStoryMode() {
  gameMode = 'story';
  challengeState.active = false;
  updateChallengeHud();
  beginEvent();
}

// Section 1-3 & 7-2 (P0): Single Unified Button Routers for `#start`, `#restart`, and `#modalBackStoryBtn`!
function dispatchPrimaryAction() {
  if (state === 'loading') return;
  if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
    if (state === 'paused') {
      state = 'playing';
      $('overlay').hidden = true;
      keys.clear();
      last = performance.now();
      acc = 0;
      canvas.focus();
      return;
    }
    if (state === 'challengeStageClear') {
      const nextIdx = Math.min(challengeLevels.length - 1, challengeStageIndex + 1);
      loadChallengeStage(nextIdx, { resetTotal: false });
      return;
    }
    // In challengeComplete or any other challenge modal state: start a fresh Challenge run at Stage 1!
    startChallengeMode(0);
    return;
  }
  // Story Mode routing
  if (state === 'paused') {
    normalStart();
    return;
  }
  startStoryMode();
}

function dispatchRestartAction() {
  if (state === 'loading') return;
  if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
    // NEVER call beginEvent() in Challenge Mode! Always restart Challenge Stage 1 cleanly!
    startChallengeMode(0);
    return;
  }
  startStoryMode();
}

function dispatchReturnToMenu() {
  if (state === 'loading') return;
  returnToStoryMenu();
}

window.dispatchPrimaryAction = dispatchPrimaryAction;
window.dispatchRestartAction = dispatchRestartAction;
window.dispatchReturnToMenu = dispatchReturnToMenu;

function challengeTick(dt) {
  if (gameMode !== 'challenge') return;
  if (state === 'playing' && !scenePaused) {
    challengeState.stageElapsed += dt;
    challengeState.totalElapsed += dt;
    updateChallengeHud();
  }
}

function checkChallengeJourney() {
  if (gameMode !== 'challenge' || state !== 'playing') return;
  const st = challengeLevels[challengeStageIndex];
  if (!st) return;

  if (checkpoint > challengeState.checkpoint) {
    challengeState.checkpoint = checkpoint;
  }

  const g = st.goal;
  if (g && p.x + 18 >= g.x && p.x - 18 <= g.x + g.w && Math.abs(p.y - g.y) < 14 && p.ground) {
    p.guardStun = 0; p.guardKnock = 0; p.knock = 0; p.invulnerable = 0;
    const stTime = Number(challengeState.stageElapsed.toFixed(2));
    challengeState.stageTimes[challengeStageIndex] = stTime;

    const prevBest = challengeState.records.bestStageTimes[challengeStageIndex];
    if (prevBest === null || stTime < prevBest) {
      challengeState.records.bestStageTimes[challengeStageIndex] = stTime;
    }

    if (challengeStageIndex < challengeLevels.length - 1) {
      state = 'challengeStageClear';
      const nextIdx = challengeStageIndex + 1;
      const nextSt = challengeLevels[nextIdx];
      saveChallengeRecords();
      modal(
        `추억의 인내의 숲 · ${challengeStageIndex + 1}단계 돌파!`,
        `${st.name} 클리어!`,
        `단계 기록: <b>${formatChallengeStopwatch(stTime)}</b> · 최고 기록: <b>${formatChallengeStopwatch(challengeState.records.bestStageTimes[challengeStageIndex])}</b><br>구간 재시도: <b>${challengeState.stageDeaths[challengeStageIndex]}회</b> · 피격: <b>${challengeState.stageHits[challengeStageIndex]}회</b><br>다음 단계: <b>${nextSt.name}</b> (${nextSt.subtitle})`,
        `다음 단계 (${nextSt.name}) 도전하기 →`
      );
      $('restart').textContent = '챌린지 1단계부터 처음부터 다시';
      $('restart').hidden = false;
      updateChallengeHud();
    } else {
      state = 'challengeComplete';
      const totTime = Number(challengeState.totalElapsed.toFixed(2));
      if (challengeState.records.bestTotalTime === null || totTime < challengeState.records.bestTotalTime) {
        challengeState.records.bestTotalTime = totTime;
      }
      challengeState.records.clears++;
      saveChallengeRecords();
      const legacyNote = challengeState.legacyV17Records && challengeState.legacyV17Records.bestTotalTime
        ? `<br><small>이전 버전 기록: ${formatChallengeStopwatch(challengeState.legacyV17Records.bestTotalTime)}</small>`
        : '';
      modal(
        '추억의 인내의 숲 · 전 구간 완주 달성!',
        '3단계 인내의 숲을 모두 정복했어요!',
        `총 합계 시간: <b>${formatChallengeStopwatch(totTime)}</b> (최고 기록: <b>${formatChallengeStopwatch(challengeState.records.bestTotalTime)}</b>)${legacyNote}<br>` +
        `1단계: <b>${formatChallengeStopwatch(challengeState.stageTimes[0])}</b> · 2단계: <b>${formatChallengeStopwatch(challengeState.stageTimes[1])}</b> · 3단계: <b>${formatChallengeStopwatch(challengeState.stageTimes[2])}</b><br>` +
        `총 낙사/재시도: <b>${challengeState.deaths}회</b> · 총 피격: <b>${challengeState.hits}회</b> (스토리 기록과 완전 분리됨)`,
        '챌린지 1단계부터 새 도전 →'
      );
      $('restart').textContent = '챌린지 1단계부터 처음부터 다시';
      $('restart').hidden = false;
      updateChallengeHud();
    }
  }
}

// Single initialization binding for all mode & modal buttons
(function wireChallengeBindings() {
  loadChallengeRecords();
  $('start').onclick = dispatchPrimaryAction;
  $('restart').onclick = dispatchRestartAction;
  const chBtn = $('startChallengeBtn');
  if (chBtn) chBtn.onclick = () => startChallengeMode(0);
  const modalBack = $('modalBackStoryBtn');
  if (modalBack) modalBack.onclick = dispatchReturnToMenu;
  const chS1 = $('chStage1Btn'), chS2 = $('chStage2Btn'), chS3 = $('chStage3Btn'), chBack = $('chBackStoryBtn');
  if (chS1) chS1.onclick = () => startChallengeMode(0);
  if (chS2) chS2.onclick = () => loadChallengeStage(1, { resetTotal: false });
  if (chS3) chS3.onclick = () => loadChallengeStage(2, { resetTotal: false });
  if (chBack) chBack.onclick = dispatchReturnToMenu;
})();
