'use strict';
// ============================================================================
// v1.6 WORLD 3 「정령산의 아침」 (stage 3-1): one long VERTICAL climb, bottom to summit, no scene changes.
//
// Built from the supplied sketch (771 x 2000, bottom = start). Sketch -> world:
//   x = 40 + sx * 3.0
//   y = 580 - (1955 - sy) * k, k = 4.2 for the cave, 3.1 for the denser lava hall (sketch y 1530..1225) and 3.8 above.
// Every hop was checked against the real jump arc (see docs/SPIRIT_MOUNTAIN.md and tools/qa/spirit_*.py).
//
// Zones (v1.6.2 route): A start outside on the lake platforms with Naia (bg 1) -> through the doorway into
// B Gabia's dark maze, down to Gabia on the cave floor and up the right side, circle of light, no pits (bg 2)
// -> C Ifrit's lava hall with fire wisps (bg 3) -> D outside climb, blue wind zone: every 20-30s a 4-6s gust from the
// right pushes Dudu left while airborne (bg 4) -> E summit, Sylla and Aya (bg 5).
// The stage rides on the World 1 stage runner (worldmap-mode.js) exactly like the night map.
// ============================================================================

const SM_WORLD_ID = 'world3_spiritmountain';
const SM_CODE = '3-1';
const SM_WIDTH = 3627;   // v1.6.3: x scale 4.6 so the maze keeps the sketch's proportions
const SM_ASSET_Q = '?v=v1_9_3_261125'; // rewritten by tools/release.py on every deploy

// Wind (directive section 4). All times in seconds of game time (physics steps), so pause and low FPS do not change them.
const SM_WIND = {
  x1: 0, x2: 3467, y1: -6046, y2: -4476,       // the blue zone on the sketch
  intervalMin: 7, intervalMax: 10,              // start-to-start (v1.6.6: a gust every 7-10s)
  firstMin: 7, firstMax: 10,                    // first gust 7-10s after arriving in the zone
  durMin: 3, durMax: 3,                         // v1.6.5: each gust blows for 3s
  warn: 1.2,                                    // visible warning before a gust, no push
  push: 104,                                    // px/s (v1.6.5: 15% stronger than 90): in the air the target speed shifts left by this much
  rampIn: 0.25, rampOut: 0.45
};

const SM_SPRITES = {
  naia_idle:    { frames: 34, fps: 12.5, anchor: 128, foot: 252, display: 126 },
  naia_happy:   { frames: 27, fps: 25,   anchor: 128, foot: 252, display: 126 },
  gabia_idle:   { frames: 34, fps: 12.5, anchor: 128, foot: 250, display: 130 },
  gabia_happy:  { frames: 27, fps: 25,   anchor: 128, foot: 250, display: 130 },
  ifrit_idle:   { frames: 34, fps: 12.5, anchor: 128, foot: 252, display: 128 },
  ifrit_sorry:  { frames: 34, fps: 25,   anchor: 128, foot: 252, display: 128 },
  sylla_idle:   { frames: 34, fps: 12.5, anchor: 134, foot: 252, display: 128 },
  sylla_happy:  { frames: 34, fps: 25,   anchor: 134, foot: 252, display: 128 },
  aya_idle:     { frames: 34, fps: 12.5, anchor: 126, foot: 252, display: 128 },
  aya_happy:    { frames: 34, fps: 25,   anchor: 126, foot: 252, display: 128 },
  wisp_idle:    { frames: 25, fps: 12.5, anchor: 128, foot: 140, display: 112 },
  wisp_move:    { frames: 34, fps: 25,   anchor: 128, foot: 160, display: 112 },
  wisp_attack:  { frames: 47, fps: 25,   anchor: 110, foot: 130, display: 112 },
  wisp_groggy:  { frames: 34, fps: 25,   anchor: 140, foot: 118, display: 112 }
};
// v1.6.4 platform, wall, lava and wind art cut from 정령산 에셋 - 새로운거.zip (flat-topped modules): [width, height, surface row]
const SM_TILES = {"out_long": [1404, 246, 52], "out_tiny": [165, 106, 4], "out_wall": [212, 287, 1], "cave_long": [1419, 237, 47], "cave_tiny": [160, 96, 1], "cave_wall": [212, 296, 2], "lava_long": [1419, 269, 69], "lava_tiny": [165, 96, 2], "snow_long": [1418, 259, 62], "snow_tiny": [157, 101, 1], "cave_glow": [305, 127, 42], "lava_glow": [272, 86, 2], "snow_glow": [362, 132, 18], "lava_strip": [452, 52, 21], "wind_1": [349, 107, 30], "wind_2": [341, 110, 26], "wind_3": [320, 106, 17], "wind_4": [284, 96, 17]};   // v1.6.4: flat-topped sheets [w, h, surface row]
const smImages = {};
let _smAssetsRequested = false;
function loadSpiritAssets() {
  if (_smAssetsRequested) return;
  _smAssetsRequested = true;
  const load = (key, src) => {
    const im = new Image();
    im.onload = async () => { try { if (im.decode) await im.decode(); } catch (e) {} smImages[key] = im; };
    im.onerror = () => console.warn('[spirit] failed to load', src);
    im.src = src;
  };
  for (const k of Object.keys(SM_SPRITES)) load(k, `assets/spirit/${k}.webp${SM_ASSET_Q}`);
  for (let i = 1; i <= 5; i++) load('bg' + i, `assets/spirit/bg${i}.webp${SM_ASSET_Q}`);
  for (const k of Object.keys(SM_TILES)) load('t_' + k, `assets/spirit/tiles/${k}.webp${SM_ASSET_Q}`);
}

