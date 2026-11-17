'use strict';
// ============================================================================
// v1.5 WORLD 2 「모나티엄의 야경」 (stage 2-1)
//
// One long side-scrolling stage at night, built from the supplied sketch (모나티엄 맵 구상.png, 2000x200).
// Sketch-to-world scale: x * 8 (+280 after the central tower, which was widened for the moving platforms),
// y -> 580 + (y - 160) * 7. Gaps were then tuned against the real jump/dash physics (see docs/NIGHT_MONATIUM.md).
//
// The stage plugs into the World 1 stage runner (worldmap-mode.js): it is appended to `world1Stages`
// with `worldId: 'world2_monatium_night'`, so camera, checkpoints, HUD, retry and the clear flow are shared.
// Everything specific to the night map lives here: lead runners (Lion, Scizor) and the 2-second start hold,
// drones that rise from below and shoot Mayo's wind darts, the tower's electric field, riot-squad patrols
// (the existing guard1/guard2 walkers), brown anti-jump walls, the city-hall NPC plaza and the night backdrop.
// ============================================================================

const NIGHT_WORLD_ID = 'world2_monatium_night';
const NIGHT_STAGE_CODE = '2-1';
const NIGHT_END = 16400;
const NIGHT_SAFE_X = 14990;           // the plaza is a safe zone: no drone rises or fires once Dudu is on it
const NIGHT_HALL_FADE = [15150, 15450];   // camera-centre range where the city hall backdrop fades in (last stretch only)
const NIGHT_RUNNER_SPEED = 345;          // Mayo's top chase speed is 314 px/s; runners use ~1.10x
const NIGHT_INTRO_HOLD = 2.0;            // seconds Dudu cannot move at the start flag

// Sprite sheets converted from the supplied GIFs (256px cells, 8 columns). Kept out of npcMeta on purpose:
// npcMeta keys are preloaded for every player at boot, these are only fetched when the night stage opens.
const NIGHT_SPRITES = {
  lion_move:    { frames: 24, fps: 25,   anchor: 122, foot: 244, display: 138 },
  lion_idle:    { frames: 27, fps: 12.5, anchor: 122, foot: 246, display: 138 },
  lion_happy:   { frames: 34, fps: 12.5, anchor: 122, foot: 246, display: 138 },
  scizor_move:  { frames: 21, fps: 25,   anchor: 126, foot: 238, display: 150 },
  scizor_idle:  { frames: 25, fps: 12.5, anchor: 126, foot: 240, display: 150 },
  scizor_sad:   { frames: 14, fps: 12.5, anchor: 126, foot: 240, display: 150 },
  drone_move:   { frames: 21, fps: 25,   anchor: 128, foot: 96,  display: 150 },
  drone_idle:   { frames: 27, fps: 25,   anchor: 128, foot: 96,  display: 150 },
  drone_attack: { frames: 31, fps: 37.5,   anchor: 128, foot: 96,  display: 150 },
  drone_die:    { frames: 25, fps: 12.5, anchor: 128, foot: 96,  display: 150 }
};
const NIGHT_BACKDROPS = { street: 'night-street', towers: 'night-towers', hall: 'night-cityhall' };
const NIGHT_ASSET_Q = '?v=v1_5_2_261117';
const nightImages = {};
let _nightAssetsRequested = false;

function loadNightAssets() {
  if (_nightAssetsRequested) return;
  _nightAssetsRequested = true;
  const q = NIGHT_ASSET_Q; // rewritten by tools/release.py on every deploy
  const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn, { timeout: 600 }) : (fn) => setTimeout(fn, 30);
  const load = (key, src) => {
    const im = new Image();
    im.onload = async () => {
      // decode now so the first frame that shows it does not stall, then prescale backdrops while idle
      try { if (im.decode) await im.decode(); } catch (e) {}
      nightImages[key] = im;
      if (key === 'bg_street') { idle(() => nightBackdropCanvas('street', false)); idle(() => nightBackdropCanvas('street', true)); }
      else if (key.startsWith('bg_')) idle(() => nightBackdropCanvas(key.slice(3), false));
    };
    im.onerror = () => console.warn('[night] failed to load', src);
    im.src = src;
  };
  for (const k of Object.keys(NIGHT_SPRITES)) load(k, `assets/npc/${k}.webp${q}`);
  for (const k of Object.keys(NIGHT_BACKDROPS)) load('bg_' + k, `assets/world/${NIGHT_BACKDROPS[k]}.webp${q}`);
  if (typeof ensureNpcRegionAssets === 'function') ensureNpcRegionAssets('monatium_b'); // guards, Elena, Amelia, Canna
}

// ----------------------------------------------------------------------------
// Stage data
// ----------------------------------------------------------------------------
const NIGHT_TOWER = { x1: 5840, x2: 6620, wall: 60, top: -800, doorTop: -330, doorSill: -110, rightWallBottom: 470 };

