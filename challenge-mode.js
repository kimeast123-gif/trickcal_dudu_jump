'use strict';
// ============================================================================
// Challenge Mode Controller & Unified Modal Button Router (<추억의 인내의 숲> v1.0)
// - Difficulty 1 (`challengeDifficultyId === 'd1'`): 3 stages (`CH-S1`, `CH-S2`, `CH-S3`),
//   storage key `dudu_challenge_records_test22_stage3hotfix_v1` (100% preserved).
// - Difficulty 2 (`challengeDifficultyId === 'd2'`): 2 playable stages:
//   * Stage 1 (`CH-D2-S1`: `2-1 · 정밀 3층 등반`, storage key `dudu_challenge_d2_stage1_v1`, 100% preserved)
//   * Stage 2 (`CH-D2-S2`: `2-2 · 가시 덩굴과 순찰 교량`, storage key `dudu_challenge_d2_stage2_v1`)
//   * Stage 3 (`2-3`): explicitly locked as `'2-3 · 준비 중 🔒'` (zero dummy stage created).
// - Supports `2-1 클리어 -> 결과 모달 -> 2-2 도전하기 -> 2-2 로딩 -> 2-2 클리어 (2-3 제작 예정)`
//   as well as direct stage selection for `2-1` and `2-2`.
// ============================================================================

const CHALLENGE_STORAGE_KEY_V18 = 'dudu_challenge_records_test22_stage3hotfix_v1';
const CHALLENGE_LEGACY_KEY_V21 = 'dudu_challenge_records_test21_v1';
const CHALLENGE_LEGACY_KEY_V17 = 'dudu_test17_challenge_records_v1';
const CHALLENGE_D2_STORAGE_KEY_V1 = 'dudu_challenge_d2_stage1_v1';
const CHALLENGE_D2_S2_STORAGE_KEY_V1 = 'dudu_challenge_d2_stage2_v1';
const CHALLENGE_D2_S3_STORAGE_KEY_V1 = 'dudu_challenge_d2_stage3_v1';

let challengeDifficultyId = 'd1'; // 'd1' (1-1~1-3) | 'd2' (2-1, 2-2; 2-3 coming soon)

const challengeState = {
  active: false,
  difficultyId: 'd1',
  gameVersion: 'v1.0',
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
    gameVersion: 'TEST22-S3H1',
    bestStageTimes: [null, null, null],
    bestTotalTime: null,
    clears: 0,
    lastSeed: 101
  },
  d2Records: {
    gameVersion: 'v1.0',
    bestStage1Time: null,
    bestStage1Deaths: null,
    bestStage1Hits: null,
    clears: 0,
    lastSeed: 101
  },
  d2Stage2Records: {
    gameVersion: 'v1.0',
    bestStage2Time: null,
    bestStage2Deaths: null,
    bestStage2Hits: null,
    bestTwoStageTotalTime: null,
    clears: 0,
    lastSeed: 101
  },
  d2Stage3Records: {
    gameVersion: 'v1.0',
    bestStage3Time: null,
    bestStage3Deaths: null,
    bestStage3Hits: null,
    bestThreeStageTotalTime: null,
    clears: 0,
    lastSeed: 101
  },
  legacyV17Records: null
};
window.challengeState = challengeState;

function getActiveChallengeStages() {
  if (challengeDifficultyId === 'd2' && typeof challengeD2Levels !== 'undefined' && challengeD2Levels.length > 0) {
    return challengeD2Levels;
  }
  return typeof challengeLevels !== 'undefined' ? challengeLevels : [];
}

function getActiveChallengeStage() {
  const list = getActiveChallengeStages();
  return list[challengeStageIndex] || list[0] || null;
}

window.getActiveChallengeStages = getActiveChallengeStages;
window.getActiveChallengeStage = getActiveChallengeStage;
Object.defineProperty(window, 'challengeDifficultyId', {
  get() { return challengeDifficultyId; },
  set(v) {
    challengeDifficultyId = (v === 'd2') ? 'd2' : 'd1';
    challengeState.difficultyId = challengeDifficultyId;
  }
});

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
  loadChallengeD2Records();
  loadChallengeD2S2Records();
  loadChallengeD2S3Records();
}