// ----------------------------------------------------------------------------
// Layout (generated from the sketch, then hand-checked). [id, x, y, w, kind]
// ----------------------------------------------------------------------------
const SM_PLATFORMS = [
  // B cave maze (the floor below is solid everywhere: no pit in the cave). v1.6.5: ledges next to a wall or pillar
  // run right up to it, so nothing slips through the seam.
  ['M1', 3265, 408, 170, 'ledge'], ['M2', 2524, 408, 69, 'ledge'], ['M3', 2299, 299, 73, 'ledge'],
  ['M4', 2690, 282, 73, 'ledge'], ['M5', 3159, 265, 64, 'ledge'], ['M6', 1857, 181, 345, 'ledge'],
  ['M7', 2841, 173, 240, 'ledge'], ['M8', 3136, -4, 69, 'ledge'], ['M9', 2170, -46, 340, 'ledge'],
  ['M10', 3278, -117, 235, 'ledge'], ['M11', 2593, -142, 253, 'ledge'], ['M12', 1857, -159, 152, 'ledge'],
  ['M13', 2464, -243, 69, 'ledge'], ['M14', 3297, -306, 156, 'ledge'], ['M15', 2570, -432, 69, 'ledge'],
  ['M16', 3274, -495, 152, 'ledge'], ['M17', 2197, -567, 267, 'ledge'], ['M18', 2713, -567, 276, 'ledge'],
  ['M19', 2998, -663, 230, 'ledge'], ['M20', 2542, -747, 74, 'ledge'], ['M21', 1880, -764, 290, 'ledge'],
  ['M22', 2253, -831, 82, 'ledge'], ['M23', 3338, -852, 170, 'ledge'], ['M24', 2842, -1003, 358, 'ledge'],
  ['M25', 2842, -1176, 289, 'ledge'],
  // left exit through the doorway to Gabia's rest
  ['E1', 1282, -310, 437, 'ledge'], ['E2', 776, -382, 405, 'ledge'], ['E3', 160, -449, 492, 'rest'],
  // C lava hall
  ['L0', 1581, -1301, 1960, 'basalt'], ['L1', 1958, -1510, 548, 'basalt'], ['L2', 2722, -1676, 690, 'basalt'],
  ['L3', 2110, -1906, 170, 'blink'], ['L4', 2400, -1819, 188, 'blink'], ['L5', 2400, -2048, 175, 'blink'],
  ['L6', 2786, -2073, 83, 'blink'], ['L7', 3012, -2079, 96, 'blink'], ['L8', 3274, -2073, 87, 'blink'],
  ['L9', 1535, -2104, 745, 'basalt'],
  // Ifrit's rest outside, then the climb over the roof of the hall
  ['I0', 1199, -1896, 313, 'rest'], ['I1', 739, -2023, 295, 'snow'],
  ['O1', 422, -2204, 276, 'snow'], ['O2', 150, -2356, 212, 'snow'], ['O3', 413, -2530, 220, 'snow'],
  ['O4', 670, -2713, 249, 'snow'], ['O5', 997, -2910, 257, 'snow'], ['O6', 1397, -3028, 74, 'snow'],
  ['O7', 1604, -2922, 87, 'snow'], ['O8', 1848, -2922, 78, 'snow'], ['O9', 2082, -2922, 88, 'snow'],
  ['O10', 2317, -2926, 97, 'snow'], ['O11', 2501, -3047, 87, 'snow'], ['O12', 2731, -3051, 299, 'snow'],
  // v1.6.6: zig-zag of small ledges, every step 122px up, 90px apart sideways
  ['O13', 2970, -3173, 100, 'snow'], ['O14', 2780, -3295, 100, 'snow'], ['O15', 2970, -3417, 100, 'snow'],
  ['O16', 2780, -3539, 100, 'snow'], ['O16B', 2970, -3661, 100, 'snow'], ['O17', 2542, -3781, 851, 'snow'],
  ['U1', 2202, -3959, 106, 'snow'], ['U2', 1875, -3876, 115, 'snow'], ['U3', 1567, -4066, 134, 'snow'],
  ['U4', 988, -4108, 147, 'snow'], ['U5', 486, -4229, 276, 'blink'], ['U6', 1305, -4237, 115, 'blink'],
  ['U7', 265, -4374, 120, 'snow'], ['U8', 1112, -4389, 124, 'snow'], ['U9', 2138, -4354, 96, 'snow'],
  ['U10', 1590, -4468, 83, 'snow'], ['U11', 1875, -4480, 79, 'blink'], ['U12', 2326, -4526, 92, 'blink'],
  // D wind zone
  ['V1', 146, -4582, 119, 'blink'], ['V2', 468, -4620, 106, 'snow'], ['V3', 836, -4628, 101, 'snow'],
  ['V4', 1388, -4655, 92, 'blink'], ['V5', 2128, -4731, 83, 'snow'], ['V6', 647, -4810, 69, 'blink'],
  ['V7', 1112, -4830, 92, 'snow'], ['V8', 2703, -4959, 83, 'snow'], ['V9', 2358, -4951, 74, 'blink'],
  ['V10', 1420, -5008, 87, 'snow'], ['V11', 169, -5008, 78, 'blink'], ['V12', 1848, -5069, 92, 'snow'],
  ['V13', 1604, -5190, 64, 'blink'], ['V14', 2124, -5202, 87, 'blink'], ['V15', 2547, -5194, 74, 'blink'],
  ['V16', 160, -5255, 73, 'blink'], ['V17', 1825, -5381, 115, 'snow'], ['V18', 2299, -5411, 87, 'snow'],
  ['V19', 1443, -5552, 101, 'snow'], ['V20', 2004, -5570, 124, 'snow'], ['V21', 2552, -5574, 119, 'snow'],
  ['V22', 1668, -5763, 83, 'snow'], ['V23', 2253, -5798, 87, 'snow'], ['V24', 1898, -5981, 97, 'snow'],
  ['V25', 1885, -6148, 92, 'snow'],
  // E summit
  ['S0', 1282, -6350, 1371, 'summit']
];
// Solid rock: [id, x, y, w, h]. The mountain's outer wall (with the cave mouth at the floor, the doorway to Gabia's
// rest and the doorway from the lava hall out to Ifrit), the brown pillars of the sketch and the roof of the hall.
const SM_WALLS = [
  ['MW1', 1719, -134, 138, 1384],   // lower outer wall, down to the bottom (v1.6.2: no cave mouth; the climb starts outside)
  ['MW2', 1719, -1163, 161, 672],  // upper outer wall; the doorway to Gabia is y -491..-134
  ['MW3', 1512, -2080, 69, 830],   // lava hall left wall below L9
  ['MW4', 1452, -2705, 60, 371],    // wall above the doorway out to Ifrit (doorway y -2334..-2104)
  ['B1', 2510, -71, 78, 256], ['B2', 2786, -559, 74, 412], ['B3', 2901, -995, 97, 428],   // v1.6.6: B2/B3 reach the ledge above
  ['B5', 2745, -1293, 97, 340], ['B6', 1834, -2096, 69, 290]   // B5 up to L0, B6 tucked under L9 (v1.6.7: B7 removed)
];
const SM_CAPLESS = new Set(['SM-B2', 'SM-B3', 'SM-B5', 'SM-B6']);   // pillars whose top is hidden under a ledge
const SM_ROOF = { x: 1632, y: -2705, w: 1918, h: 120 };   // v1.6.3: drawn only; the strip above it is a fall zone
// Lava pools lying on the lava ledges: two on the hall floor L0 and (v1.6.6) one in the middle of L1, L2 and L9.
// v1.8.1: widened so they matter. On L0 the walk from the cave (arriving at 2842..3131) to the climb onto L1 crosses
// a 390px pool; a 100px rock island (2300..2400) under L1 lets you go straight up onto L1, and a fall from L1 lands
// in the 480px pool. L1 / L2 / L9 pools 230-250px (a full jump). A hit pushes Dudu 40px past the nearer edge, which is
// always solid ledge (island or L0 ends).
const SM_LAVA = [
  { x1: 1820, x2: 2300, y: -1301 }, { x1: 2400, x2: 2790, y: -1301 },
  { x1: 2060, x2: 2290, y: -1510 }, { x1: 2930, x2: 3180, y: -1676 }, { x1: 1760, x2: 2000, y: -2104 }
];
const SM_FLOOR_Y = 580;
const SM_WALL_X = 1719;      // the mountain's outer wall (start outside on its left, Gabia's cave on its right)
const SM_LAVA_WALL_X = 1512; // the lava hall's left wall

function buildSpiritStage() {
  const s = makeWorldStage({
    id: 'world3_spirit',
    stageCode: SM_CODE,
    name: '정령산의 아침',
    subtitle: '정령들이 사는 산을 아래에서 꼭대기까지',
    worldWidth: SM_WIDTH,
    minCamY: -6870,
    maxCamY: 120,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'SM-E3', x: 376, feetY: -449 } },
    segments: [{ start: 0, end: SM_WIDTH, bg: 'spirit' }],
    backgroundRanges: {},
    goal: { id: 'spirit-summit', exitRoute: 'default', x: 2423, y: -6350, w: 60, h: 120, hidden: true }
  });
  s.worldId = SM_WORLD_ID;
  s.spirit = true;
  s.routeLabel = '월드 3';
  s.cameraCenterY = 470;          // Dudu sits a little lower on screen so more of the climb above is visible
  s.musicTrack = 0;
  s.customBackground = drawSpiritBackground;
  s.onLoad = () => loadSpiritAssets();
  s.onReset = () => resetSpiritRuntime();
  s.onComplete = () => completeSpiritStage();
  s.killYAt = spiritKillY;

  // the cave floor (inside the mountain only): the maze has no pit
  wFloor(s, SM_WALL_X, SM_WIDTH - SM_WALL_X, 'grass', SM_FLOOR_Y, { id: 'SM-FLOOR', h: 700, smDraw: 'floor' });
  let blinkN = 0;
  for (const [id, x, y, w, kind] of SM_PLATFORMS) {
    if (kind === 'blink') {
      // v1.6.3: every grey box of the sketch blinks (story rule: on 2.6s, then 0.55s warning, off 1.0s)
      blinkN++;
      wSurface(s, x, y, w, 'grass', { id: 'SM-' + id, smDraw: 'blink', behavior: 'blink',
        blink: y < -2250
          // v1.6.5: on the mountain climb every blinking ledge keeps its own random count
          ? { on: 2.6 + Math.random() * 0.8, warning: 0.55, off: 0.9 + Math.random() * 0.4, phase: Math.random() * 4.5 }
          : { on: 2.6, warning: 0.55, off: 1.0, phase: (blinkN * 0.43) % 4.15 } });
    } else wSurface(s, x, y, w, 'grass', { id: 'SM-' + id, smDraw: kind });
  }
  for (const [id, x, y, w, h] of SM_WALLS) wWall(s, x, y, w, h, 'grass', { id: 'SM-' + id, noTopLand: id.startsWith('MW'), smDraw: id.startsWith('B') ? 'pillar' : 'rock' });
  wWall(s, SM_ROOF.x, SM_ROOF.y, SM_ROOF.w, SM_ROOF.h, 'grass', { id: 'SM-ROOF', smDraw: 'roof', nonCollidable: true });

  // Checkpoints: the sketch's green flags, drawn with the story checkpoint flag (v1.6.4). Order matters
  // for spiritKillY below.
  wCheckpoint(s, '정령호수', 376, -449);
  wCheckpoint(s, '동굴 끝', 3030, -1003);
  wCheckpoint(s, '이프리트의 쉼터', 905, -2023);
  wCheckpoint(s, '눈 덮인 산길', 3136, -3781);
  wCheckpoint(s, '정상', 2423, -6350);

  s.smNpcs = [
    { id: 'SM-NPC-NAIA',  kind: 'naia',  name: '나이아',   x: 546,  y: -449,       idle: 'naia_idle',  near: 'naia_happy',  dialogue: '안녕! 처음보는 용족이네 퓨퓨! 앞으로 잘 지내보자!' },
    { id: 'SM-NPC-GABIA', kind: 'gabia', name: '가비아',   x: 3007, y: SM_FLOOR_Y, idle: 'gabia_idle', near: 'gabia_happy', dialogue: '응... 용...족... 어두...운데... 조심... 해' },
    { id: 'SM-NPC-IFRIT', kind: 'ifrit', name: '이프리트', x: 1319,  y: -1896,      idle: 'ifrit_idle', near: 'ifrit_sorry', dialogue: '뭐야? 용족이 왜 여기에 있어? 빨리 안나가?' },
    { id: 'SM-NPC-SYLLA', kind: 'sylla', name: '실라',     x: 1434,  y: -6350,      idle: 'sylla_idle', near: 'sylla_happy', dialogue: '꼬마 용족이 여기까지 오다니. 대견하구나.' },
    { id: 'SM-NPC-AYA',   kind: 'aya',   name: '아야',     x: 1618, y: -6350,      idle: 'aya_idle',   near: 'aya_happy',   dialogue: '힘이 넘치는걸? 특히 저 통통한 꼬리. 매끄럽고 탄탄하고... 참, 어서 가보렴 후훗.' }
  ];
  // Red ellipses: fire wisps in the lava hall. v1.6.2: like the story's fairies they travel their platform edge to
  // edge (wait, warn, rush, rest, walk back), about 25% faster than the fairies.
  s.smWisps = [
    { id: 'SM-W1', platformId: 'SM-L0', dir: 1 },
    { id: 'SM-W2', platformId: 'SM-L0', dir: -1 },
    { id: 'SM-W3', platformId: 'SM-L1', dir: 1 },
    { id: 'SM-W4', platformId: 'SM-L2', dir: -1 },
    { id: 'SM-W5', platformId: 'SM-L9', dir: -1 }
  ];
  // Yellow stars: three challenge collectibles (golden crayon art), saved with the stage record.
  s.smStars = [
    { id: 'SM-STAR-MAZE', x: 1972, y: -814 },
    { id: 'SM-STAR-LAVA', x: 3318, y: -2123 },
    { id: 'SM-STAR-WIND', x: 196,  y: -5320 }
  ];
  s.hudStars = s.smStars.length;
  return s;
}

