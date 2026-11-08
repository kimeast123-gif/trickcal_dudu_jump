'use strict';
// TEST22.1 Stage-3 Difficulty Hotfix: preserves TEST22 1.5x elevation and 1st floor, raises 2nd/3rd-floor shelter perches into actual dart sweep.
// TEST22 Challenge World (<추억의 인내의 숲> — Gates 1, 2, 3, 4, 5):
// - 1.5x Vertical Climb Expansion across all 3 stages:
//   * Stage 1 (<가지와 가지 사이>, 3,400px, y = 580 -> -3,530, total rise = 4,110px = 1.50x):
//     Preserves Tier 1~3 precision perches (46~68px Mid / 38~54px Top) and adds Tier 4 + Two Mandatory Top Long-Jump Air-Dash Courses (Course A Rightward + Course B Reverse Leftward) with recovery loops before C1-GOAL-DECK.
//   * Stage 2 (<진압반의 징검다리>, 1,600px, y = 580 -> -2,900, total rise = 3,480px = 1.50x):
//     Preserves existing 7 guards (CG-01..07), 3 barriers (KB-01..03), and 4 blinking relays, and extends upward with Tier 4 & Tier 5 composite guard + barrier + blink relay climbs (CG-08..10, KB-04..06).
//   * Stage 3 (<마요의 바람총 숲>, 3,600px, y = 580 -> -2,030, total rise = 2,610px = 1.50x):
//     Preserves praised 1st-floor course under MAYO-C1 (y=270, dartY=216, 910px/s), synchronizes MAYO-C2 (y=-660, dartY=-714, 950px/s) & MAYO-C3 (y=-1750, dartY=-1804, 990px/s), and exposes 6 perches in Tier 2 and 7 in Tier 3 to the real dart collision band while retaining limited safe platforms.
// - Gate 5 (P0): Strictly 2 Checkpoints per stage (`sections.length === 2`: Start + 50% Midpoint).

const challengeLevels = [];
let challengeStageIndex = 0;

function makeChallengeStage(id, stageNum, name, subtitle, width, { killY = 820, cameraProfile = 'challenge_vertical', minCamY = -3820, maxCamY = 120 } = {}) {
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
// CHALLENGE STAGE 1: <가지와 가지 사이> (Gates 1, 2, 5: y = 580 -> -3,530, Rise = 4,110px, 2 Checkpoints)
// ============================================================================
const chStage1 = makeChallengeStage(
  'CH-S1', 1, '1단계 · 가지와 가지 사이',
  '1.5배 수직 확장(y=580→-3530) · 중상층 38~68px 정밀 착지 · 최상단 대시 필수 장거리 도약 2코스',
  3400, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -3860 }
);

// --- Tier 1 (y = 580 -> -440): Diagonal 2-Jumps + Reversals + 370px Valley Dash-and-Brake ---
chFloor(chStage1, 80, 220, 580, { id: 'C1-T1-START', tier: 1, previous: 'NONE', nextTarget: 'C1-T1-P1', role: '1층 출발 안전 테라스 (체크포인트 #1)' });
// Checkpoint #1 (Start)
chCheckpoint(chStage1, 180, 580, '1층 출발 테라스', '1단계 시작 체크포인트 (#1/2)');

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
chSurface(chStage1, 1535, -325, 64, 'grass', { id: 'C1-T1-P7', tier: 1, useSmallVisual: true, previous: 'C1-T1-P6', nextTarget: 'C1-T2-CP', role: '높이 · 2층 쉼터 진입 도약(w=64)' });

// --- Tier 2 (y = -440 -> -1,480): Mid-Tier Precision Perches (w = 46 ~ 68px) + Short-Drop Catch + Reverse Valley Dash ---
// Safe rest ledge (checkpointSafe: true, but NOT a checkpoint so total checkpoints === 2!)
chSurface(chStage1, 1800, -440, 185, 'grass', { id: 'C1-T2-CP', tier: 2, checkpointSafe: true, previous: 'C1-T1-P7', nextTarget: 'C1-T2-P1', role: '2층 숲가지 안전 쉼터 (비세이브 휴식처)' });

chSurface(chStage1, 2110, -595, 66, 'grass', { id: 'C1-T2-P1', tier: 2, useSmallVisual: true, previous: 'C1-T2-CP', nextTarget: 'C1-T2-P2', role: '정밀 #1 · 우상향 대각선 2단점프(w=66)' });
chSurface(chStage1, 2400, -750, 60, 'grass', { id: 'C1-T2-P2', tier: 2, useSmallVisual: true, previous: 'C1-T2-P1', nextTarget: 'C1-T2-P3', role: '정밀 #2 · 좌상향 반전 도약 출발점(w=60)' });
chSurface(chStage1, 2120, -905, 56, 'grass', { id: 'C1-T2-P3', tier: 2, useSmallVisual: true, previous: 'C1-T2-P2', nextTarget: 'C1-T2-P4', role: '정밀 #3 · 좌상향 역방향 착지(w=56)' });
chSurface(chStage1, 2420, -1060, 52, 'grass', { id: 'C1-T2-P4', tier: 2, useSmallVisual: true, previous: 'C1-T2-P3', nextTarget: 'C1-T2-P5', role: '정밀 #4 · 우상향 반전 착지(w=52)' });
chSurface(chStage1, 2090, -1185, 48, 'grass', { id: 'C1-T2-P5', tier: 2, useSmallVisual: true, previous: 'C1-T2-P4', nextTarget: 'C1-T2-P6', role: '정밀 #5 · 역방향 362px 대시 도약 출발점(w=48)' });
chSurface(chStage1, 2240, -445, 130, 'grass', { id: 'C1-T2-REC', tier: 2, previous: 'C1-T2-P3', nextTarget: 'C1-T2-P1', role: '낙하 회복 · 2층 실수 시 3단 재등반 수용 발판' });