function saveChallengeRecords() {
  try {
    challengeState.records.gameVersion = 'TEST22-S3H1';
    challengeState.records.lastSeed = challengeState.runSeed;
    localStorage.setItem(CHALLENGE_STORAGE_KEY_V18, JSON.stringify(challengeState.records));
  } catch {}
}

function loadChallengeD2Records() {
  try {
    const raw = localStorage.getItem(CHALLENGE_D2_STORAGE_KEY_V1);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        challengeState.d2Records.bestStage1Time = typeof parsed.bestStage1Time === 'number' ? parsed.bestStage1Time : null;
        challengeState.d2Records.bestStage1Deaths = typeof parsed.bestStage1Deaths === 'number' ? parsed.bestStage1Deaths : null;
        challengeState.d2Records.bestStage1Hits = typeof parsed.bestStage1Hits === 'number' ? parsed.bestStage1Hits : null;
        challengeState.d2Records.clears = typeof parsed.clears === 'number' ? parsed.clears : 0;
      }
    }
  } catch {}
}

function saveChallengeD2Records() {
  try {
    challengeState.d2Records.gameVersion = 'v1.0';
    challengeState.d2Records.lastSeed = challengeState.runSeed;
    localStorage.setItem(CHALLENGE_D2_STORAGE_KEY_V1, JSON.stringify(challengeState.d2Records));
  } catch {}
}

function loadChallengeD2S2Records() {
  try {
    const raw = localStorage.getItem(CHALLENGE_D2_S2_STORAGE_KEY_V1);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        challengeState.d2Stage2Records.bestStage2Time = typeof parsed.bestStage2Time === 'number' ? parsed.bestStage2Time : null;
        challengeState.d2Stage2Records.bestStage2Deaths = typeof parsed.bestStage2Deaths === 'number' ? parsed.bestStage2Deaths : null;
        challengeState.d2Stage2Records.bestStage2Hits = typeof parsed.bestStage2Hits === 'number' ? parsed.bestStage2Hits : null;
        challengeState.d2Stage2Records.bestTwoStageTotalTime = typeof parsed.bestTwoStageTotalTime === 'number' ? parsed.bestTwoStageTotalTime : null;
        challengeState.d2Stage2Records.clears = typeof parsed.clears === 'number' ? parsed.clears : 0;
      }
    }
  } catch {}
}

function saveChallengeD2S2Records() {
  try {
    challengeState.d2Stage2Records.gameVersion = 'v1.0';
    challengeState.d2Stage2Records.lastSeed = challengeState.runSeed;
    localStorage.setItem(CHALLENGE_D2_S2_STORAGE_KEY_V1, JSON.stringify(challengeState.d2Stage2Records));
  } catch {}
}

function loadChallengeD2S3Records() {
  try {
    const raw = localStorage.getItem(CHALLENGE_D2_S3_STORAGE_KEY_V1);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        challengeState.d2Stage3Records.bestStage3Time = typeof parsed.bestStage3Time === 'number' ? parsed.bestStage3Time : null;
        challengeState.d2Stage3Records.bestStage3Deaths = typeof parsed.bestStage3Deaths === 'number' ? parsed.bestStage3Deaths : null;
        challengeState.d2Stage3Records.bestStage3Hits = typeof parsed.bestStage3Hits === 'number' ? parsed.bestStage3Hits : null;
        challengeState.d2Stage3Records.bestThreeStageTotalTime = typeof parsed.bestThreeStageTotalTime === 'number' ? parsed.bestThreeStageTotalTime : null;
        challengeState.d2Stage3Records.clears = typeof parsed.clears === 'number' ? parsed.clears : 0;
      }
    }
  } catch {}
}

function saveChallengeD2S3Records() {
  try {
    challengeState.d2Stage3Records.gameVersion = 'v1.0';
    challengeState.d2Stage3Records.lastSeed = challengeState.runSeed;
    localStorage.setItem(CHALLENGE_D2_S3_STORAGE_KEY_V1, JSON.stringify(challengeState.d2Stage3Records));
  } catch {}
}