function buildNightStage() {
  const s = makeWorldStage({
    id: 'world2_night',
    stageCode: NIGHT_STAGE_CODE,
    name: '모나티엄의 야경',
    subtitle: '시저와 리온을 쫓아 밤의 모나티엄을 가로질러 시청 앞 광장까지',
    worldWidth: NIGHT_END,
    minCamY: -900,
    maxCamY: 260,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'NM-B0', x: 130, feetY: 496 } },
    segments: [{ start: 0, end: NIGHT_END, bg: 'night' }],
    backgroundRanges: {},
    goal: { id: 'night-plaza', exitRoute: 'default', x: 16330, y: 580, w: 60, h: 120, hidden: true }
  });
  s.worldId = NIGHT_WORLD_ID;
  s.night = true;
  s.musicTrack = 5; // assets/event/monatium.mp3 (24. Monatium)
  s.startFlag = { x: 70, y: 496 };
  s.customBackground = drawNightBackground;
  s.onLoad = () => loadNightAssets();
  s.onReset = () => resetNightRuntime();

  const bld = (id, x, w, y, extra = {}) => wFloor(s, x, w, 'steel', y, { id, h: 1250 - y, nightDraw: 'building', ...extra });
  const ledge = (id, x, y, w, extra = {}) => wSurface(s, x, y, w, 'steel', { id, nightDraw: 'ledge', ...extra });
  const mover = (id, x, y, w, range, period, phase) => wSurface(s, x, y, w, 'steel', {
    id, nightDraw: 'ledge', behavior: 'moving', motion: { axis: 'x', range, period, phase }
  });

  // Section 1 — start flag, lead runners, low warm-up platforms (sketch x 0..300)
  bld('NM-B0', 0, 300, 496);
  wCheckpoint(s, '출발 깃발', 130, 496);
  bld('NM-B1', 380, 320, 559);
  ledge('NM-P1', 780, 580, 140);
  ledge('NM-P2', 990, 475, 160);
  bld('NM-B2', 1200, 280, 335);
  // Section 3 — switchback climb to the peak roof; the last hop is a dash-then-jump (sketch x 190..305)
  ledge('NM-Q1', 1560, 300, 160);
  ledge('NM-Q2', 1800, 150, 130);
  ledge('NM-Q3', 1560, 10, 160);
  ledge('NM-Q4', 1800, -170, 130);
  bld('NM-B3', 2290, 280, -230);
  // Section 2/4 — drop to the street, stepping stones under the first drone (sketch x 340..600)
  ledge('NM-R1', 2740, 356, 250);
  bld('NM-B4', 3140, 340, 356);
  wCheckpoint(s, '도심 진입', 3360, 356);
  [3620, 3800, 3980, 4160, 4340, 4520].forEach((x, i) => ledge(`NM-DOT${i + 1}`, x, 335, 72, { small: true }));
  bld('NM-B5', 4700, 240, 300);
  bld('NM-B6', 5020, 260, 146);
  ledge('NM-S1', 5350, 66, 120);
  ledge('NM-S2', 5540, -22, 140);
  // Section 5 — the central tower. Entered through the upper-left doorway, left through the bottom-right gap
  // on the long moving platform. Same world, same camera: no scene change.
  ledge('NM-T-SILL', 5740, NIGHT_TOWER.doorSill, 300, { towerSill: true });
  wCheckpoint(s, '타워 입구', 5990, NIGHT_TOWER.doorSill);
  s.sections[s.sections.length - 1].hiddenFlag = true; // quiet safety checkpoint; the sketch has no flag here
  const T = NIGHT_TOWER;
  wWall(s, T.x1, T.top, T.wall, T.doorTop - T.top, 'steel', { id: 'NM-T-WALL-L-TOP', noTopLand: true, nightDraw: 'none' });
  wWall(s, T.x1, T.doorSill + 20, T.wall, 1250 - (T.doorSill + 20), 'steel', { id: 'NM-T-WALL-L-BOT', noTopLand: true, nightDraw: 'none' });
  wWall(s, T.x2 - T.wall, T.top, T.wall, T.rightWallBottom - T.top, 'steel', { id: 'NM-T-WALL-R', noTopLand: true, nightDraw: 'none' });
  wWall(s, T.x1, T.top - 40, T.x2 - T.x1, 40, 'steel', { id: 'NM-T-ROOF', noTopLand: true, nightDraw: 'none' });
  mover('NM-T-M1', 6080, 20, 150, 140, 4.2, 0.0);
  mover('NM-T-M2', 6200, 202, 150, 160, 4.6, 1.9);
  mover('NM-T-M3', 6100, 391, 150, 160, 4.0, 3.6);
  mover('NM-T-M4', 6530, 650, 160, 470, 7.0, 4.71);   // the exit ferry, x 6060..7000
  // outside steps back up to street level (sketch grey boxes)
  ledge('NM-G1', 7200, 600, 100);
  ledge('NM-G2', 7360, 500, 100);
  ledge('NM-G3', 7200, 400, 100);
  ledge('NM-G4', 7360, 300, 100);
  bld('NM-B7', 7540, 300, 250);
  wCheckpoint(s, '타워 밖으로', 7620, 250);
  // Section 6 — three T-shaped decks with riot-squad patrols and drones (sketch x 917..1250)
  ledge('NM-TD1', 7920, 180, 800, { nightDraw: 'tdeck', poleX: 8250 });
  ledge('NM-TD2', 8640, 420, 880, { nightDraw: 'tdeck', poleX: 9060 });
  ledge('NM-TD3', 9500, 190, 1000, { nightDraw: 'tdeck', poleX: 9970 });
  bld('NM-B8', 10650, 300, 190);
  wCheckpoint(s, '고가 끝', 10760, 190);
  // Section 7 — brown anti-jump shutters over fall gaps (v1.5.2). Each shutter fills the whole gap between two decks
  // and hangs with its lower edge 44px above the near deck: Dudu (60px standing) bumps into it, it is far too tall to
  // jump over, and below it is a pit. A dash (32px) slips under, and a dash that ends half under a shutter is carried
  // through until Dudu is clear (game.js), which puts her straight onto the next deck.
  // W2 and W5 lead to a higher deck, so the dash must be followed by a jump; W3 drops to a lower deck.
  const shutter = (id, x, deckY) => wWall(s, x, deckY - 480, 76, 480 - 44, 'wood', { id, noTopLand: true, dashUnder: true, nightDraw: 'brown' });
  ledge('NM-P71', 11080, 175, 320);
  shutter('NM-W1', 11400, 175);
  ledge('NM-P72', 11476, 175, 300);
  shutter('NM-W2', 11776, 175);
  ledge('NM-P73', 11852, 95, 260);
  shutter('NM-W3', 12112, 95);
  ledge('NM-P74', 12188, 300, 300);
  shutter('NM-W4', 12488, 300);
  ledge('NM-P75', 12564, 300, 300);
  shutter('NM-W5', 12864, 300);
  ledge('NM-P76', 12940, 223, 380);
  bld('NM-B9', 13440, 300, 40);
  wCheckpoint(s, '시청 가는 길', 13540, 40);
  // Section 8 — stairs down to the city hall plaza (safe zone, last ~1.1 screens)
  ledge('NM-E1', 13860, 130, 120);
  ledge('NM-E2', 14080, 200, 120);
  ledge('NM-E3', 14310, 280, 120);
  ledge('NM-E4', 14550, 390, 120);
  ledge('NM-E5', 14790, 490, 120);
  wFloor(s, 15000, NIGHT_END - 15000, 'steel', 580, { id: 'NM-PLAZA', h: 670, nightDraw: 'plaza' });

  // Red squares on the sketch: where each drone stops after rising from below.
  s.nightDrones = [
    { id: 'NM-D1', x: 1250, y: 150 },
    { id: 'NM-D2', x: 2480, y: -400 },
    { id: 'NM-D3', x: 4000, y: 100 },
    { id: 'NM-D4', x: 8420, y: -30 },
    { id: 'NM-D5', x: 9060, y: 205 },
    { id: 'NM-D6', x: 9840, y: -60 },
    { id: 'NM-D7', x: 10200, y: -60 },
    { id: 'NM-D8', x: 12700, y: -230 },
    { id: 'NM-D9', x: 11990, y: -140 },   // v1.5.2: second drone over the middle of the shutter run
    { id: 'NM-D10', x: 14030, y: -40 },   // v1.5.2: one drone per two stairs down to the plaza
    { id: 'NM-D11', x: 14490, y: 150 },
    { id: 'NM-D12', x: 14850, y: 280 }
  ];
  // Red ellipses: one riot-squad member per deck; the black line is the patrol span.
  s.nightPatrols = [
    { id: 'NM-RS1', platformId: 'NM-TD1', side: 'left',  x1: 7980, x2: 8660 },
    { id: 'NM-RS2', platformId: 'NM-TD2', side: 'right', x1: 8700, x2: 9460 },
    { id: 'NM-RS3', platformId: 'NM-TD3', side: 'left',  x1: 9560, x2: 10440 }
  ];
  // Red vertical line inside the tower.
  s.nightFields = [{ id: 'NM-FIELD', x: 6480, y1: -600, y2: 420 }];
  // Green circles: the friendly plaza, in this exact order.
  s.nightNpcs = [
    { id: 'NM-NPC-LION',   kind: 'lion',   name: '리온',   x: 15420, idle: 'lion_idle',   nearClip: 'lion_happy', dialogue: '시저가 또 난리를 치다니... 빨리 붙잡아 다행이에요!', color: '#fff3e6' },
    { id: 'NM-NPC-SCIZOR', kind: 'scizor', name: '시저',   x: 15620, idle: 'scizor_idle', nearClip: 'scizor_sad', dialogue: '히끅... 빌... 빌런은 반드시 다시 돌아온다!', color: '#eef8e8' },
    { id: 'NM-NPC-ELENA',  kind: 'elena',  name: '엘레나', x: 15820, idle: 'elena_idle',  nearClip: 'elena_idle', dialogue: '바빠 죽겠는데 뭔 빌런이야 어휴!', color: '#eef6ff' },
    { id: 'NM-NPC-AMELIA', kind: 'amelia', name: '아멜리아', x: 16010, idle: 'amelia_idle', nearClip: 'amelia_idle', dialogue: '언젠가 외래종 교도소를 한번 손 봐야겠군요', color: '#fff5eb' },
    { id: 'NM-NPC-CANNA',  kind: 'canna',  name: '칸나',   x: 16200, idle: 'canna_idle',  nearClip: 'canna_idle', dialogue: '역시 스핑크스! 이번에도 협조해 주셔서 감사합니다!', color: '#f3f9ee' }
  ];
  return s;
}

