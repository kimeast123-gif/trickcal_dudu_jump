'use strict';
// ============================================================================
// v1.9 WORLD 4 「무시무시 유령늪」: three side-scrolling stages played in order, 4-1 -> 4-2 -> 4-3.
// Design package: DUDU_WORLD4_GHOST_SWAMP_CLAUDE_INTEGRATED_261122 (sketches are the authority for layout).
//
// This pass builds 4-1 「안개 낀 늪」 only: plain ledges, sinking swamp ledges (green on the sketch), the lift on the
// left (black line with a ledge at its foot) and the three vertical movers in the middle (black lines; the ledges on
// them are green, so they also sink: renderY = moving Y + sink offset). No rails, shafts or arrows are drawn.
// The stages ride on the World 1 stage runner (worldmap-mode.js) like the night map and Spirit Mountain.
//
// Sketch 4-1 (1209 x 434) -> world: x roughly 5x the sketch, then every hop measured against the jump
// (one jump: about 148px up, 2 jumps 279px; run 320px/s). Gaps 100-250px, steps 40-140px.
// ============================================================================

const GS_WORLD_ID = 'world4_ghostswamp';
const GS_ASSET_Q = '?v=v1_8_6_261122'; // rewritten by tools/release.py on every deploy

// Sinking swamp ledge (MECHANICS_EVENTS_SPEC A, v1.9 as the user described it): the ledge stays where it is; after
// 1.0s of standing on it Dudu's body slowly sinks into its mud. Jumping out puts her footing back on top.
// Physics: only Dudu's footing moves (a.y = base + sinkY, see game.js platformStep); the ledge is drawn at its base.
const GS_SINK = {
  dwell: 1.0,          // seconds of continuous standing before Dudu starts to sink (user: back to 1.0s)
  escapeHop: 0.2,      // once sinking, the first jump only lifts her out: to the surface plus 20% of a normal jump
  escapeG: 2100,       // Dudu's rising gravity with the jump key not held (measured)
  speed: 28,           // px/s into the mud
  maxDrop: 42,         // px: up to her waist (Dudu is about 62px tall)
  maxDropMoving: 42,   // same on the vertical movers
  returnJump: 180,     // px/s: slower than her hop out, so she pops up out of the mud and lands on the surface
  returnWalk: 300      // px/s: likewise after she walked off
};
const GS_SWAMP_Y = 800;   // the murky water at the bottom of 4-1 (falls end here)
// Music cue sheet (docs/world4/BGM_STAGE_MAPPING.md; event.js musicNames 6/7/8 = window.GHOST_BGM_TRACKS):
//   4-1 all: 6 Dragon Cave (Crystal) | 4-2 all, kidnap included: 8 Ghost Village (the pillar's bg2->bg3 is no cue)
//   4-3 start, chase, rescue until Rim is gone: 7 Deep Cave | 4-3 after the rescue, with Shady, farewell: 6 Dragon Cave
// The stage's musicTrack is read by the stage runner (loadWorld1Stage) after onReset, so for 4-3 it is a getter that
// answers from the rescue state: restarting after the rescue plays 6, before it 7.
const GS_BGM = { DRAGON: 6, DEEP: 7, VILLAGE: 8 };
const GS_MUSIC = { 'ghost_swamp_1': GS_BGM.DRAGON, 'ghost_swamp_1_2': GS_BGM.DRAGON, 'ghost_swamp_2': GS_BGM.VILLAGE, 'ghost_swamp_3': GS_BGM.DEEP };
window.__gsBgmLog = [];
// every World 4 music choice goes through here (playTrack does not restart a track that is already selected)
function gsPlayCue(track, cue) {
  const st = activeGhostStage();
  window.__gsBgmLog.push({ stageCode: st ? st.stageCode : null, cue, musicSelected: track,
    rescueState: typeof gsc !== 'undefined' ? gsc.state : null, timestamp: Math.round(performance.now()) });
  if (window.__gsBgmLog.length > 60) window.__gsBgmLog.shift();
  if (typeof playTrack === 'function') playTrack(track, false);
}

// ----------------------------------------------------------------------------
// Assets: 5 backgrounds and the Rim / Shady motion atlases (tools/ghost_swamp_assets.py)
// ----------------------------------------------------------------------------
const gsImages = {};
let gsAtlas = null;
let _gsBgRequested = false, _gsNpcRequested = false;
function gsLoad(key, src) {
  if (gsImages[key] !== undefined) return;
  gsImages[key] = null;
  const im = new Image();
  im.onload = async () => { try { if (im.decode) await im.decode(); } catch (e) {} gsImages[key] = im; };
  im.onerror = () => console.warn('[ghost swamp] failed to load', src);
  im.src = src;
}
function loadGhostAssets() {
  if (!_gsBgRequested) {
    _gsBgRequested = true;
    for (let i = 1; i <= 5; i++) gsLoad('bg' + i, `assets/world/ghostswamp/bg${i}.webp${GS_ASSET_Q}`);
    loadGhostParts();
  }
}
// Rim and Shady are only needed from 4-2 on. v1.9: the frame table is a script, not fetched JSON: fetch() is refused
// when index.html is opened as a file, which left Rim and Shady invisible.
function loadGhostNpcAssets() {
  if (_gsNpcRequested) return;
  _gsNpcRequested = true;
  const done = () => {
    gsAtlas = window.GS_ATLAS || null;
    if (!gsAtlas) { console.warn('[ghost swamp] no motion atlas'); _gsNpcRequested = false; return; }
    for (const k of Object.keys(gsAtlas.motions)) gsLoad('m_' + k, `assets/npc/ghostswamp/${k}.webp${GS_ASSET_Q}`);
  };
  if (window.GS_ATLAS) { done(); return; }
  const sc = document.createElement('script');
  sc.src = `assets/npc/ghostswamp/atlas.js${GS_ASSET_Q}`;
  sc.onload = done;
  sc.onerror = () => { console.warn('[ghost swamp] failed to load the motion atlas'); _gsNpcRequested = false; };
  document.head.appendChild(sc);
}
// Draw one motion frame with the feet at (x, y). face 1 = looking right (the sheets look left).
function gsSprite(key, t, x, y, face = -1, alpha = 1, loop = true) {
  const m = gsAtlas && gsAtlas.motions[key], im = gsImages['m_' + key];
  if (!m || !im) return false;
  let ms = t * 1000;
  ms = loop ? ms % m.duration : Math.min(ms, m.duration - 1);
  let f = m.frames[m.frames.length - 1];
  for (const fr of m.frames) { if (ms < fr[6]) { f = fr; break; } ms -= fr[6]; }
  if (!f[2]) return true;
  const ss = gsAtlas.superSample;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (face > 0) ctx.scale(-1, 1);
  ctx.drawImage(im, f[0], f[1], f[2], f[3], f[4], f[5], f[2] / ss, f[3] / ss);
  ctx.restore();
  return true;
}
window.gsSprite = gsSprite;

// v1.9 (user): ledges and walls that cannot be landed on show it: a row of 수인숲 thorn sprouts along their top
// (and touching them costs 1 health, like every thorn).
function noLandingCrown(s, r, prefix) {
  const n = Math.max(1, Math.round(r.w / 44));
  for (let i = 0; i < n; i++) {
    const x = Math.round(r.x + (r.w * (i + 0.5)) / n);
    wTentacle(s, `${prefix}-CROWN-${r.id}-${i + 1}`, x, r.y, null, '착지 불가 표시', '착지할 수 없는 윗면의 가시');
  }
}

// ----------------------------------------------------------------------------
// 4-1 layout. [id, x, y, w, kind]  kind: ground (black on the sketch), sink (green)
// ----------------------------------------------------------------------------
const GS41_WIDTH = 6300;
const GS41_PLATFORMS = [
  // A: start low on the left, plain and sinking ledges in turn
  ['S0', 60, 580, 400, 'ground'],          // start flag
  ['G1', 620, 580, 300, 'sink'],
  ['G2', 1060, 580, 380, 'sink'],
  ['B1', 1560, 460, 240, 'ground'],        // step up on the right
  ['G3', 1020, 330, 400, 'sink'],          // back left, one floor up (above G2)
  // B: upper-left branch from the top of the lift (the sketch's small green steps under the yellow star)
  ['Q1', 340, -60, 90, 'sink'],
  ['Q2', 110, -190, 90, 'sink'],
  ['Q3', 350, -330, 90, 'sink'],
  // C: upper row to the checkpoint
  ['G4', 980, -40, 400, 'sink'],
  ['CP', 1540, 0, 280, 'ground'],          // checkpoint flag
  ['B2', 1980, 80, 300, 'ground'],
  // E: after the three movers
  ['B3', 3540, 40, 260, 'ground'],
  // F: two ways across (over the top or along the bottom), small ledges
  ['U1', 3960, -50, 110, 'ground'], ['U2', 4240, -150, 110, 'ground'], ['U3', 4540, -230, 120, 'ground'],
  ['U4', 4890, -150, 110, 'ground'], ['U5', 5200, -50, 110, 'ground'],
  ['D1', 4000, 160, 110, 'ground'], ['D2', 4290, 250, 110, 'ground'], ['D3', 4580, 330, 160, 'ground'],
  ['D4', 4940, 230, 110, 'ground'], ['D5', 5240, 140, 110, 'ground'],
  // G: goal
  ['GOAL', 5520, 30, 620, 'ground']
];
// Vertical movers: [id, x, w, top y, bottom y, starts at, kind]. They travel between top and bottom (sine).
const GS41_MOVERS = [
  ['L1', 520, 260, 30, 320, 'bottom', 'ground'],   // the lift on the left (black line with the ledge at its foot)
  ['M1', 2440, 200, 30, 300, 'bottom', 'sink'],
  ['M2', 2800, 200, 30, 300, 'top', 'sink'],
  ['M3', 3160, 200, 30, 300, 'bottom', 'sink']
];
const GS41_PERIOD = { L1: 5.2, M1: 4.4, M2: 4.4, M3: 4.4 };

function buildGhostStage41() {
  const s = makeWorldStage({
    id: 'world4_ghost_41',
    stageCode: 'ghost_swamp_1',
    name: '유령늪 1',
    subtitle: '가라앉는 늪 발판과 오르내리는 발판',
    worldWidth: GS41_WIDTH,
    killY: GS_SWAMP_Y + 40,
    minCamY: -640,
    maxCamY: 220,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'GS41-S0', x: 200, feetY: 580 } },
    segments: [{ start: 0, end: GS41_WIDTH, bg: 'ghostswamp' }],
    backgroundRanges: {},
    goal: { id: 'gs41-goal', exitRoute: 'default', x: 5980, y: 30, w: 60, h: 120, hidden: true }
  });
  s.worldId = GS_WORLD_ID;
  s.ghostSwamp = true;
  s.routeLabel = '월드 4';
  s.musicTrack = GS_MUSIC[s.stageCode];
  s.gsBg = 1;
  s.gsWater = true;
  s.customBackground = drawGhostBackground;
  s.onLoad = () => loadGhostAssets();
  s.onReset = () => resetGhostRuntime();
  s.onComplete = () => completeGhostStage('ghost_swamp_1');

  for (const [id, x, y, w, kind] of GS41_PLATFORMS) {
    wSurface(s, x, y, w, 'grass', { id: 'GS41-' + id, gsDraw: kind, ...(kind === 'sink' ? { sink: true, sinkY: 0 } : {}) });
  }
  for (const [id, x, w, top, bottom, start, kind] of GS41_MOVERS) {
    const mid = (top + bottom) / 2, range = (bottom - top) / 2;
    // sin(phase) = +1 starts at the bottom (y grows downwards), -1 at the top
    wSurface(s, x, mid, w, 'grass', {
      id: 'GS41-' + id, gsDraw: kind, gsMover: true,
      motion: { axis: 'y', range, period: GS41_PERIOD[id], phase: start === 'bottom' ? Math.PI / 2 : -Math.PI / 2 },
      ...(kind === 'sink' ? { sink: true, sinkY: 0, sinkMax: GS_SINK.maxDropMoving } : {})
    });
  }
  // sections[0] is the start; flags are drawn for the others
  wCheckpoint(s, '늪 입구', 200, 580);
  wCheckpoint(s, '안개 속 쉼터', 1680, 0);
  wCheckpoint(s, '늪 건너편', 5980, 30);
  // Yellow star on the sketch = golden crayon (user, v1.9): above Q3 at the top of the upper-left branch
  s.collectibleDefs.push({ id: 'GS41-SPEC-01', stageCode: 'ghost_swamp_1', label: '황금 크레파스 (4-1 왼쪽 위)', x: 395, y: -395,
    parentPlatformId: 'GS41-Q3', sourceSketchRef: '4-1 노란 별', notes: '리프트 위 왼쪽 갈림길 끝' });
  s.hudStars = s.collectibleDefs.length;
  return s;
}

