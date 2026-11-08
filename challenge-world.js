'use strict';
// TEST21 Challenge World (<추억의 인내의 숲> — Gate G1 & Gate G2):
// - Stage 1 (<가지와 가지 사이>, 3,400px, y = 580 -> -2,160):
//   * Restores precision platform widths: Tier 1 (64~82px), Tier 2 (46~68px), Tier 3 (38~54px) with distinct grass-capped visual rendering (never tiny specks!).
//   * Combines diagonal 2-jumps, mid-air horizontal micro-braking, short-drop catches, and 355~375px air-dash + counter-brake valley transfers with 2~4 step recovery loops.
// - Stage 2 (<진압반의 징검다리>, 1,600px, y = 580 -> -1,740):
//   * Preserves the 3-tier vertical climb structure, 3 fixed knockback barriers (KB-01..03), and 4 blinking relays.
//   * Guards CG-01..07 patrol the full width of their assigned platform from left edge to right edge, ignoring KB-01..03 barriers.
// - Stage 3 (<마요의 바람총 숲>, 3,600px, y = 580 -> -1,160):
//   * Local rollback to TEST19's praised 1st-floor experience (Act 1 rightward under MAYO-C1) and 2nd/3rd-floor S-loop structure.
//   * Expands vertical spacing between tiers (Tier 1 -> Tier 2: +305px above ceiling; Tier 2 -> Tier 3: +520px above ceiling) and applies `noTopLand: true` on ceilings so ceiling-top standing/skipping is 100% impossible!

const challengeLevels = [];
let challengeStageIndex = 0;

function makeChallengeStage(id, stageNum, name, subtitle, width, { killY = 820, cameraProfile = 'challenge_vertical', minCamY = -2380, maxCamY = 120 } = {}) {
  return {
    id,
    stageNum,
    name,
    subtitle,
    worldWidth: width,
    killY,
    cameraProfile,
    minCamY,
    maxCamY,
    backgroundRanges: { 'forest-bg': [0, width] },
    segments: [{ start: 0, end: width, bg: 'forest-bg', skin: 'grass', name, blockId: id, indoor: false }],
    platforms: [],
    sections: [],
    signs: [],
    villageProps: [],
    decorFootprints: [],
    regularDefs: [],
    specialDefs: [],
    guards: [],
    barriers: [],
    turrets: [],
    goal: null
  };
}

function chSurface(st, x, y, w, skin = 'grass', extra = {}) {
  const id = extra.id || `${st.id}-P${String(st.platforms.length + 1).padStart(2, '0')}`;
  const behavior = extra.behavior || (extra.blink ? 'blink' : extra.motion ? 'moving' : 'static');
  const assetType = extra.wall ? 'STRUCTURAL_WALL' : extra.ceiling ? 'STRUCTURAL_CEILING' : extra.groundTile ? 'GROUND_SURFACE' : 'COLLIDABLE_PLATFORM';
  const visual = makeVisualMeta(st, x, y, w, skin, extra);
  const pObj = {
    id, assetType, x, y, w, h: extra.h || 20, thin: extra.thin !== undefined ? extra.thin : true,
    skin, visual, behavior,
    motion: extra.motion || null,
    blink: extra.blink || null,
    collidable: extra.collidable !== undefined ? extra.collidable : true,
    blinkState: 'on',
    blinkAlpha: 1,
    challenge: extra.challenge || 'main',
    checkpointSafe: Boolean(extra.checkpointSafe),
    ...extra
  };
  st.platforms.push(pObj);
  return pObj;
}

function chFloor(st, x, w, y = 580, extra = {}) {
  return chSurface(st, x, y, w, 'grass', { h: 360, thin: false, groundTile: true, checkpointSafe: true, ...extra });
}

function chCheckpoint(st, x, y, title, roleDesc = '') {
  st.sections.push({ x, y, title, hint: '', roleDesc });
}

// ============================================================================
// CHALLENGE STAGE 1: <가지와 가지 사이> (Gate G2: Precision Perches 44~70px Mid / 38~54px Top)
// ============================================================================
const chStage1 = makeChallengeStage(
  'CH-S1', 1, '1단계 · 가지와 가지 사이',
  '3층 정밀 수직 등반 · 중층 46~68px / 상층 38~54px 정밀 착지 · 공중 역제동 & 장거리 대시',
  3400, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -2380 }
);

// --- Tier 1 (y = 580 -> -440): Diagonal 2-Jumps + Reversals + 370px Valley Dash-and-Brake ---
chFloor(chStage1, 80, 220, 580, { id: 'C1-T1-START', tier: 1, previous: 'NONE', nextTarget: 'C1-T1-P1', role: '1층 출발 안전 테라스' });
chCheckpoint(chStage1, 180, 580, '1층 출발 테라스', '1단계 시작 체크포인트');