if (typeof world1Stages !== 'undefined' && !world1Stages.some(st => st.worldId === NIGHT_WORLD_ID)) {
  world1Stages.push(buildNightStage());
}
const NIGHT_STAGE_INDEX = world1Stages.findIndex(st => st.worldId === NIGHT_WORLD_ID);
window.NIGHT_STAGE_INDEX = NIGHT_STAGE_INDEX;

function nightStage() { return world1Stages[NIGHT_STAGE_INDEX]; }
function isNightActive() {
  return typeof gameMode !== 'undefined' && gameMode === 'world' && activeWorldStageIndex === NIGHT_STAGE_INDEX;
}
window.isNightActive = isNightActive;

// ----------------------------------------------------------------------------
// Runtime state
// ----------------------------------------------------------------------------
const night = {
  runners: [],
  drones: [],
  darts: [],
  npcs: [],
  clock: 0,
  fieldPhase: 0
};
window.__night = night;
window.__duduIntroLock = 0;

function nightRand(seed) { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }

function resetNightRuntime() {
  const s = nightStage();
  night.clock = 0;
  night.darts.length = 0;
  // Lead runners only replay from the start flag; a later checkpoint never shows them again.
  night.runners.length = 0;
  if (checkpoint === 0) {
    // Scizor flees first, Lion chases a step behind.
    night.runners.push(makeRunner('scizor', 262, 0.0, 70), makeRunner('lion', 196, 0.22, 0));
    window.__duduIntroLock = NIGHT_INTRO_HOLD;
    p.face = 1;
  } else {
    window.__duduIntroLock = 0;
  }
  night.drones = s.nightDrones.map(d => ({
    id: d.id, tx: d.x, ty: d.y, x: d.x, y: d.y + 560, prevX: d.x, prevY: d.y + 560,
    state: 'wait', t: 0, clip: 'drone_move', anim: 0, face: -1, fired: false, cooldown: 0, alpha: 1
  }));
  night.npcs = s.nightNpcs.map(n => ({ ...n, feetY: 580, near: false, anim: 0, face: -1, clip: n.idle }));
  // Riot squad: one member per ellipse; type, start offset and first delay vary per run inside fixed limits.
  actors = s.nightPatrols.map((z, i) => {
    const r1 = Math.random(), r2 = Math.random(), r3 = Math.random();
    const kind = r1 < 0.5 ? 'guard1' : 'guard2';
    const homeX = z.side === 'left' ? z.x1 + Math.round(r2 * 60) : z.x2 - Math.round(r2 * 60);
    return actor(kind, homeX, 580, {
      platformId: z.platformId, patrolX1: z.x1, patrolX2: z.x2,
      patrolDir: z.side === 'left' ? 1 : -1, fullSpanPatrol: true, delay: Math.round(r3 * 70) / 100,
      nightPatrol: z.id
    });
  });
}
window.resetNightRuntime = resetNightRuntime;

// ----------------------------------------------------------------------------
// Lead runners: scripted hops over the first roofs, then a long leap out of the top of the screen.
// They never touch Dudu.
// ----------------------------------------------------------------------------
const RUNNER_ROUTE = ['NM-B0', 'NM-B1', 'NM-P1', 'NM-P2', 'NM-B2'];
function makeRunner(kind, x, delay, lead) {
  return { kind, x, y: 496, prevX: x, prevY: 496, vy: 0, leg: 0, air: null, delay, lead, anim: Math.random(), gone: false, alpha: 1 };
}
function runnerPlatform(id) { return platforms.find(a => a.id === id); }
function updateRunner(r, dt) {
  if (r.gone) return;
  r.prevX = r.x; r.prevY = r.y;
  if (r.delay > 0) { r.delay -= dt; return; }
  r.anim += dt;
  if (r.air) {
    const a = r.air;
    a.t += dt;
    const u = Math.min(1, a.t / a.dur);
    r.x = a.x0 + (a.x1 - a.x0) * u;
    r.y = a.y0 + a.vy0 * a.t + 0.5 * a.g * a.t * a.t;
    if (u >= 1) {
      r.y = a.y1; r.air = null;
      if (a.final) r.gone = true;
    }
    return;
  }
  r.x += NIGHT_RUNNER_SPEED * dt;
  const cur = runnerPlatform(RUNNER_ROUTE[r.leg]);
  if (!cur) { r.gone = true; return; }
  r.y = cur.y;
  const edge = cur.x + cur.w - 14;
  if (r.x >= edge) {
    const next = runnerPlatform(RUNNER_ROUTE[r.leg + 1]);
    if (next) {
      const x1 = next.x + 30 + r.lead;
      startRunnerArc(r, x1, next.y, false);
      r.leg++;
    } else {
      // last roof: leap high and to the right, out of the top of the frame
      startRunnerArc(r, r.x + 900, cur.y - 1100, true);
    }
  }
}
function startRunnerArc(r, x1, y1, final) {
  const dist = Math.max(40, x1 - r.x);
  const dur = final ? 1.25 : Math.max(0.36, dist / NIGHT_RUNNER_SPEED);
  const g = 2300;
  const vy0 = (y1 - r.y - 0.5 * g * dur * dur) / dur;
  r.air = { x0: r.x, y0: r.y, x1, y1, dur, t: 0, g, vy0, final };
}