// ----------------------------------------------------------------------------
// 4-2 「낡은 저택」 layout. Sketch ghost_swamp_map_2.png (1209 x 482).
// Left of the big brown pillar (bg2, antique wood): start low, climb right, ride the lift up, climb back left to the
// ledge that slides along the top line, ride it over the pillar. Right of the pillar (bg3, rotten wood): the field of small plain and
// blinking ledges where Rim attacks on landing, up to the goal ledge at the top right (kidnap cutscene).
// Left part: hand-placed (world coordinates). Right part: sketch coordinates, x = 2175 + (sx - 470) * 5,
// y = 580 - (437 - sy) * 3, ledge width = sketch width * 5 kept between 110 and 280.
// ----------------------------------------------------------------------------
const GS42_WIDTH = 5900;
const GS42_WALL_X = 1990;   // the pillar: bg2 -> bg3, antique -> rotten wood
const gs42x = (sx) => Math.round(2175 + (sx - 470) * 5);
const gs42y = (sy) => Math.round(580 - (437 - sy) * 3);
// [id, x, y, w, kind] in world coordinates
const GS42_LEFT = [
  ['START', 80, 580, 500, 'ground'],
  ['A1', 704, 450, 157, 'ground'], ['A2', 992, 319, 134, 'ground'], ['A3', 1239, 190, 149, 'ground'],
  ['B1', 1260, -137, 110, 'ground'], ['B2', 950, -230, 130, 'ground'], ['B3', 620, -308, 170, 'ground']
];
// v1.9: the sketch's long horizontal lines are SIDEWAYS MOVERS (like the vertical lines are lifts), not walkways:
// [id, left end of travel, right end of travel, y, width, period (s), red]. The ledge slides between the two ends.
//   TOPRIDE: the box at the line's left end (sketch 55-100, y 101) rides the line 55..517 over the top of the pillar
//   LOWRIDE: the box on the bottom line (sketch 930-980, y 413) rides 910..1120; the line's red marks = Rim strikes
const GS42_HMOVERS = [
  ['TOPRIDE', 307, 2386, -428, 200, 18, 0],
  ['LOWRIDE', gs42x(910), gs42x(1120), gs42y(413), 250, 9, 1]
];
// the lift on the sketch's black line at x 340: ledge at its foot, rising to just under the upper-left steps
const GS42_LIFT = { id: 'LIFT', x: 1500, w: 220, top: -110, bottom: 300, period: 6.0 };
// [id, sketch left, sketch right, sketch top, kind, red]  red = Rim attacks when Dudu lands there
const GS42_RIGHT = [
  ['CP', 555, 605, 123, 'ground', 0],
  ['R1', 498, 530, 165, 'blink', 0], ['R2', 505, 533, 250, 'ground', 0], ['R3', 475, 498, 312, 'blink', 1],
  ['R4', 472, 494, 437, 'ground', 0], ['R5', 510, 565, 358, 'blink', 0], ['R6', 540, 565, 413, 'blink', 0],
  ['R7', 566, 595, 210, 'blink', 0], ['R8', 574, 600, 308, 'blink', 0], ['R9', 596, 617, 393, 'ground', 1],
  ['R10', 634, 665, 160, 'blink', 0], ['R11', 642, 668, 243, 'blink', 1], ['R12', 648, 673, 330, 'ground', 0],
  ['R13', 686, 715, 125, 'blink', 0], ['R14', 695, 716, 412, 'blink', 0], ['R15', 705, 737, 195, 'blink', 0],
  ['R16', 714, 740, 280, 'blink', 0], ['R17', 718, 740, 370, 'ground', 0], ['R18', 745, 775, 90, 'ground', 1],
  ['R19', 765, 790, 215, 'ground', 0], ['R20', 789, 810, 300, 'ground', 1], ['R21', 793, 815, 370, 'blink', 0],
  ['R22', 806, 826, 135, 'blink', 0], ['R23', 850, 872, 195, 'blink', 0], ['R24', 855, 876, 280, 'blink', 0],
  ['R25', 855, 873, 420, 'ground', 0], ['R26', 883, 908, 85, 'blink', 0], ['R27', 883, 905, 350, 'blink', 0],
  ['R28', 907, 925, 140, 'ground', 1], ['R29', 928, 948, 245, 'ground', 1],
  ['R30', 972, 1003, 150, 'blink', 0], ['R31', 972, 998, 305, 'blink', 0], ['R32', 1037, 1063, 258, 'blink', 0],
  ['END', 1147, 1173, 415, 'ground', 0],   // yellow star on the sketch: golden crayon above it
  ['GOAL', 1085, 1163, 198, 'ground', 0]   // goal flag: landing here starts the kidnap cutscene
];
// Brown anti-jump walls (rotten wooden posts and boards): [id, x, y, w, h, landable top]
const GS42_WALLS = [
  ['PILLAR', 1918, -377, 144, 1400, false],                                   // the big pillar, top just under the sliding ledge's track
  ['STUB', 2062, gs42y(207), gs42x(490) - 2062, 36, true],                    // short board on its right side
  ['BAR', gs42x(625), gs42y(280), gs42x(683) - gs42x(625), 30, false],       // board above R12: no jumping straight up
  ['HANG1', gs42x(812), -900, 40, gs42y(105) + 900, false],                   // hangs from the ceiling over R22 (walk under it)
  ['HANG2', gs42x(1020), -900, 40, gs42y(135) + 900, false],                  // hangs from the ceiling: go down for the goal
  ['GOALPOST', gs42x(1088), gs42y(210), 40, gs42y(343) - gs42y(210), false]   // under the goal ledge's left end
];

function buildGhostStage42() {
  const s = makeWorldStage({
    id: 'world4_ghost_42',
    stageCode: 'ghost_swamp_2',
    name: '유령늪 3',
    subtitle: '림이 노리는 저택',
    worldWidth: GS42_WIDTH,
    killY: 900,
    minCamY: -980,
    maxCamY: 220,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'GS42-START', x: 220, feetY: 580 } },
    segments: [{ start: 0, end: GS42_WIDTH, bg: 'ghostswamp' }],
    backgroundRanges: {},
    goal: null     // the stage ends with the kidnap cutscene, not a goal door
  });
  s.worldId = GS_WORLD_ID;
  s.ghostSwamp = true;
  s.routeLabel = '월드 4';
  s.musicTrack = GS_MUSIC[s.stageCode];
  s.gsBgSplit = { x: GS42_WALL_X, a: 2, b: 3, fade: 260 };
  s.customBackground = drawGhostBackground;
  s.onLoad = () => { loadGhostAssets(); loadGhostNpcAssets(); };
  s.onReset = () => resetGhostRuntime();
  s.onComplete = () => {};   // completion comes from the cutscene
  const skinAt = (x) => (x < GS42_WALL_X ? 'antique' : 'rotten');

  for (const [id, x, y, w, kind] of GS42_LEFT) wSurface(s, x, y, w, 'grass', { id: 'GS42-' + id, gsDraw: kind, gsSkin: skinAt(x) });
  const L = GS42_LIFT;
  wSurface(s, L.x, (L.top + L.bottom) / 2, L.w, 'grass', { id: 'GS42-' + L.id, gsDraw: 'ground', gsSkin: 'antique', gsMover: true,
    motion: { axis: 'y', range: (L.bottom - L.top) / 2, period: L.period, phase: Math.PI / 2 } });
  for (const [id, x1, x2, y, w, period, red] of GS42_HMOVERS) {
    const range = (x2 - x1 - w) / 2;
    wSurface(s, Math.round(x1 + range), y, w, 'grass', { id: 'GS42-' + id, gsDraw: 'ground', gsSkin: x1 < GS42_WALL_X ? 'antique' : 'rotten',
      gsMover: true, rimTrigger: Boolean(red), motion: { axis: 'x', range, period, phase: -Math.PI / 2 } });   // starts at the left end
  }
  let n = 0;
  for (const [id, sl, sr, sy, kind, red] of GS42_RIGHT) {
    const w = Math.max(110, Math.min(280, (sr - sl) * 5)), cx = (gs42x(sl) + gs42x(sr)) / 2;
    const extra = { id: 'GS42-' + id, gsDraw: kind, gsSkin: 'rotten' };
    if (red) extra.rimTrigger = true;
    if (kind === 'blink') {
      n++;
      extra.behavior = 'blink';
      // v1.9 (user): every blinking ledge runs its own random timer (they used to vanish in visible groups)
      extra.blink = { on: 2.0 + Math.random() * 0.7, warning: 0.55 + Math.random() * 0.15, off: 0.8 + Math.random() * 0.3, phase: Math.random() * 4 };
    }
    wSurface(s, Math.round(cx - w / 2), gs42y(sy), w, 'grass', extra);
  }
  for (const [id, x, y, w, h, top] of GS42_WALLS) wWall(s, x, y, w, h, 'wood', { id: 'GS42-' + id, gsDraw: 'wall', noTopLand: !top });
  // the board above R12 cannot be landed on: thorns along its top (the other no-landing walls have their tops out of
  // sight or tucked under a ledge)
  const bar = GS42_WALLS.find(w => w[0] === 'BAR');
  noLandingCrown(s, { id: 'BAR', x: bar[1], y: bar[2], w: bar[3] }, 'GS42');
  const cp = s.platforms.find(a => a.id === 'GS42-CP'), goal = s.platforms.find(a => a.id === 'GS42-GOAL');
  wCheckpoint(s, '저택 입구', 220, 580);
  wCheckpoint(s, '무너진 방', Math.round(cp.x + cp.w / 2), cp.y);
  wCheckpoint(s, '저택 꼭대기', Math.round(goal.x + 40), goal.y);
  s.gsKidnapPlatform = 'GS42-GOAL';
  // Yellow star on the sketch = golden crayon (user, v1.9): over END, past the right end of the lower sliding ledge
  const end = s.platforms.find(a => a.id === 'GS42-END');
  s.collectibleDefs.push({ id: 'GS42-SPEC-01', stageCode: 'ghost_swamp_2', label: '황금 크레파스 (4-2 오른쪽 아래)', x: Math.round(end.x + end.w / 2), y: end.y - 60,
    parentPlatformId: 'GS42-END', sourceSketchRef: '4-2 노란 별', notes: '아래쪽 미끄럼 발판 끝' });
  s.hudStars = s.collectibleDefs.length;
  return s;
}