chSurface(chStage1, 330, 445, 80, 'grass', { id: 'C1-T1-P1', tier: 1, useSmallVisual: true, previous: 'C1-T1-START', nextTarget: 'C1-T1-P2', role: '도입 · 우상향 1단/2단 점프(w=80)' });
chSurface(chStage1, 555, 290, 74, 'grass', { id: 'C1-T1-P2', tier: 1, useSmallVisual: true, previous: 'C1-T1-P1', nextTarget: 'C1-T1-P3', role: '높이 · 대각선 2단점프 필수(dY=-155, w=74)' });
chSurface(chStage1, 295, 130, 70, 'grass', { id: 'C1-T1-P3', tier: 1, useSmallVisual: true, previous: 'C1-T1-P2', nextTarget: 'C1-T1-P4', role: '반전 · 좌상향 역방향 2단점프(dY=-160, w=70)' });
chSurface(chStage1, 560, -30, 68, 'grass', { id: 'C1-T1-P4', tier: 1, useSmallVisual: true, previous: 'C1-T1-P3', nextTarget: 'C1-T1-P5', role: '반전 · 우상향 2단점프+미세조정(dY=-160, w=68)' });
chSurface(chStage1, 825, -165, 64, 'grass', { id: 'C1-T1-P5', tier: 1, useSmallVisual: true, previous: 'C1-T1-P4', nextTarget: 'C1-T1-P6', role: '대시 도약 출발점 · 370px 계곡 건너기(w=64)' });

// Tier 1 Valley Recovery Loop (2~3 steps re-climb on miss)
chSurface(chStage1, 1110, 235, 125, 'grass', { id: 'C1-T1-REC1', tier: 1, previous: 'C1-T1-P5', nextTarget: 'C1-T1-REC2', role: '낙하 회복 #1 · 계곡 도약 실패 시 수용 발판' });
chSurface(chStage1, 865, 95, 72, 'grass', { id: 'C1-T1-REC2', tier: 1, useSmallVisual: true, previous: 'C1-T1-REC1', nextTarget: 'C1-T1-P4', role: '낙하 회복 #2 · C1-T1-P4 재합류 징검다리' });

// 370px Valley Transfer: C1-T1-P5 (825..889, y=-165) -> C1-T1-P6 (1259, -180, w=62)
chSurface(chStage1, 1259, -180, 62, 'grass', { id: 'C1-T1-P6', tier: 1, useSmallVisual: true, previous: 'C1-T1-P5', nextTarget: 'C1-T1-P7', role: '제동 · 370px 2단점프+대시 후 역제동 착지(w=62)' });
chSurface(chStage1, 1535, -325, 64, 'grass', { id: 'C1-T1-P7', tier: 1, useSmallVisual: true, previous: 'C1-T1-P6', nextTarget: 'C1-T2-CP', role: '높이 · 2층 체크포인트 진입 도약(w=64)' });

// --- Tier 2 (y = -440 -> -1,380): Mid-Tier Precision Perches (w = 46 ~ 68px) + Short-Drop Catch + Reverse Valley Dash ---
chSurface(chStage1, 1800, -440, 185, 'grass', { id: 'C1-T2-CP', tier: 2, checkpointSafe: true, previous: 'C1-T1-P7', nextTarget: 'C1-T2-P1', role: '2층 체크포인트 쉼터' });
chCheckpoint(chStage1, 1890, -440, '2층 숲가지 쉼터', '2층 정밀 구간 체크포인트');

chSurface(chStage1, 2110, -595, 66, 'grass', { id: 'C1-T2-P1', tier: 2, useSmallVisual: true, previous: 'C1-T2-CP', nextTarget: 'C1-T2-P2', role: '정밀 #1 · 우상향 대각선 2단점프(w=66)' });
chSurface(chStage1, 2400, -750, 60, 'grass', { id: 'C1-T2-P2', tier: 2, useSmallVisual: true, previous: 'C1-T2-P1', nextTarget: 'C1-T2-P3', role: '정밀 #2 · 좌상향 반전 도약 출발점(w=60)' });
chSurface(chStage1, 2120, -905, 56, 'grass', { id: 'C1-T2-P3', tier: 2, useSmallVisual: true, previous: 'C1-T2-P2', nextTarget: 'C1-T2-P4', role: '정밀 #3 · 좌상향 역방향 착지(w=56)' });
chSurface(chStage1, 2420, -1060, 52, 'grass', { id: 'C1-T2-P4', tier: 2, useSmallVisual: true, previous: 'C1-T2-P3', nextTarget: 'C1-T2-P5', role: '정밀 #4 · 우상향 반전 착지(w=52)' });
// Short-drop precision transfer: from P4 (y=-1060) across to P5 (x=2090, y=-1185, w=48)
chSurface(chStage1, 2090, -1185, 48, 'grass', { id: 'C1-T2-P5', tier: 2, useSmallVisual: true, previous: 'C1-T2-P4', nextTarget: 'C1-T2-P6', role: '정밀 #5 · 역방향 362px 대시 도약 출발점(w=48)' });
chSurface(chStage1, 2240, -445, 130, 'grass', { id: 'C1-T2-REC', tier: 2, previous: 'C1-T2-P3', nextTarget: 'C1-T2-P1', role: '낙하 회복 · 2층 실수 시 3단 재등반 수용 발판' });