// ----------------------------------------------------------------------------
// Drones: wait below -> rise -> hover at the red square -> aim and fire wind darts -> destroyed / idle.
// Landing on a drone from above knocks it out (the Die motion); touching it any other way is a hit.
// ----------------------------------------------------------------------------
// v1.5.1: attack cycle and dart speed both 1.5x (cycle 2.49s -> 1.66s, dart 400 -> 600 px/s)
const DRONE = { trigger: 520, riseDur: 1.3, halfW: 46, halfH: 30, fireAt: 0.37, attackDur: 0.83, rest: 0.83, firstDelay: 0.37, dartSpeed: 600, sleepDist: 1500 };
function updateDrone(d, dt) {
  d.prevX = d.x; d.prevY = d.y;
  d.t += dt; d.anim += dt;
  const dx = p.x - d.tx;
  if (d.state === 'wait') {
    if (Math.abs(dx) < DRONE.trigger && Math.abs(p.y - d.ty) < 760 && p.x < NIGHT_SAFE_X) {
      d.state = 'rise'; d.t = 0; d.anim = 0; d.clip = 'drone_move';
    }
    return;
  }
  if (d.state === 'dead') {
    d.y += 70 * dt;
    d.alpha = Math.max(0, 1 - Math.max(0, d.t - 1.2) / 0.8);
    if (d.t > 2.0) d.state = 'gone';
    return;
  }
  if (d.state === 'gone' || d.state === 'sleep') return;
  if (d.state === 'rise') {
    const u = Math.min(1, d.t / DRONE.riseDur);
    const e = 1 - Math.pow(1 - u, 3);
    d.y = d.ty + 560 * (1 - e);
    if (u >= 1) { d.state = 'hover'; d.t = 0; d.clip = 'drone_idle'; d.anim = 0; d.cooldown = DRONE.firstDelay; }
  } else {
    d.y = d.ty + Math.sin(night.clock * 2.4 + d.tx) * 4;
    if (Math.abs(dx) > DRONE.sleepDist) { d.state = 'sleep'; return; }
    d.face = dx > 0 ? 1 : -1;
    if (d.state === 'hover') {
      d.cooldown -= dt;
      const inRange = Math.abs(dx) < 900 && Math.abs(p.y - d.y) < 640;
      if (d.cooldown <= 0 && inRange && p.invulnerable <= 0.3 && p.x < NIGHT_SAFE_X) {
        d.state = 'attack'; d.t = 0; d.anim = 0; d.clip = 'drone_attack'; d.fired = false;
      }
    } else if (d.state === 'attack') {
      if (!d.fired && d.t >= DRONE.fireAt) { d.fired = true; fireDroneDart(d); }
      if (d.t >= DRONE.attackDur) { d.state = 'hover'; d.t = 0; d.clip = 'drone_idle'; d.anim = 0; d.cooldown = DRONE.rest; }
    }
  }
  // body contact and stomp
  const pTop = p.y - 58, pBot = p.y;
  if (p.x + 16 > d.x - DRONE.halfW && p.x - 16 < d.x + DRONE.halfW && pBot > d.y - DRONE.halfH && pTop < d.y + DRONE.halfH) {
    const fromAbove = p.vy > 60 && (p.prevY ?? p.y) <= d.y - DRONE.halfH + 10;
    if (fromAbove) {
      d.state = 'dead'; d.t = 0; d.anim = 0; d.clip = 'drone_die';
      p.vy = -560; p.ground = false; p.on = null; p.jumps = 1; p.airDashUsed = false;
      burst(d.x, d.y - 10, '#9be7ff', 14);
      tone(520, 0.12, 'triangle', 0.05);
    } else if (p.invulnerable <= 0) {
      applyStunHit(d.x, 'night_drone');
    }
  }
}
function fireDroneDart(d) {
  const mx = d.x + d.face * 26, my = d.y + 22;
  const tx = p.x, ty = p.y - 32;
  const ang = Math.atan2(ty - my, tx - mx);
  night.darts.push({ x: mx, y: my, prevX: mx, prevY: my, vx: Math.cos(ang) * DRONE.dartSpeed, vy: Math.sin(ang) * DRONE.dartSpeed, age: 0, maxAge: 3.2, radius: 10, hit: false });
  tone(700, 0.08, 'square', 0.02);
}
function updateNightDarts(dt) {
  const pcx = p.x, pcy = p.y - 30;
  for (const wd of night.darts) {
    if (wd.hit) continue;
    wd.prevX = wd.x; wd.prevY = wd.y;
    wd.age += dt; wd.x += wd.vx * dt; wd.y += wd.vy * dt;
    if (distPointToSegment(pcx, pcy, wd.prevX, wd.prevY, wd.x, wd.y) < wd.radius + 18) {
      wd.hit = true;
      applyStunHit(wd.prevX, 'mayo_wind');
      continue;
    }
    for (const pl of platforms) {
      if (pl.collidable === false || pl.thin || pl.dashUnder) continue; /* v1.5.2: darts fly through the brown shutters */
      if (pl.x > Math.max(wd.x, wd.prevX) || pl.x + pl.w < Math.min(wd.x, wd.prevX)) continue;
      const h = segmentIntersectsBox(wd.prevX, wd.prevY, wd.x, wd.y, pl.x, pl.y, pl.x + pl.w, pl.y + pl.h);
      if (h.hit) { wd.hit = true; burst(h.x, h.y, '#b8f7e8', 5); break; }
    }
  }
  let n = 0;
  for (const wd of night.darts) if (!wd.hit && wd.age < wd.maxAge) night.darts[n++] = wd;
  night.darts.length = n;
}

// Electric field: the visible bolt and the hit box share one rectangle (x +-7).
function updateNightFields() {
  if (p.invulnerable > 0) return;
  for (const f of nightStage().nightFields) {
    if (p.x + 16 > f.x - 7 && p.x - 16 < f.x + 7 && p.y > f.y1 && p.y - 58 < f.y2) {
      applyStunHit(f.x, 'night_field');
      return;
    }
  }
}

function updateNightNpcs(dt) {
  for (const n of night.npcs) {
    const close = Math.abs(p.x - n.x) <= 165 && Math.abs(p.y - n.feetY) <= 120;
    if (close !== n.near) { n.near = close; n.anim = 0; }
    else n.anim += dt;
    n.clip = close ? n.nearClip : n.idle;
    if (close && Math.abs(p.x - n.x) > 12) n.face = p.x < n.x ? -1 : 1;
    else if (!close) n.face = -1;
  }
}

// Called from updateHazards() world branch, once per 120Hz physics step.
function updateNightMonatium(dt) {
  if (!isNightActive()) return;
  night.clock += dt;
  if (window.__duduIntroLock > 0) window.__duduIntroLock = Math.max(0, window.__duduIntroLock - dt);
  for (const r of night.runners) updateRunner(r, dt);
  updateNightFields();
  for (const d of night.drones) updateDrone(d, dt);
  updateNightDarts(dt);
  for (const a of actors) {
    a.prevX = a.x; a.prevY = a.y;
    updateWalker(a, dt);
    const instSpeed = Math.abs(a.x - a.prevX) / Math.max(dt, 0.001);
    a.anim += dt * (a.clip === 'move' ? Math.max(0.45, Math.min(1.65, instSpeed / 140)) : 1);
    a.blend = Math.min(1, a.blend + dt / 0.10);
  }
  updateNightNpcs(dt);
}
window.updateNightMonatium = updateNightMonatium;

// ----------------------------------------------------------------------------
// Drawing helpers
// ----------------------------------------------------------------------------
function drawNightSprite(key, t, x, y, face, alpha = 1, loop = true) {
  const m = NIGHT_SPRITES[key], im = nightImages[key];
  if (!m || !im) return false;
  let f = Math.floor(t * m.fps);
  f = loop ? f % m.frames : Math.min(m.frames - 1, f);
  const size = m.display;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-(face || -1), 1);
  ctx.drawImage(im, (f % 8) * 256, Math.floor(f / 8) * 256, 256, 256,
    -m.anchor / 256 * size, -m.foot / 256 * size, size, size);
  ctx.restore();
  return true;
}
function drawStoryNpcSprite(key, t, x, y, face) {
  const m = npcMeta[key], im = npcImages[key];
  if (!m || !im) return;
  const f = Math.floor(t * m.fps) % m.frames, size = m.display || 150;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-(face || -1), 1);
  ctx.drawImage(im, (f % m.cols) * 256, Math.floor(f / m.cols) * 256, 256, 256, -m.anchor / 256 * size, -m.foot / 256 * size, size, size);
  ctx.restore();
}