if (typeof world1Stages !== 'undefined' && !world1Stages.some(st => st.worldId === SM_WORLD_ID)) {
  world1Stages.push(buildSpiritStage());
}
const SM_INDEX = world1Stages.findIndex(st => st.worldId === SM_WORLD_ID);
window.SM_INDEX = SM_INDEX;
function spiritStage() { return world1Stages[SM_INDEX]; }
function isSpiritActive() {
  return typeof gameMode !== 'undefined' && gameMode === 'world' && activeWorldStageIndex === SM_INDEX;
}
window.isSpiritActive = isSpiritActive;

// Inside the cave nothing is a pit. Outside, a fall sends Dudu back to the latest flag (from Ifrit's rest on, after
// falling about one and a half screens) instead of dropping her all the way down the mountain.
function spiritKillY(x) {
  if (checkpoint >= 2 && sections[checkpoint]) return sections[checkpoint].y + 1100;
  if (x < SM_WALL_X) return 250;   // outside the mountain at the start there is nothing below: back to the lake
  return 2000;                // inside the cave the floor catches every fall
}

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------
const sm = { wisps: [], fireballs: [], npcs: [], stars: [], clock: 0, mask: 0, lastMaskT: 0,
  wind: null, windLog: [], particles: [], lastDraw: 0 };
window.__sm = sm;

function smRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function resetSpiritRuntime() {
  const s = spiritStage();
  sm.clock = 0;
  sm.fireballs.length = 0;
  sm.npcs = s.smNpcs.map(n => ({ ...n, nearNow: false, anim: Math.random() * 3, face: -1, clip: n.idle }));
  sm.wisps = s.smWisps.map((w, i) => {
    const pl = platforms.find(q => q.id === w.platformId);
    const x1 = pl.x + 28, x2 = pl.x + pl.w - 28, home = w.dir > 0 ? x1 : x2;
    return { ...w, x1, x2, y: pl.y, home, x: home, prevX: home, hy: pl.y - 64, from: home, to: home,
      state: 'wait', t: -0.35 * i, anim: Math.random(), clip: 'wisp_idle', face: w.dir };
  });
  const save = loadWorldMapSave();
  const rec = spiritRecord(save);
  sm.stars = s.smStars.map(st => ({ ...st, got: rec.collectibles.includes(st.id) }));
  // Wind: reproducible from every reset; nothing happens until Dudu enters the zone.
  sm.wind = { rng: smRng(20261117), state: 'outside', entered: false, nextStart: Infinity, start: 0, end: 0, dur: 0, intensity: 0, push: 0 };
  window.__smWindBias = 0;
  // respawning puts the darkness straight to where Dudu now stands (no leftover fade)
  sm.mask = (p.x > SM_WALL_X && p.y < SM_FLOOR_Y + 60 && p.y > -1240) ? 1 : 0;
  const z = spiritBgZone(); for (let i = 0; i < 5; i++) smBgWeights[i] = i === z ? 1 : 0;
}
window.resetSpiritRuntime = resetSpiritRuntime;

function inWindZone(x, y) { return x >= SM_WIND.x1 && x <= SM_WIND.x2 && y >= SM_WIND.y1 && y <= SM_WIND.y2; }

function updateSpiritWind(dt) {
  const w = sm.wind; if (!w) return;
  const inside = inWindZone(p.x, p.y);
  const t = sm.clock;
  if (!w.entered && inside) {
    // first entry: the first gust follows the same 20-30s rule, so there is never a gust right at the door
    w.entered = true;
    w.nextStart = t + SM_WIND.firstMin + w.rng() * (SM_WIND.firstMax - SM_WIND.firstMin);
  }
  if (w.entered) {
    if (t >= w.nextStart) {
      const prev = w.start;
      w.start = w.nextStart;
      w.dur = SM_WIND.durMin + w.rng() * (SM_WIND.durMax - SM_WIND.durMin);
      w.end = w.start + w.dur;
      // start-to-start: the next gust is measured from THIS start, not from its end
      w.nextStart = w.start + SM_WIND.intervalMin + w.rng() * (SM_WIND.intervalMax - SM_WIND.intervalMin);
      sm.windLog.push({ start: +w.start.toFixed(2), sincePrevStart: prev ? +(w.start - prev).toFixed(2) : null, duration: +w.dur.toFixed(2) });
      if (sm.windLog.length > 60) sm.windLog.shift();
      if (inside && typeof tone === 'function') { tone(260, 0.55, 'sawtooth', 0.012); tone(190, 0.8, 'triangle', 0.016); }
    }
    if (t >= w.start && t < w.end) w.state = 'gust';
    else if (t >= w.nextStart - SM_WIND.warn) w.state = 'warning';
    else w.state = 'calm';
  }
  // physical push: gust only, ramped, and only inside the zone
  if (sm.forceGust) { w.state = 'gust'; w.start = t - 1; w.end = t + 1; } // QA only (tools/qa/spirit_hops.py)
  let target = 0;
  if (w.state === 'gust') {
    const inT = (t - w.start) / SM_WIND.rampIn, outT = (w.end - t) / SM_WIND.rampOut;
    target = Math.max(0, Math.min(1, inT, outT));
  }
  w.push = target;
  window.__smWindBias = (inside && !p.ground) ? -SM_WIND.push * w.push : 0;
  // visual intensity (also used by the renderer): warning builds up, gust is full, then it settles
  let vis = 0;
  if (w.state === 'warning') vis = 0.35 * Math.min(1, 1 - (w.nextStart - t) / SM_WIND.warn);
  else if (w.state === 'gust') vis = 0.35 + 0.65 * target;
  w.intensity += (vis - w.intensity) * Math.min(1, dt / 0.15);
}