// ----------------------------------------------------------------------------
// 4-3 「이공간 추격」 layout. Sketch ghost_swamp_map_3.png (1602 x 449). Hand-placed in world coordinates:
// y = 580 - (325 - sketch y) * 3 (the start ledge is the sketch's lowest one); x keeps the sketch's order, every gap
// 130-190px so the chase never asks for a jump longer than one run-up hop.
//   start (bg4, other-world wood) -> red oval ledge P1 (Rim's first strike, then she chases) -> climb to the long
//   upper ledge TOP -> down the FOUR small ledges SP1-SP4 (Rim fastest here) -> green line: Shady rescues Dudu,
//   Rim is gone, bg4 -> bg5 (night swamp) -> walk on with Shady over plain and sinking ledges -> goal, farewell.
// ----------------------------------------------------------------------------
const GS43_WIDTH = 7500;
const GS43_RESCUE_X = 4430;       // the green line (sketch x 950), between SP4 and the long ledge after it
const GS43_PLATFORMS = [
  // [id, x, y, w, kind, skin]
  ['S0', 60, 580, 320, 'ground', 'void'],        // start flag
  ['P1', 520, 472, 420, 'ground', 'void'],       // red oval: Rim's landing strike starts the chase
  ['P2', 1080, 547, 200, 'ground', 'void'],
  ['P3', 1420, 436, 190, 'ground', 'void'],
  ['P4', 1740, 346, 190, 'ground', 'void'],
  ['P5', 2080, 433, 200, 'ground', 'void'],
  ['P6', 2420, 325, 110, 'ground', 'void'],
  ['P7', 2140, 226, 110, 'ground', 'void'],      // back left and up (sketch's small square above P5)
  ['P8', 2420, 106, 110, 'ground', 'void'],
  ['TOP', 2700, 16, 520, 'ground', 'void'],      // the long upper ledge
  ['SP1', 3400, 88, 100, 'ground', 'void'],      // the four small ledges in a row (do not add or remove)
  ['SP2', 3680, 160, 100, 'ground', 'void'],
  ['SP3', 3960, 232, 100, 'ground', 'void'],
  ['SP4', 4240, 298, 100, 'ground', 'void'],
  ['R0', 4520, 490, 620, 'ground', 'night'],     // after the green line: Shady appears, checkpoint flag
  ['N1', 5300, 538, 160, 'ground', 'night'],
  ['G1', 5620, 400, 330, 'sink', 'night'],
  ['N2', 6110, 298, 200, 'ground', 'night'],
  ['G2', 6470, 397, 330, 'sink', 'night'],
  ['GOAL', 6960, 400, 380, 'ground', 'night']    // goal flag: Shady's Joke_2 farewell, then World 4 is cleared
];
// Rim's chase (MECHANICS_EVENTS_SPEC D). Speeds in px/s; Dudu runs at 320.
const GS_CHASE = {
  spawnGrace: 0.5,        // Rim appears on the start ledge when Dudu leaves it, and waits this long
  normal: 290,            // close behind Dudu (who runs at 320 but loses time at every jump)
  sprint: 345,            // reached at the first of the four small ledges, ramping up along the long upper ledge
  catchUp: 430, leash: 700,   // more than `leash` behind: she hurries at `catchUp`
  warpDist: 900,          // further behind than this and off screen: she reappears on Dudu's previous ledge
  hitDist: 36, hitDy: 80, // she catches Dudu when this close
  recover: 1.2,           // after a catch she stops this long
  shady: 330, shadyFast: 470  // Shady walking along after the rescue
};
// Rescue (spec E) and farewell timings, seconds
// Shady Experience_1 from 0s; Rim Die 1.0-3.27s, faded out by 3.6s; then bg4->bg5 and the music change; control back at 4.5s
const GS_RESCUE = { rimDieAt: 1.0, bgFrom: 3.6, bgDur: 0.9, release: 4.5 };
const GS_FAREWELL = { jokeLoops: 2, fade: 0.5 };

function buildGhostStage43() {
  const s = makeWorldStage({
    id: 'world4_ghost_43',
    stageCode: 'ghost_swamp_3',
    name: '유령늪 4',
    subtitle: '림을 피해 달려요',
    worldWidth: GS43_WIDTH,
    killY: 900,
    minCamY: -560,
    maxCamY: 220,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'GS43-S0', x: 200, feetY: 580 } },
    segments: [{ start: 0, end: GS43_WIDTH, bg: 'ghostswamp' }],
    backgroundRanges: {},
    goal: null      // ends with Shady's farewell
  });
  s.worldId = GS_WORLD_ID;
  s.ghostSwamp = true;
  s.routeLabel = '월드 4';
  s.musicTrack = GS_MUSIC[s.stageCode];
  s.gsBg = 4;
  s.customBackground = drawGhostBackground;
  s.onLoad = () => { loadGhostAssets(); loadGhostNpcAssets(); };
  s.onReset = () => resetGhostRuntime();
  s.onComplete = () => {};
  for (const [id, x, y, w, kind, skin] of GS43_PLATFORMS) {
    const extra = { id: 'GS43-' + id, gsDraw: kind, gsSkin: skin };
    if (kind === 'sink') { extra.sink = true; extra.sinkY = 0; }
    wSurface(s, x, y, w, 'grass', extra);
  }
  wCheckpoint(s, '이공간 입구', 200, 580);
  wCheckpoint(s, '밤의 늪', 4900, 490);        // after the rescue: restarting here keeps Shady and no Rim
  wCheckpoint(s, '늪 출구', 7300, 400);   // flag at the far end, clear of the farewell
  s.gsChase = true;
  Object.defineProperty(s, 'musicTrack', { configurable: true, enumerable: true,
    get: () => (gsc.state === 'free' || gsc.state === 'farewell' || gsc.state === 'done') ? GS_BGM.DRAGON : GS_BGM.DEEP });
  s.gsRescueX = GS43_RESCUE_X;
  s.gsShadyAt = { x: 4600, y: 490 };            // the sketch's green oval
  s.gsFarewellPlatform = 'GS43-GOAL';
  return s;
}

// ----------------------------------------------------------------------------
// 유령늪 1-2 (ghost_swamp_1_2). Sketch ghost_swamp_map_1-2.png (1602 x 494), added by the 4-stage directive
// (261123). Same swamp, background (bg1) and music (20) as 유령늪 1. Hand-placed, sketch order kept:
//   start low left -> green steps -> lift (line at x 485) -> the long green mud ledge in the middle, which ends at the
//   big wall (a dead end: the way on is over the top) ... from the lift's top: back up-left over green steps -> second
//   lift (line at x 107) -> top row -> the long top line -> checkpoint on top, right of the wall -> down the right
//   side -> a lift down to the yellow star (golden crayon) -> across to the goal.
// Symbols in THIS sketch (user, v1.9): red = a fixed thorn obstacle (the 수인숲 thorn sprouts, 1 health on touch), NOT
// Rim; brown = a vertical wall that cannot be jumped over or landed on.
// The top line (user): the green mud ledge slides along it, and four thorns stand fixed on the line, each on a peg
// only as wide as the thorn (nothing to land on). Riding the ledge carries Dudu into the thorns, and standing still
// sinks her, so she has to keep jumping over thorns while she rides.
// y = 580 - (420 - sketch y) * 3 (the start ledge is y 580); x keeps the sketch order with gaps of 60-240px.
// ----------------------------------------------------------------------------
const GS412_WIDTH = 6000;
const GS412_PLATFORMS = [
  // [id, x, y, w, kind, red]
  ['START', 80, 580, 460, 'ground', 0],
  ['A1', 757, 450, 135, 'sink', 0],
  ['A2', 1080, 514, 180, 'sink', 0],
  ['A3', 1440, 418, 360, 'sink', 0],      // red mark: a thorn on it (GS412_THORNS)
  ['MUD', 2390, 385, 1000, 'sink', 0],     // the long wide green ledge (one object, one footing)
  ['U3', 1720, -62, 200, 'sink', 0],
  ['U2', 1370, 4, 200, 'sink', 0],         // red mark: a thorn on it
  ['U1', 1010, -86, 200, 'sink', 0],
  ['T1', 1010, -413, 150, 'ground', 0],
  ['CP', 3640, -329, 380, 'ground', 0],    // checkpoint on top, right of the wall
  ['R1', 4100, -194, 100, 'ground', 0],
  ['R2', 4340, -80, 110, 'sink', 0],
  ['R3', 4680, -86, 110, 'sink', 0],
  ['R4', 4120, 76, 110, 'sink', 0],
  ['R5', 4520, 94, 110, 'ground', 0],
  ['RL', 4130, 241, 600, 'sink', 0],
  ['STAR', 4250, 664, 110, 'sink', 0],     // yellow star: golden crayon above it
  ['GR', 4990, 70, 180, 'sink', 0],
  ['GOAL', 5380, 76, 470, 'ground', 0]
];
// lifts: [id, x, w, top y, bottom y, starts at, period]
const GS412_LIFTS = [
  ['LIFT1', 1980, 230, -40, 470, 'bottom', 6.0],
  ['LIFT2', 690, 220, -460, -14, 'bottom', 5.0],
  ['LIFT3', 3850, 200, 140, 700, 'top', 6.0]
];
// the top line: the green mud ledge (sketch 237-344) slides from x 1320 to 3440 (it stops short of the wall)
const GS412_RIDE = { id: 'RIDE', left: 1320, right: 3440, y: -374, w: 300, period: 26 };
// fixed thorns: the four on the top line (sketch x 435 / 566 / 687 / 724) stand on pegs at the line's height;
// one each on A3 and U2
const GS412_THORNS = [
  ['TH-TOP1', 2012, -374, true], ['TH-TOP2', 2470, -374, true], ['TH-TOP3', 2893, -374, true], ['TH-TOP4', 3022, -374, true],
  ['TH-A3', 1620, 418, false], ['TH-U2', 1470, 4, false]
];
const GS412_WALL = { id: 'WALL', x: 3470, y: -290, w: 96, h: 1300 };

function buildGhostStage412() {
  const s = makeWorldStage({
    id: 'world4_ghost_412',
    stageCode: 'ghost_swamp_1_2',
    name: '유령늪 2',
    subtitle: '움직이는 늪 발판과 가시',
    worldWidth: GS412_WIDTH,
    killY: GS_SWAMP_Y + 40,
    minCamY: -760,
    maxCamY: 260,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'GS412-START', x: 220, feetY: 580 } },
    segments: [{ start: 0, end: GS412_WIDTH, bg: 'ghostswamp' }],
    backgroundRanges: {},
    goal: { id: 'gs412-goal', exitRoute: 'default', x: 5700, y: 76, w: 60, h: 120, hidden: true }
  });
  s.worldId = GS_WORLD_ID;
  s.ghostSwamp = true;
  s.routeLabel = '월드 4';
  s.musicTrack = GS_MUSIC[s.stageCode];
  s.gsBg = 1;
  s.gsWater = true;
  s.customBackground = drawGhostBackground;
  s.onLoad = () => { loadGhostAssets(); loadGhostNpcAssets(); };
  s.onReset = () => resetGhostRuntime();
  s.onComplete = () => completeGhostStage('ghost_swamp_1_2');
  for (const [id, x, y, w, kind, red] of GS412_PLATFORMS) {
    const extra = { id: 'GS412-' + id, gsDraw: kind, gsSkin: 'swamp' };
    if (kind === 'sink') { extra.sink = true; extra.sinkY = 0; }
    if (red) extra.rimTrigger = true;
    wSurface(s, x, y, w, 'grass', extra);
  }
  for (const [id, x, w, top, bottom, start, period] of GS412_LIFTS) {
    wSurface(s, x, (top + bottom) / 2, w, 'grass', { id: 'GS412-' + id, gsDraw: 'ground', gsSkin: 'swamp', gsMover: true,
      motion: { axis: 'y', range: (bottom - top) / 2, period, phase: start === 'bottom' ? Math.PI / 2 : -Math.PI / 2 } });
  }
  const RD = GS412_RIDE, range = (RD.right - RD.left - RD.w) / 2;
  wSurface(s, RD.left + range, RD.y, RD.w, 'grass', { id: 'GS412-' + RD.id, gsDraw: 'sink', gsSkin: 'swamp', sink: true, sinkY: 0, gsMover: true,
    motion: { axis: 'x', range, period: RD.period, phase: -Math.PI / 2 } });   // starts at the left end
  for (const [id, x, y, peg] of GS412_THORNS) {
    wTentacle(s, 'GS412-' + id, x, y, null, '1-2 빨간 표시', '고정 가시 장애물 (닿으면 체력 -1)');
    // the peg the thorn stands on: as wide as the thorn, nothing to land on (drawn only, no collision)
    if (peg) wSurface(s, x - 17, y, 34, 'grass', { id: 'GS412-PEG-' + id.slice(3), gsDraw: 'peg', gsSkin: 'swamp', nonCollidable: true });
  }
  const T = GS412_WALL;
  wWall(s, T.x, T.y, T.w, T.h, 'wood', { id: 'GS412-' + T.id, gsDraw: 'wall', gsSkin: 'swamp', noTopLand: true });
  noLandingCrown(s, T, 'GS412');
  wCheckpoint(s, '늪 입구', 220, 580);
  wCheckpoint(s, '가시 벽 위', 3830, -329);
  wCheckpoint(s, '늪 건너편', 5700, 76);
  const star = s.platforms.find(a => a.id === 'GS412-STAR');
  s.collectibleDefs.push({ id: 'GS412-SPEC-01', stageCode: 'ghost_swamp_1_2', label: '황금 크레파스 (1-2 아래)', x: star.x + star.w / 2, y: star.y - 60,
    parentPlatformId: 'GS412-STAR', sourceSketchRef: '1-2 노란 별', notes: '아래로 내려가는 리프트 끝' });
  s.hudStars = s.collectibleDefs.length;
  return s;
}