let _nightPatterns = null;
function nightPatterns() {
  if (_nightPatterns) return _nightPatterns;
  const mk = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return ctx.createPattern(c, 'repeat'); };
  const windows = (warm) => (g, w, h) => {
    g.fillStyle = warm ? '#1b2440' : '#18213a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,150,210,0.10)'; for (let x = 0; x < w; x += 48) g.fillRect(x, 0, 2, h);
    for (let j = 0; j < h / 46; j++) for (let i = 0; i < w / 48; i++) {
      const r = nightRand(i * 31 + j * 7 + (warm ? 3 : 11));
      const lit = r > 0.52;
      g.fillStyle = lit ? (r > 0.86 ? 'rgba(140,240,220,0.85)' : (warm ? 'rgba(255,214,120,0.88)' : 'rgba(255,232,160,0.75)')) : 'rgba(60,78,120,0.55)';
      g.fillRect(i * 48 + 14, j * 46 + 12, 20, 22);
    }
  };
  _nightPatterns = {
    warm: mk(240, 230, windows(true)),
    cool: mk(240, 230, windows(false)),
    tower: mk(120, 120, (g, w, h) => {
      g.fillStyle = '#131a2e'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(110,140,200,0.18)'; g.lineWidth = 2; g.strokeRect(4, 4, w - 8, h - 8);
      g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, h - 4); g.moveTo(w - 4, 4); g.lineTo(4, h - 4); g.stroke();
      g.fillStyle = 'rgba(120,160,220,0.25)'; for (const [x, y] of [[8, 8], [w - 12, 8], [8, h - 12], [w - 12, h - 12]]) g.fillRect(x, y, 4, 4);
    }),
    paving: mk(160, 40, (g, w, h) => {
      // wide flat slabs like the plaza in the city hall painting
      g.fillStyle = '#56627f'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, w, 3);
      g.strokeStyle = 'rgba(28,34,56,0.45)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, 0.75); g.lineTo(w, 0.75); g.moveTo(0, 20.75); g.lineTo(w, 20.75);
      g.moveTo(0.75, 0); g.lineTo(0.75, 20); g.moveTo(80.75, 0); g.lineTo(80.75, 20);
      g.moveTo(40.75, 20); g.lineTo(40.75, 40); g.moveTo(120.75, 20); g.lineTo(120.75, 40); g.stroke();
    })
  };
  return _nightPatterns;
}

function viewBounds() {
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  return { x1: rCam, x2: rCam + W / zoom, y1: rCamY, y2: rCamY + H / zoom };
}

// Static pieces (facades, plaza, tower interior, backdrops) are painted once into offscreen canvases and
// blitted afterwards: the same lesson as the v1.4.2 Monatium B shaft strips. Canvases far from the camera
// are released so memory stays bounded on phones.
const _nightCache = new Map(); // key -> { canvas, x }
function nightCached(key, w, h, worldX, paint) {
  let e = _nightCache.get(key);
  if (!e) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    paint(c.getContext('2d'), c.width, c.height);
    e = { canvas: c, x: worldX };
    _nightCache.set(key, e);
  }
  return e.canvas;
}
function pruneNightCache() {
  const cx = rCam + W * 0.5;
  for (const [key, e] of _nightCache) {
    if (e.x === null || Math.abs(e.x - cx) < 4200) continue;
    e.canvas.width = 0; e.canvas.height = 0;
    _nightCache.delete(key);
  }
}
const NIGHT_FACADE_H = 760; // tallest building slice ever on screen (view is 720px)

// Building roofs (the tall columns of the sketch): window-grid facade, lit parapet, red aviation lamps.
function drawNightBuilding(a, x, y) {
  const v = viewBounds();
  const bottom = Math.min(y + a.h, v.y2 + 10);
  if (bottom <= y) return;
  const warm = (Math.round(a.x / 10) % 2) === 0;
  const fh = Math.min(a.h, NIGHT_FACADE_H);
  const facade = nightCached('bld:' + a.id, a.w + 8, fh, a.x + a.w / 2, (g, cw, ch) => {
    g.translate(4, 0);
    g.fillStyle = warm ? nightPatterns().warm : nightPatterns().cool;
    g.fillRect(0, 10, a.w, ch - 10);
    const shade = g.createLinearGradient(0, 0, a.w, 0);
    shade.addColorStop(0, 'rgba(10,14,28,0.35)'); shade.addColorStop(0.15, 'rgba(10,14,28,0)');
    shade.addColorStop(0.85, 'rgba(10,14,28,0)'); shade.addColorStop(1, 'rgba(10,14,28,0.45)');
    g.fillStyle = shade; g.fillRect(0, 10, a.w, ch - 10);
    g.fillStyle = '#2b3554'; g.fillRect(-4, 0, a.w + 8, 14);
    g.fillStyle = 'rgba(159,196,255,0.75)'; g.fillRect(-4, 0, a.w + 8, 3);
    g.fillStyle = '#5d6c94'; g.fillRect(-4, 12, a.w + 8, 2);
  });
  const top = Math.max(y, Math.floor(v.y1) - 2);
  const sliceTop = top - y, sliceH = Math.min(fh, bottom - y) - sliceTop;
  if (sliceH > 0) ctx.drawImage(facade, 0, sliceTop, facade.width, sliceH, x - 4, top, facade.width, sliceH);
  if (bottom > y + fh) { ctx.fillStyle = '#141b30'; ctx.fillRect(x, y + fh, a.w, bottom - (y + fh)); }
  if (a.y < 420) {
    const blink = 0.55 + 0.45 * Math.sin(time * 2.2 + a.x);
    for (const lx of [x + 10, x + a.w - 10]) {
      line(lx, y, lx, y - 22, '#55607a', 3);
      ellipse(lx, y - 24, 9, 9, `rgba(255,70,80,${0.18 * blink})`);
      ellipse(lx, y - 24, 3.5, 3.5, `rgba(255,90,96,${0.6 + 0.4 * blink})`);
    }
  }
}

// Steel catwalk ledges: dark plate, cool edge light, small truss underneath. Moving ones carry amber lamps.
function drawNightLedge(a, x, y) {
  ctx.save();
  if (a.nightDraw === 'tdeck' && typeof a.poleX === 'number') {
    const v = viewBounds();
    const px = Math.round(a.poleX - a.x + x);
    ctx.fillStyle = '#28324d'; ctx.fillRect(px - 16, y + 18, 32, Math.max(0, v.y2 - y));
    ctx.fillStyle = 'rgba(150,180,240,0.22)'; ctx.fillRect(px - 16, y + 18, 4, Math.max(0, v.y2 - y));
    ctx.strokeStyle = '#3a4668'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px - 120, y + 18); ctx.lineTo(px - 14, y + 120); ctx.moveTo(px + 120, y + 18); ctx.lineTo(px + 14, y + 120); ctx.stroke();
  }
  const h = 16;
  ctx.fillStyle = '#2e3858'; ctx.beginPath(); ctx.roundRect(x, y, a.w, h, 4); ctx.fill();
  ctx.fillStyle = '#4b5a86'; ctx.fillRect(x + 2, y + 2, a.w - 4, 4);
  ctx.fillStyle = 'rgba(160,215,255,0.85)'; ctx.fillRect(x + 3, y, a.w - 6, 2);
  if (!a.small) {
    ctx.strokeStyle = 'rgba(70,86,128,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 10; i < a.w - 10; i += 28) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 14, y + h + 10); ctx.lineTo(x + i + 28, y + h); }
    ctx.stroke();
  }
  if (a.motion) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5 + a.baseX);
    for (const lx of [x + 10, x + a.w - 10]) ellipse(lx, y + 9, 3.5, 3.5, `rgba(255,190,90,${0.55 + 0.45 * pulse})`);
  }
  ctx.restore();
}