// 362px Reverse Leftward Dash-and-Brake to C1-T2-P6 (w=46)
chSurface(chStage1, 1682, -1210, 46, 'grass', { id: 'C1-T2-P6', tier: 2, useSmallVisual: true, previous: 'C1-T2-P5', nextTarget: 'C1-T2-P7', role: '제동 · 역방향 362px 대시 후 우향 역제동 착지(w=46)' });
chSurface(chStage1, 1390, -1350, 50, 'grass', { id: 'C1-T2-P7', tier: 2, useSmallVisual: true, previous: 'C1-T2-P6', nextTarget: 'C1-T3-CP', role: '높이 · 중간 체크포인트 연결 도약(w=50)' });

// --- Midpoint Checkpoint #2 (y = -1,480 -> 2,060px above 580 = exact 50.1% of 4,110px total climb!) ---
chSurface(chStage1, 1030, -1480, 180, 'grass', { id: 'C1-T3-CP', tier: 3, checkpointSafe: true, previous: 'C1-T2-P7', nextTarget: 'C1-T3-P1', role: '중층 50% 고도 체크포인트 쉼터 (#2/2)' });
chCheckpoint(chStage1, 1120, -1480, '중층 수관 쉼터', '1단계 50% 고도 중간 체크포인트 (#2/2)');

// --- Tier 3 (y = -1,480 -> -2,235): Upper Canopy Micro-Precision Perches (w = 38 ~ 54px) ---
chSurface(chStage1, 735, -1635, 54, 'grass', { id: 'C1-T3-P1', tier: 3, useSmallVisual: true, previous: 'C1-T3-CP', nextTarget: 'C1-T3-P2', role: '상층 반전 #1 · 좌상향 54px 정밀 착지(dY=-155)' });
chSurface(chStage1, 1035, -1795, 50, 'grass', { id: 'C1-T3-P2', tier: 3, useSmallVisual: true, previous: 'C1-T3-P1', nextTarget: 'C1-T3-P3', role: '상층 반전 #2 · 우상향 50px 정밀 착지(dY=-160)' });
chSurface(chStage1, 725, -1950, 46, 'grass', { id: 'C1-T3-P3', tier: 3, useSmallVisual: true, previous: 'C1-T3-P2', nextTarget: 'C1-T3-P4', role: '상층 반전 #3 · 좌상향 46px 정밀 착지(dY=-155)' });
chSurface(chStage1, 1040, -2105, 44, 'grass', { id: 'C1-T3-P4', tier: 3, useSmallVisual: true, previous: 'C1-T3-P3', nextTarget: 'C1-T3-P5', role: '상층 반전 #4 · 우상향 44px 정밀 착지(dY=-155)' });
chSurface(chStage1, 1365, -2200, 42, 'grass', { id: 'C1-T3-P5', tier: 3, useSmallVisual: true, previous: 'C1-T3-P4', nextTarget: 'C1-T3-P6', role: '상층 제동 #5 · 우향 42px 정밀 징검다리' });
chSurface(chStage1, 1685, -2215, 38, 'grass', { id: 'C1-T3-P6', tier: 3, useSmallVisual: true, previous: 'C1-T3-P5', nextTarget: 'C1-T3-P7', role: '상층 도약점 · 38px 초정밀 발판(355px 대시 출발)' });
chSurface(chStage1, 1510, -1855, 115, 'grass', { id: 'C1-T3-REC', tier: 3, previous: 'C1-T3-P6', nextTarget: 'C1-T3-P3', role: '낙하 회복 · 3층 실패 시 3단 재등반 수용 발판' });
chSurface(chStage1, 2078, -2230, 42, 'grass', { id: 'C1-T3-P7', tier: 3, useSmallVisual: true, previous: 'C1-T3-P6', nextTarget: 'C1-T4-P1', role: '3층 통과 · 355px 대시 후 역제동 42px 착지판' });

// --- Tier 4 (y = -2,230 -> -3,530): 1.5x Vertical Expansion + Summit Mandatory Dual Long-Distance Air-Dash Courses A & B ---
chSurface(chStage1, 1810, -2385, 48, 'grass', { id: 'C1-T4-P1', tier: 4, useSmallVisual: true, previous: 'C1-T3-P7', nextTarget: 'C1-T4-P2', role: '4층 도입 · 좌상향 역방향 2단점프(dY=-155, w=48)' });
chSurface(chStage1, 2095, -2540, 46, 'grass', { id: 'C1-T4-P2', tier: 4, useSmallVisual: true, previous: 'C1-T4-P1', nextTarget: 'C1-T4-P3', role: '4층 반전 · 우상향 정밀 착지(dY=-155, w=46)' });
chSurface(chStage1, 1795, -2695, 44, 'grass', { id: 'C1-T4-P3', tier: 4, useSmallVisual: true, previous: 'C1-T4-P2', nextTarget: 'C1-T4-P4', role: '4층 반전 · 좌상향 정밀 착지(dY=-155, w=44)' });
chSurface(chStage1, 1485, -2845, 44, 'grass', { id: 'C1-T4-P4', tier: 4, useSmallVisual: true, previous: 'C1-T4-P3', nextTarget: 'C1-T4-P5', role: '4층 응용 · 좌상향 연속 도약(dY=-150, w=44)' });
chSurface(chStage1, 1210, -2965, 52, 'grass', { id: 'C1-T4-P5', tier: 4, useSmallVisual: true, previous: 'C1-T4-P4', nextTarget: 'C1-TOP-A-START', role: '4층 정렬 · 최상단 장거리 코스 A 진입 징검다리(w=52)' });

// [Gate 2 Section 3-2] TOP COURSE A — Rightward Mandatory Air-Dash + Short Reverse Counter-Brake
// Launch: C1-TOP-A-START (x=920..966, y=-3085, w=46) -> Land: C1-TOP-A-LAND (x=1328..1372, y=-3110, w=44)
// Edge-to-edge gap = 362px, dY = -25px. 2-Jump alone maxes out at x=1292 (<1310, IMPOSSIBLE without dash).
// Unbraked 2-jump+dash overshoots x=1390; requires 2-jump + air-dash + micro leftward counter-brake!
chSurface(chStage1, 920, -3085, 46, 'grass', { id: 'C1-TOP-A-START', tier: 4, useSmallVisual: true, previous: 'C1-T4-P5', nextTarget: 'C1-TOP-A-LAND', role: '최상단 코스 A 출발 · 우향 362px 대시 필수 도약대(w=46)' });
chSurface(chStage1, 1140, -2790, 96, 'grass', { id: 'C1-TOP-A-REC1', tier: 4, previous: 'C1-TOP-A-START', nextTarget: 'C1-T4-P4', role: '코스 A 회복 · 도약 실패 시 2~3단 복귀 수용 발판' });
chSurface(chStage1, 1328, -3110, 44, 'grass', { id: 'C1-TOP-A-LAND', tier: 4, useSmallVisual: true, previous: 'C1-TOP-A-START', nextTarget: 'C1-TOP-MID1', role: '최상단 코스 A 도착 · 우향 2단점프+대시+역제동 44px 착지판' });