// 362px Reverse Leftward Dash-and-Brake to C1-T2-P6 (w=46)
chSurface(chStage1, 1682, -1210, 46, 'grass', { id: 'C1-T2-P6', tier: 2, useSmallVisual: true, previous: 'C1-T2-P5', nextTarget: 'C1-T2-P7', role: '제동 · 역방향 362px 대시 후 우향 역제동 착지(w=46)' });
chSurface(chStage1, 1390, -1335, 50, 'grass', { id: 'C1-T2-P7', tier: 2, useSmallVisual: true, previous: 'C1-T2-P6', nextTarget: 'C1-T3-CP', role: '높이 · 3층 체크포인트 연결 도약(w=50)' });

// --- Tier 3 (y = -1,380 -> -2,160): Upper Canopy Micro-Precision Perches (w = 38 ~ 54px) ---
chSurface(chStage1, 1030, -1400, 180, 'grass', { id: 'C1-T3-CP', tier: 3, checkpointSafe: true, previous: 'C1-T2-P7', nextTarget: 'C1-T3-P1', role: '3층 체크포인트 쉼터' });
chCheckpoint(chStage1, 1120, -1400, '3층 수관 입구', '3층 최상단 정밀 체크포인트');

chSurface(chStage1, 735, -1560, 54, 'grass', { id: 'C1-T3-P1', tier: 3, useSmallVisual: true, previous: 'C1-T3-CP', nextTarget: 'C1-T3-P2', role: '상층 반전 #1 · 좌상향 54px 정밀 착지(dY=-160)' });
chSurface(chStage1, 1035, -1720, 50, 'grass', { id: 'C1-T3-P2', tier: 3, useSmallVisual: true, previous: 'C1-T3-P1', nextTarget: 'C1-T3-P3', role: '상층 반전 #2 · 우상향 50px 정밀 착지(dY=-160)' });
chSurface(chStage1, 725, -1875, 46, 'grass', { id: 'C1-T3-P3', tier: 3, useSmallVisual: true, previous: 'C1-T3-P2', nextTarget: 'C1-T3-P4', role: '상층 반전 #3 · 좌상향 46px 정밀 착지(dY=-155)' });
chSurface(chStage1, 1040, -2030, 44, 'grass', { id: 'C1-T3-P4', tier: 3, useSmallVisual: true, previous: 'C1-T3-P3', nextTarget: 'C1-T3-P5', role: '상층 반전 #4 · 우상향 44px 정밀 착지(dY=-155)' });
chSurface(chStage1, 1365, -2125, 42, 'grass', { id: 'C1-T3-P5', tier: 3, useSmallVisual: true, previous: 'C1-T3-P4', nextTarget: 'C1-T3-P6', role: '상층 제동 #5 · 우향 42px 정밀 징검다리' });
// Short-drop + precision brake onto 38px perch C1-T3-P6, then 355px dash + brake onto 42px C1-T3-P7!
chSurface(chStage1, 1685, -2140, 38, 'grass', { id: 'C1-T3-P6', tier: 3, useSmallVisual: true, previous: 'C1-T3-P5', nextTarget: 'C1-T3-P7', role: '최종 도약점 · 38px 초정밀 발판(355px 대시 출발)' });
chSurface(chStage1, 1510, -1780, 115, 'grass', { id: 'C1-T3-REC', tier: 3, previous: 'C1-T3-P6', nextTarget: 'C1-T3-P3', role: '낙하 회복 · 3층 상단 실패 시 3단 재등반 수용 발판' });
chSurface(chStage1, 2078, -2155, 42, 'grass', { id: 'C1-T3-P7', tier: 3, useSmallVisual: true, previous: 'C1-T3-P6', nextTarget: 'C1-GOAL-DECK', role: '최종 착지 · 355px 대시 후 역제동 42px 착지판' });

chSurface(chStage1, 2280, -2160, 240, 'grass', { id: 'C1-GOAL-DECK', tier: 3, checkpointSafe: true, previous: 'C1-T3-P7', nextTarget: 'STAGE-2', role: '보상 · 1단계 완주 출구 테라스' });
chStage1.goal = { x: 2370, y: -2160, w: 120, h: 165, label: '1단계 출구' };

