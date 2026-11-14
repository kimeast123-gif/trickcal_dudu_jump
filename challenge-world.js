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

// [A-1 Fix]: Removed floating C1-PROP-TREE1 (walkOffset:340 > im.height:292 caused 28px mid-air float above C1-T1-START)
// and C1-PROP-TREE2 (walkOffset:340 < im.height:408 caused 37px trunk protrusion below thin platform C1-T2-CP).
// C1-T1-START (x=80, y=580, w=220) and all CH-S1/S2/S3 platforms remain 100% untouched.
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
  { id: 'CG-01', kind: 'guard1', platformId: 'C2-T1-GRD1', edgeMargin: 26, startX: 820, dir: -1, speed: 168, waitTime: 0.42, warnTime: 0.36, knockVX: 416 },
  { id: 'CG-02', kind: 'guard2', platformId: 'C2-T1-GRD2', edgeMargin: 26, startX: 1210, dir: -1, speed: 182, waitTime: 0.40, warnTime: 0.35, knockVX: 416 },
  { id: 'CG-03', kind: 'guard1', platformId: 'C2-T1-GRD3', edgeMargin: 26, startX: 430, dir: 1, speed: 175, waitTime: 0.40, warnTime: 0.35, knockVX: 416 },
  { id: 'CG-04', kind: 'guard2', platformId: 'C2-T2-LONG1', edgeMargin: 26, startX: 690, dir: -1, speed: 184, waitTime: 0.38, warnTime: 0.34, knockVX: 416 },
  { id: 'CG-05', kind: 'guard1', platformId: 'C2-T2-LONG2', edgeMargin: 26, startX: 1300, dir: -1, speed: 188, waitTime: 0.38, warnTime: 0.34, knockVX: 416 },
  { id: 'CG-06', kind: 'guard2', platformId: 'C2-T3-GRD1', edgeMargin: 26, startX: 350, dir: -1, speed: 185, waitTime: 0.38, warnTime: 0.35, knockVX: 416 },
  { id: 'CG-07', kind: 'guard2', platformId: 'C2-T3-FINAL', edgeMargin: 26, startX: 1255, dir: -1, speed: 192, waitTime: 0.36, warnTime: 0.34, knockVX: 416 },
  { id: 'CG-08', kind: 'guard1', platformId: 'C2-T4-GRD1', edgeMargin: 26, startX: 375, dir: -1, speed: 188, waitTime: 0.36, warnTime: 0.34, knockVX: 416 },
  { id: 'CG-09', kind: 'guard2', platformId: 'C2-T4-GRD2', edgeMargin: 26, startX: 980, dir: -1, speed: 194, waitTime: 0.35, warnTime: 0.33, knockVX: 416 },
  { id: 'CG-10', kind: 'guard2', platformId: 'C2-T5-GRD1', edgeMargin: 26, startX: 1065, dir: -1, speed: 198, waitTime: 0.35, warnTime: 0.33, knockVX: 416 }
];

chStage2.barriers = [
  { id: 'KB-01', platformId: 'C2-T2-LONG1', localX: 140, width: 28, height: 58, activeDur: 1.35, warnDur: 0.42, offDur: 1.05, phase: 0.20, knockVX: 416 },
  { id: 'KB-02', platformId: 'C2-T2-LONG2', localX: 140, width: 28, height: 58, activeDur: 1.35, warnDur: 0.42, offDur: 1.05, phase: 1.15, knockVX: 416 },
  { id: 'KB-03', platformId: 'C2-T3-FINAL', localX: 138, width: 28, height: 58, activeDur: 1.30, warnDur: 0.40, offDur: 1.00, phase: 0.60, knockVX: 416 },
  { id: 'KB-04', platformId: 'C2-T4-GRD1', localX: 138, width: 28, height: 58, activeDur: 1.30, warnDur: 0.40, offDur: 1.02, phase: 0.40, knockVX: 416 },
  { id: 'KB-05', platformId: 'C2-T4-GRD2', localX: 140, width: 28, height: 58, activeDur: 1.28, warnDur: 0.40, offDur: 1.00, phase: 1.30, knockVX: 416 },
  { id: 'KB-06', platformId: 'C2-T5-GRD1', localX: 142, width: 28, height: 58, activeDur: 1.25, warnDur: 0.40, offDur: 1.00, phase: 0.85, knockVX: 416 }
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


// ============================================================================
// CHALLENGE DIFFICULTY 2 — STAGE 2-1: <정밀 3층 등반> (`CH-D2-S1`)
// - Strictly implements `두두_기존챌린지_오류수정_난이도2-1_최종제작지시서.md` (§B-1 ~ §B-5)
//   and user original hand-drawn layout `챌린지_난이도2-1_사용자원본손그림.png`:
//   * 1층 (Floor 1): Short left-bottom start perch (`D2-1-START`, w=104) + 3 vertical columns
//     of 5 narrow static perches (`w=48px`, `A01..A05` at x=340, `B01..B05` at x=1200, `C01..C05` at x=2060).
//     Edge-to-edge gap between columns is 812px: blocks low horizontal skip (`A01->B01` max reach 705.5px)
//     while allowing upper-to-lower diagonal glide + air-dash (`A05 y=40 -> B01 y=560` max reach 889.5px).
//     Vertical gap from `B05 (y=40)` to Floor 2 lowest row (`y=-420`) is 460px (> 281.4px double-jump max),
//     preventing direct vertical floor skip without invisible walls!
//   * 2층 (Floor 2): Right ascent column (`R01..R05` at x=2280) + 3 staggered blinking rows (`y=-680, -550, -420`)
//     with phase dispersion (`0.00 / 1.23 / 2.46`) + EXACT CENTER PERMANENT STATIC SAFE PLATFORM
//     (`D2-1-F2-SAFE-CENTER` at x=1190, y=-550, w=84, `behavior: 'static'`, `blink: null`, `collidable: true`)
//     + Left ascent column (`L01..L05` at x=180).
//   * 3층 (Floor 3): Left ascent column (`L01..L05` at x=180, y=-1070..-1590) + launch perch (`D2-1-F3-STEP`)
//     + 5 vertical moving platforms (`D2-1-F3-LIFT-01..05`, `axis: 'y'`, `noGuideLine: true`, zero vertical sky rails)
//     + Top-right safe goal perch (`D2-1-GOAL`, x=2210, y=-1480, w=148).
// ============================================================================
const challengeD2Levels = [];

const chStageD2_1 = makeChallengeStage(
  'CH-D2-S1', 1, '2-1 · 정밀 3층 등반',
  '1층 3열 수직 정밀 등반(대각 활강) · 2층 3열 교차 점멸과 중앙 영구 안전 발판 · 3층 5연속 상하 이동 발판',
  2480, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -1780, maxCamY: 120 }
);
chStageD2_1.difficultyId = 'd2';
chStageD2_1.stageCode = '2-1';
chStageD2_1.startFlag = { x: 112, y: 580 };

// --- 1층 (Floor 1: y = 580 -> 40) ---
chSurface(chStageD2_1, 90, 580, 104, 'grass', {
  id: 'D2-1-START', tier: 1, useSmallVisual: true, checkpointSafe: true,
  previous: 'NONE', nextTarget: 'D2-1-F1-A01', role: '1층 좌하단 시작 발판 (단일 소형 숲 발판)'
});
chCheckpoint(chStageD2_1, 142, 580, '2-1 · 정밀 3층 등반 시작', '1층 좌하단 출발점');