// v1.9 (4-stage directive 261123): 유령늪 1 -> 1-2 -> 2 -> 3. Stage keys are the directive's stage IDs.
const GS_STAGE_ORDER = ['ghost_swamp_1', 'ghost_swamp_1_2', 'ghost_swamp_2', 'ghost_swamp_3'];
const GS_STAGE_BUILDERS = { 'ghost_swamp_1': buildGhostStage41, 'ghost_swamp_1_2': buildGhostStage412, 'ghost_swamp_2': buildGhostStage42, 'ghost_swamp_3': buildGhostStage43 };
if (typeof world1Stages !== 'undefined') {
  for (const code of Object.keys(GS_STAGE_BUILDERS)) {
    if (!world1Stages.some(st => st.worldId === GS_WORLD_ID && st.stageCode === code)) world1Stages.push(GS_STAGE_BUILDERS[code]());
  }
}
function ghostStageIndex(code) { return world1Stages.findIndex(st => st.worldId === GS_WORLD_ID && st.stageCode === code); }
function activeGhostStage() {
  if (typeof gameMode === 'undefined' || gameMode !== 'world') return null;
  const st = world1Stages[activeWorldStageIndex];
  return st && st.worldId === GS_WORLD_ID ? st : null;
}
window.activeGhostStage = activeGhostStage;

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------
// Rim's landing attack (MECHANICS_EVENTS_SPEC B). One Rim at a time. Landing on a red-marked ledge from a DIFFERENT
// ledge (or from the start) makes her appear beside it; 0.6s later her scythe throws a red slash along the ledge top.
// Jumping in that window dodges it. Hopping in place and landing on the same ledge again does nothing.
// The motion's own strike frame is lined up with the slash: Attack1_1 swings at 400ms, Attack2_1 lunges at 930ms.
const GS_RIM_ATTACK = {
  telegraph: 0.6,        // landing -> slash leaves Rim (draft value, inside the spec's 0.45-0.70s)
  slashSpeed: 760,       // px/s along the ledge
  slashHeight: 46,       // px above the ledge top: feet higher than this are safe
  slashHalfW: 30,
  standOff: 70,          // Rim floats this far beyond the ledge end
  fadeIn: 0.25, stayAfter: 0.9, fadeOut: 0.35,
  motions: { 1: { key: 'rim_attack1', strikeMs: 400 }, 2: { key: 'rim_attack2', strikeMs: 930 } }
};
// Kidnap (spec C): Rim Experience_1 (3.74s). Her dark dash at 530ms takes Dudu; the screen darkens from 3.0s.
const GS_KIDNAP = { grabAt: 0.53, fadeAt: 3.0, fadeDur: 1.0, rimOffset: 120 };

const gs = { lastOn: null, clock: 0, lastStoodId: null, rim: null, slashes: [], kidnap: null, token: 0 };
function forcedRimAttack() {
  if (window.__gsForceAttack === 1 || window.__gsForceAttack === 2) return window.__gsForceAttack;
  const m = /[?&]gsattack=([12])\b/.exec(location.search);
  return m ? Number(m[1]) : 0;
}
function resetGhostRuntime() {
  gs.lastOn = null;
  gs.clock = 0;
  gs.lastStoodId = null;     // after a restart the first landing may trigger again
  gs.rim = null;
  gs.slashes.length = 0;
  gs.kidnap = null;
  gs.token++;                // invalidates a cutscene that was running
  window.__gsLock = false;
  window.__gsHideDudu = false;
  for (const a of platforms) {
    if (!a.sink) continue;
    a.sinkY = 0; a.sinkDwell = 0; a.sinkState = 'idle'; a.sinkReturn = GS_SINK.returnWalk;
    if (!a.motion) { a.y = a.prevY = a.baseY; }
  }
  const st = activeGhostStage();
  if (st && st.gsChase) chaseReset(typeof checkpoint === 'number' && checkpoint >= 1);
}
window.resetGhostRuntime = resetGhostRuntime;

// ----------------------------------------------------------------------------
// 4-3 runtime: chase -> rescue -> companion -> farewell
// state: 'wait' (Dudu still on the start ledge) -> 'chase' -> 'rescue' -> 'free' (Shady walks along) -> 'farewell' -> 'done'
//
// v1.9 (user): Rim and Shady move like bodies, the way Mayo chases in the story: they run along the ledges of the
// route and jump from ledge to ledge in an arc (they never float along Dudu's path). Rim appears the moment Dudu
// leaves the start ledge, follows close behind, and speeds up on the long upper ledge before the four small ones.
// ----------------------------------------------------------------------------
const GS_WALK_G = 1900;   // gravity of the walkers' jump arcs (Mayo uses the same)
const gsc = { state: 'wait', rim: null, rescue: null, shady: null, farewell: null, bgMix: 0, p1Struck: false, route: null };

function ghostRoute() {
  if (!gsc.route || gsc.route[0] !== platforms.find(a => a.id === 'GS43-S0')) {
    gsc.route = GS43_PLATFORMS.map(([id]) => platforms.find(a => a.id === 'GS43-' + id)).filter(Boolean);
  }
  return gsc.route;
}
// the route ledge Dudu stands on (or last stood on)
function duduRouteIndex() {
  const R = ghostRoute();
  if (p.ground && p.on) { const i = R.indexOf(p.on); if (i >= 0) gsc.duduIdx = i; }
  let i = gsc.duduIdx || 0;
  // in the air beyond the end of her ledge, toward the next one: followers already head for the next ledge, so they
  // keep running and jump instead of stopping at the edge and starting again
  if (!p.ground && R[i + 1]) {
    const cur = R[i], nxt = R[i + 1], right = nxt.x + nxt.w / 2 >= cur.x + cur.w / 2;
    if (right ? p.x > cur.x + cur.w : p.x < cur.x) i++;
  }
  return i;
}
const ledgeTop = (a) => a.y - (a.sinkY || 0);   // walkers stand on the mud, they do not sink

function makeWalker(idx, x) {
  const a = ghostRoute()[idx];
  const y = ledgeTop(a);
  return { idx, x, y, prevX: x, prevY: y, vx: 0, vy: 0, v: 0, air: false, land: null, landIdx: idx, face: 1, t: 0, moving: false, alpha: 1 };
}
// v1.9 (user: they stuttered and blinked): walkers are drawn between their last two physics positions, their speed
// eases instead of jumping, they only stop or turn round past a small margin, and Rim never switches pose mid-chase.
function walkerDrawPos(w) {
  const a = typeof renderAlpha === 'number' ? renderAlpha : 1;
  return { x: w.prevX + (w.x - w.prevX) * a, y: w.prevY + (w.y - w.prevY) * a };
}
// One step of a ledge walker toward (targetIdx, targetX) at `speed`: run along the ledge, jump to the next ledge of
// the route (forwards or backwards) in an arc that lands on it.
function stepWalker(w, targetIdx, targetX, speed, dt) {
  const R = ghostRoute();
  w.t += dt;
  w.prevX = w.x; w.prevY = w.y;
  w.v += Math.sign(speed - w.v) * Math.min(Math.abs(speed - w.v), 700 * dt);   // ease toward the wanted speed
  speed = Math.max(40, w.v);
  if (w.air) {
    w.x += w.vx * dt;
    const prevY = w.y;
    w.vy += GS_WALK_G * dt;
    w.y += w.vy * dt;
    const top = ledgeTop(w.land);
    if (w.vy > 0 && prevY <= top + 2 && w.y >= top) {
      w.y = top; w.vy = 0; w.vx = 0; w.air = false; w.idx = w.landIdx;
    } else if (w.y > top + 260) {   // safety: never lost under the route
      w.x = w.landX; w.y = top; w.vy = 0; w.vx = 0; w.air = false; w.idx = w.landIdx;
    }
    w.moving = true;
    return;
  }
  const pl = R[w.idx];
  w.y = ledgeTop(pl);
  const dir = targetIdx > w.idx ? 1 : targetIdx < w.idx ? -1 : 0;
  if (dir === 0) {
    const goal = Math.max(pl.x + 14, Math.min(pl.x + pl.w - 14, targetX));
    const d = goal - w.x;
    if (Math.abs(d) > (w.moving ? 4 : 18)) {   // start only past 18px, stop within 4px: no stop-start flicker
      w.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      if (Math.abs(d) > 24 || w.moving) w.face = Math.sign(d);
      w.moving = true;
    } else w.moving = false;
    return;
  }
  const next = R[w.idx + dir];
  const rightward = next.x + next.w / 2 >= pl.x + pl.w / 2;
  const takeoff = rightward ? pl.x + pl.w - 12 : pl.x + 12;
  const d = takeoff - w.x;
  w.face = Math.sign(d) || (rightward ? 1 : -1);
  w.moving = true;
  if (Math.abs(d) > speed * dt + 1) { w.x += Math.sign(d) * speed * dt; return; }
  w.x = takeoff;
  // jump: land a little inside the next ledge
  const landX = rightward ? next.x + Math.min(40, next.w / 2) : next.x + next.w - Math.min(40, next.w / 2);
  const dx = landX - w.x, dy = ledgeTop(next) - w.y;
  const T = Math.max(0.42, Math.min(0.95, Math.abs(dx) / speed + (dy < 0 ? 0.08 : 0)));
  w.vx = dx / T;
  w.vy = (dy - 0.5 * GS_WALK_G * T * T) / T;
  w.air = true; w.land = next; w.landIdx = w.idx + dir; w.landX = landX;
  w.face = dx >= 0 ? 1 : -1;
}

function chaseReset(rescued) {
  gsc.route = null;
  gsc.duduIdx = 0;
  gsc.rim = null;
  gsc.rescue = null;
  gsc.farewell = null;
  gsc.p1Struck = false;
  if (rescued) {
    // restarting after the green line: Shady is already with Dudu, Rim never comes back, night swamp
    gsc.state = 'free';
    gsc.bgMix = 1;
    const R = ghostRoute(), i = Math.max(0, R.findIndex(a => a.id === 'GS43-R0'));
    gsc.shady = makeWalker(i, Math.max(R[i].x + 20, p.x - 90));
    gsc.duduIdx = i;
  } else {
    gsc.state = 'wait';
    gsc.bgMix = 0;
    gsc.shady = null;
  }
  // a restart inside the stage (flag, R, no health left) keeps the music matching the rescue state
  gsPlayCue(rescued ? GS_BGM.DRAGON : GS_BGM.DEEP, rescued ? '4-3 restart after rescue' : '4-3 restart before rescue');
}