addStageProp(chStage1, { id: 'C1-PROP-TREE1', assetType: 'DECORATION', layer: 'background', key: 'forest/decoration_tree_a', x: 180, anchorBottom: 580, walkOffset: 340, scale: 0.58, rawW: 260, rawH: 360 });
addStageProp(chStage1, { id: 'C1-PROP-TREE2', assetType: 'DECORATION', layer: 'background', key: 'forest/decoration_tree_b', x: 1890, anchorBottom: -440, walkOffset: 340, scale: 0.54, rawW: 260, rawH: 360 });
challengeLevels.push(chStage1);


// ============================================================================
// CHALLENGE STAGE 2: <진압반의 징검다리> (Gate G1: Preserved 3-Tier Vertical Structure + Full-Platform Patrol)
// ============================================================================
const chStage2 = makeChallengeStage(
  'CH-S2', 2, '2단계 · 진압반의 징검다리',
  '3층 수직 전술 등반(y=580→-1740) · 전폭 경비 순찰 · 방패 넉백 장벽 3기 · 점멸 중계판',
  1600, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -2020 }
);

// --- Tier 1 (y = 580 -> -180): Guard Bridges + Blink Relay Ascent ---
chFloor(chStage2, 80, 1440, 580, { id: 'C2-START', role: '2단계 수직 등반 출발지', nextTarget: 'C2-T1-P1' });
chCheckpoint(chStage2, 220, 580, '징검다리 입구', '2단계 시작 체크포인트');

chSurface(chStage2, 390, 445, 115, 'grass', { id: 'C2-T1-P1', useSmallVisual: true, role: '1층 도입 발판', nextTarget: 'C2-T1-GRD1' });
chSurface(chStage2, 640, 320, 235, 'grass', { id: 'C2-T1-GRD1', role: '1층 제1경비 전폭 순찰 교량(CG-01)', nextTarget: 'C2-T1-GRD2' });
chSurface(chStage2, 1020, 180, 240, 'grass', { id: 'C2-T1-GRD2', role: '1층 제2경비 전폭 순찰 교량(CG-02)', nextTarget: 'C2-T1-BLINK1' });
chSurface(chStage2, 740, 35, 120, 'grass', {
  id: 'C2-T1-BLINK1', behavior: 'blink', fastBlink: true,
  blink: { on: 1.35, warning: 0.42, off: 1.10, phase: 0.30 },
  role: '1층 좌상향 점멸 중계판 #1', nextTarget: 'C2-T1-GRD3'
});
chSurface(chStage2, 380, -90, 235, 'grass', { id: 'C2-T1-GRD3', role: '1층 제3경비 전폭 역위상 교량(CG-03)', nextTarget: 'C2-CP1' });

// --- Tier 2 (y = -180 -> -960): Shield Knockback Barriers + Full-Platform Guard Patrol ---
chSurface(chStage2, 110, -210, 220, 'grass', { id: 'C2-CP1', checkpointSafe: true, role: '2층 좌측 초소 체크포인트', nextTarget: 'C2-T2-LONG1' });
chCheckpoint(chStage2, 220, -210, '중층 초소 쉼터', '2층 복합 장벽 구간 체크포인트');

chSurface(chStage2, 450, -345, 280, 'grass', { id: 'C2-T2-LONG1', role: '2층 장형 교량 #1 (KB-01 관통 + CG-04 양끝 순찰)', nextTarget: 'C2-T2-STEP' });
chSurface(chStage2, 850, -475, 110, 'grass', { id: 'C2-T2-STEP', useSmallVisual: true, role: '2층 중계 발판', nextTarget: 'C2-T2-LONG2' });
chSurface(chStage2, 1060, -605, 280, 'grass', { id: 'C2-T2-LONG2', role: '2층 장형 교량 #2 (KB-02 관통 + CG-05 양끝 순찰)', nextTarget: 'C2-T2-BLINK2' });
chSurface(chStage2, 780, -745, 120, 'grass', {
  id: 'C2-T2-BLINK2', behavior: 'blink', fastBlink: true,
  blink: { on: 1.30, warning: 0.40, off: 1.15, phase: 1.10 },
  role: '2층 좌상향 점멸 중계판 #2', nextTarget: 'C2-CP2'
});

// --- Tier 3 (y = -960 -> -1,740): Blink Survival + Finale Full-Platform Guard Bridge ---
chSurface(chStage2, 420, -880, 220, 'grass', { id: 'C2-CP2', checkpointSafe: true, role: '3층 중상단 체크포인트', nextTarget: 'C2-T3-GRD1' });
chCheckpoint(chStage2, 530, -880, '상층 점멸 초소', '3층 점멸 생존 구간 체크포인트');