// High-altitude direction turnaround climb from Course A to Course B
chSurface(chStage1, 1610, -3255, 46, 'grass', { id: 'C1-TOP-MID1', tier: 4, useSmallVisual: true, previous: 'C1-TOP-A-LAND', nextTarget: 'C1-TOP-B-START', role: '최상단 전환 징검다리 · 코스 B 역방향 도약대 상승 연결(w=46)' });

// [Gate 2 Section 3-2] TOP COURSE B — Reverse Leftward Mandatory Air-Dash + Apex Fine Control onto Narrower Perch
// Launch: C1-TOP-B-START (x=1880..1924, y=-3395, w=44) -> Land: C1-TOP-B-LAND (x=1470..1510, y=-3435, w=40)
// Edge-to-edge leftward gap = 370px, dY = -40px, narrower w=40px perch!
// 2-Jump alone reaches only x=1554 (>1528, IMPOSSIBLE without dash). Different elevation/timing from Course A!
chSurface(chStage1, 1880, -3395, 44, 'grass', { id: 'C1-TOP-B-START', tier: 4, useSmallVisual: true, previous: 'C1-TOP-MID1', nextTarget: 'C1-TOP-B-LAND', role: '최상단 코스 B 출발 · 좌향 역방향 370px(dY=-40) 대시 필수 도약대(w=44)' });
chSurface(chStage1, 1640, -3105, 92, 'grass', { id: 'C1-TOP-B-REC1', tier: 4, previous: 'C1-TOP-B-START', nextTarget: 'C1-TOP-MID1', role: '코스 B 회복 · 역방향 도약 실패 시 2단 재등반 수용 발판' });
chSurface(chStage1, 1470, -3435, 40, 'grass', { id: 'C1-TOP-B-LAND', tier: 4, useSmallVisual: true, previous: 'C1-TOP-B-START', nextTarget: 'C1-GOAL-DECK', role: '최상단 코스 B 도착 · 좌향 2단점프+정점대시+미세제동 40px 초정밀 착지판' });

// Summit Goal Deck at y = -3,530 (Total Vertical Rise = 580 - (-3530) = 4,110px = 1.50x!)
chSurface(chStage1, 1080, -3530, 240, 'grass', { id: 'C1-GOAL-DECK', tier: 4, checkpointSafe: true, previous: 'C1-TOP-B-LAND', nextTarget: 'STAGE-2', role: '보상 · 1단계 완주 최상단 출구 테라스(y=-3530)' });
chStage1.goal = { x: 1140, y: -3530, w: 120, h: 165, label: '1단계 출구' };

addStageProp(chStage1, { id: 'C1-PROP-TREE1', assetType: 'DECORATION', layer: 'background', key: 'forest/decoration_tree_a', x: 180, anchorBottom: 580, walkOffset: 340, scale: 0.58, rawW: 260, rawH: 360 });
addStageProp(chStage1, { id: 'C1-PROP-TREE2', assetType: 'DECORATION', layer: 'background', key: 'forest/decoration_tree_b', x: 1890, anchorBottom: -440, walkOffset: 340, scale: 0.54, rawW: 260, rawH: 360 });
challengeLevels.push(chStage1);


// ============================================================================
// CHALLENGE STAGE 2: <진압반의 징검다리> (Gates 1, 3, 5: y = 580 -> -2,900, Rise = 3,480px, 2 Checkpoints)
// ============================================================================
const chStage2 = makeChallengeStage(
  'CH-S2', 2, '2단계 · 진압반의 징검다리',
  '1.5배 수직 확장(y=580→-2900) · 전폭 경비 순찰 10기 · 방패 넉백 장벽 6기 · 점멸 중계판',
  1600, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -3220 }
);

// --- Tier 1 (y = 580 -> -210): Guard Bridges + Blink Relay Ascent ---
chFloor(chStage2, 80, 1440, 580, { id: 'C2-START', tier: 1, previous: 'NONE', nextTarget: 'C2-T1-P1', role: '2단계 수직 등반 출발지 (체크포인트 #1)' });
// Checkpoint #1 (Start)
chCheckpoint(chStage2, 220, 580, '징검다리 입구', '2단계 시작 체크포인트 (#1/2)');

chSurface(chStage2, 390, 445, 115, 'grass', { id: 'C2-T1-P1', tier: 1, useSmallVisual: true, previous: 'C2-START', nextTarget: 'C2-T1-GRD1', role: '1층 도입 발판' });
chSurface(chStage2, 640, 320, 235, 'grass', { id: 'C2-T1-GRD1', tier: 1, previous: 'C2-T1-P1', nextTarget: 'C2-T1-GRD2', role: '1층 제1경비 전폭 순찰 교량(CG-01)' });
chSurface(chStage2, 1020, 180, 240, 'grass', { id: 'C2-T1-GRD2', tier: 1, previous: 'C2-T1-GRD1', nextTarget: 'C2-T1-BLINK1', role: '1층 제2경비 전폭 순찰 교량(CG-02)' });
chSurface(chStage2, 740, 35, 120, 'grass', {
  id: 'C2-T1-BLINK1', tier: 1, behavior: 'blink', fastBlink: true,
  blink: { on: 1.35, warning: 0.42, off: 1.10, phase: 0.30 },
  previous: 'C2-T1-GRD2', nextTarget: 'C2-T1-GRD3', role: '1층 좌상향 점멸 중계판 #1'
});
chSurface(chStage2, 380, -90, 235, 'grass', { id: 'C2-T1-GRD3', tier: 1, previous: 'C2-T1-BLINK1', nextTarget: 'C2-CP1', role: '1층 제3경비 전폭 역위상 교량(CG-03)' });