window.loadChallengeD2Records = loadChallengeD2Records;
window.saveChallengeD2Records = saveChallengeD2Records;
window.loadChallengeD2S2Records = loadChallengeD2S2Records;
window.saveChallengeD2S2Records = saveChallengeD2S2Records;
window.loadChallengeD2S3Records = loadChallengeD2S3Records;
window.saveChallengeD2S3Records = saveChallengeD2S3Records;

function formatChallengeStopwatch(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const mins = Math.floor(s / 60);
  const rem = (s % 60).toFixed(1).padStart(4, '0');
  return `${String(mins).padStart(2, '0')}:${rem}`;
}

function syncChallengeNavButtons() {
  const chS1 = $('chStage1Btn');
  const chS2 = $('chStage2Btn');
  const chS3 = $('chStage3Btn');
  const d1Btn = $('chDiff1Btn');
  const d2Btn = $('chDiff2Btn');

  if (d1Btn) d1Btn.classList.toggle('active', challengeDifficultyId === 'd1');
  if (d2Btn) d2Btn.classList.toggle('active', challengeDifficultyId === 'd2');

  if (challengeDifficultyId === 'd2') {
    if (chS1) {
      chS1.textContent = '2-1 · 정밀 3층 등반';
      chS1.disabled = false;
      chS1.removeAttribute('aria-disabled');
      chS1.classList.toggle('activeStage', challengeStageIndex === 0);
    }
    if (chS2) {
      chS2.textContent = '2-2 · 가시 덩굴과 순찰 교량';
      chS2.disabled = false;
      chS2.removeAttribute('aria-disabled');
      chS2.classList.toggle('activeStage', challengeStageIndex === 1);
    }
    if (chS3) {
      chS3.textContent = '2-3 · 바람총 회랑과 쌍둥이 승강대';
      chS3.disabled = false;
      chS3.removeAttribute('aria-disabled');
      chS3.classList.toggle('activeStage', challengeStageIndex === 2);
    }
  } else {
    if (chS1) {
      chS1.textContent = 'Stage 1 · 가지와 가지 사이';
      chS1.disabled = false;
      chS1.removeAttribute('aria-disabled');
      chS1.classList.toggle('activeStage', challengeStageIndex === 0);
    }
    if (chS2) {
      chS2.textContent = 'Stage 2 · 진압반의 징검다리';
      chS2.disabled = false;
      chS2.removeAttribute('aria-disabled');
      chS2.classList.toggle('activeStage', challengeStageIndex === 1);
    }
    if (chS3) {
      chS3.textContent = 'Stage 3 · 마요의 바람총 숲';
      chS3.disabled = false;
      chS3.removeAttribute('aria-disabled');
      chS3.classList.toggle('activeStage', challengeStageIndex === 2);
    }
  }
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

  syncChallengeNavButtons();

  if (!isCh) return;
  const stages = getActiveChallengeStages();
  const st = getActiveChallengeStage();
  if (!st) return;

  if (challengeDifficultyId === 'd2') {
    const code = st.stageCode || `2-${challengeStageIndex + 1}`;
    $('routeLabel').textContent = `난이도 2 · ${challengeStageIndex + 1} / 3 · ${code}`;
  } else {
    $('routeLabel').textContent = `챌린지 · ${challengeStageIndex + 1} / ${stages.length}`;
  }
  $('zoneTitle').textContent = st.name;

  if ($('chTimer')) $('chTimer').textContent = formatChallengeStopwatch(challengeState.stageElapsed);
  if ($('chTotalTimer')) {
    $('chTotalTimer').textContent = `누적 ${formatChallengeStopwatch(challengeState.totalElapsed)}`;
  }
  const curDeaths = challengeState.stageDeaths[challengeStageIndex] || 0;
  const curHits = challengeState.stageHits[challengeStageIndex] || 0;
  if ($('chRetries')) $('chRetries').textContent = `재시도 ${curDeaths} · 피격 ${curHits}`;
}