chSurface(chStage2, 160, -1025, 240, 'grass', { id: 'C2-T3-GRD1', role: '3층 점멸 대기 경비 교량(CG-06 양끝 순찰)', nextTarget: 'C2-T3-BLINK1' });
chSurface(chStage2, 520, -1165, 118, 'grass', {
  id: 'C2-T3-BLINK1', behavior: 'blink', fastBlink: true,
  blink: { on: 1.25, warning: 0.40, off: 1.15, phase: 0.50 },
  role: '3층 연속 점멸 중계판 #1', nextTarget: 'C2-T3-BLINK2'
});
chSurface(chStage2, 780, -1305, 118, 'grass', {
  id: 'C2-T3-BLINK2', behavior: 'blink', fastBlink: true,
  blink: { on: 1.25, warning: 0.40, off: 1.15, phase: 1.55 },
  role: '3층 연속 점멸 중계판 #2', nextTarget: 'C2-T3-FINAL'
});
chSurface(chStage2, 1020, -1450, 275, 'grass', { id: 'C2-T3-FINAL', role: '3층 최종 관문 교량(KB-03 관통 + CG-07 양끝 순찰)', nextTarget: 'C2-T3-EXIT' });
chSurface(chStage2, 740, -1605, 110, 'grass', { id: 'C2-T3-EXIT', useSmallVisual: true, role: '최종 출구 연결 발판', nextTarget: 'C2-GOAL-DECK' });

chSurface(chStage2, 360, -1740, 250, 'grass', { id: 'C2-GOAL-DECK', checkpointSafe: true, role: '보상 · 2단계 완주 출구 테라스', nextTarget: 'STAGE-3' });
chStage2.goal = { x: 430, y: -1740, w: 110, h: 165, label: '2단계 출구' };

// Gate G1 (Section 2.1 & 2.2): Every guard patrols the FULL width of its platform (edgeMargin = 26px),
// ignoring KB-01..03 barriers, and uses Story-matched knockback (~320 px/s, 1.5s stun)!
chStage2.guards = [
  { id: 'CG-01', kind: 'guard1', platformId: 'C2-T1-GRD1', edgeMargin: 26, startX: 820, dir: -1, speed: 168, waitTime: 0.42, warnTime: 0.36, knockVX: 320 },
  { id: 'CG-02', kind: 'guard2', platformId: 'C2-T1-GRD2', edgeMargin: 26, startX: 1210, dir: -1, speed: 182, waitTime: 0.40, warnTime: 0.35, knockVX: 320 },
  { id: 'CG-03', kind: 'guard1', platformId: 'C2-T1-GRD3', edgeMargin: 26, startX: 430, dir: 1, speed: 175, waitTime: 0.40, warnTime: 0.35, knockVX: 320 },
  { id: 'CG-04', kind: 'guard2', platformId: 'C2-T2-LONG1', edgeMargin: 26, startX: 690, dir: -1, speed: 184, waitTime: 0.38, warnTime: 0.34, knockVX: 320 },
  { id: 'CG-05', kind: 'guard1', platformId: 'C2-T2-LONG2', edgeMargin: 26, startX: 1300, dir: -1, speed: 188, waitTime: 0.38, warnTime: 0.34, knockVX: 320 },
  { id: 'CG-06', kind: 'guard2', platformId: 'C2-T3-GRD1', edgeMargin: 26, startX: 350, dir: -1, speed: 185, waitTime: 0.38, warnTime: 0.35, knockVX: 320 },
  { id: 'CG-07', kind: 'guard2', platformId: 'C2-T3-FINAL', edgeMargin: 26, startX: 1255, dir: -1, speed: 196, waitTime: 0.35, warnTime: 0.33, knockVX: 320 }
];

chStage2.barriers = [
  { id: 'KB-01', platformId: 'C2-T2-LONG1', localX: 140, width: 28, height: 58, activeDur: 1.35, warnDur: 0.42, offDur: 1.05, phase: 0.20, knockVX: 320 },
  { id: 'KB-02', platformId: 'C2-T2-LONG2', localX: 140, width: 28, height: 58, activeDur: 1.35, warnDur: 0.42, offDur: 1.05, phase: 1.15, knockVX: 320 },
  { id: 'KB-03', platformId: 'C2-T3-FINAL', localX: 138, width: 28, height: 58, activeDur: 1.30, warnDur: 0.40, offDur: 1.00, phase: 0.60, knockVX: 320 }
];

challengeLevels.push(chStage2);