// --- Tier 2 (y = -210 -> -1,160): Shield Knockback Barriers + Full-Platform Guard Patrol ---
// Safe rest outpost (checkpointSafe: true, NOT a checkpoint so total checkpoints === 2!)
chSurface(chStage2, 110, -210, 220, 'grass', { id: 'C2-CP1', tier: 2, checkpointSafe: true, previous: 'C2-T1-GRD3', nextTarget: 'C2-T2-LONG1', role: '2층 좌측 초소 안전 쉼터 (비세이브)' });

chSurface(chStage2, 450, -345, 280, 'grass', { id: 'C2-T2-LONG1', tier: 2, previous: 'C2-CP1', nextTarget: 'C2-T2-STEP', role: '2층 장형 교량 #1 (KB-01 관통 + CG-04 양끝 순찰)' });
chSurface(chStage2, 850, -475, 110, 'grass', { id: 'C2-T2-STEP', tier: 2, useSmallVisual: true, previous: 'C2-T2-LONG1', nextTarget: 'C2-T2-LONG2', role: '2층 중계 발판' });
chSurface(chStage2, 1060, -605, 280, 'grass', { id: 'C2-T2-LONG2', tier: 2, previous: 'C2-T2-STEP', nextTarget: 'C2-T2-BLINK2', role: '2층 장형 교량 #2 (KB-02 관통 + CG-05 양끝 순찰)' });
chSurface(chStage2, 780, -745, 120, 'grass', {
  id: 'C2-T2-BLINK2', tier: 2, behavior: 'blink', fastBlink: true,
  blink: { on: 1.30, warning: 0.40, off: 1.15, phase: 1.10 },
  previous: 'C2-T2-LONG2', nextTarget: 'C2-T3-REST', role: '2층 좌상향 점멸 중계판 #2'
});

// --- Tier 3 (y = -880 -> -1,735): Midpoint Checkpoint #2 + Blink Survival + Guard Bridges ---
chSurface(chStage2, 420, -880, 220, 'grass', { id: 'C2-T3-REST', tier: 3, checkpointSafe: true, previous: 'C2-T2-BLINK2', nextTarget: 'C2-T3-GRD1', role: '3층 진입 안전 쉼터 (비세이브)' });
chSurface(chStage2, 160, -1025, 240, 'grass', { id: 'C2-T3-GRD1', tier: 3, previous: 'C2-T3-REST', nextTarget: 'C2-CP2', role: '3층 점멸 대기 경비 교량(CG-06 양끝 순찰)' });

// Checkpoint #2 at y = -1,160 (1,740px above 580 = exact 50.0% of 3,480px total vertical climb!)
chSurface(chStage2, 460, -1160, 210, 'grass', { id: 'C2-CP2', tier: 3, checkpointSafe: true, previous: 'C2-T3-GRD1', nextTarget: 'C2-T3-BLINK1', role: '중층 50% 고도 전술 초소 체크포인트 (#2/2)' });
chCheckpoint(chStage2, 565, -1160, '중층 전술 초소', '2단계 50% 고도 중간 체크포인트 (#2/2)');

chSurface(chStage2, 760, -1300, 118, 'grass', {
  id: 'C2-T3-BLINK1', tier: 3, behavior: 'blink', fastBlink: true,
  blink: { on: 1.25, warning: 0.40, off: 1.15, phase: 0.50 },
  previous: 'C2-CP2', nextTarget: 'C2-T3-FINAL', role: '3층 점멸 중계판 #1'
});
chSurface(chStage2, 1020, -1445, 275, 'grass', { id: 'C2-T3-FINAL', tier: 3, previous: 'C2-T3-BLINK1', nextTarget: 'C2-T3-BLINK2', role: '3층 관문 교량(KB-03 관통 + CG-07 양끝 순찰)' });
chSurface(chStage2, 740, -1590, 118, 'grass', {
  id: 'C2-T3-BLINK2', tier: 3, behavior: 'blink', fastBlink: true,
  blink: { on: 1.25, warning: 0.40, off: 1.15, phase: 1.55 },
  previous: 'C2-T3-FINAL', nextTarget: 'C2-T3-EXIT', role: '3층 좌상향 점멸 중계판 #2'
});
chSurface(chStage2, 460, -1735, 115, 'grass', { id: 'C2-T3-EXIT', tier: 3, useSmallVisual: true, previous: 'C2-T3-BLINK2', nextTarget: 'C2-T4-GRD1', role: '4층 연결 도약 발판' });

// --- Tier 4 & Tier 5 (y = -1,880 -> -2,900): 1.5x Vertical Expansion Composite Guard + Barrier + Blink Climb ---
chSurface(chStage2, 140, -1880, 275, 'grass', { id: 'C2-T4-GRD1', tier: 4, previous: 'C2-T3-EXIT', nextTarget: 'C2-T4-BLINK1', role: '4층 제1장형 교량(KB-04 관통 + CG-08 양끝 순찰)' });
chSurface(chStage2, 510, -2025, 116, 'grass', {
  id: 'C2-T4-BLINK1', tier: 4, behavior: 'blink', fastBlink: true,
  blink: { on: 1.28, warning: 0.40, off: 1.12, phase: 0.35 },
  previous: 'C2-T4-GRD1', nextTarget: 'C2-T4-GRD2', role: '4층 우상향 점멸 중계판 #1'
});
chSurface(chStage2, 740, -2170, 280, 'grass', { id: 'C2-T4-GRD2', tier: 4, previous: 'C2-T4-BLINK1', nextTarget: 'C2-T4-BLINK2', role: '4층 제2장형 교량(KB-05 관통 + CG-09 양끝 순찰)' });
chSurface(chStage2, 1130, -2315, 116, 'grass', {
  id: 'C2-T4-BLINK2', tier: 4, behavior: 'blink', fastBlink: true,
  blink: { on: 1.28, warning: 0.40, off: 1.12, phase: 1.25 },
  previous: 'C2-T4-GRD2', nextTarget: 'C2-T5-REST', role: '4층 우상향 점멸 중계판 #2'
});
chSurface(chStage2, 1220, -2455, 195, 'grass', { id: 'C2-T5-REST', tier: 5, checkpointSafe: true, previous: 'C2-T4-BLINK2', nextTarget: 'C2-T5-GRD1', role: '5층 진입 안전 쉼터 (비세이브)' });
chSurface(chStage2, 820, -2600, 285, 'grass', { id: 'C2-T5-GRD1', tier: 5, previous: 'C2-T5-REST', nextTarget: 'C2-T5-BLINK1', role: '5층 최종 관문 교량(KB-06 관통 + CG-10 양끝 순찰)' });
chSurface(chStage2, 560, -2750, 114, 'grass', {
  id: 'C2-T5-BLINK1', tier: 5, behavior: 'blink', fastBlink: true,
  blink: { on: 1.25, warning: 0.40, off: 1.10, phase: 0.75 },
  previous: 'C2-T5-GRD1', nextTarget: 'C2-GOAL-DECK', role: '5층 최상단 출구 진입 점멸 중계판'
});