function rimChaseSpeed() {
  const C = GS_CHASE, R = ghostRoute();
  const top = R.find(a => a.id === 'GS43-TOP'), sp1 = R.find(a => a.id === 'GS43-SP1');
  let v = C.normal;
  // speeds up along the long upper ledge, full speed from the first of the four small ledges
  if (p.x >= top.x) v = C.normal + (C.sprint - C.normal) * Math.max(0, Math.min(1, (p.x - top.x) / (sp1.x - top.x)));
  const r = gsc.rim;
  if (r && p.x - r.x > C.leash) v = Math.max(v, C.catchUp);
  return v;
}

function updateChase(dt) {
  const st = activeGhostStage(), C = GS_CHASE, R = ghostRoute();
  const di = duduRouteIndex();
  if (gsc.state === 'wait') {
    // Rim appears behind Dudu the moment she leaves the start ledge
    const s0 = R[0];
    if (p.x > s0.x + s0.w - 4 || (p.ground && p.on && p.on !== s0)) {
      gsc.state = 'chase';
      gsc.rim = makeWalker(0, s0.x + 24);
      gsc.rim.alpha = 0; gsc.rim.wait = C.spawnGrace; gsc.rim.mode = 'run';
      if (typeof burst === 'function') burst(gsc.rim.x, gsc.rim.y - 40, '#3a2440', 14);
    }
    return;
  }
  if (gsc.state !== 'chase') return;
  const r = gsc.rim;
  r.alpha = Math.min(1, r.alpha + dt / 0.35);
  // the green line: Rim stops chasing; the rescue starts as soon as Dudu stands on the far side
  if (p.x >= st.gsRescueX) {
    if (r.air) stepWalker(r, r.landIdx, r.x, rimChaseSpeed(), dt);
    if (p.ground && p.on) startRescue();
    return;
  }
  // v1.9 (user): no strike on the red oval ledge in this map and no stopping there; she just runs.
  // No warp either (it made her vanish and pop up): far behind, she hurries at catchUp speed instead.
  if (r.wait > 0) { r.wait -= dt; r.prevX = r.x; r.prevY = r.y; r.t += dt; return; }
  stepWalker(r, di, p.x, rimChaseSpeed(), dt);
  if (Math.abs(p.x - r.x) < C.hitDist && Math.abs(p.y - r.y) < C.hitDy && p.invulnerable <= 0) {
    if (typeof applyStunHit === 'function') applyStunHit(r.x - 30 * (r.face || 1), 'rim', '림에게 붙잡힐 뻔했어요!');
    r.wait = C.recover;
  }
}

function startRescue() {
  gsc.state = 'rescue';
  const at = activeGhostStage().gsShadyAt, r = gsc.rim;
  gsc.rescue = { t: 0, token: gs.token, rimX: r ? r.x : p.x - 300, rimY: r ? r.y : p.y };
  // Shady lands between Rim and Dudu (the sketch's green oval is at the near end of this ledge), facing Rim
  const R = ghostRoute(), i = R.indexOf(p.on) >= 0 ? R.indexOf(p.on) : duduRouteIndex();
  gsc.shady = makeWalker(i, Math.min(at.x, p.x - 100));
  gsc.shady.y = p.on ? p.on.y : at.y;
  gsc.shady.face = -1;
  gsc.shady.entering = true;
  gs.rim = null; gs.slashes.length = 0;
  window.__gsLock = true;
  p.vx = 0; p.dash = 0;
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
}
function updateRescue(dt) {
  const R = gsc.rescue;
  R.t += dt;
  if (gsc.shady) gsc.shady.t += dt;
  p.vx = 0;
  gsc.bgMix = Math.max(0, Math.min(1, (R.t - GS_RESCUE.bgFrom) / GS_RESCUE.bgDur));
  // Rim has finished dying and is gone: the chase is over. bg4->bg5 starts and the music changes, once.
  if (!R.musicSwitched && R.t >= GS_RESCUE.bgFrom) { R.musicSwitched = true; gsPlayCue(GS_BGM.DRAGON, '4-3 rescue complete'); }
  if (R.t >= GS_RESCUE.release) {
    gsc.state = 'free';
    gsc.rim = null;
    gsc.bgMix = 1;
    const s = gsc.shady;
    s.entering = false;
    // back onto the ledge she appeared over, then she walks along
    const pl = ghostRoute()[s.idx];
    s.x = Math.max(pl.x + 14, Math.min(pl.x + pl.w - 14, s.x));
    s.y = ledgeTop(pl);
    window.__gsLock = false;
  }
}

// Shady walks (and jumps) along behind Dudu; no collision, never stands in for a ledge, never blocks the view.
function updateShady(dt) {
  const s = gsc.shady;
  if (!s || s.entering) return;
  const di = duduRouteIndex();
  // she keeps to the side behind Dudu; it only changes after Dudu has walked the other way for 0.4s (no running
  // back and forth when Dudu turns round for a moment)
  const mv = Math.abs(p.vx) > 40 ? Math.sign(p.vx) : 0;
  if (mv && mv !== (s.side || 1)) { s.turnT = (s.turnT || 0) + dt; if (s.turnT > 0.4) { s.side = mv; s.turnT = 0; } }
  else s.turnT = 0;
  const behind = -(s.side || 1);
  const gap = Math.abs(p.x - s.x);
  const v = gap > 320 ? GS_CHASE.shadyFast : GS_CHASE.shady;
  stepWalker(s, di, p.x + behind * 90, v, dt);
  if (!s.moving && !s.air) s.face = p.x >= s.x ? 1 : -1;
}

function startFarewell() {
  gsc.state = 'farewell';
  gsc.farewell = { t: 0, token: gs.token };
  window.__gsLock = true;
  p.vx = 0; p.dash = 0;
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
  const s = gsc.shady;
  if (s) { s.air = false; s.x = Math.max(p.on ? p.on.x + 14 : p.x - 125, p.x - 125); s.y = p.on ? p.on.y : p.y; s.face = 1; s.t = 0; }
}
function updateFarewell(dt) {
  const F = gsc.farewell, s = gsc.shady;
  F.t += dt;
  p.vx = 0;
  const jokeDur = (gsAtlas && gsAtlas.motions.shady_joke ? gsAtlas.motions.shady_joke.duration / 1000 : 1.14) * GS_FAREWELL.jokeLoops;
  if (s) s.alpha = F.t < jokeDur ? 1 : Math.max(0, 1 - (F.t - jokeDur) / GS_FAREWELL.fade);
  if (F.t >= jokeDur + GS_FAREWELL.fade + 0.3) {
    gsc.state = 'done';
    if (F.token === gs.token && activeGhostStage() && activeGhostStage().stageCode === 'ghost_swamp_3') completeGhostStage('ghost_swamp_3');
  }
}

function updateGhost43(dt) {
  if (gsc.state === 'rescue') { updateRescue(dt); return; }
  if (gsc.state === 'farewell') { updateFarewell(dt); return; }
  if (gsc.state === 'wait' || gsc.state === 'chase') updateChase(dt);
  if (gsc.state === 'free') updateShady(dt);
}

function drawGhost43() {
  const r = gsc.rim;
  if (gsc.state === 'chase' && r) {
    const q = walkerDrawPos(r);
    gsSprite('rim_move', r.t, q.x, q.y, r.face, r.alpha, true);
  }
  if (gsc.state === 'rescue' && gsc.rescue) {
    const R = gsc.rescue;
    if (R.t >= GS_RESCUE.rimDieAt) {
      const dieT = R.t - GS_RESCUE.rimDieAt;
      const dieDur = gsAtlas && gsAtlas.motions.rim_die ? gsAtlas.motions.rim_die.duration / 1000 : 2.27;
      if (dieT < dieDur + 0.3) gsSprite('rim_die', dieT, R.rimX, R.rimY, 1, dieT > dieDur ? Math.max(0, 1 - (dieT - dieDur) / 0.3) : 1, false);
    } else gsSprite('rim_attack1', 0, R.rimX, R.rimY, 1, 1, false);   // stopped short by Shady
  }
  const s = gsc.shady;
  if (s && s.alpha > 0) {
    if (gsc.state === 'rescue') gsSprite('shady_exp1', s.t, s.x, s.y, s.face, Math.min(1, s.t / 0.25), false);
    else if (gsc.state === 'farewell') gsSprite('shady_joke', gsc.farewell.t, s.x, s.y, s.face, s.alpha, true);
    else { const q = walkerDrawPos(s); gsSprite(s.moving || s.air ? 'shady_move' : 'shady_idle', s.t, q.x, q.y, s.face, s.alpha, true); }
  }
}

function startRimAttack(plat, side = null) {
  const which = forcedRimAttack() || (Math.random() < 0.5 ? 1 : 2);
  const mo = GS_RIM_ATTACK.motions[which];
  // Rim takes the side of the ledge away from Dudu, so the slash runs across where Dudu stands
  const right = side ? side === 'right' : p.x < plat.x + plat.w / 2;
  gs.rim = {
    plat, which, key: mo.key, strikeMs: mo.strikeMs,
    x: right ? plat.x + plat.w + GS_RIM_ATTACK.standOff : plat.x - GS_RIM_ATTACK.standOff,
    face: right ? -1 : 1,
    t: 0,                       // time since landing
    struck: false, gone: false
  };
}
function updateRim(dt) {
  const r = gs.rim;
  if (!r) return;
  r.t += dt;
  const A = GS_RIM_ATTACK;
  if (!r.struck && r.t >= A.telegraph) {
    r.struck = true;
    gs.slashes.push({ x: r.x, y: r.plat.y, dir: r.face, start: r.x,
      end: r.face < 0 ? r.plat.x - 80 : r.plat.x + r.plat.w + 80, t: 0 });
    if (typeof tone === 'function') tone(520, 0.09, 'sawtooth', 0.03);
  }
  if (r.struck && r.t >= A.telegraph + A.stayAfter + A.fadeOut) gs.rim = null;
}
function updateSlashes(dt) {
  const A = GS_RIM_ATTACK;
  for (let i = gs.slashes.length - 1; i >= 0; i--) {
    const s = gs.slashes[i];
    s.t += dt;
    s.x += s.dir * A.slashSpeed * dt;
    if ((s.dir < 0 && s.x < s.end) || (s.dir > 0 && s.x > s.end)) { gs.slashes.splice(i, 1); continue; }
    if (!s.hit && Math.abs(p.x - s.x) < A.slashHalfW + 16 && p.y > s.y - A.slashHeight && p.y - 62 < s.y && p.invulnerable <= 0) {
      s.hit = true;
      if (typeof applyStunHit === 'function') applyStunHit(s.x - s.dir * 40, 'rim', '림의 낫에 맞았어요!');
    }
  }
}

