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
const SM_WIDTH = 2400;
const SM_ASSET_Q = '?v=v1_6_2_261117'; // rewritten by tools/release.py on every deploy

// Wind (directive section 4). All times in seconds of game time (physics steps), so pause and low FPS do not change them.
const SM_WIND = {
  x1: 0, x2: 2275, y1: -6046, y2: -4476,       // the blue zone on the sketch
  intervalMin: 20, intervalMax: 30,             // start-to-start
  durMin: 4, durMax: 6,
  warn: 1.2,                                    // visible warning before a gust, no push
  push: 90,                                     // px/s: in the air the target speed shifts left by this much
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
// v1.6.2 platform, wall, lava, wind and shrine art cut from 정령산 플랫폼 에셋.zip: [width, height, surface row]
const SM_TILES = {"lake_long": [1247, 121, 19], "lake_mid": [384, 84, 13], "lake_small": [167, 98, 2], "lake_start": [510, 125, 22], "cave_long": [1299, 161, 39], "cave_mid": [483, 124, 17], "cave_small": [215, 114, 12], "cave_pillar": [155, 245, 2], "cave_floor": [1346, 173, 45], "lava_long": [1391, 180, 53], "lava_mid": [615, 150, 34], "lava_small": [236, 109, 10], "lava_slab": [324, 90, 3], "lava_pillar": [134, 297, 2], "lava_pool": [284, 84, 34], "snow_long": [1313, 156, 38], "snow_mid": [407, 117, 25], "snow_small": [193, 80, 3], "snow_ice": [288, 111, 6], "snow_pillar": [129, 245, 2], "wind_a": [331, 110, 14], "wind_b": [156, 117, 10], "wind_c": [157, 86, 11], "wind_d": [267, 88, 20], "wind_e": [204, 78, 16], "shrine_lake": [256, 170, 99], "shrine_cave": [233, 164, 90], "shrine_lava": [231, 166, 104], "shrine_snow": [233, 170, 102], "shrine_top": [233, 166, 33], "stone_pillar": [122, 205, 1]};
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
  // B cave maze (the floor below is solid everywhere: no pit in the cave)
  ['M1', 2143, 408, 111, 'ledge'], ['M2', 1634, 408, 96, 'ledge'], ['M3', 1489, 299, 96, 'ledge'],
  ['M4', 1744, 282, 96, 'ledge'], ['M5', 2047, 265, 96, 'ledge'], ['M6', 1243, 181, 207, 'ledge'],
  ['M7', 1867, 173, 156, 'ledge'], ['M8', 2034, -4, 96, 'ledge'], ['M9', 1429, -46, 198, 'ledge'],
  ['M10', 2152, -117, 153, 'ledge'], ['M11', 1705, -142, 165, 'ledge'], ['M12', 1232, -159, 96, 'ledge'],
  ['M13', 1596, -243, 96, 'ledge'], ['M14', 2164, -306, 102, 'ledge'], ['M15', 1664, -432, 96, 'ledge'],
  ['M16', 2149, -495, 99, 'ledge'], ['M17', 1447, -567, 174, 'ledge'], ['M18', 1783, -567, 180, 'ledge'],
  ['M19', 2002, -663, 117, 'ledge'], ['M20', 1648, -747, 96, 'ledge'], ['M21', 1258, -764, 171, 'ledge'],
  ['M22', 1462, -831, 96, 'ledge'], ['M23', 2191, -852, 111, 'ledge'], ['M24', 1879, -1003, 222, 'ledge'],
  ['M25', 1912, -1176, 144, 'ledge'],
  // left exit through the doorway to Gabia's rest
  ['E1', 850, -310, 285, 'ledge'], ['E2', 520, -382, 264, 'ledge'], ['E3', 118, -449, 321, 'rest'],
  // C lava hall
  ['L0', 1045, -1301, 1278, 'basalt'], ['L1', 1291, -1510, 357, 'basalt'], ['L2', 1789, -1676, 450, 'basalt'],
  ['L3', 1390, -1906, 111, 'basalt'], ['L4', 1579, -1819, 123, 'basalt'], ['L5', 1579, -2048, 114, 'basalt'],
  ['L6', 1810, -2073, 96, 'basalt'], ['L7', 1962, -2079, 96, 'basalt'], ['L8', 2130, -2073, 96, 'basalt'],
  ['L9', 1015, -2104, 486, 'basalt'],
  // Ifrit's rest outside, then the climb over the roof of the hall
  ['I0', 796, -1896, 204, 'rest'], ['I1', 496, -2023, 192, 'snow'],
  ['O1', 289, -2204, 180, 'snow'], ['O2', 112, -2356, 138, 'snow'], ['O3', 283, -2530, 144, 'snow'],
  ['O4', 451, -2713, 162, 'snow'], ['O5', 664, -2910, 168, 'snow'], ['O6', 901, -3028, 96, 'snow'],
  ['O7', 1040, -2922, 96, 'snow'], ['O8', 1196, -2922, 96, 'snow'], ['O9', 1352, -2922, 96, 'snow'],
  ['O10', 1508, -2926, 96, 'snow'], ['O11', 1626, -3047, 96, 'snow'], ['O12', 1795, -3051, 195, 'snow'],
  ['O13', 1942, -3218, 114, 'snow'], ['O14', 1930, -3348, 117, 'snow'], ['O15', 1924, -3469, 111, 'snow'],
  ['O16', 1915, -3617, 123, 'snow'], ['O17', 1672, -3781, 555, 'snow'],
  ['U1', 1436, -3959, 96, 'snow'], ['U2', 1226, -3876, 96, 'snow'], ['U3', 1032, -4066, 96, 'snow'],
  ['U4', 658, -4108, 96, 'snow'], ['U5', 331, -4229, 180, 'ice'], ['U6', 854, -4237, 96, 'ice'],
  ['U7', 178, -4374, 96, 'snow'], ['U8', 732, -4389, 96, 'snow'], ['U9', 1392, -4354, 96, 'snow'],
  ['U10', 1030, -4468, 96, 'snow'], ['U11', 1214, -4480, 96, 'ice'], ['U12', 1513, -4526, 96, 'ice'],
  // D wind zone
  ['V1', 100, -4582, 96, 'ice'], ['V2', 306, -4620, 96, 'snow'], ['V3', 544, -4628, 96, 'snow'],
  ['V4', 901, -4655, 96, 'ice'], ['V5', 1381, -4731, 96, 'snow'], ['V6', 410, -4810, 96, 'ice'],
  ['V7', 721, -4830, 96, 'snow'], ['V8', 1756, -4959, 96, 'snow'], ['V9', 1528, -4951, 96, 'ice'],
  ['V10', 920, -5008, 96, 'snow'], ['V11', 102, -5008, 96, 'ice'], ['V12', 1201, -5069, 96, 'snow'],
  ['V13', 1033, -5190, 96, 'ice'], ['V14', 1380, -5202, 96, 'ice'], ['V15', 1651, -5194, 96, 'ice'],
  ['V16', 94, -5255, 96, 'ice'], ['V17', 1194, -5381, 96, 'snow'], ['V18', 1494, -5411, 96, 'snow'],
  ['V19', 940, -5552, 96, 'snow'], ['V20', 1314, -5570, 96, 'snow'], ['V21', 1669, -5574, 96, 'snow'],
  ['V22', 1081, -5763, 96, 'snow'], ['V23', 1464, -5798, 96, 'snow'], ['V24', 1236, -5981, 96, 'snow'],
  ['V25', 1225, -6148, 96, 'snow'],
  // E summit
  ['S0', 850, -6350, 894, 'summit']
];
// Solid rock: [id, x, y, w, h]. The mountain's outer wall (with the cave mouth at the floor, the doorway to Gabia's
// rest and the doorway from the lava hall out to Ifrit), the brown pillars of the sketch and the roof of the hall.
const SM_WALLS = [
  ['MW1', 1135, -134, 90, 1384],   // lower outer wall, down to the bottom (v1.6.2: no cave mouth; the climb starts outside)
  ['MW2', 1135, -1163, 105, 672],  // upper outer wall; the doorway to Gabia is y -491..-134
  ['MW3', 1000, -2080, 45, 830],   // lava hall left wall below L9
  ['MW4', 961, -2705, 39, 371],    // wall above the doorway out to Ifrit (doorway y -2334..-2104)
  ['B1', 1651, -71, 51, 256], ['B2', 1831, -424, 48, 277], ['B3', 1906, -882, 63, 315],
  ['B5', 1804, -1236, 63, 283], ['B6', 1210, -2073, 45, 267], ['B7', 988, -2846, 60, 217]
];
const SM_ROOF = { x: 1078, y: -2705, w: 1251, h: 120 };
const SM_LAVA = [ { x1: 1340, x2: 1460 }, { x1: 1620, x2: 1740 } ];   // pools lying on the hall floor L0
const SM_FLOOR_Y = 580;

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
    entrySpawns: { default: { route: 'default', platformId: 'SM-E3', x: 259, feetY: -449 } },
    segments: [{ start: 0, end: SM_WIDTH, bg: 'spirit' }],
    backgroundRanges: {},
    goal: { id: 'spirit-summit', exitRoute: 'default', x: 1594, y: -6350, w: 60, h: 120, hidden: true }
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
  wFloor(s, 1135, SM_WIDTH - 1135, 'grass', SM_FLOOR_Y, { id: 'SM-FLOOR', h: 700, smDraw: 'floor' });
  for (const [id, x, y, w, kind] of SM_PLATFORMS) {
    if (kind === 'basalt' && id === 'L0') wSurface(s, x, y, w, 'grass', { id: 'SM-' + id, smDraw: kind });
    else wSurface(s, x, y, w, 'grass', { id: 'SM-' + id, smDraw: kind, small: w <= 100 });
  }
  for (const [id, x, y, w, h] of SM_WALLS) wWall(s, x, y, w, h, 'grass', { id: 'SM-' + id, noTopLand: id.startsWith('MW'), smDraw: id.startsWith('B') ? 'pillar' : 'rock' });
  wWall(s, SM_ROOF.x, SM_ROOF.y, SM_ROOF.w, SM_ROOF.h, 'grass', { id: 'SM-ROOF', smDraw: 'roof' });

  // Checkpoints: the sketch's green flags, shown as the zone's shrine (the plain flag is hidden). Order matters
  // for spiritKillY below.
  wCheckpoint(s, '정령호수', 259, -449);
  wCheckpoint(s, '동굴 끝', 1990, -1003);
  wCheckpoint(s, '이프리트의 쉼터', 604, -2023);
  wCheckpoint(s, '눈 덮인 산길', 2059, -3781);
  wCheckpoint(s, '정상', 1594, -6350);
  for (const sec of s.sections) sec.hiddenFlag = true;
  s.smShrines = ['shrine_lake', 'shrine_cave', 'shrine_lava', 'shrine_snow', 'shrine_top'];

  s.smNpcs = [
    { id: 'SM-NPC-NAIA',  kind: 'naia',  name: '나이아',   x: 370,  y: -449,       idle: 'naia_idle',  near: 'naia_happy',  dialogue: '안녕! 처음보는 용족이네 퓨퓨! 앞으로 잘 지내보자!' },
    { id: 'SM-NPC-GABIA', kind: 'gabia', name: '가비아',   x: 1975, y: SM_FLOOR_Y, idle: 'gabia_idle', near: 'gabia_happy', dialogue: '응... 용...족... 어두...운데... 조심... 해' },
    { id: 'SM-NPC-IFRIT', kind: 'ifrit', name: '이프리트', x: 874,  y: -1896,      idle: 'ifrit_idle', near: 'ifrit_sorry', dialogue: '뭐야? 용족이 왜 여기에 있어? 빨리 안나가?' },
    { id: 'SM-NPC-SYLLA', kind: 'sylla', name: '실라',     x: 949,  y: -6350,      idle: 'sylla_idle', near: 'sylla_happy', dialogue: '꼬마 용족이 여기까지 오다니. 대견하구나.' },
    { id: 'SM-NPC-AYA',   kind: 'aya',   name: '아야',     x: 1069, y: -6350,      idle: 'aya_idle',   near: 'aya_happy',   dialogue: '힘이 넘치는걸? 특히 저 통통한 꼬리. 매끄럽고 탄탄하고... 참, 어서 가보렴 후훗.' }
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
    { id: 'SM-STAR-MAZE', x: 1300, y: -814 },
    { id: 'SM-STAR-LAVA', x: 2178, y: -2123 },
    { id: 'SM-STAR-WIND', x: 142,  y: -5320 }
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
  if (x < 1135) return 250;   // outside the mountain at the start there is nothing below: back to the lake
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
  sm.mask = (p.x > 1135 && p.y < SM_FLOOR_Y - 60 && p.y > -1240) ? 1 : 0;
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
    w.nextStart = t + SM_WIND.intervalMin + w.rng() * (SM_WIND.intervalMax - SM_WIND.intervalMin);
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

// story fairy timings (fairy1/fairy2 profiles) with the travel speed about 25% higher
const WISP = { wait: 0.62, warn: 1.0, rest: 1.3, speed: 216, returnSpeed: 170, halfW: 26, halfH: 34 };
function spiritLavaZone() { return p.x > 1000 && p.y < -1240 && p.y > -2200; }
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
    if (p.vy > 60 && (p.prevY ?? p.y) <= w.hy - WISP.halfH + 10) {
      w.state = 'stomped'; w.t = 0; w.anim = 0; w.clip = 'wisp_groggy';
      p.vy = -540; p.ground = false; p.on = null; p.jumps = 1; p.airDashUsed = false;
      burst(w.x, w.hy - 20, '#ffcf6b', 12); tone(520, 0.1, 'triangle', 0.04);
    } else if (p.invulnerable <= 0) {
      applyStunHit(w.x, 'spirit_wisp');
    }
  }
}
function updateLava() {
  if (p.invulnerable > 0) return;
  const floorY = -1301;
  if (Math.abs(p.y - floorY) > 6) return;
  for (const l of SM_LAVA) if (p.x > l.x1 + 6 && p.x < l.x2 - 6) { applyStunHit(p.x < (l.x1 + l.x2) / 2 ? l.x1 - 40 : l.x2 + 40, 'spirit_lava'); return; }
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
  updateSpiritStars();
  updateSpiritNpcs(dt);
  // cave darkness follows Dudu: full in the maze, none at the start floor, Gabia's rest or the lava hall
  const inMaze = p.x > 1135 && p.y < SM_FLOOR_Y - 60 && p.y > -1240;
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
  ctx.drawImage(im, (f % 8) * 256, Math.floor(f / 8) * 256, 256, 256, -m.anchor / 256 * size, -m.foot / 256 * size, size, size);
  ctx.restore();
  return true;
}
function smRand(i) { const v = Math.sin(i * 91.7 + 13.3) * 43758.5453; return v - Math.floor(v); }

