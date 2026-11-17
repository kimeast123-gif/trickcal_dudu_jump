'use strict';
// ============================================================================
// v1.6 WORLD 3 「정령산의 아침」 (stage 3-1): one long VERTICAL climb, bottom to summit, no scene changes.
//
// Built from the supplied sketch (771 x 2000, bottom = start). Sketch -> world:
//   x = 40 + sx * 3.0
//   y = 580 - (1955 - sy) * k, k = 4.2 for the cave, 3.1 for the denser lava hall (sketch y 1530..1225) and 3.8 above.
// Every hop was checked against the real jump arc (see docs/SPIRIT_MOUNTAIN.md and tools/qa/spirit_*.py).
//
// Zones, bottom to top: A start + Naia (bg 1) -> B Gabia's dark maze, circle of light around Dudu, no pits (bg 2)
// -> C Ifrit's lava hall with fire wisps (bg 3) -> D outside climb, blue wind zone: every 20-30s a 4-6s gust from the
// right pushes Dudu left while airborne (bg 4) -> E summit, Sylla and Aya (bg 5).
// The stage rides on the World 1 stage runner (worldmap-mode.js) exactly like the night map.
// ============================================================================

const SM_WORLD_ID = 'world3_spiritmountain';
const SM_CODE = '3-1';
const SM_WIDTH = 2400;
const SM_ASSET_Q = '?v=v1_6_1_261117'; // rewritten by tools/release.py on every deploy

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
  ['MW1', 1135, -134, 90, 534],    // lower outer wall; leaves a 180px cave mouth at floor level (400..580)
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
    entrySpawns: { default: { route: 'default', platformId: 'SM-FLOOR', x: 1390, feetY: SM_FLOOR_Y } },
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

  wFloor(s, 0, SM_WIDTH, 'grass', SM_FLOOR_Y, { id: 'SM-FLOOR', h: 700, smDraw: 'floor' });
  for (const [id, x, y, w, kind] of SM_PLATFORMS) {
    if (kind === 'basalt' && id === 'L0') wSurface(s, x, y, w, 'grass', { id: 'SM-' + id, smDraw: kind });
    else wSurface(s, x, y, w, 'grass', { id: 'SM-' + id, smDraw: kind, small: w <= 100 });
  }
  for (const [id, x, y, w, h] of SM_WALLS) wWall(s, x, y, w, h, 'grass', { id: 'SM-' + id, noTopLand: id.startsWith('MW'), smDraw: id.startsWith('B') ? 'pillar' : 'rock' });
  wWall(s, SM_ROOF.x, SM_ROOF.y, SM_ROOF.w, SM_ROOF.h, 'grass', { id: 'SM-ROOF', smDraw: 'roof' });

  // Checkpoints: the sketch's green flags. Index matters for the kill rule below.
  wCheckpoint(s, '정령산 입구', 1390, SM_FLOOR_Y);
  wCheckpoint(s, '가비아의 쉼터', 175, -449);
  wCheckpoint(s, '동굴 끝', 1990, -1003);
  wCheckpoint(s, '이프리트의 쉼터', 604, -2023);
  wCheckpoint(s, '눈 덮인 산길', 2059, -3781);
  wCheckpoint(s, '정상', 1594, -6350);

  s.smNpcs = [
    // TEMP lines: the directive gives no script yet; replace these freely (one short line each).
    { id: 'SM-NPC-NAIA',  kind: 'naia',  name: '나이아',   x: 1975, y: SM_FLOOR_Y, idle: 'naia_idle',  near: 'naia_happy',  dialogue: '두두 왔구나! 산꼭대기까지 같이 가 보자.' },
    { id: 'SM-NPC-GABIA', kind: 'gabia', name: '가비아',   x: 370,  y: -449,       idle: 'gabia_idle', near: 'gabia_happy', dialogue: '깜깜한 길을 잘 찾아왔네.' },
    { id: 'SM-NPC-IFRIT', kind: 'ifrit', name: '이프리트', x: 874,  y: -1896,      idle: 'ifrit_idle', near: 'ifrit_sorry', dialogue: '불꽃들이 장난이 심했지? 미안해.' },
    { id: 'SM-NPC-SYLLA', kind: 'sylla', name: '실라',     x: 949,  y: -6350,      idle: 'sylla_idle', near: 'sylla_happy', dialogue: '바람을 뚫고 올라왔구나!' },
    { id: 'SM-NPC-AYA',   kind: 'aya',   name: '아야',     x: 1069, y: -6350,      idle: 'aya_idle',   near: 'aya_happy',   dialogue: '정상에 온 걸 환영해, 두두.' }
  ];
  // Red ellipses: fire wisps, all inside the lava hall. Patrol spans follow the sketch's black lines.
  s.smWisps = [
    { id: 'SM-W1', x1: 1216, x2: 1680, home: 1216, y: -1301 },
    { id: 'SM-W2', x1: 1660, x2: 2128, home: 2128, y: -1301 },
    { id: 'SM-W3', x1: 1372, x2: 1594, home: 1372, y: -1510 },
    { id: 'SM-W4', x1: 1828, x2: 2116, home: 2116, y: -1676 },
    { id: 'SM-W5', x1: 1462, x2: 1462, home: 1462, y: -2104 }
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

// Below the cave nothing is a pit. Once Dudu has reached Ifrit's rest (outside), falling more than about one and a
// half screens below the latest flag sends her back to it instead of dropping her all the way down the mountain.
function spiritKillY() {
  if (checkpoint >= 3 && sections[checkpoint]) return sections[checkpoint].y + 1100;
  return 2000;
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
  sm.wisps = s.smWisps.map(w => ({ ...w, x: w.home, prevX: w.home, hy: w.y - 64, dir: w.home <= w.x1 ? 1 : -1,
    state: 'patrol', t: 0, anim: Math.random(), clip: w.x1 === w.x2 ? 'wisp_idle' : 'wisp_move', face: -1, cool: 1.2 + Math.random(), fired: false }));
  const save = loadWorldMapSave();
  const rec = spiritRecord(save);
  sm.stars = s.smStars.map(st => ({ ...st, got: rec.collectibles.includes(st.id) }));
  // Wind: reproducible from every reset; nothing happens until Dudu enters the zone.
  sm.wind = { rng: smRng(20261117), state: 'outside', entered: false, nextStart: Infinity, start: 0, end: 0, dur: 0, intensity: 0, push: 0 };
  window.__smWindBias = 0;
  // respawning puts the darkness straight to where Dudu now stands (no leftover fade)
  sm.mask = (p.x > 1135 && p.y < SM_FLOOR_Y - 60 && p.y > -1240) ? 1 : 0;
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

const WISP = { sight: 380, sightY: 170, telegraph: 0.55, attackDur: 1.4, groggy: 1.0, ballSpeed: 300, ballRange: 440, speed: 90, halfW: 26, halfH: 34 };
function spiritLavaZone() { return p.x > 1000 && p.y < -1240 && p.y > -2200; }
function updateWisp(w, dt) {
  w.prevX = w.x; w.t += dt; w.anim += dt;
  const active = spiritLavaZone();
  const dx = p.x - w.x, dyP = (p.y - 30) - w.hy;
  if (w.state === 'stomped') { if (w.t > 2.6) { w.state = 'patrol'; w.t = 0; w.clip = w.x1 === w.x2 ? 'wisp_idle' : 'wisp_move'; } return; }
  if (w.state === 'patrol') {
    if (w.x1 !== w.x2) {
      w.x += w.dir * WISP.speed * dt;
      if (w.x <= w.x1) { w.x = w.x1; w.dir = 1; } else if (w.x >= w.x2) { w.x = w.x2; w.dir = -1; }
      w.face = w.dir;
    }
    w.cool -= dt;
    const onScreen = w.x > rCam - 20 && w.x < rCam + W + 20 && w.hy > rCamY && w.hy < rCamY + H;
    if (active && onScreen && w.cool <= 0 && Math.abs(dx) < WISP.sight && Math.abs(dyP) < WISP.sightY && p.invulnerable <= 0.3) {
      w.state = 'attack'; w.t = 0; w.anim = 0; w.clip = 'wisp_attack'; w.fired = false; w.face = dx > 0 ? 1 : -1;
    }
  } else if (w.state === 'attack') {
    if (!w.fired && w.t >= WISP.telegraph) {
      w.fired = true;
      const ang = Math.atan2(dyP, dx);
      sm.fireballs.push({ x: w.x + w.face * 20, y: w.hy, prevX: w.x, prevY: w.hy, vx: Math.cos(ang) * WISP.ballSpeed, vy: Math.sin(ang) * WISP.ballSpeed, dist: 0, hit: false });
      if (typeof tone === 'function') tone(520, 0.08, 'triangle', 0.02);
    }
    if (w.t >= WISP.attackDur) { w.state = 'groggy'; w.t = 0; w.anim = 0; w.clip = 'wisp_groggy'; }
  } else if (w.state === 'groggy') {
    if (w.t >= WISP.groggy) { w.state = 'patrol'; w.t = 0; w.clip = w.x1 === w.x2 ? 'wisp_idle' : 'wisp_move'; w.cool = 1.6 + Math.random() * 0.8; }
  }
  if (w.state === 'groggy') return; // a resting wisp is harmless
  // body: landing on top stuns it; touching it otherwise is a hit
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
function updateFireballs(dt) {
  const pcx = p.x, pcy = p.y - 30;
  for (const b of sm.fireballs) {
    if (b.hit) continue;
    b.prevX = b.x; b.prevY = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.dist += WISP.ballSpeed * dt;
    if (b.dist > WISP.ballRange) { b.hit = true; continue; }
    if (distPointToSegment(pcx, pcy, b.prevX, b.prevY, b.x, b.y) < 30) { b.hit = true; applyStunHit(b.prevX, 'spirit_fire'); continue; }
    for (const pl of platforms) {
      if (pl.collidable === false || pl.thin) continue;
      if (pl.x > Math.max(b.x, b.prevX) || pl.x + pl.w < Math.min(b.x, b.prevX)) continue;
      if (segmentIntersectsBox(b.prevX, b.prevY, b.x, b.y, pl.x, pl.y, pl.x + pl.w, pl.y + pl.h).hit) { b.hit = true; break; }
    }
  }
  let n = 0; for (const b of sm.fireballs) if (!b.hit) sm.fireballs[n++] = b; sm.fireballs.length = n;
}
// Lava pools lie on the hall floor: stepping in is a normal hit (health -1, knock-back, invulnerability), never a reset.
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
  if (spiritLavaZone() || sm.fireballs.length) {
    for (const w of sm.wisps) updateWisp(w, dt);
    updateFireballs(dt);
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

const SM_STYLE = {
  ledge:  { top: '#6f6a74', body: '#4a4552', rim: 'rgba(210,200,230,0.55)' },
  rest:   { top: '#8fb07a', body: '#5d6b4c', rim: 'rgba(240,255,210,0.7)' },
  basalt: { top: '#4b3a37', body: '#2e2423', rim: 'rgba(255,150,80,0.75)' },
  snow:   { top: '#f2f6ff', body: '#7d8aa3', rim: 'rgba(255,255,255,0.9)' },
  ice:    { top: '#d9ecff', body: '#8fa9c8', rim: 'rgba(230,248,255,0.9)' },
  summit: { top: '#ffffff', body: '#9fb0c8', rim: 'rgba(255,255,255,1)' }
};
function drawSpiritLedge(a, x, y) {
  const st = SM_STYLE[a.smDraw] || SM_STYLE.ledge;
  ctx.save();
  ctx.fillStyle = st.body; ctx.beginPath(); ctx.roundRect(x, y + 4, a.w, 18, 6); ctx.fill();
  ctx.fillStyle = st.top; ctx.beginPath(); ctx.roundRect(x - 2, y, a.w + 4, 9, 5); ctx.fill();
  ctx.fillStyle = st.rim; ctx.fillRect(x + 3, y, a.w - 6, 2);
  if (a.smDraw === 'snow' || a.smDraw === 'summit') {
    // a soft snow lip hanging over the edges
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < a.w; i += 26) { const r = 4 + smRand(a.x + i) * 4; ctx.beginPath(); ctx.arc(x + i + 10, y + 8, r, 0, Math.PI); ctx.fill(); }
  } else if (a.smDraw === 'basalt') {
    ctx.fillStyle = 'rgba(255,120,40,0.35)'; ctx.fillRect(x + 4, y + 18, a.w - 8, 3);
  }
  ctx.restore();
}
function drawSpiritRock(a, x, y) {
  const v = smView();
  const y1 = Math.max(y, v.y1 - 10), y2 = Math.min(y + a.h, v.y2 + 10);
  if (y2 <= y1) return;
  ctx.save();
  const lava = a.y < -1200 && a.y > -2900;
  ctx.fillStyle = a.smDraw === 'pillar' ? '#8a5a3a' : (lava ? '#3a2826' : '#4a4652');
  ctx.fillRect(x, y1, a.w, y2 - y1);
  ctx.fillStyle = a.smDraw === 'pillar' ? 'rgba(255,214,160,0.35)' : 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y1, 3, y2 - y1);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + a.w - 4, y1, 4, y2 - y1);
  if (a.smDraw === 'roof') { ctx.fillStyle = '#f2f6ff'; ctx.fillRect(x - 4, y, a.w + 8, 10); }
  ctx.restore();
}
function drawSpiritFloor(a, x, y) {
  const v = smView();
  const x1 = Math.max(x, v.x1 - 20), x2 = Math.min(x + a.w, v.x2 + 20);
  const h = Math.min(a.h, v.y2 - y + 10);
  if (x2 <= x1 || h <= 0) return;
  ctx.save();
  ctx.fillStyle = '#5b6b45'; ctx.fillRect(x1, y, x2 - x1, h);
  ctx.fillStyle = '#86a35e'; ctx.fillRect(x1, y, x2 - x1, 10);
  ctx.fillStyle = 'rgba(255,255,230,0.5)'; ctx.fillRect(x1, y, x2 - x1, 2);
  ctx.restore();
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
  drawLavaPools();
  for (const w of sm.wisps) {
    const x = w.prevX + (w.x - w.prevX) * renderAlpha, y = w.hy + Math.sin(time * 2.4 + w.home) * 5;
    if (x < v.x1 - 100 || x > v.x2 + 100 || y < v.y1 - 100 || y > v.y2 + 100) continue;
    ctx.save(); ctx.globalAlpha = 0.25; ellipse(x, w.y + 2, 26, 5, '#ff8a3d'); ctx.restore();
    if (w.state === 'attack' && !w.fired) {
      ctx.save(); ctx.globalAlpha = 0.25 + 0.5 * (w.t / WISP.telegraph); ellipse(x, y, 40, 40, 'rgba(255,170,60,0.5)'); ctx.restore();
    }
    if (!drawSpiritSprite(w.clip, w.anim, x, y, w.face, w.state === 'stomped' ? 0.7 : 1)) ellipse(x, y, 22, 28, '#ff8a3d');
  }
  for (const b of sm.fireballs) {
    const x = b.prevX + (b.x - b.prevX) * renderAlpha, y = b.prevY + (b.y - b.prevY) * renderAlpha;
    ellipse(x, y, 16, 16, 'rgba(255,150,60,0.35)'); ellipse(x, y, 9, 9, '#ffcf6b'); ellipse(x, y, 5, 5, '#fff4d0');
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
const SM_BG_BANDS = [   // camera-centre y ranges (world y grows downward)
  { key: 'bg1', top: 300, bottom: 99999 },
  { key: 'bg2', top: -1163, bottom: 300 },
  { key: 'bg3', top: -2700, bottom: -1163 },
  { key: 'bg4', top: -6300, bottom: -2700, fadeTop: 120 },
  { key: 'bg5', top: -99999, bottom: -6300, fadeBottom: 120 }   // short fade: the summit art appears only at the top
];
const SM_BG_FADE = 220;
const _smBgCache = {};
function smBackdrop(key) {
  if (_smBgCache[key]) return _smBgCache[key];
  const im = smImages[key]; if (!im) return null;
  const sc = Math.max(W / im.width, H / im.height) * 1.3;
  const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
  _smBgCache[key] = c; return c;
}
function smBandAlpha(b, cy) {
  const fT = b.fadeTop || SM_BG_FADE, fB = b.fadeBottom || SM_BG_FADE;
  return Math.max(0, Math.min(1, (cy - (b.top - fT)) / (2 * fT), ((b.bottom + fB) - cy) / (2 * fB)));
}
function drawSpiritBackground() {
  const cy = rCamY + H * 0.5, cx = rCam + W * 0.5;
  let drew = false;
  for (const b of SM_BG_BANDS) {
    const a = smBandAlpha(b, cy);
    if (a <= 0) continue;
    const c = smBackdrop(b.key);
    if (!c) continue;
    // pan slowly with the climb inside the band, and a little with the camera's x
    const span = Math.max(1, Math.min(b.bottom, 900) - Math.max(b.top, -6900));
    const vy = Math.max(0, Math.min(1, (cy - Math.max(b.top, -6900)) / span));
    const vx = Math.max(0, Math.min(1, cx / SM_WIDTH));
    const sx = Math.round(vx * (c.width - W)), sy = Math.round(vy * (c.height - H));
    if (a < 1) { ctx.save(); ctx.globalAlpha = a; }
    ctx.drawImage(c, sx, sy, W, H, 0, 0, W, H);
    if (a < 1) ctx.restore();
    drew = drew || a >= 1;
  }
  if (!drew && !smImages.bg1) { ctx.fillStyle = '#9fc3d6'; ctx.fillRect(0, 0, W, H); }
  window.__smBgDebug = { cy, bands: SM_BG_BANDS.map(b => +smBandAlpha(b, cy).toFixed(2)) };
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