// Summit Goal Deck at y = -2,900 (Total Vertical Rise = 580 - (-2900) = 3,480px = 1.50x!)
chSurface(chStage2, 180, -2900, 250, 'grass', { id: 'C2-GOAL-DECK', tier: 5, checkpointSafe: true, previous: 'C2-T5-BLINK1', nextTarget: 'STAGE-3', role: '보상 · 2단계 완주 최상단 출구 테라스(y=-2900)' });
chStage2.goal = { x: 250, y: -2900, w: 110, h: 165, label: '2단계 출구' };

// Anti-skip vertical baffle walls (noTopLand: true) preventing direct vertical bypass without blocking normal path
chSurface(chStage2, 340, -620, 36, 'grass', { id: 'C2-ANTI-SKIP-1', tier: 2, h: 210, thin: false, wall: true, noTopLand: true, previous: 'NONE', nextTarget: 'NONE', role: '2→3층 우회 차단 세로벽(상단 착지 불가)' });
chSurface(chStage2, 680, -1920, 36, 'grass', { id: 'C2-ANTI-SKIP-2', tier: 4, h: 210, thin: false, wall: true, noTopLand: true, previous: 'NONE', nextTarget: 'NONE', role: '3→4층 우회 차단 세로벽(상단 착지 불가)' });

chStage2.guards = [
  { id: 'CG-01', kind: 'guard1', platformId: 'C2-T1-GRD1', edgeMargin: 26, startX: 820, dir: -1, speed: 168, waitTime: 0.42, warnTime: 0.36, knockVX: 320 },
  { id: 'CG-02', kind: 'guard2', platformId: 'C2-T1-GRD2', edgeMargin: 26, startX: 1210, dir: -1, speed: 182, waitTime: 0.40, warnTime: 0.35, knockVX: 320 },
  { id: 'CG-03', kind: 'guard1', platformId: 'C2-T1-GRD3', edgeMargin: 26, startX: 430, dir: 1, speed: 175, waitTime: 0.40, warnTime: 0.35, knockVX: 320 },
  { id: 'CG-04', kind: 'guard2', platformId: 'C2-T2-LONG1', edgeMargin: 26, startX: 690, dir: -1, speed: 184, waitTime: 0.38, warnTime: 0.34, knockVX: 320 },
  { id: 'CG-05', kind: 'guard1', platformId: 'C2-T2-LONG2', edgeMargin: 26, startX: 1300, dir: -1, speed: 188, waitTime: 0.38, warnTime: 0.34, knockVX: 320 },
  { id: 'CG-06', kind: 'guard2', platformId: 'C2-T3-GRD1', edgeMargin: 26, startX: 350, dir: -1, speed: 185, waitTime: 0.38, warnTime: 0.35, knockVX: 320 },
  { id: 'CG-07', kind: 'guard2', platformId: 'C2-T3-FINAL', edgeMargin: 26, startX: 1255, dir: -1, speed: 192, waitTime: 0.36, warnTime: 0.34, knockVX: 320 },
  { id: 'CG-08', kind: 'guard1', platformId: 'C2-T4-GRD1', edgeMargin: 26, startX: 375, dir: -1, speed: 188, waitTime: 0.36, warnTime: 0.34, knockVX: 320 },
  { id: 'CG-09', kind: 'guard2', platformId: 'C2-T4-GRD2', edgeMargin: 26, startX: 980, dir: -1, speed: 194, waitTime: 0.35, warnTime: 0.33, knockVX: 320 },
  { id: 'CG-10', kind: 'guard2', platformId: 'C2-T5-GRD1', edgeMargin: 26, startX: 1065, dir: -1, speed: 198, waitTime: 0.35, warnTime: 0.33, knockVX: 320 }
];

chStage2.barriers = [
  { id: 'KB-01', platformId: 'C2-T2-LONG1', localX: 140, width: 28, height: 58, activeDur: 1.35, warnDur: 0.42, offDur: 1.05, phase: 0.20, knockVX: 320 },
  { id: 'KB-02', platformId: 'C2-T2-LONG2', localX: 140, width: 28, height: 58, activeDur: 1.35, warnDur: 0.42, offDur: 1.05, phase: 1.15, knockVX: 320 },
  { id: 'KB-03', platformId: 'C2-T3-FINAL', localX: 138, width: 28, height: 58, activeDur: 1.30, warnDur: 0.40, offDur: 1.00, phase: 0.60, knockVX: 320 },
  { id: 'KB-04', platformId: 'C2-T4-GRD1', localX: 138, width: 28, height: 58, activeDur: 1.30, warnDur: 0.40, offDur: 1.02, phase: 0.40, knockVX: 320 },
  { id: 'KB-05', platformId: 'C2-T4-GRD2', localX: 140, width: 28, height: 58, activeDur: 1.28, warnDur: 0.40, offDur: 1.00, phase: 1.30, knockVX: 320 },
  { id: 'KB-06', platformId: 'C2-T5-GRD1', localX: 142, width: 28, height: 58, activeDur: 1.25, warnDur: 0.40, offDur: 1.00, phase: 0.85, knockVX: 320 }
];