function smTile(k) { return smImages['t_' + k] || null; }
// Which zone art a platform uses, from its id: E = lake start, M = Gabia's cave, L / I0 = Ifrit's lava, the rest snow.
function smZoneOf(id) {
  const k = id.replace('SM-', '');
  if (k[0] === 'E') return 'lake';
  if (k[0] === 'M' || k === 'FLOOR') return 'cave';
  if (k[0] === 'L' || k === 'I0') return 'lava';
  return 'snow';
}
function smPickTile(a) {
  const z = smZoneOf(a.id);
  if (a.id === 'SM-E3') return 'lake_start';
  if (a.smDraw === 'ice') return 'snow_ice';
  if (z === 'lava' && a.id === 'SM-I0') return 'lava_slab';
  if (a.w >= 700) return z + '_long';
  if (a.w >= 260) return z + '_mid';
  return z + '_small';
}
// The tile is scaled to the platform's width and placed so its walkable surface line sits on the platform top.
function drawSpiritLedge(a, x, y) {
  const key = smPickTile(a), im = smTile(key), m = SM_TILES[key];
  if (!im || !m) { ctx.fillStyle = '#6f6a74'; ctx.fillRect(x, y, a.w, 14); return; }
  const sc = (a.w + 16) / m[0];
  ctx.drawImage(im, x - 8, y - m[2] * sc, m[0] * sc, m[1] * sc);
}
// Walls and the brown pillars of the sketch: the zone's pillar art stacked to the wall's height.
function drawSpiritRock(a, x, y) {
  const v = smView();
  const y1 = Math.max(y, v.y1 - 300), y2 = Math.min(y + a.h, v.y2 + 10);
  if (y2 <= y1) return;
  if (a.smDraw === 'roof') { drawSpiritLedge({ ...a, smDraw: 'snow', w: a.w, id: 'SM-ROOF' }, x, y); return; }
  const z = smZoneOf(a.id) === 'lava' || a.id === 'SM-MW3' || a.id === 'SM-MW4' || a.id === 'SM-B6' ? 'lava' : (a.id === 'SM-B7' ? 'stone' : 'cave');
  const key = z + '_pillar', im = smTile(key), m = SM_TILES[key];
  if (!im || !m) { ctx.fillStyle = '#4a4652'; ctx.fillRect(x, y1, a.w, y2 - y1); return; }
  const sc = (a.w + 14) / m[0], th = m[1] * sc - 4;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 10, y - 2, a.w + 20, a.h + 4); ctx.clip();
  const start = y + Math.floor((y1 - y) / th) * th;
  for (let ty = start; ty < y2; ty += th) ctx.drawImage(im, x - 7, ty, m[0] * sc, m[1] * sc);
  ctx.restore();
}
function drawSpiritFloor(a, x, y) {
  const v = smView();
  const x1 = Math.max(x, v.x1 - 20), x2 = Math.min(x + a.w, v.x2 + 20);
  const h = Math.min(a.h, v.y2 - y + 10);
  if (x2 <= x1 || h <= 0) return;
  ctx.save();
  ctx.fillStyle = '#2c2a36'; ctx.fillRect(x1, y + 30, x2 - x1, h - 30);
  const im = smTile('cave_floor'), m = SM_TILES.cave_floor;
  if (im && m) {
    const sc = 0.6, tw = m[0] * sc - 6;
    for (let tx = x + Math.floor((x1 - x) / tw) * tw; tx < x2; tx += tw) ctx.drawImage(im, tx, y - m[2] * sc, m[0] * sc, m[1] * sc);
  }
  ctx.restore();
}
function drawSpiritPlatform(a, x, y) {
  if (a.smDraw === 'floor') drawSpiritFloor(a, x, y);
  else if (a.smDraw === 'rock' || a.smDraw === 'pillar' || a.smDraw === 'roof') drawSpiritRock(a, x, y);
  else drawSpiritLedge(a, x, y);
}
window.drawSpiritPlatform = drawSpiritPlatform;