// story fairy pattern; v1.6.5: travel 1.2x faster and a 0.5s pause at each end of the ledge
// (home end: the attack pose is the pause, far end: the groggy pose)
const WISP = { wait: 0, warn: 0.5, rest: 0.5, speed: 259, returnSpeed: 204, halfW: 26, halfH: 34 };
function spiritLavaZone() { return p.x > SM_LAVA_WALL_X && p.y < -1240 && p.y > -2200; }
function updateWisp(w, dt) {
  w.prevX = w.x; w.t += dt; w.anim += dt;
  const span = Math.max(40, w.x2 - w.x1);
  if (w.state === 'stomped') { if (w.t > 2.6) { w.state = 'wait'; w.t = 0; w.clip = 'wisp_idle'; } return; }
  if (w.state === 'wait') {
    w.clip = 'wisp_idle';
    if (w.t >= WISP.wait) { w.state = 'warn'; w.t = 0; w.anim = 0; w.clip = 'wisp_attack'; }
  } else if (w.state === 'warn') {
    w.face = w.dir;
    if (w.t >= WISP.warn) { w.state = 'rush'; w.t = 0; w.anim = 0; w.clip = 'wisp_move'; w.from = w.x; w.to = w.dir > 0 ? w.x2 : w.x1; }
  } else if (w.state === 'rush' || w.state === 'return') {
    const dur = span / (w.state === 'rush' ? WISP.speed : WISP.returnSpeed);
    const u = Math.min(1, w.t / dur);
    w.x = w.from + (w.to - w.from) * u;                       // even pace, no ease-in / ease-out
    w.face = w.to > w.from ? 1 : -1;
    if (u >= 1) {
      if (w.state === 'rush') { w.state = 'rest'; w.t = 0; w.anim = 0; w.clip = 'wisp_groggy'; }
      else { w.state = 'wait'; w.t = 0; w.clip = 'wisp_idle'; }
    }
  } else if (w.state === 'rest') {
    if (w.t >= WISP.rest) { w.state = 'return'; w.t = 0; w.anim = 0; w.clip = 'wisp_move'; w.from = w.x; w.to = w.home; }
  }
  // body: landing on top stuns it; touching it otherwise is a hit (in every phase, like the fairies)
  if (p.x + 16 > w.x - WISP.halfW && p.x - 16 < w.x + WISP.halfW && p.y > w.hy - WISP.halfH && p.y - 58 < w.hy + WISP.halfH) {
    if (p.invulnerable <= 0) applyStunHit(w.x, 'spirit_wisp');   // v1.6.3: touching is always a hit (no stomping)
  }
}
function updateLava() {
  if (p.invulnerable > 0) return;
  for (const l of SM_LAVA) if (Math.abs(p.y - l.y) <= 6 && p.x > l.x1 + 6 && p.x < l.x2 - 6) { applyStunHit(p.x < (l.x1 + l.x2) / 2 ? l.x1 - 40 : l.x2 + 40, 'spirit_lava'); return; }
}
function updateSpiritStars() {
  for (const st of sm.stars) {
    if (st.got) continue;
    if (Math.abs(p.x - st.x) < 34 && Math.abs((p.y - 30) - st.y) < 44) {
      st.got = true;
      const save = loadWorldMapSave(), rec = spiritRecord(save);
      if (!rec.collectibles.includes(st.id)) { rec.collectibles.push(st.id); saveWorldMapData(save); }
      burst(st.x, st.y, '#ffd43b', 14); tone(880, 0.12, 'triangle', 0.05);
      if (typeof playDuduVoice === 'function') playDuduVoice('special_coin');
      if (typeof updateHud === 'function') updateHud();
    }
  }
}
function updateSpiritNpcs(dt) {
  for (const n of sm.npcs) {
    const close = Math.abs(p.x - n.x) <= 160 && Math.abs(p.y - n.y) <= 120;
    if (close !== n.nearNow) { n.nearNow = close; n.anim = 0; } else n.anim += dt;
    n.clip = close ? n.near : n.idle;
    n.face = close && Math.abs(p.x - n.x) > 12 ? (p.x < n.x ? -1 : 1) : -1;
  }
}

// Called from updateHazards() (world branch) once per 120Hz physics step.
function updateSpiritMountain(dt) {
  if (!isSpiritActive()) { if (window.__smWindBias) window.__smWindBias = 0; return; }
  sm.clock += dt;
  updateSpiritWind(dt);
  if (spiritLavaZone()) {
    for (const w of sm.wisps) updateWisp(w, dt);
    updateLava();
  } else {
    for (const w of sm.wisps) { w.prevX = w.x; w.anim += dt; }
  }
  // v1.6.3: above the lava hall's roof there is nothing to stand on: dropping into it is a fall
  if (p.x > SM_LAVA_WALL_X - 60 && p.x < SM_ROOF.x + SM_ROOF.w && p.y > SM_ROOF.y + 30 && p.y < SM_ROOF.y + 250 && p.vy > 0 && state === 'playing') {
    deaths++;
    if (typeof retryWorld1StageCheckpoint === 'function') retryWorld1StageCheckpoint();
    if (typeof tone === 'function') tone(180, 0.13);
    return;
  }
  updateSpiritStars();
  updateSpiritNpcs(dt);
  // cave darkness follows Dudu: full in the whole cave down to Gabia's floor (v1.6.7), none outside or in the hall
  const inMaze = p.x > SM_WALL_X && p.y < SM_FLOOR_Y + 60 && p.y > -1240;
  const target = inMaze ? 1 : 0;
  sm.mask += (target - sm.mask) * Math.min(1, dt / 0.35);
}
window.updateSpiritMountain = updateSpiritMountain;

// ----------------------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------------------
function smView() {
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  return { x1: rCam, x2: rCam + W / zoom, y1: rCamY, y2: rCamY + H / zoom };
}
function drawSpiritSprite(key, t, x, y, face, alpha = 1) {
  const m = SM_SPRITES[key], im = smImages[key];
  if (!m || !im) return false;
  const f = Math.floor(t * m.fps) % m.frames, size = m.display;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-(face || -1), 1);
  const c = im.width / 8;   // v1.6.8: sheets are 192px cells (shown at 112-130px); anchors stay in 256 units
  ctx.drawImage(im, (f % 8) * c, Math.floor(f / 8) * c, c, c, -m.anchor / 256 * size, -m.foot / 256 * size, size, size);
  ctx.restore();
  return true;
}
function smRand(i) { const v = Math.sin(i * 91.7 + 13.3) * 43758.5453; return v - Math.floor(v); }