challengeLevels.push(chStage2);


// ============================================================================
// CHALLENGE STAGE 3: <마요의 바람총 숲> (Gates 1, 4, 5: y = 580 -> -2,030, Rise = 2,610px, 2 Checkpoints)
// - Preserves 1st-floor course under MAYO-C1 (y=270, dartY=216, 910px/s).
// - Synchronizes MAYO-C2 (y=-660, dartY=-714, 950px/s) and MAYO-C3 (y=-1750, dartY=-1804, 990px/s).
// - Exposes 6 / 9 traversal perches on Tier 2 to MAYO-C2 dartY=-714; checkpoint P4 stays safe.
// - Exposes 7 / 9 traversal perches on Tier 3 to MAYO-C3 dartY=-1804; P6 upper shelter stays safe.
//   intentional respites retained at `C3-A2-P4` (mid checkpoint), `C3-A2-P6` (high lane), and `C3-A3-P6` (high lane); formerly safe low perches P1/P4/P8 now swept by darts.
// ============================================================================
const chStage3 = makeChallengeStage(
  'CH-S3', 3, '3단계 · 마요의 바람총 숲',
  'TEST21 대비 실제 상승고도 1.5배(1740→2610px) · 1층 보존 · 2·3층 탄도 노출 강화(체크포인트 2개)',
  3600, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -2350 }
);

// Non-collidable perches for the 3 Fixed Mayo Turrets (synchronized with expanded Tier 2 & Tier 3 elevations!)
chSurface(chStage3, 40, 270, 110, 'grass', { id: 'C3-TURRET-P1', tier: 1, collidable: false, nonCollidable: true, challenge: 'turret', previous: 'NONE', nextTarget: 'NONE', role: 'MAYO-C1 1층 우향 고정 포대 대좌(비충돌, y=270, 탄도 y=216)' });
chSurface(chStage3, 3440, -660, 110, 'grass', { id: 'C3-TURRET-P2', tier: 2, collidable: false, nonCollidable: true, challenge: 'turret', previous: 'NONE', nextTarget: 'NONE', role: 'MAYO-C2 2층 좌향 고정 포대 대좌(비충돌, y=-660, 탄도 y=-714)' });
chSurface(chStage3, 40, -1750, 110, 'grass', { id: 'C3-TURRET-P3', tier: 3, collidable: false, nonCollidable: true, challenge: 'turret', previous: 'NONE', nextTarget: 'NONE', role: 'MAYO-C3 3층 우향 고정 포대 대좌(비충돌, y=-1750, 탄도 y=-1804)' });

// Tier Separation Ceilings (`noTopLand: true` + 540~645px vertical separation to the tier above so skipping is 100% impossible!)
chSurface(chStage3, 0, 85, 2680, 'grass', { id: 'C3-TIER1-ROOF', tier: 1, h: 38, thin: false, wall: true, noTopLand: true, previous: 'NONE', nextTarget: 'NONE', role: '1층 상부 차단 천장(x=0..2680, 상면 착지 불가)' });
chSurface(chStage3, 560, -1030, 3040, 'grass', { id: 'C3-TIER2-ROOF', tier: 2, h: 38, thin: false, wall: true, noTopLand: true, previous: 'NONE', nextTarget: 'NONE', role: '2층 상부 차단 천장(x=560..3600, 상면 착지 불가 · 3층과 645px 이격)' });

// --- Act 1 (1st Floor — Praised Course Preserved: x = 160 -> 3040, y = 580 -> 185, under C3-TIER1-ROOF y=85) ---
chFloor(chStage3, 160, 210, 580, { id: 'C3-START', tier: 1, previous: 'NONE', nextTarget: 'C3-A1-P1', role: '1층 진입 안전 테라스 (체크포인트 #1)' });
// Checkpoint #1 (Start)
chCheckpoint(chStage3, 255, 580, '바람총 숲 입구', '3단계 1층 시작 체크포인트 (#1/2)');

chSurface(chStage3, 470, 450, 76, 'grass', { id: 'C3-A1-P1', tier: 1, useSmallVisual: true, previous: 'C3-START', nextTarget: 'C3-A1-P2', role: '1층 도입 발판 #1' });
chSurface(chStage3, 730, 330, 74, 'grass', { id: 'C3-A1-P2', tier: 1, useSmallVisual: true, previous: 'C3-A1-P1', nextTarget: 'C3-A1-P3', role: '대기 · C1 탄도(y=216) 하방 관찰 안전 발판' });
chSurface(chStage3, 995, 250, 68, 'grass', { id: 'C3-A1-P3', tier: 1, useSmallVisual: true, previous: 'C3-A1-P2', nextTarget: 'C3-A1-P4', role: '위협 · C1(910px/s) 사선 관통 발판 #1' });
chSurface(chStage3, 1280, 235, 68, 'grass', { id: 'C3-A1-P4', tier: 1, useSmallVisual: true, previous: 'C3-A1-P3', nextTarget: 'C3-A1-P5', role: '위협 · C1 사선 관통 발판 #2' });
chSurface(chStage3, 1575, 310, 72, 'grass', { id: 'C3-A1-P5', tier: 1, useSmallVisual: true, previous: 'C3-A1-P4', nextTarget: 'C3-A1-P6', role: '중간 숨고르기 · C1 사선 하방 안전 발판' });
chSurface(chStage3, 1870, 240, 68, 'grass', { id: 'C3-A1-P6', tier: 1, useSmallVisual: true, previous: 'C3-A1-P5', nextTarget: 'C3-A1-P7', role: '위협 · C1 사선 재진입 발판 #3' });
chSurface(chStage3, 2170, 225, 66, 'grass', { id: 'C3-A1-P7', tier: 1, useSmallVisual: true, previous: 'C3-A1-P6', nextTarget: 'C3-A1-P8', role: '위협 · C1 사선 고속 돌파 발판 #4' });
chSurface(chStage3, 2475, 250, 68, 'grass', { id: 'C3-A1-P8', tier: 1, useSmallVisual: true, previous: 'C3-A1-P7', nextTarget: 'C3-A1-P9', role: '위협 · 1층 천장(x=2680) 탈출 전방 발판' });
chSurface(chStage3, 2765, 185, 74, 'grass', { id: 'C3-A1-P9', tier: 1, useSmallVisual: true, previous: 'C3-A1-P8', nextTarget: 'C3-A1-UP1', role: '상승 · 우측 개구부(x>2680) 진입 발판' });