// Checkpoint shrines (one per zone) stand where the sketch's green flags are.
function drawSpiritShrines() {
  const v = smView(), s = spiritStage();
  sections.forEach((sec, i) => {
    if (sec.x < v.x1 - 200 || sec.x > v.x2 + 200 || sec.y < v.y1 - 50 || sec.y > v.y2 + 250) return;
    const key = s.smShrines[i], im = smTile(key), m = SM_TILES[key];
    if (!im || !m) return;
    const sc = 160 / m[0];
    ctx.save();
    if (i > 0 && checkpoint < i) ctx.globalAlpha = 0.85;
    ctx.drawImage(im, sec.x - 80, sec.y - m[1] * sc + 14, m[0] * sc, m[1] * sc);
    ctx.restore();
  });
}

// --- wind particles: world-space streaks drawn behind the platforms, flowing right to left ---
function spiritWindVisibility() {
  // how much of the zone is on screen (fades in and out at the borders)
  const v = smView();
  const ov = Math.max(0, Math.min(v.y2, SM_WIND.y2) - Math.max(v.y1, SM_WIND.y1));
  return Math.min(1, ov / 300);
}
function updateWindParticles(fdt) {
  const w = sm.wind; if (!w) return;
  const vis = spiritWindVisibility();
  const v = smView();
  const light = !!window.duduLightMode;
  const want = vis <= 0 ? 0 : Math.round((light ? 18 : 34) + (light ? 40 : 90) * w.intensity);
  while (sm.particles.length < want) {
    sm.particles.push({ x: v.x1 + Math.random() * (v.x2 - v.x1 + 300), y: Math.max(SM_WIND.y1, v.y1) + Math.random() * Math.max(1, Math.min(v.y2, SM_WIND.y2) - Math.max(v.y1, SM_WIND.y1)), s: Math.random(), life: 0 });
  }
  if (sm.particles.length > want + 20) sm.particles.length = want;
  for (const q of sm.particles) {
    const spd = 40 + 1250 * w.intensity * (0.6 + 0.4 * q.s);
    q.x -= spd * fdt; q.y += (8 + 30 * w.intensity) * fdt * (q.s - 0.3); q.life += fdt;
    if (q.x < v.x1 - 140 || q.y < v.y1 - 40 || q.y > v.y2 + 40) {
      q.x = v.x2 + Math.random() * 200; q.y = Math.max(SM_WIND.y1, v.y1) + Math.random() * Math.max(1, Math.min(v.y2, SM_WIND.y2) - Math.max(v.y1, SM_WIND.y1)); q.life = 0;
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
  if (I > 0.05) {
    // a pale band of blown snow sweeping right to left across the zone (behind the platforms)
    const v = smView(); const band = (time * 900) % (v.x2 - v.x1 + 800);
    const bx = v.x2 + 400 - band;
    const g = ctx.createLinearGradient(bx - 400, 0, bx + 400, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(235,245,255,${0.16 * I * vis})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(bx - 400, Math.max(v.y1, SM_WIND.y1), 800, Math.min(v.y2, SM_WIND.y2) - Math.max(v.y1, SM_WIND.y1));
  }
  ctx.lineCap = 'round';
  for (const q of sm.particles) {
    if (q.y < SM_WIND.y1 - 20 || q.y > SM_WIND.y2 + 20) continue;
    const len = 6 + 150 * I * (0.5 + q.s);
    const a = vis * (0.3 + 0.6 * I) * (0.55 + 0.45 * q.s);
    if (len > 14) {
      // streak: the bright head is on the LEFT, the tail trails to the right, so the motion reads right-to-left.
      // Thick enough to read on a phone (the canvas is shown at about 40% there).
      const th = 2.5 + 3.5 * q.s * I;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(smStreak(), q.x, q.y - th / 2, len, th);
      ctx.globalAlpha = 1;
    }
    if (q.s > 0.8 && I > 0.3) {
      // a few of the supplied wind swirls, mirrored so they read as blowing from the right
      const keys = ['wind_a', 'wind_b', 'wind_c', 'wind_d', 'wind_e'], key = keys[Math.floor(q.s * 1000) % 5];
      const im = smTile(key), m = SM_TILES[key];
      if (im && m) {
        const sc = 0.5 + 0.3 * q.s;
        ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.3); ctx.translate(q.x, q.y); ctx.scale(-1, 1);
        ctx.drawImage(im, -m[0] * sc / 2, -m[1] * sc / 2, m[0] * sc, m[1] * sc); ctx.restore();
        continue;
      }
    }
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, a + 0.15)})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, 1.6 + 1.6 * q.s, 0, Math.PI * 2); ctx.fill();
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