// Brown anti-jump wall: painted steel shutter hanging on two cables.
function drawNightBrownWall(a, x, y) {
  ctx.save();
  line(x + 6, y - 400, x + 6, y, '#3a3f52', 2);
  line(x + a.w - 6, y - 400, x + a.w - 6, y, '#3a3f52', 2);
  const g = ctx.createLinearGradient(x, 0, x + a.w, 0);
  g.addColorStop(0, '#7a4f33'); g.addColorStop(0.5, '#a8744c'); g.addColorStop(1, '#6e4630');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, a.w, a.h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,14,0.55)'; ctx.lineWidth = 2;
  for (let yy = y + 26; yy < y + a.h - 10; yy += 26) { ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + a.w - 3, yy); ctx.stroke(); }
  ctx.fillStyle = '#3b2618'; ctx.fillRect(x, y + a.h - 8, a.w, 8);
  ctx.fillStyle = 'rgba(255,214,150,0.35)'; ctx.fillRect(x + 2, y + 2, 3, a.h - 12);
  ctx.restore();
}

// Short see-through grate joining two decks under a shutter.
function drawNightGrate(a, x, y) {
  ctx.save();
  ctx.fillStyle = '#26304c'; ctx.fillRect(x, y, a.w, 10);
  ctx.fillStyle = 'rgba(160,215,255,0.7)'; ctx.fillRect(x, y, a.w, 2);
  ctx.fillStyle = 'rgba(10,14,28,0.8)';
  for (let i = 6; i < a.w - 6; i += 12) ctx.fillRect(x + i, y + 3, 6, 5);
  ctx.restore();
}

function drawNightPlaza(a, x, y) {
  const v = viewBounds();
  const x1 = Math.max(x, v.x1 - 20), x2 = Math.min(x + a.w, v.x2 + 20);
  if (x2 <= x1) return;
  const h = Math.min(a.h, v.y2 - y + 10);
  const band = 260;
  const slab = nightPlazaSlab(a, band);
  const sh = Math.min(band, h);
  if (sh > 0) ctx.drawImage(slab, x1 - x, 0, x2 - x1, sh, x1, y, x2 - x1, sh);
  if (h > band) { ctx.fillStyle = '#1a2038'; ctx.fillRect(x1, y + band, x2 - x1, h - band); }
}
function nightPlazaSlab(a, band = 260) {
  return nightCached('plaza', a.w, band, null, (g, cw, ch) => {
    g.fillStyle = nightPatterns().paving; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#7d89a8'; g.fillRect(0, 0, cw, 6);
    g.fillStyle = 'rgba(255,214,140,0.45)'; g.fillRect(0, 0, cw, 2);
    const fade = g.createLinearGradient(0, 6, 0, ch);
    fade.addColorStop(0, 'rgba(14,18,36,0.05)'); fade.addColorStop(1, 'rgba(14,18,36,0.7)');
    g.fillStyle = fade; g.fillRect(0, 6, cw, ch - 6);
    g.fillStyle = '#2b3554'; g.fillRect(0, 0, 6, ch);
  });
}

function drawNightPlatform(a, x, y) {
  switch (a.nightDraw) {
    case 'building': drawNightBuilding(a, x, y); break;
    case 'brown': drawNightBrownWall(a, x, y); break;
    case 'plaza': drawNightPlaza(a, x, y); break;
    case 'grate': drawNightGrate(a, x, y); break;
    case 'none': break;
    default: drawNightLedge(a, x, y);
  }
}
window.drawNightPlatform = drawNightPlatform;

// World-space pass behind the platforms: the tower body and its interior.
function drawNightMonatiumBack() {
  if (!isNightActive()) return;
  const v = viewBounds();
  const T = NIGHT_TOWER;
  if (v.x2 < T.x1 - 40 || v.x1 > T.x2 + 40) return;
  const top = T.top - 40, bot = Math.min(1250, v.y2 + 10);
  ctx.save();
  // interior back wall, composited once per 480px strip
  const ix = T.x1 + T.wall, iw = T.x2 - T.x1 - 2 * T.wall, STRIP = 480;
  const r0 = Math.max(0, Math.floor((v.y1 - top) / STRIP)), r1 = Math.floor((Math.min(bot, v.y2) - top) / STRIP);
  for (let r = r0; r <= r1; r++) {
    const sy = top + r * STRIP, shh = Math.min(STRIP, 1250 - sy);
    if (shh <= 0) break;
    const strip = nightCached('tower:' + r, iw, shh, T.x1, (g, cw, ch) => {
      g.translate(0, -((r * STRIP) % 120)); g.fillStyle = nightPatterns().tower; g.fillRect(0, 0, cw, ch + 120);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const glow = g.createLinearGradient(0, 0, cw, 0);
      glow.addColorStop(0, 'rgba(255,200,120,0.10)'); glow.addColorStop(0.5, 'rgba(255,200,120,0)'); glow.addColorStop(1, 'rgba(255,60,80,0.10)');
      g.fillStyle = glow; g.fillRect(0, 0, cw, ch);
    });
    ctx.drawImage(strip, ix, sy);
  }
  // warm ceiling lamps inside
  for (let yy = -620; yy < 600; yy += 210) {
    ellipse(T.x1 + 160, yy, 46, 10, 'rgba(255,214,140,0.10)');
    ellipse(T.x1 + 160, yy, 14, 4, 'rgba(255,226,170,0.75)');
  }
  // outer walls and roof
  const wallFill = (x, y, w, h) => {
    const y1 = Math.max(y, v.y1 - 10), y2 = Math.min(y + h, v.y2 + 10);
    if (y2 <= y1) return;
    ctx.fillStyle = '#2a3453'; ctx.fillRect(x, y1, w, y2 - y1);
    ctx.fillStyle = '#39466a'; ctx.fillRect(x, y1, 14, y2 - y1);
    ctx.fillStyle = '#1d253d'; ctx.fillRect(x + w - 14, y1, 14, y2 - y1);
    ctx.fillStyle = 'rgba(160,200,255,0.35)'; ctx.fillRect(x, y1, 2, y2 - y1);
  };
  wallFill(T.x1, top, T.wall, T.doorTop - top);
  wallFill(T.x1, T.doorSill + 20, T.wall, bot - (T.doorSill + 20));
  wallFill(T.x2 - T.wall, top, T.wall, T.rightWallBottom - top);
  ctx.fillStyle = '#222b45'; ctx.fillRect(T.x1 - 20, top - 30, T.x2 - T.x1 + 40, 40);
  ctx.fillStyle = 'rgba(160,200,255,0.6)'; ctx.fillRect(T.x1 - 20, top - 30, T.x2 - T.x1 + 40, 3);
  // doorway frame and exit gap trim
  ctx.fillStyle = 'rgba(255,214,140,0.85)';
  ctx.fillRect(T.x1 - 4, T.doorTop - 6, T.wall + 8, 6);
  ctx.fillRect(T.x2 - T.wall - 4, T.rightWallBottom, T.wall + 8, 6);
  // field emitters live on the tower, so they are drawn here; the bolt itself is drawn in front
  for (const f of nightStage().nightFields) {
    ctx.fillStyle = '#4a2030'; ctx.fillRect(f.x - 14, f.y1 - 18, 28, 18); ctx.fillRect(f.x - 14, f.y2, 28, 18);
  }
  ctx.restore();
}
window.drawNightMonatiumBack = drawNightMonatiumBack;