// Right-Side Vertical Ascent Shaft (y = 185 -> -460, 4 vertical steps)
chSurface(chStage3, 2980, 45, 76, 'grass', { id: 'C3-A1-UP1', tier: 1, useSmallVisual: true, previous: 'C3-A1-P9', nextTarget: 'C3-A1-UP2', role: '우측 수직 상승 징검다리 #1(y=45)' });
chSurface(chStage3, 2770, -90, 74, 'grass', { id: 'C3-A1-UP2', tier: 1, useSmallVisual: true, previous: 'C3-A1-UP1', nextTarget: 'C3-A1-UP3', role: '우측 수직 상승 징검다리 #2(y=-90)' });
chSurface(chStage3, 3010, -225, 72, 'grass', { id: 'C3-A1-UP3', tier: 1, useSmallVisual: true, previous: 'C3-A1-UP2', nextTarget: 'C3-A1-UP4', role: '우측 수직 상승 징검다리 #3(y=-225)' });
chSurface(chStage3, 2790, -355, 70, 'grass', { id: 'C3-A1-UP4', tier: 1, useSmallVisual: true, previous: 'C3-A1-UP3', nextTarget: 'C3-CP1', role: '우측 수직 상승 징검다리 #4(y=-355)' });

// East Turnaround Safe Deck (checkpointSafe: true, NOT a checkpoint per Gate 5!)
chSurface(chStage3, 3040, -460, 185, 'grass', { id: 'C3-CP1', tier: 2, checkpointSafe: true, previous: 'C3-A1-UP4', nextTarget: 'C3-A2-P1', role: '동쪽 회랑 반환 안전 쉼터 (Act 2 좌향 출발점 · 비세이브)' });

// --- Act 2 (2nd Floor — Leftward Traverse under MAYO-C2 dartY=-714: 4 Mandatory Exposed Perches + Safe Shelters) ---
chSurface(chStage3, 2810, -650, 68, 'grass', { id: 'C3-A2-P1', tier: 2, useSmallVisual: true, exposedToTurret: 'MAYO-C2', previous: 'C3-CP1', nextTarget: 'C3-A2-P2', role: '2층 첫 사선 진입 · 입구에서 190px 상승 후 탄도 내 착지' });
chSurface(chStage3, 2520, -685, 66, 'grass', { id: 'C3-A2-P2', tier: 2, useSmallVisual: true, exposedToTurret: 'MAYO-C2', previous: 'C3-A2-P1', nextTarget: 'C3-A2-P3', role: '2층 탄도 정면 노출 #1 · 정지 대기 시 피격' });
chSurface(chStage3, 2215, -695, 64, 'grass', { id: 'C3-A2-P3', tier: 2, useSmallVisual: true, exposedToTurret: 'MAYO-C2', previous: 'C3-A2-P2', nextTarget: 'C3-A2-P4', role: '2층 탄도 정면 노출 #2 · 정지 대기 시 피격' });

// Checkpoint #2 at 2nd-Floor Midpoint Safe Shelter (y = -595, safely below dartY=-714!)
chSurface(chStage3, 1850, -595, 150, 'grass', { id: 'C3-A2-P4', tier: 2, checkpointSafe: true, previous: 'C3-A2-P3', nextTarget: 'C3-A2-P5', role: '2층 중앙 안전 쉼터 · 중간 체크포인트 (#2/2, 탄도 하방 안전지대)' });
chCheckpoint(chStage3, 1925, -595, '2층 중앙 안전 쉼터', '3단계 2층 중반 중간 체크포인트 (#2/2)');

chSurface(chStage3, 1575, -692, 64, 'grass', { id: 'C3-A2-P5', tier: 2, useSmallVisual: true, exposedToTurret: 'MAYO-C2', previous: 'C3-A2-P4', nextTarget: 'C3-A2-P6', role: '2층 중반 사선 재진입 · 안전 쉼터 후 즉시 탄도 노출' });
chSurface(chStage3, 1290, -775, 64, 'grass', { id: 'C3-A2-P6', tier: 2, useSmallVisual: true, previous: 'C3-A2-P5', nextTarget: 'C3-A2-P7', role: '2층 상방 도약 · 탄도 상부 통과 징검다리(y=-775)' });
chSurface(chStage3, 1005, -688, 64, 'grass', { id: 'C3-A2-P7', tier: 2, useSmallVisual: true, exposedToTurret: 'MAYO-C2', previous: 'C3-A2-P6', nextTarget: 'C3-A2-P8', role: '2층 후반 탄도 노출 · 고속 이동 요구' });
chSurface(chStage3, 715, -700, 64, 'grass', { id: 'C3-A2-P8', tier: 2, useSmallVisual: true, exposedToTurret: 'MAYO-C2', previous: 'C3-A2-P7', nextTarget: 'C3-A2-P9', role: '2층 후반 연속 탄도 노출 · 이전 상공 무풍 대기발판 교정' });
chSurface(chStage3, 430, -885, 68, 'grass', { id: 'C3-A2-P9', tier: 2, useSmallVisual: true, previous: 'C3-A2-P8', nextTarget: 'C3-A2-UP1', role: '상승 전환 · 좌측 개구부(x<560) 통과 발판(y=-885)' });