function drawLavaPools() {
  const imP = smTile('lava_pool'), mP = SM_TILES.lava_pool;
  if (imP && mP) {
    for (const l of SM_LAVA) {
      const w = l.x2 - l.x1 + 24, sc = w / mP[0];
      ctx.drawImage(imP, l.x1 - 12, -1301 - mP[2] * sc + 4, w, mP[1] * sc);
    }
    return;
  }
  const v = smView(); const y = -1301;
  if (y < v.y1 - 60 || y > v.y2 + 60) return;
  ctx.save();
  for (const l of SM_LAVA) {
    const g = ctx.createLinearGradient(0, y - 10, 0, y + 14);
    g.addColorStop(0, '#ffd166'); g.addColorStop(0.4, '#ff7b29'); g.addColorStop(1, '#a8231d');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(l.x1, y + 12);
    for (let x = l.x1; x <= l.x2; x += 10) ctx.lineTo(x, y - 6 + Math.sin(time * 3 + x * 0.08) * 2.5);
    ctx.lineTo(l.x2, y + 12); ctx.closePath(); ctx.fill();
    // bubbles that swell and pop
    for (let i = 0; i < 4; i++) {
      const ph = (time * 0.7 + i * 0.27 + l.x1 * 0.001) % 1;
      const bx = l.x1 + 14 + ((i * 37 + Math.floor(time * 0.7 + i * 0.27) * 53) % (l.x2 - l.x1 - 28));
      ctx.fillStyle = `rgba(255,220,140,${0.8 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(bx, y - 6 - ph * 10, 2 + ph * 5, 0, Math.PI * 2); ctx.fill();
    }
    // heat shimmer above
    ctx.fillStyle = 'rgba(255,140,60,0.10)'; ctx.fillRect(l.x1, y - 70, l.x2 - l.x1, 64);
  }
  ctx.restore();
}

function drawSpiritFront() {
  if (!isSpiritActive()) return;
  const v = smView();
  drawSpiritShrines();
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
let _smMaskCanvas = null;
const SM_SIGHT_R = 210, SM_MASK_SCALE = 4;
function smMaskCanvas() {
  if (_smMaskCanvas) return _smMaskCanvas;
  const c = document.createElement('canvas');
  c.width = (2 * W) / SM_MASK_SCALE; c.height = (2 * H) / SM_MASK_SCALE;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(6,5,12,0.93)'; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-out';
  const r = SM_SIGHT_R / SM_MASK_SCALE, cx = c.width / 2, cy = c.height / 2;
  const grad = g.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.25);
  grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, r * 1.3, 0, Math.PI * 2); g.fill();
  _smMaskCanvas = c;
  return c;
}
function drawSpiritOverlay() {
  if (!isSpiritActive()) return;
  if (sm.mask > 0.01) {
    const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
    const sx = (rPx - rCam) * zoom, sy = (rPy - 32 - rCamY) * zoom;
    ctx.save();
    ctx.globalAlpha = sm.mask;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(smMaskCanvas(), sx - W, sy - H, 2 * W, 2 * H);
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
  if (p.x >= 1000 && p.y < -1240 && p.y > -2705) return 2;    // lava hall
  if (p.x < 1000 && p.y < -1240 && p.y > -2150) return 2;     // Ifrit's rest
  if (p.y <= -1240) return 3;                                 // outside climb
  if (p.x >= 1135) return 1;                                  // Gabia's cave
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
  window.__smBgDebug = { zone, weights: smBgWeights.map(v => +v.toFixed(2)) };
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
      <div class="wmStageGrid">
        <div class="wmStageCard unlocked ${rec.cleared ? 'cleared' : ''}" id="wmStageCard-3-1" data-stage-code="3-1" data-unlocked="true">
          <div class="wmStageTop"><span class="wmStageCode">STAGE 3-1</span><span class="wmStageStatus">${rec.cleared ? '✓ 클리어' : '● 진입 가능'}</span></div>
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