// ============================================================================
// CHALLENGE STAGE 3: <마요의 바람총 숲> (Gate G2 Section 4: TEST19 Local Rollback + Expanded Inter-Tier Spacing!)
// - Restores TEST19's praised 1st-floor course (Act 1 rightward under MAYO-C1 at y=270, dartY=216) and S-loop 2nd/3rd floors.
// - Expands vertical spacing between Tier 1 -> Tier 2 and Tier 2 -> Tier 3 so standing on or jumping from a ceiling
//   can NEVER reach the next tier (Tier 2 is at y = -220..-505; C3-TIER2-ROOF is at y = -640 with noTopLand: true;
//   Tier 3 is at y = -1010..-1160 — 370~520px ABOVE C3-TIER2-ROOF, far beyond 210px double-jump height!).
// ============================================================================
const chStage3 = makeChallengeStage(
  'CH-S3', 3, '3단계 · 마요의 바람총 숲',
  'TEST19 1층 탄막 돌파 원형 복구 + 2·3층 수직 층간 간격 대폭 확장(천장 스킵 원천 봉쇄)',
  3600, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -1420 }
);

// Non-collidable perches for the 3 Fixed Mayo Turrets
chSurface(chStage3, 40, 270, 110, 'grass', { id: 'C3-TURRET-P1', collidable: false, nonCollidable: true, challenge: 'turret', role: 'MAYO-C1 1층 우향 고정 포대 대좌(비충돌, y=270, 탄도 y=216)', nextTarget: 'NONE' });
chSurface(chStage3, 3440, -310, 110, 'grass', { id: 'C3-TURRET-P2', collidable: false, nonCollidable: true, challenge: 'turret', role: 'MAYO-C2 2층 좌향 고정 포대 대좌(비충돌, y=-310, 탄도 y=-364)', nextTarget: 'NONE' });
chSurface(chStage3, 40, -990, 110, 'grass', { id: 'C3-TURRET-P3', collidable: false, nonCollidable: true, challenge: 'turret', role: 'MAYO-C3 3층 우향 고정 포대 대좌(비충돌, y=-990, 탄도 y=-1044)', nextTarget: 'NONE' });

// Tier Separation Ceilings (`noTopLand: true` so they can never be used as a walkable floor, plus 370~520px vertical gap to the tier above!)
chSurface(chStage3, 0, 95, 2680, 'grass', { id: 'C3-TIER1-ROOF', h: 38, thin: false, wall: true, noTopLand: true, role: '1층 상부 차단 천장(x=0..2680, 상면 착지 불가)', nextTarget: 'C3-CP1' });
chSurface(chStage3, 560, -640, 3040, 'grass', { id: 'C3-TIER2-ROOF', h: 38, thin: false, wall: true, noTopLand: true, role: '2층 상부 차단 천장(x=560..3600, 상면 착지 불가 · 3층과 370~520px 이격)', nextTarget: 'C3-CP2' });

// --- Act 1 (1st Floor — Exact TEST19 Praised Course: x = 160 -> 3130, y = 580 -> 185, under C3-TIER1-ROOF y=95) ---
chFloor(chStage3, 160, 210, 580, { id: 'C3-START', role: '1층 진입 안전 테라스', nextTarget: 'C3-A1-P1' });
chCheckpoint(chStage3, 255, 580, '바람총 숲 입구', '3단계 1층 시작 안전 지점');

chSurface(chStage3, 470, 450, 76, 'grass', { id: 'C3-A1-P1', useSmallVisual: true, role: '1층 도입 발판 #1', nextTarget: 'C3-A1-P2' });
chSurface(chStage3, 730, 330, 74, 'grass', { id: 'C3-A1-P2', useSmallVisual: true, role: '대기 · C1 탄도(y=216) 하방 관찰 발판', nextTarget: 'C3-A1-P3' });
chSurface(chStage3, 995, 250, 68, 'grass', { id: 'C3-A1-P3', useSmallVisual: true, role: '위협 · C1(910px/s) 사선 관통 발판 #1', nextTarget: 'C3-A1-P4' });
chSurface(chStage3, 1280, 235, 68, 'grass', { id: 'C3-A1-P4', useSmallVisual: true, role: '위협 · C1 사선 관통 발판 #2', nextTarget: 'C3-A1-P5' });
chSurface(chStage3, 1575, 310, 72, 'grass', { id: 'C3-A1-P5', useSmallVisual: true, role: '중간 숨고르기 · C1 사선 하방 저고도 발판', nextTarget: 'C3-A1-P6' });
chSurface(chStage3, 1870, 240, 68, 'grass', { id: 'C3-A1-P6', useSmallVisual: true, role: '위협 · C1 사선 재진입 발판 #3', nextTarget: 'C3-A1-P7' });
chSurface(chStage3, 2170, 225, 66, 'grass', { id: 'C3-A1-P7', useSmallVisual: true, role: '위협 · C1 사선 고속 돌파 발판 #4', nextTarget: 'C3-A1-P8' });
chSurface(chStage3, 2475, 250, 68, 'grass', { id: 'C3-A1-P8', useSmallVisual: true, role: '위협 · 1층 천장(x=2680) 탈출 전방 발판', nextTarget: 'C3-A1-P9' });
chSurface(chStage3, 2765, 185, 74, 'grass', { id: 'C3-A1-P9', useSmallVisual: true, role: '상승 · 우측 개구부(x>2680) 진입 발판', nextTarget: 'C3-A1-UP1' });
// Right-side vertical ascent steps from Act 1 (y=185) up to expanded Act 2 height (y=-210)
chSurface(chStage3, 2980, 50, 78, 'grass', { id: 'C3-A1-UP1', useSmallVisual: true, role: '우측 수직 상승 징검다리 #1(y=50)', nextTarget: 'C3-A1-UP2' });
chSurface(chStage3, 2780, -85, 78, 'grass', { id: 'C3-A1-UP2', useSmallVisual: true, role: '우측 수직 상승 징검다리 #2(y=-85)', nextTarget: 'C3-CP1' });