// Left-Side Vertical Ascent Shaft (y = -885 -> -1,560, 4 vertical steps)
chSurface(chStage3, 190, -1025, 76, 'grass', { id: 'C3-A2-UP1', tier: 2, useSmallVisual: true, previous: 'C3-A2-P9', nextTarget: 'C3-A2-UP2', role: '좌측 수직 상승 징검다리 #1(y=-1025)' });
chSurface(chStage3, 385, -1165, 74, 'grass', { id: 'C3-A2-UP2', tier: 2, useSmallVisual: true, previous: 'C3-A2-UP1', nextTarget: 'C3-A2-UP3', role: '좌측 수직 상승 징검다리 #2(y=-1165)' });
chSurface(chStage3, 175, -1305, 72, 'grass', { id: 'C3-A2-UP3', tier: 2, useSmallVisual: true, previous: 'C3-A2-UP2', nextTarget: 'C3-A2-UP4', role: '좌측 수직 상승 징검다리 #3(y=-1305)' });
chSurface(chStage3, 380, -1440, 70, 'grass', { id: 'C3-A2-UP4', tier: 2, useSmallVisual: true, previous: 'C3-A2-UP3', nextTarget: 'C3-CP2', role: '좌측 수직 상승 징검다리 #4(y=-1440)' });

// West Turnaround Safe Deck (checkpointSafe: true, NOT a checkpoint per Gate 5!)
chSurface(chStage3, 165, -1560, 180, 'grass', { id: 'C3-CP2', tier: 3, checkpointSafe: true, previous: 'C3-A2-UP4', nextTarget: 'C3-A3-P1', role: '서쪽 수관 반환 안전 쉼터 (Act 3 우향 출발점 · 비세이브)' });

// --- Act 3 (3rd Floor — Rightward Finale under MAYO-C3 dartY=-1804: 4 Mandatory Exposed Perches + Safe Shelters -> y=-2,030) ---
chSurface(chStage3, 520, -1750, 68, 'grass', { id: 'C3-A3-P1', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', previous: 'C3-CP2', nextTarget: 'C3-A3-P2', role: '3층 첫 사선 진입 · 반환점에서 190px 상승 후 탄도 내 착지' });
chSurface(chStage3, 815, -1772, 66, 'grass', { id: 'C3-A3-P2', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', previous: 'C3-A3-P1', nextTarget: 'C3-A3-P3', role: '3층 탄도 노출 #1 · 정지 대기 시 피격' });
chSurface(chStage3, 1115, -1784, 64, 'grass', { id: 'C3-A3-P3', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', previous: 'C3-A3-P2', nextTarget: 'C3-A3-P4', role: '3층 탄도 노출 #2 · 정지 대기 시 피격' });
chSurface(chStage3, 1420, -1776, 76, 'grass', { id: 'C3-A3-P4', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', checkpointSafe: true, previous: 'C3-A3-P3', nextTarget: 'C3-A3-P5', role: '3층 중반 탄도 노출 · 기존 하방 영구 안전 쉼터 제거' });
chSurface(chStage3, 1730, -1781, 64, 'grass', { id: 'C3-A3-P5', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', previous: 'C3-A3-P4', nextTarget: 'C3-A3-P6', role: '3층 중반 탄도 노출 #3 · 신속한 점프·대시 필요' });
chSurface(chStage3, 2035, -1875, 62, 'grass', { id: 'C3-A3-P6', tier: 3, useSmallVisual: true, previous: 'C3-A3-P5', nextTarget: 'C3-A3-P7', role: '3층 상방 도약 · 탄도 상부 통과 발판(y=-1875)' });
chSurface(chStage3, 2340, -1772, 62, 'grass', { id: 'C3-A3-P7', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', previous: 'C3-A3-P6', nextTarget: 'C3-A3-P8', role: '3층 후반 탄도 노출 · 상방 회피 발판 이후 재진입' });
chSurface(chStage3, 2640, -1786, 60, 'grass', { id: 'C3-A3-P8', tier: 3, useSmallVisual: true, exposedToTurret: 'MAYO-C3', previous: 'C3-A3-P7', nextTarget: 'C3-A3-P9', role: '3층 후반 탄도 노출 · 기존 상공 무풍 대기발판 교정' });
chSurface(chStage3, 2925, -1995, 58, 'grass', { id: 'C3-A3-P9', tier: 3, useSmallVisual: true, previous: 'C3-A3-P8', nextTarget: 'C3-GOAL-DECK', role: '정상 등반 #2 · 최상단 출구 전방 정밀 착지판(y=-1995)' });

// Summit Goal Deck at y = -2,030 (Total Vertical Rise = 580 - (-2030) = 2,610px = 1.50x!)
chSurface(chStage3, 3190, -2030, 220, 'grass', { id: 'C3-GOAL-DECK', tier: 3, checkpointSafe: true, previous: 'C3-A3-P9', nextTarget: 'CHALLENGE-CLEAR', role: '보상 · 3단계 최종 완주 출구 테라스(y=-2030)' });
chStage3.goal = { x: 3265, y: -2030, w: 120, h: 165, label: '인내의 숲 정복!' };

chStage3.turrets = [
  {
    id: 'MAYO-C1', lane: 'low', platformId: 'C3-TURRET-P1',
    x: 95, y: 270, face: 1, muzzleOffsetY: -54, // dartY = 216 (shoots RIGHT at 910 px/s across Act 1)
    minCooldown: 1.65, maxCooldown: 2.25, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: 910, minX: 95, maxX: 3520, seedOffset: 101, initialDelay: 0.45
  },
  {
    id: 'MAYO-C2', lane: 'mid', platformId: 'C3-TURRET-P2',
    x: 3495, y: -660, face: -1, muzzleOffsetY: -54, // dartY = -714 (shoots LEFT at 950 px/s across Act 2)
    minCooldown: 1.48, maxCooldown: 1.92, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: 950, minX: 80, maxX: 3495, seedOffset: 307, initialDelay: 0.90
  },
  {
    id: 'MAYO-C3', lane: 'high', platformId: 'C3-TURRET-P3',
    x: 95, y: -1750, face: 1, muzzleOffsetY: -54, // dartY = -1804 (shoots RIGHT at 990 px/s across Act 3)
    minCooldown: 1.40, maxCooldown: 1.88, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: 990, minX: 95, maxX: 3520, seedOffset: 619, initialDelay: 1.35
  }
];

challengeLevels.push(chStage3);
window.challengeLevels = challengeLevels;