function smTile(k) { return smImages['t_' + k] || null; }
// Which zone art a platform uses: E = outside start, M = Gabia's cave, L and Ifrit's ledge I0 = lava, the rest snow.
function smZoneOf(a) {
  const k = a.id.replace('SM-', '');
  if (k[0] === 'E') return 'out';
  if (k[0] === 'M' || k === 'FLOOR') return 'cave';
  if (k[0] === 'L' || k === 'I0') return 'lava';   // v1.6.5: lava art stops at Ifrit's own ledge
  return 'snow';
}
// v1.6.4: every ledge is drawn at one fixed scale so all of them share the same slim thickness, and the tile's
// walkable top line sits exactly on the platform top (feet never float). Long ledges are 3-sliced from the long
// module (left cap, repeated middle, right cap); short ones use the tiny module.
const SM_LEDGE_SC = 0.34;        // long module: about 66px of rock under the surface
const SM_CAP = 130;              // source px kept for each end cap
function drawSpiritTile(a, x, y, zone) {
  const z = zone || smZoneOf(a), w = a.w;
  if (w < 120) {
    const key = z + '_tiny', im = smTile(key), m = SM_TILES[key];
    if (!im || !m) { ctx.fillStyle = '#6f6a74'; ctx.fillRect(x, y, w, 14); return; }
    const sc = (w + 10) / m[0];
    ctx.drawImage(im, x - 5, y - m[2] * sc, m[0] * sc, m[1] * sc);
    return;
  }
  const key = z + '_long', im = smTile(key), m = SM_TILES[key];
  if (!im || !m) { ctx.fillStyle = '#6f6a74'; ctx.fillRect(x, y, w, 14); return; }
  const sc = SM_LEDGE_SC, top = y - m[2] * sc, h = m[1] * sc;
  const x0 = x - 6, x1 = x + w + 6;                 // the art overhangs the hitbox a little on both sides
  const cap = Math.min(SM_CAP * sc, (x1 - x0) / 2);
  const capSrc = cap / sc;
  ctx.drawImage(im, 0, 0, capSrc, m[1], x0, top, cap, h);
  ctx.drawImage(im, m[0] - capSrc, 0, capSrc, m[1], x1 - cap, top, cap, h);
  const midSrc = m[0] - 2 * SM_CAP, midW = midSrc * sc;
  for (let tx = x0 + cap; tx < x1 - cap - 0.5; tx += midW) {
    const dw = Math.min(midW, x1 - cap - tx);
    ctx.drawImage(im, SM_CAP, 0, dw / sc, m[1], tx, top, dw + 0.6, h);
  }
}
// Blinking platforms use the zone's glowing slab and show their state: fade, warning shake, faint ghost while off.
function drawSpiritGlow(a, x, y) {
  const z = smZoneOf(a), key = (z === 'lava' ? 'lava' : z === 'snow' ? 'snow' : 'cave') + '_glow';
  const im = smTile(key), m = SM_TILES[key];
  if (!im || !m) { ctx.fillStyle = '#7fd8ff'; ctx.fillRect(x, y, a.w, 12); return; }
  const sx = (a.w + 10) / m[0], sy = Math.min(sx, 0.42);
  ctx.drawImage(im, x - 5, y - m[2] * sy, m[0] * sx, m[1] * sy);
}
function drawSpiritLedge(a, x, y) {
  if (a.blink) {
    ctx.save();
    if (a.blinkState === 'off') {
      const prog = Math.max(0, Math.min(1, a.blinkStateProgress ?? 0));
      ctx.globalAlpha = 0.1 + 0.3 * prog * prog;
    } else {
      ctx.globalAlpha = a.blinkAlpha ?? 1;
      if (a.blinkState === 'warning') x += Math.round(Math.sin(time * 55) * 2);
    }
    drawSpiritGlow(a, x, y);
    ctx.restore();
    return;
  }
  drawSpiritTile(a, x, y);
}
// Walls: one clean rock block per zone, tiled down the wall at the wall's width. Landable pillars get a ledge cap.
function smWallZone(id) {
  if (id === 'SM-MW1') return 'out';
  if (id === 'SM-MW3' || id === 'SM-MW4' || id === 'SM-B6') return 'lava';
  return 'cave';
}
// One seamless rock texture per wall art, cut from the inside of the wall block (no tile outlines), so tall walls
// read as a single face of rock instead of a stack of blocks.
const _smWallPat = {};
function smWallPattern(key) {
  if (_smWallPat[key]) return _smWallPat[key];
  const im = smTile(key), m = SM_TILES[key];
  if (!im || !m || !im.complete || !im.naturalWidth) return null;
  const sw = m[0] - 40, sh = m[1] - 50, sc = 0.55;
  const c = document.createElement('canvas'); c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
  c.getContext('2d').drawImage(im, 20, 25, sw, sh, 0, 0, c.width, c.height);
  const pat = ctx.createPattern(c, 'repeat');
  pat.__src = c;
  return (_smWallPat[key] = pat);
}
// v1.6.5: the mountain's outer walls are painted as one natural rock face (uneven edges, light on the side
// that faces the open sky, dark toward the cave), not made of pasted tiles.
const SM_WALL_COLORS = {
  out:  ['#7d8796', '#646c7b', '#525968', '#4a505e'],   // ends on the mountain body's colour
  lava: ['#6b4640', '#4c3130', '#33211f', '#221617']
};
// v1.6.8: each outer wall is painted once into its own canvas (polygon, shadow blur, texture, strata) and then
// only the visible slice is copied each frame.
const _smWallCache = {};
const SM_WALL_PAD = 24;
function smPaintOuterWall(a) {
  const pat = smWallPattern('cave_wall');
  if (!pat) return null;
  const lava = a.id === 'SM-MW3' || a.id === 'SM-MW4', c = SM_WALL_COLORS[lava ? 'lava' : 'out'];
  const cv = document.createElement('canvas');
  cv.width = a.w + 2 * SM_WALL_PAD; cv.height = a.h;
  const g = cv.getContext('2d'), x = SM_WALL_PAD;
  const step = 26, n = Math.ceil(a.h / step), seed = a.x * 0.37;
  const jag = (k, side) => (smRand(seed + k * 3.1 + side * 71) - 0.5) * 12;
  g.beginPath();
  for (let k = 0; k <= n; k++) {
    const yy = Math.min(a.h, k * step), ends = (k === 0 || k * step >= a.h);
    g.lineTo(x + 3 + (ends ? 4 : jag(k, 0)), yy);
  }
  for (let k = n; k >= 0; k--) {
    const yy = Math.min(a.h, k * step), ends = (k === 0 || k * step >= a.h);
    g.lineTo(x + a.w - 3 + (ends ? -4 : jag(k, 1)), yy);
  }
  g.closePath();
  const gr = g.createLinearGradient(x - 6, 0, x + a.w + 6, 0);
  gr.addColorStop(0, c[0]); gr.addColorStop(0.35, c[1]); gr.addColorStop(0.75, c[2]); gr.addColorStop(1, c[3]);
  g.fillStyle = gr;
  if (!lava) { g.shadowColor = 'rgba(40,48,60,0.35)'; g.shadowBlur = 18; }
  g.fill();
  g.shadowBlur = 0;
  g.clip();
  // soft rock texture and strata, very low contrast so it sits with the painted backgrounds
  g.globalAlpha = 0.22; g.fillStyle = g.createPattern(pat.__src, 'repeat'); g.fillRect(0, 0, cv.width, a.h); g.globalAlpha = 1;
  g.strokeStyle = lava ? 'rgba(255,140,80,0.10)' : 'rgba(220,230,245,0.10)'; g.lineWidth = 2;
  for (let k = 0; k * 90 < a.h; k++) {
    const yy = k * 90 + smRand(seed + k) * 30;
    g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + a.w * 0.5, yy + (smRand(seed + k * 7) - 0.5) * 24, x + a.w, yy + 6); g.stroke();
  }
  return cv;
}
function drawSpiritOuterWall(a, x, y, v) {
  const cv = _smWallCache[a.id] || (_smWallCache[a.id] = smPaintOuterWall(a));
  const y1 = Math.max(y, Math.floor(v.y1) - 4), y2 = Math.min(y + a.h, Math.ceil(v.y2) + 4);
  if (y2 <= y1) return;
  if (!cv) { ctx.fillStyle = '#4a4652'; ctx.fillRect(x, y1, a.w, y2 - y1); return; }
  ctx.drawImage(cv, 0, y1 - y, cv.width, y2 - y1, x - SM_WALL_PAD, y1, cv.width, y2 - y1);
}
// Seen from outside, the mountain is one solid body of rock (the maze and the hall are hidden inside) with a dark
// doorway; it fades away as Dudu walks into the doorway.
//  - the lake side (v1.6.5) and Ifrit's side (v1.6.6): a rock body right of the outer wall
//  - above the hall's roof (v1.6.6): a dark chasm, so the fall zone reads as a drop and nothing inside shows
function smBodyFill(x0, y0, y1, v, k, cols, doorY) {
  if (x0 > v.x2 || y1 <= y0) return;
  ctx.save();
  ctx.globalAlpha = k;
  const g = ctx.createLinearGradient(x0 - 30, 0, x0 + 520, 0);
  g.addColorStop(0, cols[0]); g.addColorStop(0.5, cols[1]); g.addColorStop(1, cols[2]);
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 30, y0, v.x2 - x0 + 60, y1 - y0);
  const pat = smWallPattern('cave_wall');
  if (pat) { ctx.globalAlpha = k * 0.18; ctx.fillStyle = pat; ctx.fillRect(x0 - 30, y0, v.x2 - x0 + 60, y1 - y0); ctx.globalAlpha = k; }
  ctx.beginPath(); ctx.rect(x0 - 30, y0, v.x2 - x0 + 60, y1 - y0); ctx.clip();
  const d = ctx.createRadialGradient(x0 - 30, doorY, 20, x0 - 30, doorY, 230);
  d.addColorStop(0, 'rgba(18,16,26,0.95)'); d.addColorStop(0.6, 'rgba(18,16,26,0.6)'); d.addColorStop(1, 'rgba(18,16,26,0)');
  ctx.fillStyle = d;
  ctx.beginPath(); ctx.ellipse(x0 - 30, doorY, 230, 200, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawSpiritMountainBody() {
  const v = smView();
  // lake side
  if (p.y > -1240 && p.x < SM_WALL_X + 40) {
    const k = Math.max(0, Math.min(1, (SM_WALL_X + 40 - p.x) / 260));
    if (k > 0) smBodyFill(SM_WALL_X + 46, Math.max(v.y1 - 20, -1240), v.y2 + 20, v, k, ['#596170', '#4a505e', '#3d4250'], -300);
  }
  // Ifrit's side: from Ifrit's ledge outward nothing of the lava hall shows
  if (p.y > SM_ROOF.y && p.y < -1240 && p.x < SM_LAVA_WALL_X + 40) {
    const k = Math.max(0, Math.min(1, (SM_LAVA_WALL_X + 40 - p.x) / 260));
    if (k > 0) smBodyFill(SM_LAVA_WALL_X + 18, Math.max(v.y1 - 20, SM_ROOF.y), Math.min(v.y2 + 20, -1240), v, k, ['#4f3431', '#3f2a28', '#33221f'], -2215);
  }
  // above the roof: a dark chasm below the roof line
  if (p.y < SM_ROOF.y + 40) {
    const k = Math.max(0, Math.min(1, (SM_ROOF.y + 40 - p.y) / 160));
    // v1.6.7: opaque right below the roof line and wide enough to swallow MW4, so only the drop shows
    const top = SM_ROOF.y - 24, x0 = SM_LAVA_WALL_X - 152, y1 = v.y2 + 20;
    if (k > 0 && y1 > top && x0 < v.x2) {
      ctx.save();
      ctx.globalAlpha = k;
      const g = ctx.createLinearGradient(0, top, 0, top + 60);
      g.addColorStop(0, 'rgba(10,14,26,0)'); g.addColorStop(1, 'rgba(10,14,26,0.97)');
      ctx.fillStyle = g;
      // the left end fades out sideways over 80px
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = k * (i + 1) / 8;
        ctx.fillRect(x0 + i * 10, top, 10, y1 - top);
      }
      ctx.globalAlpha = k;
      ctx.fillRect(x0 + 80, top, v.x2 - x0, y1 - top);
      ctx.restore();
    }
  }
}
function drawSpiritRock(a, x, y) {
  if (a.smDraw === 'roof') return;   // v1.6.4: the lava hall's roof is not drawn; the space above it is an open drop
  const v = smView();
  const y1 = Math.max(y, v.y1 - 300), y2 = Math.min(y + a.h, v.y2 + 10);
  if (y2 <= y1 || x + a.w < v.x1 - 20 || x > v.x2 + 20) return;
  if (a.smDraw === 'rock') { drawSpiritOuterWall(a, x, y, v); return; }
  const z = smWallZone(a.id), pat = smWallPattern(z === 'out' ? 'out_wall' : 'cave_wall');
  ctx.save();
  ctx.fillStyle = pat || '#4a4652';
  ctx.fillRect(x, y1, a.w, y2 - y1);
  const tint = z === 'lava' ? 'rgba(255,96,40,0.16)' : z === 'snow' ? 'rgba(210,230,255,0.18)' : null;
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y1, a.w, y2 - y1); }
  // soft shading on both sides so the wall has volume, and a dark outline like the platform art
  const g = ctx.createLinearGradient(x, 0, x + a.w, 0);
  g.addColorStop(0, 'rgba(20,16,30,0.45)'); g.addColorStop(0.18, 'rgba(20,16,30,0)');
  g.addColorStop(0.82, 'rgba(20,16,30,0)'); g.addColorStop(1, 'rgba(20,16,30,0.5)');
  ctx.fillStyle = g; ctx.fillRect(x, y1, a.w, y2 - y1);
  ctx.fillStyle = 'rgba(28,22,38,0.85)';
  ctx.fillRect(x, y1, 2, y2 - y1); ctx.fillRect(x + a.w - 2, y1, 2, y2 - y1);
  ctx.restore();
  if (a.smDraw === 'pillar' && !SM_CAPLESS.has(a.id) && y > v.y1 - 80) drawSpiritTile({ w: a.w + 8 }, x - 4, y, z === 'out' ? 'cave' : z);
}
// v1.6.5: Gabia's floor is one long cave ledge fixed to the world (it does not follow the camera): the long
// module scaled to the floor's full width, its surface on the floor line.
function drawSpiritFloor(a, x, y) {
  const v = smView();
  if (x > v.x2 + 20 || x + a.w < v.x1 - 20 || y > v.y2 + 20) return;
  const im = smTile('cave_long'), m = SM_TILES.cave_long;
  if (!im || !m) { ctx.fillStyle = '#3b3746'; ctx.fillRect(x, y, a.w, 40); return; }
  const sc = (a.w + 40) / m[0];
  ctx.drawImage(im, x - 20, y - m[2] * sc, m[0] * sc, m[1] * sc);
}
function drawSpiritPlatform(a, x, y) {
  if (a.smDraw === 'floor') drawSpiritFloor(a, x, y);
  else if (a.smDraw === 'rock' || a.smDraw === 'pillar' || a.smDraw === 'roof') drawSpiritRock(a, x, y);
  else drawSpiritLedge(a, x, y);
}
window.drawSpiritPlatform = drawSpiritPlatform;