// Checkpoint #1 at Far-Right Turnaround (x = 3040..3225, y = -210 — 305px above C3-TIER1-ROOF y=95!)
chSurface(chStage3, 3040, -210, 185, 'grass', { id: 'C3-CP1', checkpointSafe: true, role: '제1체크포인트 · 동쪽 회랑 반환점(Act 2 좌향 역주행 출발점, y=-210)', nextTarget: 'C3-A2-P1' });
chCheckpoint(chStage3, 3130, -210, '제1쉼터 · 동쪽 회랑 반환점', 'Act 2 중층 좌향 역주행 진입 체크포인트');

// --- Act 2 (2nd Floor — Leftward Traverse: x = 3130 -> 255, y = -210 -> -505, under C3-TIER2-ROOF y=-640) ---
chSurface(chStage3, 2810, -320, 68, 'grass', { id: 'C3-A2-P1', useSmallVisual: true, role: '2층 역주행 #1 · C2(950px/s, y=-364) 사선 진입(좌향)', nextTarget: 'C3-A2-P2' });
chSurface(chStage3, 2520, -430, 66, 'grass', { id: 'C3-A2-P2', useSmallVisual: true, role: '2층 역주행 #2 · C2 사선 상방 도약 착지(좌향)', nextTarget: 'C3-A2-P3' });
chSurface(chStage3, 2210, -315, 66, 'grass', { id: 'C3-A2-P3', useSmallVisual: true, role: '2층 역주행 #3 · C2 사선 하방 교차 착지(좌향)', nextTarget: 'C3-A2-P4' });
chSurface(chStage3, 1910, -240, 74, 'grass', { id: 'C3-A2-P4', useSmallVisual: true, role: '2층 중간 숨고르기 · C2 사선(y=-364) 하방 안전 발판(좌향)', nextTarget: 'C3-A2-P5' });
chSurface(chStage3, 1615, -325, 66, 'grass', { id: 'C3-A2-P5', useSmallVisual: true, role: '2층 역주행 #4 · C2 사선 정면 관통 발판(좌향)', nextTarget: 'C3-A2-P6' });
chSurface(chStage3, 1320, -440, 64, 'grass', { id: 'C3-A2-P6', useSmallVisual: true, role: '2층 역주행 #5 · C2 사선 상방 대각선 도약(좌향)', nextTarget: 'C3-A2-P7' });
chSurface(chStage3, 1010, -320, 64, 'grass', { id: 'C3-A2-P7', useSmallVisual: true, role: '2층 역주행 #6 · C2 사선 재착지 발판(좌향)', nextTarget: 'C3-A2-P8' });
chSurface(chStage3, 710, -425, 64, 'grass', { id: 'C3-A2-P8', useSmallVisual: true, role: '2층 역주행 #7 · 2층 천장 좌측 끝(x=560) 접근 발판', nextTarget: 'C3-A2-P9' });
chSurface(chStage3, 430, -505, 68, 'grass', { id: 'C3-A2-P9', useSmallVisual: true, role: '상승 전환 · 좌측 개구부(x<560) 통과 발판', nextTarget: 'C3-A2-UP1' });
// Left-side vertical ascent steps from Act 2 (y=-505) up to expanded Act 3 height (y=-900)
chSurface(chStage3, 190, -640, 78, 'grass', { id: 'C3-A2-UP1', useSmallVisual: true, role: '좌측 수직 상승 징검다리 #1(y=-640)', nextTarget: 'C3-A2-UP2' });
chSurface(chStage3, 380, -775, 78, 'grass', { id: 'C3-A2-UP2', useSmallVisual: true, role: '좌측 수직 상승 징검다리 #2(y=-775)', nextTarget: 'C3-CP2' });