function startKidnap() {
  gs.rim = null;
  gs.slashes.length = 0;
  const onPlat = p.on;
  // Rim stands on the goal ledge to Dudu's right (or left when Dudu is at the right end), facing her
  let rx = p.x + GS_KIDNAP.rimOffset, face = -1;
  if (onPlat && rx > onPlat.x + onPlat.w - 30) { rx = p.x - GS_KIDNAP.rimOffset; face = 1; }
  gs.kidnap = { t: 0, token: ++gs.token, x: rx, face, y: onPlat ? onPlat.y : p.y, grabbed: false, done: false, dx: p.x, dy: p.y };
  window.__gsLock = true;
  p.vx = 0; p.dash = 0;
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
}
function updateKidnap(dt) {
  const k = gs.kidnap;
  if (!k || k.done) return;
  k.t += dt;
  p.vx = 0;
  if (!k.grabbed && k.t >= GS_KIDNAP.grabAt) {
    k.grabbed = true;
    window.__gsHideDudu = true;
    if (typeof burst === 'function') { burst(k.dx, k.dy - 34, '#3a2440', 16); burst(k.dx, k.dy - 34, '#b0283a', 8); }
    if (typeof tone === 'function') tone(180, 0.3, 'sawtooth', 0.04);
  }
  if (k.t >= GS_KIDNAP.fadeAt + GS_KIDNAP.fadeDur) {
    k.done = true;
    const token = k.token;
    if (token === gs.token && activeGhostStage() && activeGhostStage().stageCode === 'ghost_swamp_2') completeGhostStage('ghost_swamp_2');
  }
}

function updateGhostSwamp(dt) {
  if (!activeGhostStage()) return;
  gs.clock += dt;
  if (gs.kidnap) { updateKidnap(dt); return; }
  const st = activeGhostStage();
  if (st.gsChase && (gsc.state === 'rescue' || gsc.state === 'farewell' || gsc.state === 'done')) { updateGhost43(dt); return; }
  // landings: a new ledge (not the one Dudu last stood on) can start Rim's attack, the kidnap or the farewell
  if (p.ground && p.on && p.on.id !== gs.lastStoodId) {
    gs.lastStoodId = p.on.id;
    if (st.gsKidnapPlatform && p.on.id === st.gsKidnapPlatform) { startKidnap(); return; }
    if (st.gsFarewellPlatform && p.on.id === st.gsFarewellPlatform && gsc.state === 'free') { startFarewell(); return; }
    // in 4-3 Rim comes from behind (the left), and only before the rescue
    if (p.on.rimTrigger && (!gs.rim || gs.rim.struck) && !(st.gsChase && gsc.state !== 'wait' && gsc.state !== 'chase')) {
      startRimAttack(p.on, st.gsChase ? 'left' : null);
    }
  }
  updateRim(dt);
  updateSlashes(dt);
  // 유령늪 1-2: the thorny vine wall pricks like the 수인숲 thorns (1 health, knocked away from it)
  if (p.invulnerable <= 0) {
    for (const a of platforms) {
      if (a.gsDraw !== 'thorn') continue;
      if (p.x + 18 >= a.x - 2 && p.x - 18 <= a.x + a.w + 2 && p.y >= a.y && p.y - 60 <= a.y + a.h) {
        if (typeof applyStunHit === 'function') applyStunHit(a.x + a.w / 2, 'world1_tentacle', '앗! 가시 덩굴에 찔렸어요!');
        break;
      }
    }
  }
  if (st.gsChase) updateGhost43(dt);
  const on = (p.ground && p.on) ? p.on : null;
  // left a sinking ledge: a jump sends it back quickly, walking or falling off slowly
  if (gs.lastOn && gs.lastOn !== on && gs.lastOn.sink) {
    gs.lastOn.sinkReturn = (!p.ground && p.vy < 0) ? GS_SINK.returnJump : GS_SINK.returnWalk;
    gs.lastOn.sinkDwell = 0;
  }
  gs.lastOn = on;
  for (const a of platforms) {
    if (!a.sink) continue;
    const max = a.sinkMax || GS_SINK.maxDrop;
    if (a === on) {
      a.sinkDwell = (a.sinkDwell || 0) + dt;
      if (a.sinkDwell >= GS_SINK.dwell) {
        a.sinkState = 'sinking';
        a.sinkY = Math.min(max, (a.sinkY || 0) + GS_SINK.speed * dt);
        continue;
      }
    } else a.sinkDwell = 0;
    // not sinking: drift back up to the resting height (on a mover: back onto its own track)
    if (a.sinkY > 0) {
      a.sinkState = 'rising';
      a.sinkY = Math.max(0, a.sinkY - (a.sinkReturn || GS_SINK.returnWalk) * dt);
    } else a.sinkState = a === on ? 'dwell' : 'idle';
  }
}
window.updateGhostSwamp = updateGhostSwamp;

// ----------------------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------------------
function drawGhostBackground() {
  const st = activeGhostStage();
  ctx.fillStyle = '#2e3436'; ctx.fillRect(0, 0, W, H);
  if (!st) return;
  // the paintings are 1280x820: shown 12% larger so they can drift slowly with the camera
  const sc = 1.12;
  const vx = Math.max(0, Math.min(1, (rCam + W * 0.5) / st.worldWidth));
  const vy = Math.max(0, Math.min(1, (rCamY - st.minCamY) / Math.max(1, st.maxCamY - st.minCamY)));
  const paint = (n, alpha) => {
    const im = gsImages['bg' + n];
    if (!im || alpha <= 0.001) return;
    const dw = im.width * sc, dh = im.height * sc;
    if (alpha < 1) { ctx.save(); ctx.globalAlpha = alpha; }
    ctx.drawImage(im, -Math.round(vx * (dw - W)), -Math.round(vy * (dh - H)), dw, dh);
    if (alpha < 1) ctx.restore();
  };
  if (st.gsChase) {   // 4-3: bg4 until the rescue, then bg5 (cross-faded during the rescue)
    if (gsc.bgMix < 1) paint(4, 1);
    if (gsc.bgMix > 0) paint(5, gsc.bgMix);
    return;
  }
  const sp = st.gsBgSplit;
  if (!sp) { paint(st.gsBg || 1, 1); return; }
  // two paintings meeting at a wall: cross-fade while the wall passes the middle of the screen
  const u = Math.max(0, Math.min(1, ((rCam + W * 0.5) - (sp.x - sp.fade / 2)) / sp.fade));
  if (u < 1) paint(sp.a, 1);
  if (u > 0) paint(sp.b, u < 1 ? u : 1);
}