function drawNightField(f) {
  const v = viewBounds();
  if (f.x < v.x1 - 40 || f.x > v.x2 + 40) return;
  const y1 = Math.max(f.y1, v.y1 - 20), y2 = Math.min(f.y2, v.y2 + 20);
  if (y2 <= y1) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,60,90,0.16)'; ctx.fillRect(f.x - 16, y1, 32, y2 - y1);
  ctx.fillStyle = 'rgba(255,80,110,0.45)'; ctx.fillRect(f.x - 7, y1, 14, y2 - y1);
  ctx.strokeStyle = '#ffd6de'; ctx.lineWidth = 2.5; ctx.beginPath();
  const seed = Math.floor(time * 18);
  ctx.moveTo(f.x, y1);
  for (let yy = y1; yy < y2; yy += 18) ctx.lineTo(f.x + (nightRand(seed + yy) - 0.5) * 11, yy);
  ctx.lineTo(f.x, y2);
  ctx.stroke();
  ctx.restore();
}

function drawNightMonatiumFront() {
  if (!isNightActive()) return;
  const v = viewBounds();
  for (const f of nightStage().nightFields) drawNightField(f);
  // riot squad (existing guard walkers and their warning cue)
  if (typeof drawActors === 'function') drawActors();
  // drones
  for (const d of night.drones) {
    if (d.state === 'wait' || d.state === 'gone' || d.state === 'sleep') continue;
    const dx = d.prevX + (d.x - d.prevX) * renderAlpha, dy = d.prevY + (d.y - d.prevY) * renderAlpha;
    if (dx < v.x1 - 120 || dx > v.x2 + 120 || dy < v.y1 - 120 || dy > v.y2 + 120) continue;
    if (d.state === 'attack' && !d.fired) {
      const mx = dx + d.face * 26, my = dy + 22;
      ctx.save(); ctx.globalAlpha = 0.6; ctx.setLineDash([6, 6]);
      line(mx, my, p.x, p.y - 32, '#ff6b6b', 2); ctx.restore();
    }
    const drawn = drawNightSprite(d.clip, d.anim, dx, dy, d.face, d.alpha, d.state !== 'dead');
    if (!drawn) { ellipse(dx, dy, 40, 22, '#6b7084'); ellipse(dx, dy, 8, 8, '#63e6be'); }
  }
  // darts (same look as Mayo's wind gun)
  for (const wd of night.darts) {
    const wx = wd.prevX + (wd.x - wd.prevX) * renderAlpha, wy = wd.prevY + (wd.y - wd.prevY) * renderAlpha;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(Math.atan2(wd.vy, wd.vx));
    ctx.strokeStyle = '#63e6be'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e6fcf5'; ctx.beginPath(); ctx.roundRect(-17, -4, 34, 8, 4); ctx.fill();
    ctx.restore();
  }
  // lead runners
  for (const r of night.runners) {
    if (r.gone || r.delay > 0) continue;
    const rx = r.prevX + (r.x - r.prevX) * renderAlpha, ry = r.prevY + (r.y - r.prevY) * renderAlpha;
    if (rx < v.x1 - 150 || rx > v.x2 + 150) continue;
    if (!r.air) ellipse(rx, ry + 2, 22, 4, '#0b0f1e66');
    drawNightSprite(r.kind + '_move', r.anim, rx, ry, 1);
  }
  // plaza friends
  let nearest = null;
  for (const n of night.npcs) {
    if (n.x < v.x1 - 160 || n.x > v.x2 + 160) continue;
    ellipse(n.x, n.feetY + 2, 26, 5, '#0b0f1e55');
    if (NIGHT_SPRITES[n.clip]) drawNightSprite(n.clip, n.anim, n.x, n.feetY, n.face);
    else drawStoryNpcSprite(n.clip, n.anim, n.x, n.feetY, n.face);
    if (n.near && (!nearest || Math.abs(p.x - n.x) < Math.abs(p.x - nearest.x))) nearest = n;
  }
  if (nearest && typeof drawFriendlySpeechBubble === 'function') {
    drawFriendlySpeechBubble(nearest.dialogue, nearest.x, nearest.feetY - 140, nearest.color, nearest.name);
  }
}
window.drawNightMonatiumFront = drawNightMonatiumFront;