// Checkpoint #2 at Far-Left Turnaround (x = 165..345, y = -900 — 260px above C3-TIER2-ROOF y=-640!)
chSurface(chStage3, 165, -900, 180, 'grass', { id: 'C3-CP2', checkpointSafe: true, role: '제2체크포인트 · 서쪽 수관 반환점(Act 3 우향 최종 돌파 출발점, y=-900)', nextTarget: 'C3-A3-P1' });
chCheckpoint(chStage3, 255, -900, '제2쉼터 · 서쪽 수관 반환점', 'Act 3 상층 990px/s 탄막 돌파 체크포인트');

// --- Act 3 (3rd Floor — Rightward Finale: x = 255 -> 3265, y = -900 -> -1,160 — 370~520px ABOVE C3-TIER2-ROOF y=-640!) ---
chSurface(chStage3, 520, -1010, 68, 'grass', { id: 'C3-A3-P1', useSmallVisual: true, role: '3층 위협 #1 · C3(990px/s, y=-1044) 사선 진입', nextTarget: 'C3-A3-P2' });
chSurface(chStage3, 820, -1115, 66, 'grass', { id: 'C3-A3-P2', useSmallVisual: true, role: '3층 위협 #2 · C3 사선 상방 관통 도약', nextTarget: 'C3-A3-P3' });
chSurface(chStage3, 1125, -1005, 64, 'grass', { id: 'C3-A3-P3', useSmallVisual: true, role: '3층 위협 #3 · C3 사선 하방 교차 착지', nextTarget: 'C3-A3-P4' });
chSurface(chStage3, 1430, -1120, 64, 'grass', { id: 'C3-A3-P4', useSmallVisual: true, role: '3층 위협 #4 · C3 사선 재관통 도약', nextTarget: 'C3-A3-P5' });
chSurface(chStage3, 1760, -1000, 64, 'grass', { id: 'C3-A3-P5', useSmallVisual: true, role: '3층 위협 #5 · C3 사선 하방 징검다리', nextTarget: 'C3-A3-P6' });
chSurface(chStage3, 2070, -1115, 62, 'grass', { id: 'C3-A3-P6', useSmallVisual: true, role: '3층 위협 #6 · C3 사선 상방 정밀 착지', nextTarget: 'C3-A3-P7' });
chSurface(chStage3, 2380, -1010, 62, 'grass', { id: 'C3-A3-P7', useSmallVisual: true, role: '3층 위협 #7 · C3 사선 하방 징검다리', nextTarget: 'C3-A3-P8' });
chSurface(chStage3, 2690, -1125, 60, 'grass', { id: 'C3-A3-P8', useSmallVisual: true, role: '점프 재충전 · 최종 도약 출발점', nextTarget: 'C3-A3-P9' });
chSurface(chStage3, 2985, -1150, 60, 'grass', { id: 'C3-A3-P9', useSmallVisual: true, role: '제동 · 출구 전방 정밀 착지판', nextTarget: 'C3-GOAL-DECK' });

chSurface(chStage3, 3190, -1160, 220, 'grass', { id: 'C3-GOAL-DECK', checkpointSafe: true, role: '보상 · 3단계 최종 완주 출구 테라스(y=-1160)', nextTarget: 'CHALLENGE-CLEAR' });
chStage3.goal = { x: 3265, y: -1160, w: 120, h: 165, label: '인내의 숲 정복!' };

chStage3.turrets = [
  {
    id: 'MAYO-C1', lane: 'low', platformId: 'C3-TURRET-P1',
    x: 95, y: 270, face: 1, muzzleOffsetY: -54, // dartY = 216 (shoots RIGHT at 910 px/s across Act 1)
    minCooldown: 1.65, maxCooldown: 2.25, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: 910, minX: 95, maxX: 3520, seedOffset: 101, initialDelay: 0.45
  },
  {
    id: 'MAYO-C2', lane: 'mid', platformId: 'C3-TURRET-P2',
    x: 3495, y: -310, face: -1, muzzleOffsetY: -54, // dartY = -364 (shoots LEFT at 950 px/s across Act 2)
    minCooldown: 1.75, maxCooldown: 2.40, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: 950, minX: 80, maxX: 3495, seedOffset: 307, initialDelay: 0.90
  },
  {
    id: 'MAYO-C3', lane: 'high', platformId: 'C3-TURRET-P3',
    x: 95, y: -990, face: 1, muzzleOffsetY: -54, // dartY = -1044 (shoots RIGHT at 990 px/s across Act 3)
    minCooldown: 1.85, maxCooldown: 2.55, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: 990, minX: 95, maxX: 3520, seedOffset: 619, initialDelay: 1.35
  }
];

challengeLevels.push(chStage3);
window.challengeLevels = challengeLevels;