// Murky water along the bottom of the stage (behind the ledges). Called in world coordinates.
function drawGhostBack() {
  const st = activeGhostStage();
  if (!st || !st.gsWater) return;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const x1 = Math.floor(rCam) - 20, x2 = Math.ceil(rCam + W / zoom) + 20, y = GS_SWAMP_Y, y2 = rCamY + H / zoom + 20;
  if (y > y2) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + 140);
  g.addColorStop(0, 'rgba(58, 74, 52, 0.92)');
  g.addColorStop(1, 'rgba(24, 30, 24, 0.98)');
  ctx.fillStyle = g;
  ctx.fillRect(x1, y, x2 - x1, y2 - y);
  ctx.strokeStyle = 'rgba(150, 170, 120, 0.35)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x1 - (x1 % 16); x <= x2; x += 16) {
    const wy = y + Math.sin(x * 0.018 + gs.clock * 1.4) * 2.5;
    if (x === x1 - (x1 % 16)) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
  }
  ctx.stroke();
  ctx.restore();
}
// Rim, her slashes and the kidnap: drawn in world coordinates, behind Dudu.
function drawGhostFront() {
  const st = activeGhostStage();
  if (!st) return;
  const A = GS_RIM_ATTACK, r = gs.rim;
  if (r) {
    // telegraph: the ledge top glows red until the slash leaves
    if (!r.struck) {
      const u = r.t / A.telegraph;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.45 * u;
      const g = ctx.createLinearGradient(0, r.plat.y - 30, 0, r.plat.y + 4);
      g.addColorStop(0, 'rgba(200, 30, 50, 0)'); g.addColorStop(1, 'rgba(220, 40, 60, 0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(r.plat.x, r.plat.y - 30, r.plat.w, 34);
      ctx.restore();
    }
    // the motion runs so that its strike frame lands on the slash
    const animT = (r.strikeMs / 1000) - A.telegraph + r.t;
    const end = A.telegraph + A.stayAfter;
    const alpha = r.t < A.fadeIn ? r.t / A.fadeIn : r.t > end ? Math.max(0, 1 - (r.t - end) / A.fadeOut) : 1;
    if (animT >= 0) gsSprite(r.key, animT, r.x, r.plat.y, r.face, alpha, false);
    else gsSprite(r.key, 0, r.x, r.plat.y, r.face, alpha, false);
  }
  for (const s of gs.slashes) {
    // a red crescent sliding along the ledge
    ctx.save();
    ctx.translate(s.x, s.y - 22);
    ctx.scale(s.dir, 1);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#d8283e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 26, 0, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(-8, 0, 12, 22, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff9aa6';
    ctx.fillRect(-60, 20, 60, 4);
    ctx.restore();
  }
  if (st.gsChase) drawGhost43();
  const k = gs.kidnap;
  if (k) gsSprite('rim_exp1', k.t, k.x, k.y, k.face, 1, false);
}
// screen-space: the kidnap fades to dark
function drawGhostOverlay() {
  const k = gs.kidnap;
  if (!k || !activeGhostStage()) return;
  const u = Math.max(0, Math.min(1, (k.t - GS_KIDNAP.fadeAt) / GS_KIDNAP.fadeDur));
  if (u <= 0) return;
  ctx.save();
  ctx.globalAlpha = u;
  ctx.fillStyle = '#120a16';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function gsRand(i) { const v = Math.sin(i * 91.7 + 13.3) * 43758.5453; return v - Math.floor(v); }

// DEV PLACEHOLDER SKINS (to check layout and gaps only). The real ledge art comes from GPT source paintings
// (docs/world4/GPT_GHOST_SWAMP_PLATFORM_SOURCES_BRIEF.md). The walk line is the platform top, drawY.
//   swamp (4-1): grey-brown soil and old wood, green moss on sinking ledges
//   antique (4-2 before the pillar): dark warm wood with a light grained top
//   rotten (4-2 after the pillar): purple-grey rotten wood, chipped ends
const GS_SKIN = {
  swamp:   { top: '#8f877c', b0: '#6b625a', b1: '#4c443e', b2: '#2f2a27' },
  antique: { top: '#b98a58', b0: '#7a5232', b1: '#5a3a22', b2: '#3a2516' },
  rotten:  { top: '#8e8090', b0: '#5e5260', b1: '#463c48', b2: '#2c252e' },
  void:    { top: '#8ea0b8', b0: '#4e5a70', b1: '#38425a', b2: '#232a3c' },   // 4-3 before the rescue
  night:   { top: '#6e6a62', b0: '#4a4640', b1: '#35322e', b2: '#221f1c' }    // 4-3 after the rescue (night swamp)
};
function drawGhostWall(a, x, y) {
  // old wooden posts / boards (brown on the sketch)
  ctx.save();
  const g = ctx.createLinearGradient(x, 0, x + a.w, 0);
  g.addColorStop(0, '#5a3a24'); g.addColorStop(0.5, '#7a5234'); g.addColorStop(1, '#4a2e1c');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, a.w, a.h);
  ctx.strokeStyle = 'rgba(30, 18, 10, 0.55)'; ctx.lineWidth = 2;
  if (a.h > a.w) {   // planks
    for (let px = x + 18; px < x + a.w - 6; px += 22) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + a.h); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.moveTo(x, y + a.h / 2); ctx.lineTo(x + a.w, y + a.h / 2); ctx.stroke();
  }
  ctx.fillStyle = '#9a7048';
  if (!a.noTopLand) ctx.fillRect(x, y, a.w, 5);
  ctx.restore();
}
// ---- platform art -------------------------------------------------------------------------------------------
// The user's 「DUDU ART V2 Ghost Swamp Platform Atlas」 board, cut into single parts by
// tools/ghost_swamp_board_parts.py (assets/terrain/ghost_swamp/<family>_<part>.webp + parts.js):
//   swamp ① (유령늪 1, 1-2) | sinking ② (every sinking ledge) | manor ③ (유령늪 2 before the pillar) |
//   rotten ④ (after it) | void ⑤ Ghostly Dream (유령늪 3 before the green line) | swamp_night / sinking_night
//   (① ② darkened, 유령늪 3 after the rescue) | blink on/dim (유령늪 2 blinking ledges) | blocker earth (유령늪 2 walls).
// Long ledges: left end + repeated middle tile + right end at the parts' own scale. Ledges too short for both ends:
// the thin float (up to 100px) or the medium float, scaled the same both ways. Every part's walking surface row sits
// exactly on the ledge's y. 유령늪 1-2's wall keeps the 수인숲 thorn sprouts (user).
const GS_PARTS_DIR = 'assets/terrain/ghost_swamp/';
const GS_FAMILY_OF_SKIN = { swamp: 'swamp', antique: 'manor', rotten: 'rotten', void: 'void', night: 'swamp_night' };
let gsParts = null;
function loadGhostParts() {
  const done = () => {
    gsParts = window.GS_PARTS || null;
    if (!gsParts) return;
    for (const fam of Object.keys(gsParts)) for (const part of Object.keys(gsParts[fam])) gsLoad(`pt_${fam}_${part}`, `${GS_PARTS_DIR}${fam}_${part}.webp${GS_ASSET_Q}`);
  };
  if (window.GS_PARTS) { done(); return; }
  const sc = document.createElement('script');
  sc.src = `${GS_PARTS_DIR}parts.js${GS_ASSET_Q}`;
  sc.onload = done;
  sc.onerror = () => console.warn('[ghost swamp] failed to load the ledge parts table');
  document.head.appendChild(sc);
}
function gsPart(fam, part) {
  const m = gsParts && gsParts[fam] && gsParts[fam][part], im = gsImages[`pt_${fam}_${part}`];
  return m && im ? { im, w: m[0], h: m[1], surf: m[2] } : null;
}
function gsLedgeFamily(a) {
  if (a.gsDraw === 'sink') return a.gsSkin === 'night' ? 'sinking_night' : 'sinking';
  if (a.gsDraw === 'wall') return a.x < GS42_WALL_X ? 'manor' : 'rotten';   // 유령늪 2's horizontal boards
  return GS_FAMILY_OF_SKIN[a.gsSkin || 'swamp'] || 'swamp';
}
// draws a ledge of family `fam`, `w` wide, walking surface at y; returns the drawn depth below the surface (0 = not ready)
function gsDrawLedgeParts(fam, x, y, w) {
  const L = gsPart(fam, 'left'), M = gsPart(fam, 'mid'), R = gsPart(fam, 'right');
  // each part on the board carries a thin dark outline and soft rim on its sides: the joining sides lose JOIN px and
  // the pieces overlap by 1px, so the long ledge reads as one piece
  const JOIN = 3;
  if (L && M && R && w >= L.w + R.w - JOIN * 2) {
    ctx.drawImage(L.im, 0, 0, L.w - JOIN, L.h, x, Math.round(y - L.surf), L.w - JOIN, L.h);
    const end = x + w - (R.w - JOIN), mw = M.w - JOIN * 2;
    for (let cx = x + L.w - JOIN - 1; cx < end; cx += mw - 1) {
      const cw = Math.min(mw, end - cx + 1);
      ctx.drawImage(M.im, JOIN, 0, cw, M.h, cx, Math.round(y - M.surf), cw, M.h);
    }
    ctx.drawImage(R.im, JOIN, 0, R.w - JOIN, R.h, end - 1, Math.round(y - R.surf), R.w - JOIN, R.h);
    return Math.min(L.h - L.surf, M.h - M.surf, R.h - R.surf);
  }
  const F = gsPart(fam, w <= 100 ? 'small' : 'medium') || gsPart(fam, 'medium');
  if (!F) return 0;
  const s = w / F.w;
  ctx.drawImage(F.im, x, Math.round(y - F.surf * s), w, Math.round(F.h * s));
  return (F.h - F.surf) * s;
}
// blinking ledge (유령늪 2): the blink slab, its two ends kept and its middle repeated to the ledge's width
function gsDrawBlink(a, x, y) {
  const B = gsPart('blink', a.blinkState === 'warning' && Math.sin(gs.clock * 16) > 0 ? 'dim' : 'on');
  if (!B) return false;
  const cap = 26, mid = B.w - cap * 2;
  ctx.drawImage(B.im, 0, 0, cap, B.h, x, Math.round(y - B.surf), cap, B.h);
  for (let cx = x + cap; cx < x + a.w - cap; cx += mid - 1) {
    const cw = Math.min(mid, x + a.w - cap - cx);
    ctx.drawImage(B.im, cap, 0, cw, B.h, cx, Math.round(y - B.surf), cw, B.h);
  }
  ctx.drawImage(B.im, B.w - cap, 0, cap, B.h, x + a.w - cap, Math.round(y - B.surf), cap, B.h);
  return true;
}
// upright walls: the wooden posts from the earlier sheets (user, v1.9: the board's earth blocker is not used),
// swamp post in 유령늪 2, manor post before the pillar and rotten post after it in 유령늪 3; the post's top once, then
// its middle repeated down the wall
function gsDrawBlocker(a, x, y) {
  const B = gsPart('post', a.gsSkin === 'swamp' ? 'swamp' : a.x < GS42_WALL_X ? 'manor' : 'rotten');
  if (!B) return false;
  const s = (a.w + 8) / B.w, capH = Math.round(B.h * 0.25), midY = capH, midH = Math.round(B.h * 0.62);   // long repeat: fewer bands
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 4, y, a.w + 8, a.h); ctx.clip();
  let yy = y;
  if (!a.noTopLand) { ctx.drawImage(B.im, 0, 0, B.w, capH, x - 4, y, a.w + 8, capH * s); yy += capH * s - 1; }
  const vTop = rCamY - 200, vBot = rCamY + H + 200;
  for (; yy < y + a.h; yy += midH * s - 3) {
    if (yy + midH * s < vTop || yy > vBot) continue;
    ctx.drawImage(B.im, 0, midY, B.w, midH, x - 4, yy, a.w + 8, midH * s);
  }
  ctx.restore();
  return true;
}
// 유령늪 1-2's big wall: the 수인숲 thorn sprouts (tentacle_idle), stacked into a thorny vine column over a dark core
function drawGhostThornWall(a, x, y) {
  const im = typeof npcImages !== 'undefined' ? npcImages.tentacle_idle : null;
  const M = typeof TENTACLE_META !== 'undefined' ? TENTACLE_META : null;
  ctx.save();
  const g = ctx.createLinearGradient(x, 0, x + a.w, 0);
  g.addColorStop(0, '#2a1d2a'); g.addColorStop(0.5, '#3b2738'); g.addColorStop(1, '#241824');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x + 10, y, a.w - 20, a.h, 18); ctx.fill();
  if (im && im.complete && im.naturalWidth > 0 && M) {
    const sz = Math.round(M.displaySize * 1.6), step = 74;
    const viewTop = rCamY - 140, viewBot = rCamY + H + 140;
    let i = 0;
    for (let yy = y + a.h; yy > y + 10; yy -= step, i++) {
      if (yy < viewTop || yy - sz > viewBot) continue;
      for (const side of [0, 1]) {
        const cx = x + (side ? a.w * 0.78 : a.w * 0.22) + ((i % 2) ? 8 : -8);
        const f = Math.floor((gs.clock * M.fps + i * 7 + side * 13) % M.frames);
        ctx.drawImage(im, (f % M.cols) * 256, Math.floor(f / M.cols) * 256, 256, 256,
          Math.round(cx - (M.anchorX / 256) * sz), Math.round(yy - (M.footY / 256) * sz), sz, sz);
      }
    }
  }
  ctx.restore();
}
// the peg a fixed thorn stands on (유령늪 2 top line): a stub of mossy root, too narrow to land on
function drawGhostPeg(a, x, y) {
  ctx.save();
  ctx.fillStyle = '#3e2c22';
  ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + a.w - 4, y); ctx.lineTo(x + a.w / 2 + 5, y + 46); ctx.lineTo(x + a.w / 2 - 5, y + 46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f8f3a';
  ctx.beginPath(); ctx.ellipse(x + a.w / 2, y + 1, a.w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawGhostArt(a, x, y) {
  if (a.gsDraw === 'peg') { drawGhostPeg(a, x, y); return true; }
  if (a.gsDraw === 'thorn') { drawGhostThornWall(a, x, y); return true; }
  if (!gsParts) return false;
  if (a.gsDraw === 'wall' && a.h > a.w) return gsDrawBlocker(a, x, y);
  ctx.save();
  if (a.blink) ctx.globalAlpha = a.blinkAlpha ?? 1;
  let ok;
  if (a.gsDraw === 'blink') ok = gsDrawBlink(a, x, y);
  else {
    const depth = gsDrawLedgeParts(gsLedgeFamily(a), x, y, a.w);
    ok = depth > 0;
    // a sinking ledge only swallows Dudu as deep as its mud is drawn (thin floats are shallower than long ledges)
    if (ok && a.sink && !a.sinkMaxFixed) { a.sinkMax = Math.max(16, Math.min(a.sinkMax || GS_SINK.maxDrop, Math.floor(depth - 4))); a.sinkMaxFixed = true; }
  }
  ctx.restore();
  return ok;
}

function drawGhostPlatform(a, x, y) {
  // v1.9: a sinking ledge itself stays put; only Dudu's footing (a.y) goes down into its mud, so the ledge is drawn
  // sinkY higher than its collision line, and it is thick enough to swallow Dudu's legs.
  if (a.gsDraw === 'sink') y -= Math.round(a.sinkY || 0);
  if (drawGhostArt(a, x, y)) return;
  // fallback until the art has loaded: the earlier temporary drawing
  if (a.gsDraw === 'wall') { drawGhostWall(a, x, y); return; }
  const sink = a.gsDraw === 'sink', w = a.w, seed = (a.visual && a.visual.seed) || 7;
  const K = GS_SKIN[a.gsSkin || 'swamp'];
  const th = sink ? GS_SINK.maxDrop + 10 : (w <= 130 ? 26 : 34);
  ctx.save();
  if (a.blink) ctx.globalAlpha = a.blinkAlpha ?? 1;
  // soft shadow on what is behind
  ctx.fillStyle = 'rgba(10, 12, 10, 0.25)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + th + 6, w * 0.46, 6, 0, 0, Math.PI * 2); ctx.fill();
  const body = ctx.createLinearGradient(0, y, 0, y + th);
  body.addColorStop(0, K.b0); body.addColorStop(0.35, K.b1); body.addColorStop(1, K.b2);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect(x, y, w, th, [6, 6, 12, 12]); ctx.fill();
  // ragged underside
  ctx.fillStyle = K.b2;
  for (let i = 0; i < Math.floor(w / 22); i++) {
    const cx = x + 10 + i * 22 + gsRand(seed + i) * 8, d = 4 + gsRand(seed * 3 + i) * 8;
    ctx.beginPath(); ctx.moveTo(cx - 7, y + th - 2); ctx.lineTo(cx, y + th + d); ctx.lineTo(cx + 7, y + th - 2); ctx.fill();
  }
  // flat top
  ctx.fillStyle = K.top;
  ctx.beginPath(); ctx.roundRect(x, y - 1, w, 7, [6, 6, 0, 0]); ctx.fill();
  if (a.gsSkin === 'antique' || a.gsSkin === 'rotten' || a.gsSkin === 'void') {
    // wood grain and board joints
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.35)'; ctx.lineWidth = 1.5;
    for (let jx = x + 40 + gsRand(seed) * 30; jx < x + w - 20; jx += 70 + gsRand(seed + jx) * 30) {
      ctx.beginPath(); ctx.moveTo(jx, y + 6); ctx.lineTo(jx, y + th - 4); ctx.stroke();
    }
    if (a.blink && a.blinkState === 'warning') {   // blinking ledges shake a little before they vanish
      ctx.fillStyle = 'rgba(255, 230, 200, 0.18)';
      ctx.fillRect(x, y - 1, w, th);
    }
    ctx.restore();
    return;
  }
  if (sink) {
    // dark green moss and slime on top, a few short drips, small bubbles
    const t = gs.clock;
    const moss = ctx.createLinearGradient(0, y - 3, 0, y + 10);
    moss.addColorStop(0, '#5f9a3c'); moss.addColorStop(1, '#2f5a22');
    ctx.fillStyle = moss;
    ctx.beginPath(); ctx.roundRect(x - 1, y - 3, w + 2, 11, [7, 7, 3, 3]); ctx.fill();
    ctx.fillStyle = '#2f5a22';
    for (let i = 0; i < Math.max(2, Math.floor(w / 46)); i++) {
      const dx = x + 14 + gsRand(seed + 40 + i) * (w - 28), len = 6 + gsRand(seed + 70 + i) * 12 + Math.sin(t * 1.3 + i) * 1.5;
      ctx.beginPath(); ctx.roundRect(dx - 2.5, y + 4, 5, len, 3); ctx.fill();
    }
    ctx.fillStyle = 'rgba(170, 220, 120, 0.55)';
    for (let i = 0; i < Math.max(1, Math.floor(w / 90)); i++) {
      const ph = (t * 0.6 + gsRand(seed + 9 + i)) % 1, bx = x + 12 + gsRand(seed + 20 + i) * (w - 24);
      ctx.beginPath(); ctx.arc(bx, y - 2 - ph * 6, 1.5 + ph * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // a little moss on plain ledges too
    ctx.fillStyle = 'rgba(95, 130, 70, 0.8)';
    for (let i = 0; i < Math.max(1, Math.floor(w / 120)); i++) {
      const mx = x + 10 + gsRand(seed + 5 + i) * (w - 40);
      ctx.beginPath(); ctx.ellipse(mx + 10, y + 1, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
window.drawGhostPlatform = drawGhostPlatform;
// v1.9 (user): once Dudu has started to sink, her jump is weak: one jump lifts her out of the mud to the surface
// (plus 20% of a normal jump's height), with no second jump in the air; after landing everything is normal again.
// Called from game.js beginJump; returns true when it handled the jump.
function ghostEscapeJump(plat) {
  if (!activeGhostStage() || !(plat.sinkY > 0.5)) return false;
  const rise = plat.sinkY + 148 * GS_SINK.escapeHop;
  p.touchHoldGrace = 0;
  p.vy = -Math.sqrt(2 * GS_SINK.escapeG * rise);
  p.jumps = 2;                 // no second jump on the way out
  p.ground = false; p.on = null; p.coyote = 0; p.buffer = 0; p.hold = 0;
  p.jumpHeld = false; p.jumpCut = false; p.jumpOrigin = p.y; p.jumpHeight = 0;
  plat.sinkReturn = GS_SINK.returnJump; plat.sinkDwell = 0;
  if (typeof burst === 'function') burst(p.x, p.y - 6, '#4f7a34', 8);
  return true;
}
window.ghostEscapeJump = ghostEscapeJump;
// Drawn right after Dudu (world coordinates): while she sinks, the mud ledge she stands in is painted again over her
// legs, with a ring of slime where she goes in.
function drawGhostAfterDudu() {
  if (!activeGhostStage() || !p.on || !p.on.sink || !(p.on.sinkY > 0.5)) return;
  const a = p.on;
  const x = Math.round((a.prevX ?? a.x) + (a.x - (a.prevX ?? a.x)) * renderAlpha);
  const y = Math.round((a.prevY ?? a.y) + (a.y - (a.prevY ?? a.y)) * renderAlpha);
  drawGhostPlatform(a, x, y);
  const top = y - Math.round(a.sinkY || 0), cx = Math.round(rPx);
  ctx.save();
  ctx.fillStyle = 'rgba(70, 120, 45, 0.85)';
  ctx.beginPath(); ctx.ellipse(cx, top + 1, 26 + Math.sin(gs.clock * 3) * 2, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(170, 220, 120, 0.5)';
  ctx.beginPath(); ctx.ellipse(cx, top - 1, 20, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
window.drawGhostAfterDudu = drawGhostAfterDudu;
window.drawGhostBack = drawGhostBack;
window.drawGhostFront = drawGhostFront;
window.drawGhostOverlay = drawGhostOverlay;

// ----------------------------------------------------------------------------
// Save, panels
// ----------------------------------------------------------------------------
const GS_STAGE_INFO = {
  // shown as 유령늪 1, 2, 3, 4 (user); the keys stay the directive's stage IDs
  'ghost_swamp_1':   { code: '1', name: '유령늪 1', desc: '가라앉는 늪 발판과 오르내리는 발판을 건너 늪 건너편까지 가요.' },
  'ghost_swamp_1_2': { code: '2', name: '유령늪 2', desc: '움직이는 늪 발판을 타고 가시를 뛰어넘어, 높은 벽 위로 넘어가요.' },
  'ghost_swamp_2':   { code: '3', name: '유령늪 3', desc: '림이 발판에 내려앉을 때마다 공격해요. 피해서 저택을 지나가요.' },
  'ghost_swamp_3':   { code: '4', name: '유령늪 4', desc: '쫓아오는 림을 피해 달리고, 셰이디와 함께 늪을 빠져나가요.' }
};
function ghostRecord(code, save) {
  save = save || loadWorldMapSave();
  return save.worlds[GS_WORLD_ID].stages[code];
}
function openGhostStageSelect() {
  loadGhostAssets();
  worldMapScreen = 'ghostStageSelect';
  const wrap = $('worldmapOverlay'); if (!wrap) return;
  const save = loadWorldMapSave();
  const cards = GS_STAGE_ORDER.map(code => {
    const rec = ghostRecord(code, save), info = GS_STAGE_INFO[code];
    const built = ghostStageIndex(code) >= 0, open = built && rec.unlocked;
    const status = !built ? '준비 중' : rec.cleared ? '✓ 클리어' : rec.unlocked ? '● 진입 가능' : '잠김';
    const bestTxt = rec.bestSeconds !== null ? `${rec.bestSeconds.toFixed(1)}초` : '기록 없음';
    return `
        <div class="wmStageCard ${open ? 'unlocked' : 'locked'} ${rec.cleared ? 'cleared' : ''}" id="wmStageCard-${code}" data-stage-code="${code}" data-unlocked="${open}">
          <div class="wmStageTop"><span class="wmStageCode">${info.code}</span><span class="wmStageStatus">${status}</span></div>
          <strong class="wmStageName">${info.name}</strong>
          <p class="wmStageDesc">${info.desc}</p>
          <div class="wmStageStats">
            <span>최고 기록: <b>${bestTxt}</b></span>
            <span>재시도 <b>${rec.retries}</b>회, 피격 <b>${rec.hits}</b>회</span>
          </div>
          <div class="wmStageBtnRow"><button type="button" class="wmStagePlayBtn" id="wmStageBtn-${code}" ${open ? '' : 'disabled'} onclick="startGhostStage('${code}')">${open ? '스테이지 시작' : (built ? '앞 스테이지를 깨면 열려요' : '준비 중')}</button></div>
        </div>`;
  }).join('');
  wrap.innerHTML = `
    <div class="wmPanel" role="dialog" aria-modal="true" aria-labelledby="wmGhostHeaderTitle">
      <div class="wmHeader">
        <div><span class="wmEyebrow">월드 4</span><h2 id="wmGhostHeaderTitle">무시무시 유령늪</h2></div>
        <div class="wmHeaderActions"><button type="button" class="wmBackBtn" onclick="openWorldMapMenu({forceDevOpen:true})">세계지도로</button></div>
      </div>
      <div class="wmStageGrid">${cards}</div>
    </div>`;
  wrap.hidden = false;
}
window.openGhostStageSelect = openGhostStageSelect;

function startGhostStage(code = 'ghost_swamp_1', section = 0) {
  const idx = ghostStageIndex(code);
  if (idx < 0) return;
  loadGhostAssets();
  loadWorld1Stage(idx, { section, entryRoute: 'default' });
}
window.startGhostStage = startGhostStage;

function completeGhostStage(code) {
  const save = loadWorldMapSave(), rec = ghostRecord(code, save);
  rec.cleared = true;
  const elapsed = Number(worldStageElapsed.toFixed(2));
  if (rec.bestSeconds === null || elapsed < rec.bestSeconds) rec.bestSeconds = elapsed;
  const next = GS_STAGE_ORDER[GS_STAGE_ORDER.indexOf(code) + 1];
  if (next) save.worlds[GS_WORLD_ID].stages[next].unlocked = true;
  if (code === 'ghost_swamp_3') save.worlds[GS_WORLD_ID].regionCleared = true;
  saveWorldMapData(save);
  window.__gsLock = false;
  window.__gsHideDudu = false;
  gs.kidnap = null;
  const nextBuilt = next && ghostStageIndex(next) >= 0;
  // 4-2 ends with Rim carrying Dudu off: straight on into 4-3 (spec C)
  if (code === 'ghost_swamp_2' && nextBuilt) { startGhostStage(next); return; }
  if (typeof tone === 'function' && code !== 'ghost_swamp_2') tone(960, 0.22, 'triangle', 0.06);
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
  state = 'paused';
  worldMapScreen = 'ghostClearModal';
  const wrap = $('worldmapOverlay'); if (!wrap) return;
  const head = code === 'ghost_swamp_2'
    ? '<span class="wmEyebrow">유령늪 3</span><h2>두두가 림에게 붙잡혀 갔어요!</h2>'
    : code === 'ghost_swamp_3' ? '<span class="wmEyebrow">월드 4 완주</span><h2>셰이디와 함께 유령늪을 빠져나왔어요!</h2>'
    : `<span class="wmEyebrow">월드 4</span><h2>${GS_STAGE_INFO[code].name} 통과!</h2>`;
  const nextLabel = code === 'ghost_swamp_2' ? '구하러 가기' : '다음 스테이지';
  wrap.innerHTML = `
    <div class="wmPanel wmClearPanel" role="dialog" aria-modal="true">
      <div class="wmHeader"><div>${head}</div></div>
      <p class="wmClearSummary">걸린 시간 <b>${worldStageElapsed.toFixed(1)}초</b>, 피격 <b>${worldStageHitsThisRun}회</b></p>
      <div class="wmClearBtnRow">
        ${nextBuilt ? `<button type="button" class="primary" onclick="startGhostStage('${next}')">${nextLabel}</button>` : ''}
        <button type="button" class="${nextBuilt ? 'secondary' : 'primary'}" onclick="startGhostStage('${code}')">다시 하기</button>
        <button type="button" class="secondary" onclick="openGhostStageSelect()">스테이지 선택</button>
      </div>
    </div>`;
  wrap.hidden = false;
}
window.completeGhostStage = completeGhostStage;

// DEV: jump straight to a point in a World 4 stage (QA only)
function devPracticeGhost(code = 'ghost_swamp_1', x = null, y = null) {
  startGhostStage(code);
  if (typeof x === 'number') { p.x = p.prevX = x; }
  if (typeof y === 'number') {
    p.y = p.prevY = y;
    p.on = platforms.find(a => a.collidable !== false && !a.wall && p.x >= a.x && p.x <= a.x + a.w && Math.abs(a.y - p.y) < 10) || null;
    p.ground = Boolean(p.on);
  }
  if (typeof x === 'number') {
    const c = computeInitialCameraForPoint(p.x, p.y);
    cam = c.cam; camY = c.camY; window.camBaseY = camY; syncRenderCoords();
  }
}
window.devPracticeGhost = devPracticeGhost;