// ----------------------------------------------------------------------------
// Backdrop: the supplied night paintings, panned slowly per zone and cross-faded. The city hall painting is
// only ever drawn once the camera centre passes NIGHT_HALL_FADE[0], i.e. on the plaza itself.
// ----------------------------------------------------------------------------
const NIGHT_BG_ZONES = [
  { key: 'street', x0: 0, x1: 5600, flip: false },
  { key: 'towers', x0: 5600, x1: 11000, flip: false },
  { key: 'street', x0: 11000, x1: NIGHT_END, flip: true }
];
const NIGHT_BG_SCALE = 1.15;
function nightBackdropCanvas(key, flip) {
  const im = nightImages['bg_' + key];
  if (!im) return null;
  const sc = Math.max(W / im.width, H / im.height) * NIGHT_BG_SCALE;
  const pw = Math.round(im.width * sc), ph = Math.round(im.height * sc);
  return nightCached(`bg:${key}:${flip ? 1 : 0}`, pw, ph, null, (g, cw, ch) => {
    g.imageSmoothingQuality = 'high';
    if (flip) { g.translate(cw, 0); g.scale(-1, 1); }
    g.drawImage(im, 0, 0, cw, ch);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // night haze toward the bottom keeps the foreground readable
    const haze = g.createLinearGradient(0, ch * 0.35, 0, ch);
    haze.addColorStop(0, 'rgba(10,14,30,0)'); haze.addColorStop(1, 'rgba(10,14,30,0.38)');
    g.fillStyle = haze; g.fillRect(0, 0, cw, ch);
  });
}
// Draws one prescaled backdrop crop (a plain 1:1 copy). Returns true when it covered the whole screen.
function drawNightBackdrop(key, flip, prog, alpha) {
  if (alpha <= 0) return false;
  const c = nightBackdropCanvas(key, flip);
  if (!c) return false;
  const l = nightStage();
  const vProg = Math.max(0, Math.min(1, (rCamY - l.minCamY) / Math.max(1, l.maxCamY - l.minCamY)));
  const sx = Math.round(prog * (c.width - W)), sy = Math.round(vProg * (c.height - H));
  if (alpha < 1) { ctx.save(); ctx.globalAlpha = alpha; }
  ctx.drawImage(c, sx, sy, W, H, 0, 0, W, H);
  if (alpha < 1) ctx.restore();
  return alpha >= 1;
}
function drawNightBackground() {
  const center = rCam + W * 0.5;
  const fadeHalf = 500;
  const hallA = center > NIGHT_HALL_FADE[0] ? Math.min(1, (center - NIGHT_HALL_FADE[0]) / (NIGHT_HALL_FADE[1] - NIGHT_HALL_FADE[0])) : 0;
  let covered = false;
  if (hallA < 1) {
    for (let i = 0; i < NIGHT_BG_ZONES.length; i++) {
      const z = NIGHT_BG_ZONES[i];
      if (center < z.x0 - fadeHalf || center > z.x1 + fadeHalf) continue;
      let a = 1;
      if (i > 0 && center < z.x0 + fadeHalf) a = Math.max(0, Math.min(1, (center - (z.x0 - fadeHalf)) / (2 * fadeHalf)));
      if (!covered && a < 1) { ctx.fillStyle = '#0d1328'; ctx.fillRect(0, 0, W, H); }
      const prog = Math.max(0, Math.min(1, (center - z.x0) / (z.x1 - z.x0)));
      if (drawNightBackdrop(z.key, z.flip, z.flip ? 1 - prog : prog, a)) covered = true;
    }
  }
  if (hallA > 0) {
    if (!covered && hallA < 1) { ctx.fillStyle = '#0d1328'; ctx.fillRect(0, 0, W, H); }
    const prog = Math.max(0, Math.min(1, (center - NIGHT_HALL_FADE[0]) / (NIGHT_END - W * 0.5 - NIGHT_HALL_FADE[0])));
    if (drawNightBackdrop('hall', false, prog, hallA)) covered = true;
  }
  if (!covered && !nightImages.bg_street) { ctx.fillStyle = '#0d1328'; ctx.fillRect(0, 0, W, H); } // still loading
  window.__nightBgDebug = { center, hall: hallA > 0 };
  // build the plaza slab while still on the stairs, so the first plaza frame does not pay for it
  if (center > 13600 && !_nightCache.has('plaza')) { const pz = platforms.find(q => q.id === 'NM-PLAZA'); if (pz) nightPlazaSlab(pz); }
  pruneNightCache();
}

// ----------------------------------------------------------------------------
// Save record, stage panel, clear panel
// ----------------------------------------------------------------------------
function nightRecord(save) {
  save = save || loadWorldMapSave();
  return save.worlds[NIGHT_WORLD_ID].stages[NIGHT_STAGE_CODE];
}

function openNightStageSelect() {
  if (typeof ensureWorldRegionAssets === 'function') ensureWorldRegionAssets('world1');
  loadNightAssets();
  worldMapScreen = 'nightStageSelect';
  const wrap = $('worldmapOverlay');
  if (!wrap) return;
  const rec = nightRecord();
  const bestTxt = rec.bestSeconds !== null ? `${rec.bestSeconds.toFixed(1)}초` : '기록 없음';
  wrap.innerHTML = `
    <div class="wmPanel" role="dialog" aria-modal="true" aria-labelledby="wmNightHeaderTitle">
      <div class="wmHeader">
        <div>
          <span class="wmEyebrow">월드 2</span>
          <h2 id="wmNightHeaderTitle">모나티엄의 야경</h2>
        </div>
        <div class="wmHeaderActions">
          <button type="button" class="wmBackBtn" onclick="openWorldMapMenu({forceDevOpen:true})">세계지도로</button>
        </div>
      </div>
      <div class="wmStageGrid">
        <div class="wmStageCard unlocked ${rec.cleared ? 'cleared' : ''}" id="wmStageCard-2-1" data-stage-code="2-1" data-unlocked="true">
          <div class="wmStageTop">
            <span class="wmStageCode">STAGE 2-1</span>
            <span class="wmStageStatus">${rec.cleared ? '✓ 클리어' : '● 진입 가능'}</span>
          </div>
          <strong class="wmStageName">시저와 리온을 쫓아서</strong>
          <p class="wmStageDesc">불 켜진 빌딩 옥상과 타워를 지나 시청 앞 광장까지 한 번에 달려요.</p>
          <div class="wmStageStats">
            <span>최고 기록: <b>${bestTxt}</b></span>
            <span>재시도 <b>${rec.retries}</b>회, 피격 <b>${rec.hits}</b>회</span>
          </div>
          <div class="wmStageBtnRow">
            <button type="button" class="wmStagePlayBtn" id="wmStageBtn-2-1" onclick="startNightStage()">스테이지 시작</button>
          </div>
        </div>
      </div>
    </div>`;
  wrap.hidden = false;
}
window.openNightStageSelect = openNightStageSelect;

function startNightStage(section = 0) {
  loadNightAssets();
  loadWorld1Stage(NIGHT_STAGE_INDEX, { section, entryRoute: 'default' });
}
window.startNightStage = startNightStage;

function completeNightStage() {
  const save = loadWorldMapSave();
  const rec = nightRecord(save);
  rec.cleared = true;
  const elapsed = Number(worldStageElapsed.toFixed(2));
  if (rec.bestSeconds === null || elapsed < rec.bestSeconds) rec.bestSeconds = elapsed;
  saveWorldMapData(save);
  if (typeof tone === 'function') tone(960, 0.22, 'triangle', 0.06);
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
  state = 'paused';
  worldMapScreen = 'nightClearModal';
  const wrap = $('worldmapOverlay');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="wmPanel wmClearPanel" role="dialog" aria-modal="true">
      <div class="wmHeader">
        <div>
          <span class="wmEyebrow">월드 2 완주</span>
          <h2>시청 앞 광장 도착!</h2>
        </div>
      </div>
      <p class="wmClearSummary">
        걸린 시간 <b>${worldStageElapsed.toFixed(1)}초</b>, 피격 <b>${worldStageHitsThisRun}회</b><br>
        시저도 붙잡혔고, 모나티엄의 밤도 무사히 지나갔어요.
      </p>
      <div class="wmClearBtnRow">
        <button type="button" class="primary" id="wmNightReplayBtn" onclick="startNightStage()">다시 달리기</button>
        <button type="button" class="secondary" id="wmReturnWorldMapBtn" onclick="openWorldMapMenu({forceDevOpen:true})">세계지도로</button>
      </div>
    </div>`;
  wrap.hidden = false;
}
window.completeNightStage = completeNightStage;

function devPracticeNight(x = null, y = null, section = 0) {
  startNightStage(section);
  if (typeof x === 'number') { p.x = p.prevX = x; }
  if (typeof y === 'number') {
    p.y = p.prevY = y;
    p.on = platforms.find(a => a.collidable !== false && !a.wall && p.x >= a.x && p.x <= a.x + a.w && Math.abs(a.y - p.y) < 10) || null;
    p.ground = Boolean(p.on);
  }
  if (typeof x === 'number') {
    window.__duduIntroLock = 0;
    night.runners.length = 0;
    const c = computeInitialCameraForPoint(p.x, p.y);
    cam = c.cam; camY = c.camY; window.camBaseY = camY;
    syncRenderCoords();
  }
}
window.devPracticeNight = devPracticeNight;