function resetChallengePlayer(fullStageReset = false) {
  const st = getActiveChallengeStage();
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

function loadChallengeStage(stageIdx, { resetTotal = false, customSeed = null, difficultyId = null } = {}) {
  if (state === 'loading') return;
  if (difficultyId === 'd1' || difficultyId === 'd2') {
    challengeDifficultyId = difficultyId;
    challengeState.difficultyId = difficultyId;
  }
  closeChallengeSelectModal();
  leaveEvent();
  clearRegionTransitionLayer();

  gameMode = 'challenge';
  challengeState.active = true;
  if (typeof ensureWorldRegionAssets === 'function') {
    Promise.all([
      ensureWorldRegionAssets('forest'),
      ensureWorldRegionAssets('monatium_a'),
      ensureWorldRegionAssets('erpien_a'),
      ensureWorldRegionAssets('erpien_b')
    ]).then(() => {
      if (typeof draw === 'function' && gameMode === 'challenge') draw();
    }).catch(() => {});
  }
  if (customSeed !== null) challengeState.runSeed = customSeed;
  const stages = getActiveChallengeStages();
  if (resetTotal) {
    challengeState.totalElapsed = 0;
    challengeState.stageTimes = stages.map(() => 0);
    challengeState.deaths = 0;
    challengeState.stageDeaths = stages.map(() => 0);
    challengeState.hits = 0;
    challengeState.stageHits = stages.map(() => 0);
    challengeState.attemptIndex = 0;
  } else {
    while (challengeState.stageTimes.length < stages.length) challengeState.stageTimes.push(0);
    while (challengeState.stageDeaths.length < stages.length) challengeState.stageDeaths.push(0);
    while (challengeState.stageHits.length < stages.length) challengeState.stageHits.push(0);
    challengeState.stageTimes[stageIdx] = 0;
    challengeState.stageDeaths[stageIdx] = 0;
    challengeState.stageHits[stageIdx] = 0;
  }

  challengeStageIndex = Math.max(0, Math.min(stages.length - 1, stageIdx));
  const st = stages[challengeStageIndex];
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

function startChallengeMode(stageIdx = 0, customSeed = null, difficultyId = 'd1') {
  challengeDifficultyId = (difficultyId === 'd2') ? 'd2' : 'd1';
  challengeState.difficultyId = challengeDifficultyId;
  loadChallengeRecords();
  loadChallengeStage(stageIdx, { resetTotal: true, customSeed, difficultyId: challengeDifficultyId });
}

function startChallengeDifficulty2(stageIdx = 0, customSeed = null) {
  const d2Stages = (typeof challengeD2Levels !== 'undefined') ? challengeD2Levels : [];
  if (stageIdx >= d2Stages.length) {
    notify('🔒 챌린지 2-3 맵은 현재 제작 예정(준비 중)입니다!');
    return;
  }
  startChallengeMode(stageIdx, customSeed, 'd2');
}

window.startChallengeMode = startChallengeMode;
window.startChallengeDifficulty2 = startChallengeDifficulty2;

function retryChallengeStage() {
  if (gameMode !== 'challenge') return;
  challengeState.deaths++;
  challengeState.stageDeaths[challengeStageIndex] = (challengeState.stageDeaths[challengeStageIndex] || 0) + 1;
  resetChallengePlayer(false);
  state = 'playing';
  $('overlay').hidden = true;
  last = performance.now();
  acc = 0;
  canvas.focus();
}

function returnToStoryMenu() {
  closeChallengeSelectModal();
  leaveEvent();
  clearRegionTransitionLayer();
  gameMode = 'story';
  challengeState.active = false;
  challengeGuards = [];
  challengeBarriers = [];
  challengeTurrets = [];
  challengeDarts = [];
  if (typeof challengeSpikes !== 'undefined') challengeSpikes = [];
  resetJourney();
  state = 'ready';
  updateChallengeHud();
  updateHud();
  updateRegionHud();
  modal(
    '해가 지기 전에 집으로',
    '준비됐나요, 두두?',
    '25분 동안 두두와 산책하고 집으로 돌아가요.<br>일반 경로의 왕사탕을 따라가면 누구나 완주할 수 있고, 황금 크레파스 12개는 숙련자 도전이에요!<br>← → 이동 · SPACE 점프 · ↓+SPACE 발판 내려가기 · ↓ 아래보기 · L SHIFT 대시',
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
      const stages = getActiveChallengeStages();
      const nextIdx = Math.min(stages.length - 1, challengeStageIndex + 1);
      loadChallengeStage(nextIdx, { resetTotal: false, difficultyId: challengeDifficultyId });
      return;
    }
    if (challengeDifficultyId === 'd2') {
      // On 2-2 challengeComplete modal, primary button restarts current stage (2-2) directly
      loadChallengeStage(challengeStageIndex, { resetTotal: challengeStageIndex === 0, difficultyId: 'd2' });
      return;
    }
    startChallengeMode(0, null, challengeDifficultyId);
    return;
  }
  if (state === 'paused') {
    normalStart();
    return;
  }
  startStoryMode();
}

function dispatchRestartAction() {
  if (state === 'loading') return;
  if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
    startChallengeMode(0, null, challengeDifficultyId);
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
  const stages = getActiveChallengeStages();
  const st = getActiveChallengeStage();
  if (!st) return;

  if (checkpoint > challengeState.checkpoint) {
    challengeState.checkpoint = checkpoint;
  }

  const g = st.goal;
  if (g && p.x + 18 >= g.x && p.x - 18 <= g.x + g.w && Math.abs(p.y - g.y) < 14 && p.ground) {
    p.guardStun = 0; p.guardKnock = 0; p.knock = 0; p.invulnerable = 0;
    const stTime = Number(challengeState.stageElapsed.toFixed(2));
    challengeState.stageTimes[challengeStageIndex] = stTime;

    // Difficulty 2 (`2-1` -> `2-2` -> `'2-3 제작 예정'` flow — §4)
    if (challengeDifficultyId === 'd2') {
      const curDeaths = challengeState.stageDeaths[challengeStageIndex] || 0;
      const curHits = challengeState.stageHits[challengeStageIndex] || 0;

      if (challengeStageIndex === 0) {
        // 2-1 Cleared: preserve 2-1 storage key `dudu_challenge_d2_stage1_v1` and offer transition to 2-2!
        const prevBest = challengeState.d2Records.bestStage1Time;
        if (prevBest === null || stTime < prevBest) {
          challengeState.d2Records.bestStage1Time = stTime;
          challengeState.d2Records.bestStage1Deaths = curDeaths;
          challengeState.d2Records.bestStage1Hits = curHits;
        }
        challengeState.d2Records.clears = (challengeState.d2Records.clears || 0) + 1;
        saveChallengeD2Records();

        if (stages.length > 1) {
          state = 'challengeStageClear';
          const nextSt = stages[1];
          modal(
            '추억의 인내의 숲 · 난이도 2-1 돌파!',
            '2-1 · 정밀 3층 등반 클리어!',
            `2-1 클리어 기록: <b>${formatChallengeStopwatch(stTime)}</b> · 2-1 최고 기록: <b>${formatChallengeStopwatch(challengeState.d2Records.bestStage1Time)}</b><br>` +
            `구간 재시도: <b>${curDeaths}회</b> · 피격: <b>${curHits}회</b><br>` +
            `다음 단계: <b>${nextSt.name}</b> (${nextSt.subtitle})`,
            `다음 단계 (${nextSt.name}) 도전하기 →`
          );
          $('restart').textContent = '2-1 처음부터 다시 도전';
          $('restart').hidden = false;
          updateChallengeHud();
          return;
        }
      }

      if (challengeStageIndex === 1) {
        // 2-2 Cleared: preserve 2-2 storage key `dudu_challenge_d2_stage2_v1` and transition to 2-3!
        const prevBest2 = challengeState.d2Stage2Records.bestStage2Time;
        if (prevBest2 === null || stTime < prevBest2) {
          challengeState.d2Stage2Records.bestStage2Time = stTime;
          challengeState.d2Stage2Records.bestStage2Deaths = curDeaths;
          challengeState.d2Stage2Records.bestStage2Hits = curHits;
        }
        const totTwoTime = Number(challengeState.totalElapsed.toFixed(2));
        if (challengeState.stageTimes[0] > 0) {
          const prevTwoBest = challengeState.d2Stage2Records.bestTwoStageTotalTime;
          if (prevTwoBest === null || totTwoTime < prevTwoBest) {
            challengeState.d2Stage2Records.bestTwoStageTotalTime = totTwoTime;
          }
        }
        challengeState.d2Stage2Records.clears = (challengeState.d2Stage2Records.clears || 0) + 1;
        saveChallengeD2S2Records();

        if (stages.length > 2) {
          state = 'challengeStageClear';
          const nextSt = stages[2];
          modal(
            '추억의 인내의 숲 · 난이도 2-2 돌파!',
            '2-2 · 가시 덩굴과 순찰 교량 클리어!',
            `2-2 클리어 기록: <b>${formatChallengeStopwatch(stTime)}</b> · 2-2 최고 기록: <b>${formatChallengeStopwatch(challengeState.d2Stage2Records.bestStage2Time)}</b><br>` +
            `2-2 구간 재시도: <b>${curDeaths}회</b> · 피격: <b>${curHits}회</b><br>` +
            `다음 최종 단계: <b>${nextSt.name}</b> (${nextSt.subtitle})`,
            `다음 단계 (${nextSt.name}) 도전하기 →`
          );
          $('restart').textContent = '2-1부터 연속 도전하기';
          $('restart').hidden = false;
          updateChallengeHud();
          return;
        }
      }

      // 2-3 Cleared (Final Stage of Difficulty 2 — Complete!)
      state = 'challengeComplete';
      const prevBest3 = challengeState.d2Stage3Records.bestStage3Time;
      if (prevBest3 === null || stTime < prevBest3) {
        challengeState.d2Stage3Records.bestStage3Time = stTime;
        challengeState.d2Stage3Records.bestStage3Deaths = curDeaths;
        challengeState.d2Stage3Records.bestStage3Hits = curHits;
      }
      const totD2Time = Number(challengeState.totalElapsed.toFixed(2));
      if (challengeState.stageTimes[0] > 0 && challengeState.stageTimes[1] > 0) {
        const prevThreeBest = challengeState.d2Stage3Records.bestThreeStageTotalTime;
        if (prevThreeBest === null || totD2Time < prevThreeBest) {
          challengeState.d2Stage3Records.bestThreeStageTotalTime = totD2Time;
        }
      }
      challengeState.d2Stage3Records.clears = (challengeState.d2Stage3Records.clears || 0) + 1;
      saveChallengeD2S3Records();

      const fullRunLine = (challengeState.stageTimes[0] > 0 && challengeState.stageTimes[1] > 0)
        ? `<br>난이도 2 전 구간(2-1~2-3) 합산: <b>${formatChallengeStopwatch(totD2Time)}</b> (2-1: ${formatChallengeStopwatch(challengeState.stageTimes[0])} · 2-2: ${formatChallengeStopwatch(challengeState.stageTimes[1])} · 2-3: ${formatChallengeStopwatch(stTime)})`
        : '';
      modal(
        '추억의 인내의 숲 · 난이도 2 전 구간 완주 달성!',
        '2-3 · 바람총 회랑과 쌍둥이 승강대 클리어!',
        `2-3 클리어 기록: <b>${formatChallengeStopwatch(stTime)}</b> · 2-3 최고 기록: <b>${formatChallengeStopwatch(challengeState.d2Stage3Records.bestStage3Time)}</b>${fullRunLine}<br>` +
        `2-3 구간 재시도: <b>${curDeaths}회</b> · 피격: <b>${curHits}회</b> (난이도 1 및 스토리 기록과 완전 분리 저장됨)`,
        '↻ 2-3 다시 도전하기 →'
      );
      $('restart').textContent = '2-1부터 전체 연속 도전하기';
      $('restart').hidden = false;
      updateChallengeHud();
      return;
    }

    // Difficulty 1 (`1-1` -> `1-2` -> `1-3` flow preserved 100%)
    const prevBest = challengeState.records.bestStageTimes[challengeStageIndex];
    if (prevBest === null || stTime < prevBest) {
      challengeState.records.bestStageTimes[challengeStageIndex] = stTime;
    }

    if (challengeStageIndex < stages.length - 1) {
      state = 'challengeStageClear';
      const nextIdx = challengeStageIndex + 1;
      const nextSt = stages[nextIdx];
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
        ? `<br><small>구버전(TEST17) 보존 기록: ${formatChallengeStopwatch(challengeState.legacyV17Records.bestTotalTime)}</small>`
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

// ============================================================================
// Challenge Difficulty Selection Modal (`#challengeSelectModal`) & Nav Controls
// ============================================================================
function ensureChallengeSelectModalDOM() {
  const vp = $('gameViewport');
  if (!vp || $('challengeSelectModal')) return;
  const el = document.createElement('div');
  el.id = 'challengeSelectModal';
  el.className = 'challengeSelectModal';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'chSelectModalTitle');
  el.innerHTML = `
    <div class="chSelectCard">
      <div class="chSelectHeader">
        <div>
          <span class="chSelectEyebrow">CHALLENGE MODE · 추억의 인내의 숲</span>
          <h3 id="chSelectModalTitle">🌲 챌린지 난이도 선택</h3>
        </div>
        <button type="button" class="chSelectCloseBtn" id="closeChallengeSelectBtn" aria-label="닫기">✕</button>
      </div>
      <div class="chSelectGrid">
        <div class="chDiffBox chDiffBoxD1">
          <div class="chDiffBadge">난이도 1 · 기본 3단계 코스</div>
          <h4>추억의 인내의 숲 (1-1 ~ 1-3)</h4>
          <p>가지와 가지 사이(1-1) → 진압반의 징검다리(1-2) → 마요의 바람총 숲(1-3) 연속 완주 코스</p>
          <div class="chDiffRecord" id="chD1RecordSummary">최고 완주 기록: 기록 없음</div>
          <div class="chStageBtnGroup">
            <button type="button" class="chLaunchPrimaryBtn" id="chModalStartD1Btn">▶ 난이도 1 시작 (1-1부터 도전)</button>
            <div class="chStageQuickRow">
              <button type="button" class="chStageMiniBtn" id="chModalD1S1Btn">1-1 시작</button>
              <button type="button" class="chStageMiniBtn" id="chModalD1S2Btn">1-2 연습</button>
              <button type="button" class="chStageMiniBtn" id="chModalD1S3Btn">1-3 연습</button>
            </div>
          </div>
        </div>
        <div class="chDiffBox chDiffBoxD2">
          <div class="chDiffBadge chDiffBadgeHard">난이도 2 · 심화 3단계 완결 코스 (2-1 ~ 2-3)</div>
          <h4>정밀 3층 등반 (2-1) · 가시 덩굴 교량 (2-2) · 바람총 회랑 (2-3)</h4>
          <p>2-1 정밀 등반 → 2-2 가시 덩굴과 순찰 교량 → 2-3 바람총 회랑과 쌍둥이 승강대 (4단 수평 왕복·9마요·쌍둥이 수직 승강대)</p>
          <div class="chDiffRecord" id="chD2RecordSummary">2-1 / 2-2 / 2-3 최고 기록: 기록 없음</div>
          <div class="chStageBtnGroup">
            <button type="button" class="chLaunchPrimaryBtn chLaunchD2Btn" id="chModalStartD2Btn">🔥 난이도 2-3 바로 시작 (바람총 회랑과 쌍둥이 승강대)</button>
            <div class="chStageQuickRow">
              <button type="button" class="chStageMiniBtn" id="chModalD2S1Btn">2-1 플레이</button>
              <button type="button" class="chStageMiniBtn" id="chModalD2S2Btn">2-2 플레이</button>
              <button type="button" class="chStageMiniBtn active" id="chModalD2S3Btn">2-3 플레이 (NEW)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  vp.appendChild(el);

  $('closeChallengeSelectBtn').onclick = () => closeChallengeSelectModal();
  el.addEventListener('click', (e) => {
    if (e.target === el) closeChallengeSelectModal();
  });
  $('chModalStartD1Btn').onclick = () => startChallengeMode(0, null, 'd1');
  $('chModalD1S1Btn').onclick = () => startChallengeMode(0, null, 'd1');
  $('chModalD1S2Btn').onclick = () => {
    challengeDifficultyId = 'd1';
    loadChallengeRecords();
    loadChallengeStage(1, { resetTotal: false, difficultyId: 'd1' });
  };
  $('chModalD1S3Btn').onclick = () => {
    challengeDifficultyId = 'd1';
    loadChallengeRecords();
    loadChallengeStage(2, { resetTotal: false, difficultyId: 'd1' });
  };
  $('chModalStartD2Btn').onclick = () => startChallengeMode(2, null, 'd2');
  $('chModalD2S1Btn').onclick = () => startChallengeMode(0, null, 'd2');
  $('chModalD2S2Btn').onclick = () => startChallengeMode(1, null, 'd2');
  if ($('chModalD2S3Btn')) $('chModalD2S3Btn').onclick = () => startChallengeMode(2, null, 'd2');
}

function openChallengeSelectModal() {
  ensureChallengeSelectModalDOM();
  loadChallengeRecords();
  const modalEl = $('challengeSelectModal');
  if (!modalEl) {
    startChallengeMode(0, null, 'd1');
    return;
  }
  const d1Rec = $('chD1RecordSummary');
  if (d1Rec) {
    const bt = challengeState.records.bestTotalTime;
    const cl = challengeState.records.clears || 0;
    d1Rec.textContent = bt !== null
      ? `3단계 합산 최고: ${formatChallengeStopwatch(bt)} (${cl}회 완주)`
      : '3단계 합산 최고: 기록 없음';
  }
  const d2Rec = $('chD2RecordSummary');
  if (d2Rec) {
    const bt1 = challengeState.d2Records.bestStage1Time;
    const bt2 = challengeState.d2Stage2Records.bestStage2Time;
    const bt3 = challengeState.d2Stage3Records.bestStage3Time;
    const s1Txt = bt1 !== null ? formatChallengeStopwatch(bt1) : '없음';
    const s2Txt = bt2 !== null ? formatChallengeStopwatch(bt2) : '없음';
    const s3Txt = bt3 !== null ? formatChallengeStopwatch(bt3) : '없음';
    d2Rec.textContent = `2-1: ${s1Txt} · 2-2: ${s2Txt} · 2-3: ${s3Txt}`;
  }
  modalEl.hidden = false;
}

function closeChallengeSelectModal() {
  const modalEl = $('challengeSelectModal');
  if (modalEl) modalEl.hidden = true;
}

window.openChallengeSelectModal = openChallengeSelectModal;
window.closeChallengeSelectModal = closeChallengeSelectModal;

// Single initialization binding for all mode & modal buttons
(function wireChallengeBindings() {
  loadChallengeRecords();
  ensureChallengeSelectModalDOM();

  const chNav = $('challengeNav');
  if (chNav && !$('chDiff1Btn')) {
    const diffWrap = document.createElement('span');
    diffWrap.className = 'chNavDiffSwitch';
    diffWrap.innerHTML = `
      <button type="button" id="chDiff1Btn" class="chDiffSwitchBtn active">난이도 1 (1-1~1-3)</button>
      <button type="button" id="chDiff2Btn" class="chDiffSwitchBtn">난이도 2 (2-1~2-3)</button>
    `;
    const firstBtn = $('chStage1Btn');
    if (firstBtn) chNav.insertBefore(diffWrap, firstBtn);
    $('chDiff1Btn').onclick = () => startChallengeMode(0, null, 'd1');
    $('chDiff2Btn').onclick = () => startChallengeMode(1, null, 'd2');
  }

  $('start').onclick = dispatchPrimaryAction;
  $('restart').onclick = dispatchRestartAction;
  const chBtn = $('startChallengeBtn');
  if (chBtn) chBtn.onclick = () => openChallengeSelectModal();
  const modalBack = $('modalBackStoryBtn');
  if (modalBack) modalBack.onclick = dispatchReturnToMenu;
  const chS1 = $('chStage1Btn'), chS2 = $('chStage2Btn'), chS3 = $('chStage3Btn'), chBack = $('chBackStoryBtn');
  if (chS1) chS1.onclick = () => startChallengeMode(0, null, challengeDifficultyId);
  if (chS2) {
    chS2.onclick = () => {
      if (challengeDifficultyId === 'd2') {
        loadChallengeStage(1, { resetTotal: false, difficultyId: 'd2' });
        return;
      }
      loadChallengeStage(1, { resetTotal: false, difficultyId: 'd1' });
    };
  }
  if (chS3) {
    chS3.onclick = () => {
      if (challengeDifficultyId === 'd2') {
        loadChallengeStage(2, { resetTotal: false, difficultyId: 'd2' });
        return;
      }
      loadChallengeStage(2, { resetTotal: false, difficultyId: 'd1' });
    };
  }
  if (chBack) chBack.onclick = dispatchReturnToMenu;
  syncChallengeNavButtons();
})();