// --- wind particles: world-space streaks drawn behind the platforms, flowing right to left ---
function spiritWindVisibility() {
  // how much of the zone is on screen (fades in and out at the borders)
  const v = smView();
  const ov = Math.max(0, Math.min(v.y2, SM_WIND.y2) - Math.max(v.y1, SM_WIND.y1));
  return Math.min(1, ov / 300);
}
function smWindSpawnY(v) {
  const top = Math.max(SM_WIND.y1 - 120, v.y1), bot = Math.min(SM_WIND.y2 + 120, v.y2);
  return top + Math.random() * Math.max(1, bot - top);
}
function updateWindParticles(fdt) {
  const w = sm.wind; if (!w) return;
  const vis = spiritWindVisibility();
  const v = smView();
  const light = !!window.duduLightMode;
  const want = vis <= 0 ? 0 : Math.round((light ? 8 : 14) + (light ? 16 : 30) * w.intensity);   // v1.6.4: calmer
  while (sm.particles.length < want) {
    sm.particles.push({ x: v.x1 + Math.random() * (v.x2 - v.x1 + 300), y: smWindSpawnY(v), s: Math.random(), life: 0 });
  }
  if (sm.particles.length > want + 20) sm.particles.length = want;
  for (const q of sm.particles) {
    const spd = 40 + 1250 * w.intensity * (0.6 + 0.4 * q.s);
    q.x -= spd * fdt; q.y += (8 + 30 * w.intensity) * fdt * (q.s - 0.3); q.life += fdt;
    if (q.x < v.x1 - 140 || q.y < v.y1 - 40 || q.y > v.y2 + 40) {
      q.x = v.x2 + Math.random() * 200; q.y = smWindSpawnY(v); q.life = 0;
    }
  }
}
let _smStreak = null;
function smStreak() {
  // one pre-drawn streak (bright head on the left, fading tail to the right), stretched per particle
  if (_smStreak) return _smStreak;
  const c = document.createElement('canvas'); c.width = 128; c.height = 8;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.roundRect(0, 1, 128, 6, 3); g.fill();
  _smStreak = c; return c;
}
function drawWindParticles() {
  const w = sm.wind; if (!w || !sm.particles.length) return;
  const vis = spiritWindVisibility();
  if (vis <= 0) return;
  const I = w.intensity;
  ctx.save();
  ctx.lineCap = 'round';
  for (const q of sm.particles) {
    // fade toward the zone's top and bottom so the border never shows as a line
    const edge = Math.max(0, Math.min(1, (q.y - SM_WIND.y1 + 120) / 360, (SM_WIND.y2 + 120 - q.y) / 360));
    if (edge <= 0) continue;
    const len = 6 + 150 * I * (0.5 + q.s);
    const a = 0.65 * edge * vis * (0.3 + 0.6 * I) * (0.55 + 0.45 * q.s);
    if (len > 14) {
      // streak: the bright head is on the LEFT, the tail trails to the right, so the motion reads right-to-left.
      // Thick enough to read on a phone (the canvas is shown at about 40% there).
      const th = 2 + 2 * q.s * I;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(smStreak(), q.x, q.y - th / 2, len, th);
      ctx.globalAlpha = 1;
    }
    if (q.s > 0.9 && I > 0.5) {
      // v1.6.4: a few soft gust sprites, mirrored so they blow from the right, kept faint
      const key = 'wind_' + (1 + Math.floor(q.s * 1000) % 4), im = smTile(key), m = SM_TILES[key];
      if (im && m) {
        const sc = 0.5;
        ctx.save(); ctx.globalAlpha = Math.min(0.45, a * 0.6); ctx.translate(q.x, q.y); ctx.scale(-1, 1);
        ctx.drawImage(im, -m[0] * sc / 2, -m[1] * sc / 2, m[0] * sc, m[1] * sc); ctx.restore();
        continue;
      }
    }
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, a + 0.1)})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, 1.4 + 1.2 * q.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// World-space pass behind the platforms.
function drawSpiritBack() {
  if (!isSpiritActive()) return;
  const now = performance.now();
  const fdt = sm.lastDraw ? Math.min(0.05, (now - sm.lastDraw) / 1000) : 0;
  sm.lastDraw = now;
  if (state === 'playing') updateWindParticles(fdt);
  drawWindParticles();
}
window.drawSpiritBack = drawSpiritBack;