// Column A (x = 340, w = 48, y = 560 -> 40)
chSurface(chStageD2_1, 340, 560, 48, 'grass', { id: 'D2-1-F1-A01', tier: 1, useSmallVisual: true, previous: 'D2-1-START', nextTarget: 'D2-1-F1-A02', role: '1층 제1열(A) 1단 소형 고정 발판' });
chSurface(chStageD2_1, 340, 430, 48, 'grass', { id: 'D2-1-F1-A02', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-A01', nextTarget: 'D2-1-F1-A03', role: '1층 제1열(A) 2단 소형 고정 발판' });
chSurface(chStageD2_1, 340, 300, 48, 'grass', { id: 'D2-1-F1-A03', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-A02', nextTarget: 'D2-1-F1-A04', role: '1층 제1열(A) 3단 소형 고정 발판' });
chSurface(chStageD2_1, 340, 170, 48, 'grass', { id: 'D2-1-F1-A04', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-A03', nextTarget: 'D2-1-F1-A05', role: '1층 제1열(A) 4단 소형 고정 발판' });
chSurface(chStageD2_1, 340,  40, 48, 'grass', { id: 'D2-1-F1-A05', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-A04', nextTarget: 'D2-1-F1-B01', role: '1층 제1열(A) 5단 정상 도약대 (B01 대각 활강 출발점)' });

// Column B (x = 1200, w = 48, y = 560 -> 40; 812px edge gap from Column A blocks A01->B01 horizontal skip!)
chSurface(chStageD2_1, 1200, 560, 48, 'grass', { id: 'D2-1-F1-B01', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-A05', nextTarget: 'D2-1-F1-B02', role: '1층 제2열(B) 1단 착지 발판 (하단 수평 직행 불가 · A05 대각 도달)' });
chSurface(chStageD2_1, 1200, 430, 48, 'grass', { id: 'D2-1-F1-B02', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-B01', nextTarget: 'D2-1-F1-B03', role: '1층 제2열(B) 2단 소형 고정 발판' });
chSurface(chStageD2_1, 1200, 300, 48, 'grass', { id: 'D2-1-F1-B03', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-B02', nextTarget: 'D2-1-F1-B04', role: '1층 제2열(B) 3단 소형 고정 발판' });
chSurface(chStageD2_1, 1200, 170, 48, 'grass', { id: 'D2-1-F1-B04', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-B03', nextTarget: 'D2-1-F1-B05', role: '1층 제2열(B) 4단 소형 고정 발판' });
chSurface(chStageD2_1, 1200,  40, 48, 'grass', { id: 'D2-1-F1-B05', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-B04', nextTarget: 'D2-1-F1-C01', role: '1층 제2열(B) 5단 정상 도약대 (2층 직행 스킵 불가: Δy=460px > 281px)' });

// Column C (x = 2060, w = 48, y = 560 -> 40; 812px edge gap from Column B)
chSurface(chStageD2_1, 2060, 560, 48, 'grass', { id: 'D2-1-F1-C01', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-B05', nextTarget: 'D2-1-F1-C02', role: '1층 제3열(C) 1단 착지 발판 (B05 대각 도달)' });
chSurface(chStageD2_1, 2060, 430, 48, 'grass', { id: 'D2-1-F1-C02', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-C01', nextTarget: 'D2-1-F1-C03', role: '1층 제3열(C) 2단 소형 고정 발판' });
chSurface(chStageD2_1, 2060, 300, 48, 'grass', { id: 'D2-1-F1-C03', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-C02', nextTarget: 'D2-1-F1-C04', role: '1층 제3열(C) 3단 소형 고정 발판' });
chSurface(chStageD2_1, 2060, 170, 48, 'grass', { id: 'D2-1-F1-C04', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-C03', nextTarget: 'D2-1-F1-C05', role: '1층 제3열(C) 4단 소형 고정 발판' });
chSurface(chStageD2_1, 2060,  40, 48, 'grass', { id: 'D2-1-F1-C05', tier: 1, useSmallVisual: true, previous: 'D2-1-F1-C04', nextTarget: 'D2-1-F2-R01', role: '1층 제3열(C) 5단 우상단 연결 발판 (2층 진입)' });

// --- 2층 (Floor 2: y = -160 -> -940) ---
// Right-Side Ascent Column (x = 2280, w = 48)
chSurface(chStageD2_1, 2280, -160, 48, 'grass', { id: 'D2-1-F2-R01', tier: 2, useSmallVisual: true, previous: 'D2-1-F1-C05', nextTarget: 'D2-1-F2-R02', role: '2층 우측 진입열 1단 고정 발판' });
chSurface(chStageD2_1, 2280, -290, 48, 'grass', { id: 'D2-1-F2-R02', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-R01', nextTarget: 'D2-1-F2-R03', role: '2층 우측 진입열 2단 고정 발판' });
chSurface(chStageD2_1, 2280, -420, 48, 'grass', { id: 'D2-1-F2-R03', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-R02', nextTarget: 'D2-1-F2-R04', role: '2층 우측 진입열 3단 고정 발판 (하단 점멸줄 높이)' });
chSurface(chStageD2_1, 2280, -550, 48, 'grass', { id: 'D2-1-F2-R04', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-R03', nextTarget: 'D2-1-F2-R05', role: '2층 우측 진입열 4단 고정 발판 (중단 점멸줄 높이)' });
chSurface(chStageD2_1, 2280, -680, 48, 'grass', { id: 'D2-1-F2-R05', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-R04', nextTarget: 'D2-1-F2-BLINK-R1-01', role: '2층 우측 진입열 5단 출발 발판 (상단 점멸줄 높이)' });

// Center 3-Row Blinking Band + Exact Center Permanent Static Safe Platform (`D2-1-F2-SAFE-CENTER`)
// Every single blinking platform (10 total) has its own independent phase & cycle timing (zero row-wide synchronous blinking!).
// Row 1 (Upper Row, y = -680 — individual phases: 0.00, 2.35, 1.28, 2.74)
chSurface(chStageD2_1, 1910, -680, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R1-01', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.15, warning: 0.55, off: 1.00, phase: 0.00 },
  previous: 'D2-1-F2-R05', nextTarget: 'D2-1-F2-BLINK-R2-01', role: '2층 상단열 개별 점멸 발판 #1 (phase 0.00)'
});
chSurface(chStageD2_1, 1430, -680, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R1-02', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.05, warning: 0.55, off: 1.05, phase: 2.35 },
  previous: 'D2-1-F2-BLINK-R2-01', nextTarget: 'D2-1-F2-SAFE-CENTER', role: '2층 상단열 개별 점멸 발판 #2 (phase 2.35)'
});
chSurface(chStageD2_1,  950, -680, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R1-03', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.15, warning: 0.55, off: 1.00, phase: 1.28 },
  previous: 'D2-1-F2-SAFE-CENTER', nextTarget: 'D2-1-F2-BLINK-R2-02', role: '2층 상단열 개별 점멸 발판 #3 (phase 1.28)'
});
chSurface(chStageD2_1,  490, -680, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R1-04', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.10, warning: 0.55, off: 1.05, phase: 2.74 },
  previous: 'D2-1-F2-BLINK-R2-02', nextTarget: 'D2-1-F2-L03', role: '2층 상단열 개별 점멸 발판 #4 (phase 2.74)'
});

// Row 2 (Middle Row, y = -550 — individual phases: 0.92 and 2.18; CENTER IS PERMANENT STATIC SAFE PLATFORM!)
chSurface(chStageD2_1, 1670, -550, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R2-01', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.20, warning: 0.55, off: 1.00, phase: 0.92 },
  previous: 'D2-1-F2-BLINK-R1-01', nextTarget: 'D2-1-F2-SAFE-CENTER', role: '2층 중단열 우측 개별 점멸 발판 (phase 0.92)'
});
chSurface(chStageD2_1, 1190, -550, 84, 'grass', {
  id: 'D2-1-F2-SAFE-CENTER', tier: 2, useSmallVisual: true, behavior: 'static', blink: null, collidable: true, checkpointSafe: true,
  previous: 'D2-1-F2-BLINK-R2-01', nextTarget: 'D2-1-F2-BLINK-R2-02', role: '2층 정중앙 영구 고정 안전 발판 (비점멸 · 상시 충돌 활성)'
});
chSurface(chStageD2_1,  720, -550, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R2-02', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.20, warning: 0.55, off: 1.00, phase: 2.18 },
  previous: 'D2-1-F2-SAFE-CENTER', nextTarget: 'D2-1-F2-BLINK-R1-04', role: '2층 중단열 좌측 개별 점멸 발판 (phase 2.18)'
});

// Row 3 (Lower Row, y = -420 — individual phases: 1.85, 0.52, 3.10, 0.88)
chSurface(chStageD2_1, 1910, -420, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R3-01', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.10, warning: 0.55, off: 1.05, phase: 1.85 },
  previous: 'D2-1-F2-R03', nextTarget: 'D2-1-F2-BLINK-R2-01', role: '2층 하단열 개별 점멸 발판 #1 (phase 1.85)'
});
chSurface(chStageD2_1, 1430, -420, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R3-02', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.15, warning: 0.55, off: 1.00, phase: 0.52 },
  previous: 'D2-1-F2-BLINK-R2-01', nextTarget: 'D2-1-F2-SAFE-CENTER', role: '2층 하단열 개별 점멸 발판 #2 (phase 0.52)'
});
chSurface(chStageD2_1,  950, -420, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R3-03', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.08, warning: 0.55, off: 1.02, phase: 3.10 },
  previous: 'D2-1-F2-SAFE-CENTER', nextTarget: 'D2-1-F2-BLINK-R2-02', role: '2층 하단열 개별 점멸 발판 #3 (phase 3.10)'
});
chSurface(chStageD2_1,  490, -420, 78, 'grass', {
  id: 'D2-1-F2-BLINK-R3-04', tier: 2, useSmallVisual: true, behavior: 'blink', fastBlink: true,
  blink: { on: 2.12, warning: 0.55, off: 1.03, phase: 0.88 },
  previous: 'D2-1-F2-BLINK-R2-02', nextTarget: 'D2-1-F2-L01', role: '2층 하단열 개별 점멸 발판 #4 (phase 0.88)'
});

// Left-Side Ascent Column of Floor 2 (x = 180, w = 48, y = -420 -> -940)
chSurface(chStageD2_1, 180, -420, 48, 'grass', { id: 'D2-1-F2-L01', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-BLINK-R3-04', nextTarget: 'D2-1-F2-L02', role: '2층 좌측 상승열 1단 고정 발판' });
chSurface(chStageD2_1, 180, -550, 48, 'grass', { id: 'D2-1-F2-L02', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-L01', nextTarget: 'D2-1-F2-L03', role: '2층 좌측 상승열 2단 고정 발판' });
chSurface(chStageD2_1, 180, -680, 48, 'grass', { id: 'D2-1-F2-L03', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-L02', nextTarget: 'D2-1-F2-L04', role: '2층 좌측 상승열 3단 고정 발판' });
chSurface(chStageD2_1, 180, -810, 48, 'grass', { id: 'D2-1-F2-L04', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-L03', nextTarget: 'D2-1-F2-L05', role: '2층 좌측 상승열 4단 고정 발판' });
chSurface(chStageD2_1, 180, -940, 48, 'grass', { id: 'D2-1-F2-L05', tier: 2, useSmallVisual: true, previous: 'D2-1-F2-L04', nextTarget: 'D2-1-F3-L01', role: '2층 좌측 상승열 5단 연결 발판 (3층 진입)' });

// --- 3층 (Floor 3: y = -1070 -> -1590, 5 Vertical Moving Platforms -> Goal at y = -1480) ---
// Left-Side Ascent Column of Floor 3 (x = 180, w = 48, y = -1070 -> -1590)
chSurface(chStageD2_1, 180, -1070, 48, 'grass', { id: 'D2-1-F3-L01', tier: 3, useSmallVisual: true, previous: 'D2-1-F2-L05', nextTarget: 'D2-1-F3-L02', role: '3층 좌측 진입열 1단 고정 발판' });
chSurface(chStageD2_1, 180, -1200, 48, 'grass', { id: 'D2-1-F3-L02', tier: 3, useSmallVisual: true, previous: 'D2-1-F3-L01', nextTarget: 'D2-1-F3-L03', role: '3층 좌측 진입열 2단 고정 발판' });
chSurface(chStageD2_1, 180, -1330, 48, 'grass', { id: 'D2-1-F3-L03', tier: 3, useSmallVisual: true, previous: 'D2-1-F3-L02', nextTarget: 'D2-1-F3-L04', role: '3층 좌측 진입열 3단 고정 발판' });
chSurface(chStageD2_1, 180, -1460, 48, 'grass', { id: 'D2-1-F3-L04', tier: 3, useSmallVisual: true, previous: 'D2-1-F3-L03', nextTarget: 'D2-1-F3-L05', role: '3층 좌측 진입열 4단 고정 발판' });
chSurface(chStageD2_1, 180, -1590, 48, 'grass', { id: 'D2-1-F3-L05', tier: 3, useSmallVisual: true, previous: 'D2-1-F3-L04', nextTarget: 'D2-1-F3-STEP', role: '3층 좌측 진입열 5단 최상단 발판' });

// Launch Step Perch before the 5 Vertical Moving Platforms
chSurface(chStageD2_1, 370, -1360, 52, 'grass', { id: 'D2-1-F3-STEP', tier: 3, useSmallVisual: true, previous: 'D2-1-F3-L04', nextTarget: 'D2-1-F3-LIFT-01', role: '3층 상하 이동 발판 구간 진입 고정 디딤판' });

// 5 Vertical Moving Platforms (`axis: 'y'`, `noGuideLine: true` — zero drawn vertical rail lines in sky!)
chSurface(chStageD2_1,  640, -1380, 54, 'grass', {
  id: 'D2-1-F3-LIFT-01', tier: 3, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  motion: { axis: 'y', range: 135, period: 3.20, phase: -1.10 },
  previous: 'D2-1-F3-STEP', nextTarget: 'D2-1-F3-LIFT-02', role: '3층 상하 이동 발판 #1 (수직 왕복 ±135px · 무레일)'
});
chSurface(chStageD2_1,  960, -1380, 54, 'grass', {
  id: 'D2-1-F3-LIFT-02', tier: 3, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  motion: { axis: 'y', range: 135, period: 3.40, phase: 1.10 },
  previous: 'D2-1-F3-LIFT-01', nextTarget: 'D2-1-F3-LIFT-03', role: '3층 상하 이동 발판 #2 (수직 왕복 ±135px · 역위상 · 무레일)'
});
chSurface(chStageD2_1, 1280, -1380, 54, 'grass', {
  id: 'D2-1-F3-LIFT-03', tier: 3, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  motion: { axis: 'y', range: 135, period: 3.10, phase: -0.90 },
  previous: 'D2-1-F3-LIFT-02', nextTarget: 'D2-1-F3-LIFT-04', role: '3층 상하 이동 발판 #3 (수직 왕복 ±135px · 무레일)'
});
chSurface(chStageD2_1, 1600, -1380, 54, 'grass', {
  id: 'D2-1-F3-LIFT-04', tier: 3, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  motion: { axis: 'y', range: 135, period: 3.50, phase: 1.20 },
  previous: 'D2-1-F3-LIFT-03', nextTarget: 'D2-1-F3-LIFT-05', role: '3층 상하 이동 발판 #4 (수직 왕복 ±135px · 역위상 · 무레일)'
});
chSurface(chStageD2_1, 1920, -1380, 54, 'grass', {
  id: 'D2-1-F3-LIFT-05', tier: 3, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  motion: { axis: 'y', range: 135, period: 3.20, phase: -1.00 },
  previous: 'D2-1-F3-LIFT-04', nextTarget: 'D2-1-GOAL', role: '3층 상하 이동 발판 #5 (수직 왕복 ±135px · 골인 도약 · 무레일)'
});

// Top-Right Goal Platform (`D2-1-GOAL`)
chSurface(chStageD2_1, 2210, -1480, 148, 'grass', {
  id: 'D2-1-GOAL', tier: 3, useSmallVisual: true, checkpointSafe: true,
  previous: 'D2-1-F3-LIFT-05', nextTarget: 'CHALLENGE-D2-1-CLEAR', role: '3층 우상단 최종 골인 안전 발판'
});
chStageD2_1.goal = { x: 2236, y: -1480, w: 96, h: 126, label: '2-1 정상 골인!' };

challengeD2Levels.push(chStageD2_1);
window.challengeD2Levels = challengeD2Levels;


// ============================================================================
// CHALLENGE DIFFICULTY 2 — STAGE 2-2: <가시 덩굴과 순찰 교량> (`CH-D2-S2`)
// - Strictly implements `두두_챌린지_난이도2-2_최종제작지시서.md` and `01_챌린지_2-2_사용자원본손그림.png`
// - Preserves `CH-D2-S1` (`2-1`) 100% frozen.
// - Separates provisional hazard settings (`D2_2_HAZARD_CONFIG`) for user QA confirmation (§3-3).
// ============================================================================
const D2_2_HAZARD_CONFIG = {
  // [미확정 1 — 사용자 QA 확정 대기]: 큰 빨간 타원 5개의 적대 캐릭터 종류 (기본값: 기존 챌린지 순찰형 guard1/guard2 재사용)
  ovalPatrolHazardType: 'challenge_guard_patrol',
  regionBPatrolKinds: ['guard1', 'guard2'],
  regionDPatrolKinds: ['guard1', 'guard2', 'guard1'],
  // [미확정 2 — 사용자 QA 확정 대기]: 가시 접촉 피해 효과 및 중간 체크포인트 유무 (기본값: 기존 챌린지 피격 넉백·무적 규약, 넉백 30% 강화 반영)
  spikePenaltyMode: 'challenge_knockback_hit', // 'challenge_knockback_hit' | 'checkpoint_respawn'
  spikeKnockForce: 416, // +30% knockback force (guarantees immediate fall on Floor 1 148~152px platforms)
  spikeStunSec: 1.10,
  spikeSpriteKey: 'tentacle_idle',
  spikeDisplaySize: 54,
  spikeHalfWidth: 7,
  spikeHitHeight: 22,
  enableMidCheckpoint: false
};
window.D2_2_HAZARD_CONFIG = D2_2_HAZARD_CONFIG;

const chStageD2_2 = makeChallengeStage(
  'CH-D2-S2', 2, '2-2 · 가시 덩굴과 순찰 교량',
  'A 하단 2열 가시 정밀 도약(상단 가시 이단점프 제약) · B 중하단 2개 순찰 가시 교량 · C 중앙 지그재그 장거리 반전 상승 · D 상하부 점프 막이 장형 가시 교량과 3기 순찰 돌파',
  2160, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -1820, maxCamY: 120 }
);
chStageD2_2.difficultyId = 'd2';
chStageD2_2.stageCode = '2-2';
chStageD2_2.startFlag = { x: 118, y: 580 };
chStageD2_2.spikes = [];

function addChSpike(stg, id, platformId, localX, orientation = 'up', sketchRegion = 'A', role = '') {
  stg.spikes.push({
    id,
    platformId,
    localX,
    orientation, // 'up' (top surface) | 'down' (underside surface)
    halfW: D2_2_HAZARD_CONFIG.spikeHalfWidth,
    hitH: D2_2_HAZARD_CONFIG.spikeHitHeight,
    displaySize: D2_2_HAZARD_CONFIG.spikeDisplaySize,
    sketchRegion,
    role
  });
}

// --- Region A: 하단 가시 정밀 점프 (y = 580 -> 35) ---
chSurface(chStageD2_2, 90, 580, 128, 'grass', {
  id: 'D2-2-A-START', tier: 1, useSmallVisual: true, checkpointSafe: true,
  sketchRegion: 'A', previous: 'NONE', nextTarget: 'D2-2-A-SPIKEP-01',
  role: '구간 A 좌하단 시작 발판 (초록 깃발 · 스폰 정렬)'
});
chCheckpoint(chStageD2_2, 154, 580, '2-2 · 가시 덩굴과 순찰 교량 시작', '구간 A 좌하단 출발점');

// Region A Bottom Row: 5 Spiked Platforms (y = 490, Left -> Right)
chSurface(chStageD2_2, 330, 490, 152, 'grass', {
  id: 'D2-2-A-SPIKEP-01', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-START', nextTarget: 'D2-2-A-SPIKEP-02',
  role: '구간 A 하단열 가시 발판 #1 (양끝 가시 2개 · 중앙 92px 안전 착지)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-A01-L', 'D2-2-A-SPIKEP-01', 20, 'up', 'A', '하단열 #1 좌측 끝 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-A01-R', 'D2-2-A-SPIKEP-01', 132, 'up', 'A', '하단열 #1 우측 끝 가시');

chSurface(chStageD2_2, 610, 490, 152, 'grass', {
  id: 'D2-2-A-SPIKEP-02', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-SPIKEP-01', nextTarget: 'D2-2-A-SPIKEP-03',
  role: '구간 A 하단열 가시 발판 #2 (중앙 가시 1개 · 좌/우 66px 안전 착지)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-A02-C', 'D2-2-A-SPIKEP-02', 76, 'up', 'A', '하단열 #2 정중앙 가시');

chSurface(chStageD2_2, 890, 490, 152, 'grass', {
  id: 'D2-2-A-SPIKEP-03', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-SPIKEP-02', nextTarget: 'D2-2-A-SPIKEP-04',
  role: '구간 A 하단열 가시 발판 #3 (양끝 가시 2개 · 중앙 92px 안전 착지)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-A03-L', 'D2-2-A-SPIKEP-03', 20, 'up', 'A', '하단열 #3 좌측 끝 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-A03-R', 'D2-2-A-SPIKEP-03', 132, 'up', 'A', '하단열 #3 우측 끝 가시');

chSurface(chStageD2_2, 1170, 490, 152, 'grass', {
  id: 'D2-2-A-SPIKEP-04', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-SPIKEP-03', nextTarget: 'D2-2-A-SPIKEP-05',
  role: '구간 A 하단열 가시 발판 #4 (중앙 가시 1개 · 좌/우 66px 안전 착지)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-A04-C', 'D2-2-A-SPIKEP-04', 76, 'up', 'A', '하단열 #4 정중앙 가시');

chSurface(chStageD2_2, 1450, 490, 152, 'grass', {
  id: 'D2-2-A-SPIKEP-05', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-SPIKEP-04', nextTarget: 'D2-2-A-TURN-R',
  role: '구간 A 하단열 가시 발판 #5 (양끝 가시 2개 · 중앙 92px 안전 착지)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-A05-L', 'D2-2-A-SPIKEP-05', 20, 'up', 'A', '하단열 #5 좌측 끝 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-A05-R', 'D2-2-A-SPIKEP-05', 132, 'up', 'A', '하단열 #5 우측 끝 가시');

// Right Turnaround Step between Bottom Row (y=490) and Upper Row (y=205; Δy=285px > 281.4px blocks direct row skip!)
chSurface(chStageD2_2, 1740, 345, 128, 'grass', {
  id: 'D2-2-A-TURN-R', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-SPIKEP-05', nextTarget: 'D2-2-A-UPPER-04',
  role: '구간 A 우측 상승 반환 발판 (비가시 디딤판)'
});

// Region A Upper Row: 4 Staggered Spiked Platforms (y = 205, Right -> Left)
// Positioned so a high double-jump from the bottom row (y=490) reaches right into the upper row spikes & triggers knockback!
chSurface(chStageD2_2, 1410, 205, 148, 'grass', {
  id: 'D2-2-A-UPPER-04', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-TURN-R', nextTarget: 'D2-2-A-UPPER-03',
  role: '구간 A 상단열 가시 발판 #4 (우측 첫 발판 · 중앙 가시 1개 · 하단 고점프 제약)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-AU4-C', 'D2-2-A-UPPER-04', 74, 'up', 'A', '상단열 #4 정중앙 가시');

chSurface(chStageD2_2, 1110, 205, 148, 'grass', {
  id: 'D2-2-A-UPPER-03', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-UPPER-04', nextTarget: 'D2-2-A-UPPER-02',
  role: '구간 A 상단열 가시 발판 #3 (양끝 가시 2개 · 중앙 안전 · 하단 고점프 제약)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-AU3-L', 'D2-2-A-UPPER-03', 20, 'up', 'A', '상단열 #3 좌측 끝 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-AU3-R', 'D2-2-A-UPPER-03', 128, 'up', 'A', '상단열 #3 우측 끝 가시');

chSurface(chStageD2_2, 810, 205, 148, 'grass', {
  id: 'D2-2-A-UPPER-02', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-UPPER-03', nextTarget: 'D2-2-A-UPPER-01',
  role: '구간 A 상단열 가시 발판 #2 (중앙 가시 1개 · 좌/우 안전 · 하단 고점프 제약)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-AU2-C', 'D2-2-A-UPPER-02', 74, 'up', 'A', '상단열 #2 정중앙 가시');

chSurface(chStageD2_2, 510, 205, 148, 'grass', {
  id: 'D2-2-A-UPPER-01', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-UPPER-02', nextTarget: 'D2-2-A-TURN-L',
  role: '구간 A 상단열 가시 발판 #1 (좌측 끝 · 양끝 가시 2개 · 하단 고점프 제약)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-AU1-L', 'D2-2-A-UPPER-01', 20, 'up', 'A', '상단열 #1 좌측 끝 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-AU1-R', 'D2-2-A-UPPER-01', 128, 'up', 'A', '상단열 #1 우측 끝 가시');

// Left Turnaround Step leading from Region A (y=205) up into Region B (y=-115; Δy=320px > 281.4px blocks direct row skip!)
chSurface(chStageD2_2, 240, 45, 128, 'grass', {
  id: 'D2-2-A-TURN-L', tier: 1, useSmallVisual: true, sketchRegion: 'A',
  previous: 'D2-2-A-UPPER-01', nextTarget: 'D2-2-B-BRIDGE-L',
  role: '구간 A 좌측 상승 반환 발판 (B구간 진입 디딤판)'
});

// --- Region B: 중하단 가시 교량 2개 & 수평 이동 위험 요소 2개 (y = -115) ---
chSurface(chStageD2_2, 500, -115, 410, 'grass', {
  id: 'D2-2-B-BRIDGE-L', tier: 2, sketchRegion: 'B',
  previous: 'D2-2-A-TURN-L', nextTarget: 'D2-2-B-BRIDGE-R',
  role: '구간 B 좌측 장형 가시 교량 (양끝 가시 + 순찰 위험체 D2-2-B-PATROL-L)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-BL-L', 'D2-2-B-BRIDGE-L', 22, 'up', 'B', 'B 좌측 교량 좌단 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-BL-R', 'D2-2-B-BRIDGE-L', 388, 'up', 'B', 'B 좌측 교량 우단 가시');

chSurface(chStageD2_2, 1150, -115, 460, 'grass', {
  id: 'D2-2-B-BRIDGE-R', tier: 2, sketchRegion: 'B',
  previous: 'D2-2-B-BRIDGE-L', nextTarget: 'D2-2-B-TURN-R',
  role: '구간 B 우측 장형 가시 교량 (양끝 가시 + 순찰 위험체 D2-2-B-PATROL-R)'
});
addChSpike(chStageD2_2, 'D2-2-SPK-BR-L', 'D2-2-B-BRIDGE-R', 22, 'up', 'B', 'B 우측 교량 좌단 가시');
addChSpike(chStageD2_2, 'D2-2-SPK-BR-R', 'D2-2-B-BRIDGE-R', 438, 'up', 'B', 'B 우측 교량 우단 가시');

chSurface(chStageD2_2, 1740, -265, 128, 'grass', {
  id: 'D2-2-B-TURN-R', tier: 2, useSmallVisual: true, sketchRegion: 'B',
  previous: 'D2-2-B-BRIDGE-R', nextTarget: 'D2-2-C-RSTEP-01',
  role: '구간 B 우측 상승 전환 발판 (C구간 진입)'
});

// --- Region C: 중앙 지그재그 방향 반전 정밀 상승 (y = -395 -> -1175) ---
// [피드백 3 반영]: 대각선 계단식 3개 플랫폼 중 가장 위쪽 플랫폼(`RSTEP-03`, `LSTEP-03`)을 1개씩 제거하여 장거리 점프 강제!
chSurface(chStageD2_2, 1560, -395, 50, 'grass', {
  id: 'D2-2-C-RSTEP-01', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-B-TURN-R', nextTarget: 'D2-2-C-RSTEP-02',
  role: '구간 C 우측 좌상향 소형 발판 #1'
});
chSurface(chStageD2_2, 1420, -515, 50, 'grass', {
  id: 'D2-2-C-RSTEP-02', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-RSTEP-01', nextTarget: 'D2-2-C-TURN',
  role: '구간 C 우측 좌상향 소형 발판 #2 (최상단 3번째 발판 제거 · 중앙 전환판까지 장거리 좌향 도약 강제)'
});

// Center Turnaround Platform (y = -415; 300px above Region B bridges so direct bottom skip is impossible, plus underside spike!)
chSurface(chStageD2_2, 965, -415, 136, 'grass', {
  id: 'D2-2-C-TURN', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-RSTEP-02', nextTarget: 'D2-2-C-LSTEP-01',
  role: '구간 C 중앙 고정 전환 발판 (아랫면 하부 가시 D2-2-B-UNDER-SPIKE 부착)'
});
addChSpike(chStageD2_2, 'D2-2-B-UNDER-SPIKE', 'D2-2-C-TURN', 68, 'down', 'B/C', '중앙 전환판 아랫면 하부 접촉 위험 가시');

// Center-to-Left Ascending Narrow Steps (topmost 3rd step `LSTEP-03` removed to force long jump onto `D2-2-C-REST-L`!)
chSurface(chStageD2_2, 815, -505, 50, 'grass', {
  id: 'D2-2-C-LSTEP-01', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-TURN', nextTarget: 'D2-2-C-LSTEP-02',
  role: '구간 C 중앙→좌측 상향 소형 발판 #1'
});
chSurface(chStageD2_2, 675, -595, 50, 'grass', {
  id: 'D2-2-C-LSTEP-02', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-LSTEP-01', nextTarget: 'D2-2-C-REST-L',
  role: '구간 C 중앙→좌측 상향 소형 발판 #2 (최상단 3번째 발판 제거 · 좌측 쉼발판까지 장거리 도약 강제)'
});

chSurface(chStageD2_2, 265, -745, 136, 'grass', {
  id: 'D2-2-C-REST-L', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-LSTEP-02', nextTarget: 'D2-2-C-VSTEP-01',
  role: '구간 C 좌측 반환 쉼발판 (장거리 점프 착지)'
});
chSurface(chStageD2_2, 320, -895, 50, 'grass', {
  id: 'D2-2-C-VSTEP-01', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-REST-L', nextTarget: 'D2-2-C-TOP-01',
  role: '구간 C 좌측 수직 디딤 소형 발판'
});

// [피드백 2 반영]: 2층과 3층 사이 천장(`D2-2-D-UNDERSIDE`) 아래 점프 플랫폼 간격 확대 (기존 276px -> 355px 중심 간격, 에지 간격 307px)
chSurface(chStageD2_2, 320, -1045, 48, 'grass', {
  id: 'D2-2-C-TOP-01', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-VSTEP-01', nextTarget: 'D2-2-C-TOP-02',
  role: '구간 C 상부 천장 하단 광간격 소형 발판 #1 (x=320)'
});
chSurface(chStageD2_2, 675, -1053, 48, 'grass', {
  id: 'D2-2-C-TOP-02', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-TOP-01', nextTarget: 'D2-2-C-TOP-03',
  role: '구간 C 상부 천장 하단 광간격 소형 발판 #2 (x=675, 간격 확대)'
});
chSurface(chStageD2_2, 1030, -1061, 48, 'grass', {
  id: 'D2-2-C-TOP-03', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-TOP-02', nextTarget: 'D2-2-C-TOP-04',
  role: '구간 C 상부 천장 하단 광간격 소형 발판 #3 (x=1030, 간격 확대)'
});
chSurface(chStageD2_2, 1385, -1069, 48, 'grass', {
  id: 'D2-2-C-TOP-04', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-TOP-03', nextTarget: 'D2-2-C-TOP-05',
  role: '구간 C 상부 천장 하단 광간격 소형 발판 #4 (x=1385, 간격 확대)'
});
chSurface(chStageD2_2, 1740, -1076, 48, 'grass', {
  id: 'D2-2-C-TOP-05', tier: 3, useSmallVisual: true, sketchRegion: 'C',
  previous: 'D2-2-C-TOP-04', nextTarget: 'D2-2-C-ENTRY-R',
  role: '구간 C 상부 천장 하단 광간격 소형 발판 #5 (x=1740, 간격 확대)'
});

chSurface(chStageD2_2, 1920, -1175, 116, 'grass', {
  id: 'D2-2-C-ENTRY-R', tier: 3, useSmallVisual: true, sketchRegion: 'C/D',
  previous: 'D2-2-C-TOP-05', nextTarget: 'D2-2-D-BRIDGE',
  role: '구간 D 상부 장형 교량 우측 진입 발판'
});

// --- Region D: 상부 장형 가시 교량·하부 막이·상부 이단점프 차단 막이·3개 순찰 위험체·골인 (y = -1265 -> -1605) ---
chSurface(chStageD2_2, 460, -1265, 1360, 'grass', {
  id: 'D2-2-D-BRIDGE', tier: 4, dropThroughDisabled: true, sketchRegion: 'D',
  previous: 'D2-2-C-ENTRY-R', nextTarget: 'D2-2-D-EXIT-01',
  role: '구간 D 상부 연속 장형 가시 교량 (가시 4개 + 3구역 순찰 위험체 3기)'
});

// Integrated Brown Underside Anti-Skip Barrier (`D2-2-D-UNDERSIDE`) fused seamlessly into the bottom of `D2-2-D-BRIDGE`
chSurface(chStageD2_2, 460, -1230, 1360, 'grass', {
  id: 'D2-2-D-UNDERSIDE', tier: 4, h: 26, thin: false, wall: true, ceiling: true, noTopLand: true, underBridgeBarrier: true,
  sketchRegion: 'D', previous: 'NONE', nextTarget: 'NONE',
  role: '구간 D 상부 장형 교량 하부 일체형 갈색 점프 방지 막이 (하방 관통 스킵 차단)'
});

// [피드백 4 반영]: 3층 경비병 3명+가시 교량 상공에 첫 점프 최고점 높이(`y = -1504, h = 26`, 바닥면 `y = -1478`)로 긴 갈색 점프 차단 플랫폼 설치 (이단 점프 시 머리 충돌!)
chSurface(chStageD2_2, 475, -1504, 1330, 'grass', {
  id: 'D2-2-D-OVERHEAD-CEIL', tier: 4, h: 26, thin: false, wall: true, ceiling: true, noTopLand: true, overheadJumpBarrier: true,
  sketchRegion: 'D', previous: 'NONE', nextTarget: 'NONE',
  role: '구간 D 3층 교량 상공 이단점프 차단 긴 갈색 막이 (첫 점프 최고점 y=-1478 정렬 · 이단점프 시 머리 충돌)'
});

addChSpike(chStageD2_2, 'D2-2-SPK-D-01', 'D2-2-D-BRIDGE', 24, 'up', 'D', '상부 장형 교량 좌단 가시 #1');
addChSpike(chStageD2_2, 'D2-2-SPK-D-02', 'D2-2-D-BRIDGE', 460, 'up', 'D', '상부 장형 교량 중좌 가시 #2');
addChSpike(chStageD2_2, 'D2-2-SPK-D-03', 'D2-2-D-BRIDGE', 900, 'up', 'D', '상부 장형 교량 중우 가시 #3');
addChSpike(chStageD2_2, 'D2-2-SPK-D-04', 'D2-2-D-BRIDGE', 1336, 'up', 'D', '상부 장형 교량 우단 가시 #4');

// Left-Top Exit Stair Perches (2 steps outside x < 475) -> Top-Center Goal (`D2-2-D-GOAL`, y = -1605; above overhead barrier!)
chSurface(chStageD2_2, 170, -1385, 132, 'grass', {
  id: 'D2-2-D-EXIT-01', tier: 4, useSmallVisual: true, sketchRegion: 'D',
  previous: 'D2-2-D-BRIDGE', nextTarget: 'D2-2-D-EXIT-02',
  role: '구간 D 좌상단 골인 진입 계단 발판 #1'
});
chSurface(chStageD2_2, 320, -1515, 132, 'grass', {
  id: 'D2-2-D-EXIT-02', tier: 4, useSmallVisual: true, sketchRegion: 'D',
  previous: 'D2-2-D-EXIT-01', nextTarget: 'D2-2-D-GOAL',
  role: '구간 D 좌상단 골인 진입 계단 발판 #2'
});
chSurface(chStageD2_2, 600, -1605, 152, 'grass', {
  id: 'D2-2-D-GOAL', tier: 4, useSmallVisual: true, checkpointSafe: true, sketchRegion: 'D',
  previous: 'D2-2-D-EXIT-02', nextTarget: 'CHALLENGE-D2-2-CLEAR',
  role: '구간 D 상단 중앙 최종 골인 발판'
});
chStageD2_2.goal = { x: 628, y: -1605, w: 96, h: 126, label: '2-2 정상 골인!' };

// 5 Horizontal Patrol Hazards (knockVX increased by +30%: 300 -> 390)
chStageD2_2.guards = [
  {
    id: 'D2-2-B-PATROL-L',
    kind: D2_2_HAZARD_CONFIG.regionBPatrolKinds[0],
    platformId: 'D2-2-B-BRIDGE-L',
    minX: 556, maxX: 854, startX: 740,
    dir: -1, speed: 165, waitTime: 0.40, warnTime: 0.35, phase: 0.00, knockVX: 390,
    sketchRegion: 'B', hidePatrolLine: true,
    role: '구간 B 좌측 교량 수평 순찰 위험체 #1 (임시 guard1 · 넉백 30% 증가)'
  },
  {
    id: 'D2-2-B-PATROL-R',
    kind: D2_2_HAZARD_CONFIG.regionBPatrolKinds[1],
    platformId: 'D2-2-B-BRIDGE-R',
    minX: 1206, maxX: 1554, startX: 1410,
    dir: -1, speed: 172, waitTime: 0.38, warnTime: 0.34, phase: 0.65, knockVX: 390,
    sketchRegion: 'B', hidePatrolLine: true,
    role: '구간 B 우측 교량 수평 순찰 위험체 #2 (임시 guard2 · 넉백 30% 증가)'
  },
  {
    id: 'D2-2-D-PATROL-01',
    kind: D2_2_HAZARD_CONFIG.regionDPatrolKinds[0],
    platformId: 'D2-2-D-BRIDGE',
    minX: 525, maxX: 880, startX: 575,
    dir: 1, speed: 166, waitTime: 0.38, warnTime: 0.34, phase: 0.00, knockVX: 390,
    sketchRegion: 'D', hidePatrolLine: true,
    role: '구간 D 상부 장형 교량 좌측 구역 순찰 위험체 #1 (임시 guard1 · 넉백 30% 증가)'
  },
  {
    id: 'D2-2-D-PATROL-02',
    kind: D2_2_HAZARD_CONFIG.regionDPatrolKinds[1],
    platformId: 'D2-2-D-BRIDGE',
    minX: 960, maxX: 1320, startX: 1180,
    dir: -1, speed: 178, waitTime: 0.35, warnTime: 0.32, phase: 0.90, knockVX: 390,
    sketchRegion: 'D', hidePatrolLine: true,
    role: '구간 D 상부 장형 교량 중앙 구역 순찰 위험체 #2 (임시 guard2 · 넉백 30% 증가)'
  },
  {
    id: 'D2-2-D-PATROL-03',
    kind: D2_2_HAZARD_CONFIG.regionDPatrolKinds[2],
    platformId: 'D2-2-D-BRIDGE',
    minX: 1400, maxX: 1755, startX: 1690,
    dir: -1, speed: 170, waitTime: 0.40, warnTime: 0.35, phase: 1.75, knockVX: 390,
    sketchRegion: 'D', hidePatrolLine: true,
    role: '구간 D 상부 장형 교량 우측 구역 순찰 위험체 #3 (임시 guard1 · 넉백 30% 증가)'
  }
];

challengeD2Levels.push(chStageD2_2);


// ============================================================================
// CHALLENGE DIFFICULTY 2 — STAGE 2-3: <바람총 회랑과 쌍둥이 승강대> (`CH-D2-S3`)
// - Strictly implements `두두_챌린지_난이도2-3_최종상세제작지시서.md` and `01_챌린지_2-3_사용자원본손그림.png` (920x1412)
// - Preserves `CH-S1`~`CH-S3`, `CH-D2-S1` (`2-1`), and `CH-D2-S2` (`2-2`) 100% frozen.
// - Structure:
//   * A구간 (하단 4회 수평 왕복 플랫폼 & 마요 4명 & H4 부착 가시 1개):
//     - `D2-3-START` (하단 중앙 스폰 고정 발판, x=810, y=580, w=140)
//     - `D2-3-H1` (좌→우 수평 왕복, y=410) + 좌측 마요 `D2-3-M1` (→ 수평 바람총, vy=0)
//     - `D2-3-H2` (우→좌 수평 왕복, y=220) + 우측 마요 `D2-3-M2` (← 수평 바람총, vy=0)
//     - `D2-3-H3` (좌→우 수평 왕복, y=30)  + 좌측 마요 `D2-3-M3` (→ 수평 바람총, vy=0)
//     - `D2-3-H4` (우→좌 수평 왕복, y=-160) + 상면 중앙 부착 가시 1개(`D2-3-H4-SPIKE`, 플랫폼과 동반 이동) + 우측 마요 `D2-3-M4` (← 수평 바람총, vy=0)
//   * B구간 (중상단 전환 고정 징검발판 5개 & 우측 서로 다른 높이 마요 2명):
//     - 좌/우 하단 전환 발판 `D2-3-B-LOW-L`, `D2-3-B-LOW-R` + 삼각 징검발판 `D2-3-B-STEP-L`, `D2-3-B-STEP-R`, `D2-3-B-STEP-C`
//     - 우측 마요 2명 `D2-3-M5` (하단 ←), `D2-3-M6` (상단 ←)
//   * C구간 (최상단 좌측 마요 2명·우측 마요 1명 + 유사 속도 수직 왕복 발판 2개 + 중앙 고정 차단 구조물 + 상단 중앙 골인):
//     - 중앙 고정 차단 구조물 없음 (사용자 QA 요청에 따라 제거됨)
//     - 좌측 수직 왕복 발판 `D2-3-VL` (axis='y', range=220, period=4.80, 평균속도 183.3px/s)
//     - 우측 수직 왕복 발판 `D2-3-VR` (axis='y', range=220, period=5.00, 평균속도 176.0px/s · 속도차 4.0%)
//     - 좌측 마요 2명 `D2-3-M7` (하단 →), `D2-3-M8` (상단 →) + 우측 마요 1명 `D2-3-M9` (상단 ←)
//     - 최상단 중앙 골인 발판 `D2-3-GOAL` (x=790, y=-1330, w=180) 및 골인 게이트
// ============================================================================
const D2_3_HAZARD_CONFIG = {
  dartSpeedA: 860,
  dartSpeedB: 880,
  dartSpeedC: 900,
  muzzleOffsetY: -54,
  warnTime: 0.36,
  attackDur: 0.42,
  spikeHalfWidth: 7,
  spikeHitHeight: 22,
  spikeDisplaySize: 54
};
window.D2_3_HAZARD_CONFIG = D2_3_HAZARD_CONFIG;

const chStageD2_3 = makeChallengeStage(
  'CH-D2-S3', 3, '2-3 · 바람총 회랑과 쌍둥이 승강대',
  'A 4단 교차 수평 왕복 발판과 마요 바람총 · B 우측 2열 바람총 징검다리 · C 중앙 차단문과 좌우 쌍둥이 수직 승강대 돌파',
  1280, { killY: 820, cameraProfile: 'challenge_vertical', minCamY: -1560, maxCamY: 120 }
);
chStageD2_3.difficultyId = 'd2';
chStageD2_3.stageCode = '2-3';
chStageD2_3.startFlag = { x: 602, y: 580 };
chStageD2_3.spikes = [];
chStageD2_3.turrets = [];

// --- A구간: 하단 중앙 스폰 및 4개 수평 왕복 플랫폼 (y = 580 -> -160) ---
chSurface(chStageD2_3, 570, 580, 140, 'grass', {
  id: 'D2-3-START', tier: 1, useSmallVisual: true, checkpointSafe: true,
  sketchRegion: 'A', previous: 'NONE', nextTarget: 'D2-3-H1',
  role: 'A구간 하단 중앙 진입/스폰 고정 발판'
});
chCheckpoint(chStageD2_3, 640, 580, '2-3 · 바람총 회랑과 쌍둥이 승강대 시작', 'A구간 하단 중앙 출발점');

// H1: 좌측 출발 -> 우측 이동 수평 왕복 발판 (y = 410, minX = 210, maxX = 960, startX = 210, dir = +1)
chSurface(chStageD2_3, 585, 410, 124, 'grass', {
  id: 'D2-3-H1', tier: 1, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  sketchRegion: 'A', startX: 210, minX: 210, maxX: 960, initialDir: 'right',
  motion: { axis: 'x', range: 375, period: 5.60, phase: -Math.PI / 2 },
  previous: 'D2-3-START', nextTarget: 'D2-3-H2',
  role: 'A구간 제1 수평 왕복 발판 (좌→우 초기 진행 · M1 우향 바람총 회피)'
});
chSurface(chStageD2_3, 56, 410, 88, 'grass', {
  id: 'D2-3-M1-PERCH', tier: 1, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'A', previous: 'NONE', nextTarget: 'NONE',
  role: 'M1 좌측 하단 마요 포대 전용 비충돌 받침대'
});

// H2: 우측 출발 -> 좌측 이동 수평 왕복 발판 (y = 220, minX = 220, maxX = 950, startX = 950, dir = -1)
chSurface(chStageD2_3, 585, 220, 120, 'grass', {
  id: 'D2-3-H2', tier: 1, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  sketchRegion: 'A', startX: 950, minX: 220, maxX: 950, initialDir: 'left',
  motion: { axis: 'x', range: 365, period: 5.40, phase: Math.PI / 2 },
  previous: 'D2-3-H1', nextTarget: 'D2-3-H3',
  role: 'A구간 제2 수평 왕복 발판 (우→좌 초기 진행 · M2 좌향 바람총 회피)'
});
chSurface(chStageD2_3, 1116, 220, 88, 'grass', {
  id: 'D2-3-M2-PERCH', tier: 1, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'A', previous: 'NONE', nextTarget: 'NONE',
  role: 'M2 우측 중단 마요 포대 전용 비충돌 받침대'
});

// H3: 좌측 출발 -> 우측 이동 수평 왕복 발판 (y = 30, minX = 210, maxX = 950, startX = 210, dir = +1)
chSurface(chStageD2_3, 580, 30, 116, 'grass', {
  id: 'D2-3-H3', tier: 2, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  sketchRegion: 'A', startX: 210, minX: 210, maxX: 950, initialDir: 'right',
  motion: { axis: 'x', range: 370, period: 5.30, phase: -Math.PI / 2 },
  previous: 'D2-3-H2', nextTarget: 'D2-3-H4',
  role: 'A구간 제3 수평 왕복 발판 (좌→우 초기 진행 · M3 우향 바람총 회피)'
});
chSurface(chStageD2_3, 56, 30, 88, 'grass', {
  id: 'D2-3-M3-PERCH', tier: 2, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'A', previous: 'NONE', nextTarget: 'NONE',
  role: 'M3 좌측 상단 마요 포대 전용 비충돌 받침대'
});

// H4: 우측 출발 -> 좌측 이동 수평 왕복 발판 + 상면 중앙 가시 1개 부착 (y = -160, minX = 220, maxX = 940, startX = 940, dir = -1)
chSurface(chStageD2_3, 580, -160, 124, 'grass', {
  id: 'D2-3-H4', tier: 2, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  sketchRegion: 'A', startX: 940, minX: 220, maxX: 940, initialDir: 'left',
  motion: { axis: 'x', range: 360, period: 5.50, phase: Math.PI / 2 },
  previous: 'D2-3-H3', nextTarget: 'D2-3-B-LOW-L',
  role: 'A구간 제4 수평 왕복 발판 (우→좌 초기 진행 · 상면 중앙 가시 1개 동반 이동 · M4 좌향 바람총 회피)'
});
chStageD2_3.spikes.push({
  id: 'D2-3-H4-SPIKE',
  platformId: 'D2-3-H4',
  localX: 62,
  orientation: 'up',
  halfW: D2_3_HAZARD_CONFIG.spikeHalfWidth,
  hitH: D2_3_HAZARD_CONFIG.spikeHitHeight,
  displaySize: D2_3_HAZARD_CONFIG.spikeDisplaySize,
  sketchRegion: 'A',
  role: '제4 수평 이동 발판(D2-3-H4) 상면 중앙에 부착되어 발판과 함께 이동하는 접촉 가시'
});
chSurface(chStageD2_3, 1106, -160, 88, 'grass', {
  id: 'D2-3-M4-PERCH', tier: 2, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'A', previous: 'NONE', nextTarget: 'NONE',
  role: 'M4 우측 상단 마요 포대 전용 비충돌 받침대'
});

// --- B구간: 중상단 고정 징검발판 5개 & 우측 서로 다른 높이 마요 2명 (y = -370 -> -590) ---
chSurface(chStageD2_3, 370, -355, 116, 'grass', {
  id: 'D2-3-B-LOW-L', tier: 3, useSmallVisual: true, sketchRegion: 'B',
  previous: 'D2-3-H4', nextTarget: 'D2-3-B-STEP-L',
  role: 'B구간 좌측 하단 고정 전환 발판 (M5 탄도 회피)'
});
chSurface(chStageD2_3, 794, -355, 116, 'grass', {
  id: 'D2-3-B-LOW-R', tier: 3, useSmallVisual: true, sketchRegion: 'B',
  previous: 'D2-3-H4', nextTarget: 'D2-3-B-STEP-R',
  role: 'B구간 우측 하단 고정 전환 발판 (M5 탄도 회피)'
});
chSurface(chStageD2_3, 510, -505, 48, 'grass', {
  id: 'D2-3-B-STEP-L', tier: 3, useSmallVisual: true, sketchRegion: 'B',
  previous: 'D2-3-B-LOW-L', nextTarget: 'D2-3-B-STEP-C',
  role: 'B구간 중앙 좌측 소형 징검발판 (M6 탄도 회피)'
});
chSurface(chStageD2_3, 722, -505, 48, 'grass', {
  id: 'D2-3-B-STEP-R', tier: 3, useSmallVisual: true, sketchRegion: 'B',
  previous: 'D2-3-B-LOW-R', nextTarget: 'D2-3-B-STEP-C',
  role: 'B구간 중앙 우측 소형 징검발판 (M6 탄도 회피)'
});
chSurface(chStageD2_3, 616, -590, 48, 'grass', {
  id: 'D2-3-B-STEP-C', tier: 3, useSmallVisual: true, sketchRegion: 'B',
  previous: 'D2-3-B-STEP-L', nextTarget: 'D2-3-VL',
  role: 'B구간 중앙 상단 꼭짓점 소형 징검발판 (C구간 좌/우 수직 발판 진입 분기점)'
});
chSurface(chStageD2_3, 1116, -355, 88, 'grass', {
  id: 'D2-3-M5-PERCH', tier: 3, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'B', previous: 'NONE', nextTarget: 'NONE',
  role: 'M5 B구간 우측 아래 마요 포대 전용 비충돌 받침대'
});
chSurface(chStageD2_3, 1106, -535, 88, 'grass', {
  id: 'D2-3-M6-PERCH', tier: 3, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'B', previous: 'NONE', nextTarget: 'NONE',
  role: 'M6 B구간 우측 위 마요 포대 전용 비충돌 받침대'
});

// --- C구간: 최상단 좌우 마요 3명 + 수직 왕복 플랫폼 2개 + 최상단 골인 (y = -760 -> -1330) ---
// 좌/우 수직 왕복 플랫폼 2개 (`D2-3-VL`, `D2-3-VR` — 평균속도 183.3px/s vs 176.0px/s, 속도차 4.0%)
chSurface(chStageD2_3, 340, -980, 120, 'grass', {
  id: 'D2-3-VL', tier: 4, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  sketchRegion: 'C', minY: -1200, maxY: -760, avgSpeed: 183.3,
  motion: { axis: 'y', range: 220, period: 4.80, phase: 1.35 },
  previous: 'D2-3-B-STEP-C', nextTarget: 'D2-3-GOAL',
  role: 'C구간 중앙 차단면 좌측 수직 왕복 플랫폼 (y=-1200..-760 · 평균 183.3px/s · M7/M8 회피 및 골인 진입)'
});
chSurface(chStageD2_3, 820, -980, 120, 'grass', {
  id: 'D2-3-VR', tier: 4, useSmallVisual: true, behavior: 'moving', noGuideLine: true,
  sketchRegion: 'C', minY: -1200, maxY: -760, avgSpeed: 176.0,
  motion: { axis: 'y', range: 220, period: 5.00, phase: 0.95 },
  previous: 'D2-3-B-STEP-C', nextTarget: 'D2-3-GOAL',
  role: 'C구간 중앙 차단면 우측 수직 왕복 플랫폼 (y=-1200..-760 · 평균 176.0px/s · M9 회피 및 골인 진입)'
});

// C구간 좌측 마요 2명(M7, M8) 및 우측 마요 1명(M9) 받침대
chSurface(chStageD2_3, 96, -790, 88, 'grass', {
  id: 'D2-3-M7-PERCH', tier: 4, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'C', previous: 'NONE', nextTarget: 'NONE',
  role: 'M7 C구간 좌측 아래 마요 포대 전용 비충돌 받침대'
});
chSurface(chStageD2_3, 96, -1010, 88, 'grass', {
  id: 'D2-3-M8-PERCH', tier: 4, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'C', previous: 'NONE', nextTarget: 'NONE',
  role: 'M8 C구간 좌측 위 마요 포대 전용 비충돌 받침대'
});
chSurface(chStageD2_3, 1106, -995, 88, 'grass', {
  id: 'D2-3-M9-PERCH', tier: 4, collidable: false, nonCollidable: true, challenge: 'turret',
  sketchRegion: 'C', previous: 'NONE', nextTarget: 'NONE',
  role: 'M9 C구간 우측 위 마요 포대 전용 비충돌 받침대'
});

// 최상단 중앙 골인 발판 (`D2-3-GOAL`) 및 골인 게이트
chSurface(chStageD2_3, 550, -1330, 180, 'grass', {
  id: 'D2-3-GOAL', tier: 4, useSmallVisual: true, checkpointSafe: true,
  sketchRegion: 'C', previous: 'D2-3-VL', nextTarget: 'CHALLENGE-D2-COMPLETE',
  role: 'C구간 중앙 차단면 상단 최종 골인 고정 발판'
});
chStageD2_3.goal = { x: 592, y: -1330, w: 96, h: 126, label: '2-3 최종 골인!' };

// --- 마요 고정 포대 9명 (`D2-3-M1` ~ `D2-3-M9`, 전원 수평 발사 `vy = 0`) ---
chStageD2_3.turrets = [
  {
    id: 'D2-3-M1', lane: 'A-H1', sketchRegion: 'A', platformId: 'D2-3-M1-PERCH',
    x: 100, y: 410, face: 1, muzzleOffsetY: -54, // dartY = 356 (→)
    minCooldown: 1.75, maxCooldown: 2.25, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedA, minX: 100, maxX: 1240, seedOffset: 201, initialDelay: 0.55,
    role: 'A/H1 좌측 하단 마요 (→ 우향 수평 바람총)'
  },
  {
    id: 'D2-3-M2', lane: 'A-H2', sketchRegion: 'A', platformId: 'D2-3-M2-PERCH',
    x: 1160, y: 220, face: -1, muzzleOffsetY: -54, // dartY = 166 (←)
    minCooldown: 1.70, maxCooldown: 2.20, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedA, minX: 40, maxX: 1160, seedOffset: 213, initialDelay: 0.85,
    role: 'A/H2 우측 마요 (← 좌향 수평 바람총)'
  },
  {
    id: 'D2-3-M3', lane: 'A-H3', sketchRegion: 'A', platformId: 'D2-3-M3-PERCH',
    x: 100, y: 30, face: 1, muzzleOffsetY: -54, // dartY = -24 (→)
    minCooldown: 1.68, maxCooldown: 2.18, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedA, minX: 100, maxX: 1240, seedOffset: 227, initialDelay: 0.65,
    role: 'A/H3 좌측 마요 (→ 우향 수평 바람총)'
  },
  {
    id: 'D2-3-M4', lane: 'A-H4', sketchRegion: 'A', platformId: 'D2-3-M4-PERCH',
    x: 1150, y: -160, face: -1, muzzleOffsetY: -54, // dartY = -214 (←)
    minCooldown: 1.72, maxCooldown: 2.22, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedA, minX: 40, maxX: 1150, seedOffset: 239, initialDelay: 0.95,
    role: 'A/H4 우측 마요 (← 좌향 수평 바람총 · 가시 이동 플랫폼 동시 압박)'
  },
  {
    id: 'D2-3-M5', lane: 'B-LOW', sketchRegion: 'B', platformId: 'D2-3-M5-PERCH',
    x: 1160, y: -355, face: -1, muzzleOffsetY: -54, // dartY = -409 (←)
    minCooldown: 1.65, maxCooldown: 2.15, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedB, minX: 40, maxX: 1160, seedOffset: 251, initialDelay: 0.50,
    role: 'B구간 우측 아래 마요 (← 중상단 전환 제1 탄도)'
  },
  {
    id: 'D2-3-M6', lane: 'B-HIGH', sketchRegion: 'B', platformId: 'D2-3-M6-PERCH',
    x: 1150, y: -535, face: -1, muzzleOffsetY: -54, // dartY = -589 (←)
    minCooldown: 1.62, maxCooldown: 2.12, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedB, minX: 40, maxX: 1150, seedOffset: 263, initialDelay: 1.15,
    role: 'B구간 우측 위 마요 (← 중상단 전환 제2 탄도)'
  },
  {
    id: 'D2-3-M7', lane: 'C-LEFT-LOW', sketchRegion: 'C', platformId: 'D2-3-M7-PERCH',
    x: 140, y: -790, face: 1, muzzleOffsetY: -54, // dartY = -844 (→)
    minCooldown: 1.65, maxCooldown: 2.15, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedC, minX: 140, maxX: 1240, seedOffset: 277, initialDelay: 0.60,
    role: 'C구간 좌측 아래 마요 (→ 좌측 수직 플랫폼 저층 위협)'
  },
  {
    id: 'D2-3-M8', lane: 'C-LEFT-HIGH', sketchRegion: 'C', platformId: 'D2-3-M8-PERCH',
    x: 140, y: -1010, face: 1, muzzleOffsetY: -54, // dartY = -1064 (→)
    minCooldown: 1.60, maxCooldown: 2.10, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedC, minX: 140, maxX: 1240, seedOffset: 289, initialDelay: 1.25,
    role: 'C구간 좌측 위 마요 (→ 좌측 수직 플랫폼 상층 위협)'
  },
  {
    id: 'D2-3-M9', lane: 'C-RIGHT-HIGH', sketchRegion: 'C', platformId: 'D2-3-M9-PERCH',
    x: 1150, y: -995, face: -1, muzzleOffsetY: -54, // dartY = -1049 (←)
    minCooldown: 1.62, maxCooldown: 2.12, warnTime: 0.36, attackDur: 0.42,
    dartSpeed: D2_3_HAZARD_CONFIG.dartSpeedC, minX: 40, maxX: 1150, seedOffset: 301, initialDelay: 0.90,
    role: 'C구간 우측 위 마요 (← 우측 수직 플랫폼 및 골인 접근 위협)'
  }
];

challengeD2Levels.push(chStageD2_3);