// v1.6.6: pools are painted bright and alive (dark crust rim, glowing molten top, pulsing heat glow, bubbles and
// embers) so they stand out from the red backdrop as something that hurts.
function drawLavaPools() {
  const v = smView();
  ctx.save();
  for (const l of SM_LAVA) {
    const y = l.y, w = l.x2 - l.x1;
    if (l.x2 < v.x1 - 80 || l.x1 > v.x2 + 80 || y < v.y1 - 120 || y > v.y2 + 60) continue;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.2 + l.x1 * 0.01);
    // soft heat glow over the pool (an ellipse, no hard edges)
    const cx = (l.x1 + l.x2) / 2;
    ctx.save();
    ctx.translate(cx, y - 6); ctx.scale(1, 0.45);
    const hg = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.75);
    hg.addColorStop(0, `rgba(255,200,90,${0.45 + 0.25 * pulse})`); hg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, w * 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // v1.8.2: the pool body (sunk into the ledge) comes from terrain-art.js when its images are loaded; the drawn
    // crust / molten bar / rim below is the fallback. Heat glow, bubbles, flames and embers stay drawn here.
    if (!(typeof window.drawLavaPoolArt === 'function' && window.drawLavaPoolArt(l))) {
    // crust rim
    ctx.fillStyle = '#2b0d07';
    ctx.beginPath(); ctx.roundRect(l.x1 - 6, y - 9, w + 12, 22, 8); ctx.fill();
    // molten body with a wavy top
    const g = ctx.createLinearGradient(0, y - 10, 0, y + 12);
    g.addColorStop(0, '#fff3a6'); g.addColorStop(0.35, '#ffb02e'); g.addColorStop(0.75, '#ff5a1f'); g.addColorStop(1, '#b3200f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(l.x1, y + 10);
    for (let x = l.x1; x <= l.x2; x += 8) ctx.lineTo(x, y - 6 + Math.sin(time * 3.4 + x * 0.09) * 2.2);
    ctx.lineTo(l.x2, y + 10); ctx.closePath(); ctx.fill();
    // bright pulsing rim line so the edge of the danger is clear
    ctx.strokeStyle = `rgba(255,240,170,${0.55 + 0.35 * pulse})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(l.x1 - 3, y - 8, w + 6, 18, 7); ctx.stroke();
    }
    // bubbles that swell and pop
    for (let i = 0; i < 4; i++) {
      const ph = (time * 0.8 + i * 0.27 + l.x1 * 0.001) % 1;
      const bx = l.x1 + 12 + ((i * 37 + Math.floor(time * 0.8 + i * 0.27) * 53) % Math.max(1, w - 24));
      ctx.fillStyle = `rgba(255,236,170,${0.85 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(bx, y - 5 - ph * 9, 2 + ph * 4, 0, Math.PI * 2); ctx.fill();
    }
    // flame tongues licking up from the pool
    for (let i = 0; i < Math.max(3, Math.round(w / 36)); i++) {
      const fx = l.x1 + 14 + (i + 0.5) * (w - 28) / Math.max(3, Math.round(w / 36));
      const fh = 16 + 14 * (0.5 + 0.5 * Math.sin(time * 7 + i * 1.9 + l.x1));
      const fg = ctx.createLinearGradient(0, y - 6 - fh, 0, y - 4);
      fg.addColorStop(0, 'rgba(255,230,120,0)'); fg.addColorStop(0.5, 'rgba(255,170,50,0.8)'); fg.addColorStop(1, 'rgba(255,90,30,0.95)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(fx - 7, y - 4);
      ctx.quadraticCurveTo(fx - 5, y - 6 - fh * 0.5, fx + Math.sin(time * 5 + i) * 3, y - 6 - fh);
      ctx.quadraticCurveTo(fx + 5, y - 6 - fh * 0.5, fx + 7, y - 4); ctx.closePath(); ctx.fill();
    }
    // embers rising
    for (let i = 0; i < 5; i++) {
      const ph = (time * 0.55 + i * 0.21 + l.x1 * 0.003) % 1;
      const ex = l.x1 + 10 + smRand(l.x1 + i * 13) * (w - 20) + Math.sin(time * 2 + i) * 6;
      ctx.fillStyle = `rgba(255,${150 + 80 * (1 - ph) | 0},70,${0.8 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(ex, y - 10 - ph * 70, 2.2 * (1 - ph) + 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawSpiritFront() {
  if (!isSpiritActive()) return;
  const v = smView();
  drawLavaPools();
  for (const w of sm.wisps) {
    const x = w.prevX + (w.x - w.prevX) * renderAlpha, y = w.hy + Math.sin(time * 2.4 + w.home) * 5;
    if (x < v.x1 - 100 || x > v.x2 + 100 || y < v.y1 - 100 || y > v.y2 + 100) continue;
    ctx.save(); ctx.globalAlpha = 0.25; ellipse(x, w.y + 2, 26, 5, '#ff8a3d'); ctx.restore();
    if (w.state === 'warn') {
      ctx.save(); ctx.globalAlpha = 0.25 + 0.5 * Math.min(1, w.t / WISP.warn); ellipse(x, y, 40, 40, 'rgba(255,170,60,0.5)'); ctx.restore();
    }
    if (!drawSpiritSprite(w.clip, w.anim, x, y, w.face, w.state === 'stomped' ? 0.7 : 1)) ellipse(x, y, 22, 28, '#ff8a3d');
  }
  const crayon = (typeof collectibleImages !== 'undefined') ? collectibleImages['golden_crayon'] : null;
  for (let i = 0; i < sm.stars.length; i++) {
    const st = sm.stars[i]; if (st.got) continue;
    if (st.x < v.x1 - 60 || st.x > v.x2 + 60 || st.y < v.y1 - 60 || st.y > v.y2 + 60) continue;
    const by = st.y + Math.sin(time * 4 + i) * 4;
    ellipse(st.x, by, 24, 24, 'rgba(255,229,115,0.35)');
    if (crayon && crayon.complete) ctx.drawImage(crayon, st.x - 18, by - 18, 36, 36);
    else ellipse(st.x, by, 10, 10, '#ffd43b');
  }
  let nearest = null;
  drawSpiritMountainBody();   // over the wisps and stars inside, under the NPCs (all of them stand outside or deep in the cave)
  for (const n of sm.npcs) {
    if (n.x < v.x1 - 150 || n.x > v.x2 + 150 || n.y < v.y1 - 200 || n.y > v.y2 + 200) continue;
    ellipse(n.x, n.y + 2, 26, 5, 'rgba(20,20,30,0.3)');
    if (!drawSpiritSprite(n.clip, n.anim, n.x, n.y, n.face)) ellipse(n.x, n.y - 50, 24, 50, '#cfe8c0');
    if (n.nearNow && (!nearest || Math.abs(p.x - n.x) < Math.abs(p.x - nearest.x))) nearest = n;
  }
  if (nearest && typeof drawFriendlySpeechBubble === 'function') drawFriendlySpeechBubble(nearest.dialogue, nearest.x, nearest.y - 136, '#fff8e7', nearest.name);
}
window.drawSpiritFront = drawSpiritFront;

// Screen-space pass after the world: the cave darkness. The DOM HUD and touch controls sit above the canvas,
// so they are never darkened.
// v1.6.7: the mask is rebuilt each frame at quarter size with a light hole for Dudu and one for Gabia (she glows
// with the same radius as Dudu's sight).
let _smHole = null, _smMaskCanvas = null;
const SM_SIGHT_R = 210, SM_MASK_SCALE = 4;
function smHole() {
  if (_smHole) return _smHole;
  const r = SM_SIGHT_R / SM_MASK_SCALE, R = Math.ceil(r * 1.3);
  const c = document.createElement('canvas'); c.width = c.height = 2 * R;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(R, R, r * 0.55, R, R, r * 1.25);
  grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  return (_smHole = c);
}
function drawSpiritOverlay() {
  if (!isSpiritActive()) return;
  if (sm.mask > 0.01) {
    const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
    if (!_smMaskCanvas) { _smMaskCanvas = document.createElement('canvas'); _smMaskCanvas.width = W / SM_MASK_SCALE; _smMaskCanvas.height = H / SM_MASK_SCALE; }
    const c = _smMaskCanvas, hole = smHole(), hr = hole.width / 2;
    const gabia = sm.npcs && sm.npcs.find(n => n.kind === 'gabia');
    const k1 = Math.round((rPx - rCam) * zoom / SM_MASK_SCALE), k2 = Math.round((rPy - 32 - rCamY) * zoom / SM_MASK_SCALE);
    const k3 = gabia ? Math.round((gabia.x - rCam) * zoom / SM_MASK_SCALE) : 0, k4 = gabia ? Math.round((gabia.y - 50 - rCamY) * zoom / SM_MASK_SCALE) : 0;
    const key = k1 + ',' + k2 + ',' + k3 + ',' + k4;
    if (key !== sm.maskKey) {
    sm.maskKey = key;
    const g = c.__g || (c.__g = c.getContext('2d'));
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(6,5,12,0.93)'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-out';
    const lights = [[rPx, rPy - 32]];
    if (gabia) lights.push([gabia.x, gabia.y - 50]);
    for (const [wx, wy] of lights) {
      const sx = (wx - rCam) * zoom / SM_MASK_SCALE, sy = (wy - rCamY) * zoom / SM_MASK_SCALE;
      if (sx < -hr || sy < -hr || sx > c.width + hr || sy > c.height + hr) continue;
      g.drawImage(hole, sx - hr, sy - hr);
    }
    g.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.globalAlpha = sm.mask;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(c, 0, 0, W, H);
    ctx.restore();
  }
}
window.drawSpiritOverlay = drawSpiritOverlay;

// --- backdrops: the five paintings in order, each framed for its band of the climb and cross-faded by height ---
// v1.6.2: the start lake sits beside the cave at the same height, so the painting follows Dudu's zone and
// cross-fades over about 0.7s instead of following the camera's height.
const SM_BG_KEYS = ['bg1', 'bg2', 'bg3', 'bg4', 'bg5'];
const smBgWeights = [1, 0, 0, 0, 0];
let smBgLast = 0;
function spiritBgZone() {
  if (p.y < -6250) return 4;                                  // summit
  if (p.x >= SM_LAVA_WALL_X && p.y < -1240 && p.y > -2705) return 2;    // lava hall
  if (p.x < SM_LAVA_WALL_X && p.y < -1240 && p.y > -2150) return 2;     // Ifrit's rest
  if (p.y <= -1240) return 3;                                 // outside climb
  if (p.x >= SM_WALL_X) return 1;                                  // Gabia's cave
  return 0;                                                   // lake start
}
const _smBgCache = {};
function smBackdrop(key) {
  if (_smBgCache[key]) return _smBgCache[key];
  const im = smImages[key]; if (!im) return null;
  const sc = Math.max(W / im.width, H / im.height) * 1.3;
  const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
  _smBgCache[key] = c; return c;
}
function drawSpiritBackground() {
  const now = performance.now();
  const dt = smBgLast ? Math.min(0.1, (now - smBgLast) / 1000) : 1;
  smBgLast = now;
  const zone = spiritBgZone();
  for (let i = 0; i < 5; i++) {
    const target = i === zone ? 1 : 0;
    smBgWeights[i] += Math.sign(target - smBgWeights[i]) * Math.min(Math.abs(target - smBgWeights[i]), dt / 0.7);
  }
  const cy = rCamY + H * 0.5, cx = rCam + W * 0.5;
  ctx.fillStyle = '#9fc3d6'; ctx.fillRect(0, 0, W, H);
  // draw the fading-out paintings first, the current one on top
  const order = [0, 1, 2, 3, 4].sort((a, b) => (a === zone) - (b === zone));
  for (const i of order) {
    const a = smBgWeights[i];
    if (a <= 0.001) continue;
    const c = smBackdrop(SM_BG_KEYS[i]);
    if (!c) continue;
    const vy = Math.max(0, Math.min(1, (cy + 6900) / 7800));
    const vx = Math.max(0, Math.min(1, cx / SM_WIDTH));
    const sx = Math.round(vx * (c.width - W)), sy = Math.round((1 - vy) * 0 + vy * (c.height - H));
    if (a < 1) { ctx.save(); ctx.globalAlpha = a; }
    ctx.drawImage(c, sx, sy, W, H, 0, 0, W, H);
    if (a < 1) ctx.restore();
  }
  /* v1.6.8: QA readout without allocating every frame */
  const dbg = window.__smBgDebug && window.__smBgDebug.weights === smBgWeights ? window.__smBgDebug : (window.__smBgDebug = { zone, weights: smBgWeights });
  dbg.zone = zone;
}

// ----------------------------------------------------------------------------
// Save, panels
// ----------------------------------------------------------------------------
function spiritRecord(save) {
  save = save || loadWorldMapSave();
  return save.worlds[SM_WORLD_ID].stages[SM_CODE];
}
function openSpiritStageSelect() {
  loadSpiritAssets();
  worldMapScreen = 'spiritStageSelect';
  const wrap = $('worldmapOverlay'); if (!wrap) return;
  const rec = spiritRecord();
  const bestTxt = rec.bestSeconds !== null ? `${rec.bestSeconds.toFixed(1)}초` : '기록 없음';
  wrap.innerHTML = `
    <div class="wmPanel" role="dialog" aria-modal="true" aria-labelledby="wmSpiritHeaderTitle">
      <div class="wmHeader">
        <div><span class="wmEyebrow">월드 3</span><h2 id="wmSpiritHeaderTitle">정령산의 아침</h2></div>
        <div class="wmHeaderActions"><button type="button" class="wmBackBtn" onclick="openWorldMapMenu({forceDevOpen:true})">세계지도로</button></div>
      </div>
      <div class="wmStageGrid wmStageGridSingle">
        <div class="wmStageCard unlocked ${rec.cleared ? 'cleared' : ''}" id="wmStageCard-3-1" data-stage-code="3-1" data-unlocked="true">
          <div class="wmStageTop"><span class="wmStageCode">3-1</span><span class="wmStageStatus">${rec.cleared ? '✓ 클리어' : '● 진입 가능'}</span></div>
          <strong class="wmStageName">정령들의 산을 오르자</strong>
          <p class="wmStageDesc">깜깜한 동굴과 뜨거운 용암, 바람 부는 눈길을 지나 꼭대기까지 올라가요.</p>
          <div class="wmStageStats">
            <span>최고 기록: <b>${bestTxt}</b></span>
            <span>황금 크레파스 <b>${rec.collectibles.length}/3</b></span>
            <span>재시도 <b>${rec.retries}</b>회, 피격 <b>${rec.hits}</b>회</span>
          </div>
          <div class="wmStageBtnRow"><button type="button" class="wmStagePlayBtn" id="wmStageBtn-3-1" onclick="startSpiritStage()">스테이지 시작</button></div>
        </div>
      </div>
    </div>`;
  wrap.hidden = false;
}
window.openSpiritStageSelect = openSpiritStageSelect;
function startSpiritStage(section = 0) { loadSpiritAssets(); loadWorld1Stage(SM_INDEX, { section, entryRoute: 'default' }); }
window.startSpiritStage = startSpiritStage;
function completeSpiritStage() {
  const save = loadWorldMapSave(), rec = spiritRecord(save);
  rec.cleared = true;
  const elapsed = Number(worldStageElapsed.toFixed(2));
  if (rec.bestSeconds === null || elapsed < rec.bestSeconds) rec.bestSeconds = elapsed;
  saveWorldMapData(save);
  if (typeof tone === 'function') tone(960, 0.22, 'triangle', 0.06);
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
  window.__smWindBias = 0;
  state = 'paused';
  worldMapScreen = 'spiritClearModal';
  const wrap = $('worldmapOverlay'); if (!wrap) return;
  wrap.innerHTML = `
    <div class="wmPanel wmClearPanel" role="dialog" aria-modal="true">
      <div class="wmHeader"><div><span class="wmEyebrow">월드 3 완주</span><h2>정령산 꼭대기 도착!</h2></div></div>
      <p class="wmClearSummary">걸린 시간 <b>${worldStageElapsed.toFixed(1)}초</b>, 피격 <b>${worldStageHitsThisRun}회</b>, 황금 크레파스 <b>${rec.collectibles.length}/3</b><br>실라와 아야가 꼭대기에서 반겨 줬어요.</p>
      <div class="wmClearBtnRow">
        <button type="button" class="primary" id="wmSpiritReplayBtn" onclick="startSpiritStage()">다시 오르기</button>
        <button type="button" class="secondary" onclick="openWorldMapMenu({forceDevOpen:true})">세계지도로</button>
      </div>
    </div>`;
  wrap.hidden = false;
}
window.completeSpiritStage = completeSpiritStage;
function devPracticeSpirit(x = null, y = null, section = 0) {
  startSpiritStage(section);
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
window.devPracticeSpirit = devPracticeSpirit;
