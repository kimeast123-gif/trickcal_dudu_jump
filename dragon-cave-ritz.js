'use strict';
// ============================================================================
// v1.11.0 WORLD 5 / 5-4 「리츠의 비밀 수련」
// (package DUDU_WORLD5_STAGE54_RITZ_TRAINING_CLAUDE_261126; CLAUDE_WORLD5_STAGE54_RITZ_TRAINING_MASTER.md)
//
// A platform room full of small stone ledges in stacked columns. Ritz stands still on the floor edge below the
// middle (the sketch's red mark) and swings her great sword (Leets_Attack1_1 / Leets_Attack2_1), throwing sword
// waves at where Dudu is and where she is heading. Every two ledge columns Dudu passes going forward, the attack
// gets stronger (more waves, faster, shorter rest). Start (left), checkpoint (the high ledge in the middle), goal
// (right). The brown floor of the sketch is a drop, not ground (Ritz stands on its edge, as Jade and Opal in 5-1).
//
// Layout: the sketch (1167 x 435) at ONE scale, x = 60 + sketch x * 3, y = 580 + (sketch y - 348) * 3, as in 5-3
// (the user's rule from 5-3: keep the drawing's proportions so walls keep their height). docs/world5/RITZ_MAP4_COORDS.csv
// Art: ledges and walls reuse the 5-3 stone parts (candidate art, not approved for 5-4); the sword waves are drawn
// in code (the package has no art for them). Music: 21. Dragon Cave (Water) (user, track 13).
// v1.11.1 (user): Ritz's line first; waves twice as many and twice as wide, spread around Dudu instead of at her.
// All attack numbers are first tuning values (the package's suggestions), to be set by playing.
// ============================================================================

const DC54_CODE = 'dragon_cave_4';
const DC54_WIDTH = 5400;
const DC54_FLOOR_Y = 685;          // the sketch's brown floor: a drop; Ritz stands on its edge
const DC54_RITZ = { x: 2451, y: DC54_FLOOR_Y };
// ledges: [id, x, y, w, art]  columns 1-9 of the sketch, bottom to top.
// v1.11.3 (user): the map is 1.5 times longer. The sketch's columns keep their shapes and gaps; five new columns in the
// same form go in where no ceiling wall hangs (L1, L2 between columns 2 and 3; R1-R3 between columns 6 and 7), and
// everything after them moves right (+660 from column 3, +975 more from column 7). The sketch's x for a moved ledge is
// (x - shift - 60) / 3.
const DC54_LEDGES = [
  ['S', 120, 580, 216, 'long'],   /* v1.12.1 (user): plain ledge and the usual flag, not the Kidian pad */
  ['C1a', 465, 520, 201, 's'], ['C1b', 462, 385, 192, 's'], ['C1c', 459, 244, 192, 's'], ['C1d', 471, 106, 183, 's'],
  ['C2a', 792, 364, 171, 's'], ['C2b', 789, 235, 156, 's'], ['C2c', 780, 109, 156, 's'], ['C2d', 783, -29, 150, 's'],
  ['L1a', 1113, 300, 165, 's'], ['L1b', 1110, 172, 156, 's'], ['L1c', 1116, 46, 150, 's'], ['L1d', 1110, -92, 150, 's']   /* added in v1.11.3 */,
  ['L2a', 1446, 250, 150, 's'], ['L2b', 1440, 128, 141, 's'], ['L2c', 1443, 8, 135, 's'], ['L2d', 1440, -120, 132, 's']   /* added in v1.11.3 */,
  ['C3a', 1779, 217, 129, 's'], ['C3b', 1776, 100, 120, 's'], ['C3c', 1776, -17, 111, 's'], ['C3d', 1776, -158, 105, 's'],
  ['C4a', 2028, 91, 147, 's'], ['C4b', 2028, -29, 144, 's'], ['C4c', 2028, -149, 132, 's'],
  ['CP', 2214, -299, 390, 'long'],
  ['C5a', 2328, 85, 153, 's'], ['C5b', 2328, -35, 144, 's'], ['C5c', 2319, -152, 147, 's'],
  ['C6a', 2685, 79, 156, 's'], ['C6b', 2682, -29, 141, 's'], ['C6c', 2670, -152, 141, 's'],
  ['R1a', 3003, 85, 153, 's'], ['R1b', 3000, -33, 144, 's'], ['R1c', 3006, -155, 141, 's']   /* added in v1.11.3 */,
  ['R2a', 3336, 190, 180, 's'], ['R2b', 3330, 80, 168, 's'], ['R2c', 3333, -40, 141, 's'], ['R2d', 3330, -170, 132, 's']   /* added in v1.11.3 */,
  ['R3a', 3663, 82, 156, 's'], ['R3b', 3660, -30, 141, 's'], ['R3c', 3657, -150, 141, 's']   /* added in v1.11.3 */,
  ['C7a', 3984, 187, 192, 's'], ['C7b', 3978, 79, 183, 's'], ['C7c', 3981, -38, 135, 's'], ['C7d', 3975, -173, 129, 's'],
  ['C8a', 4311, 277, 168, 's'], ['C8b', 4314, 175, 150, 's'], ['C8c', 4299, 58, 153, 's'], ['C8d', 4293, -50, 150, 's'],
  ['C9a', 4656, 415, 171, 's'], ['C9b', 4641, 289, 159, 's'], ['C9c', 4629, 172, 168, 's'], ['C9d', 4620, 61, 171, 's'],
  ['N1', 4920, 510, 105, 's'], ['N2', 5160, 500, 90, 's'],   /* added in v1.11.6: the row under the goal */
  ['N3', 4850, 640, 120, 's'], ['N4', 5070, 640, 120, 's'],   /* v1.12.1: one more row below */
  ['GOAL', 4983, 262, 213, 'long']   /* v1.12.1 (user): plain ledge and the usual goal flag */
];
// the three brown walls hanging from the ceiling: [id, x, bottom y, w]; they run up far above the screen
// v1.12.1 (user: Dudu bumped her head on W4 too much): the row under the goal is lower (N1 415 -> 510, N2 403 -> 500;
// 209px under W4, more than a single jump of a 60px Dudu reaches), and a row below it (N3, N4 at 640) catches a
// fall and leads back up (130px). From N2 to the goal is now a double jump (238px).
// v1.11.6 (user sketch): W4 hangs down to just under the goal ledge's height (sketch y 255 -> 301), between column 9
// and the goal, so the goal cannot be reached by jumping across from column 9. The way is a U turn: down column 9 to
// C9a, along the new row under the wall (N1, N2; 114px of room under W4, Dudu is 60 tall) and up onto the goal from N2.
const DC54_WALLS = [['W1', 2046, -278, 78], ['W2', 4293, -194, 87], ['W3', 4632, -80, 117], ['W4', 4866, 301, 90]];
// forward gates (x): passing one counts once; every two raise the attack stage. v1.11.3: ten, evenly over the longer
// map, so the last stage comes near the goal again
const DC54_GATES = [560, 1040, 1520, 2000, 2480, 2960, 3440, 3920, 4400, 4880];
const DC54_CP_X = 2409;
const DC54_GOAL_X = 5089;
// attack stages (package suggestion table): waves per attack, speed px/s, rest after the motion (s)
// v1.11.1 (user): twice the waves of the package table, twice as wide
// v1.11.2 (user): the old last speed (350) is the first, and the last is 1.5 times that (525), in even steps
// v1.11.4 (user: running straight on ignored the waves): much faster, 600 to 900, still 1.5 times from first to last
const RZ_STAGES = [
  { n: 2, speed: 600, rest: 1.6 }, { n: 4, speed: 660, rest: 1.4 }, { n: 4, speed: 720, rest: 1.1 },
  { n: 6, speed: 780, rest: 1.0 }, { n: 6, speed: 840, rest: 0.8 }, { n: 8, speed: 900, rest: 0.7 }
];
// the swings in the motions (frames checked one by one): Attack2_1 swings down at 670ms (#10) and across at 1600ms
// (#24); Attack1_1 at 1070ms (#16) and 2400ms (#36). The first waves leave on the first swing, the rest on the
// second; the wind-up before the first swing is the warning (0.67s / 1.07s), with the aim line shown.
const RZ_MOTIONS = { ritz_attack2: [670, 1600], ritz_attack1: [1070, 2400] };
const RZ_WAVE = { r: 44, hitR: 36, life: 12 };
// v1.11.1 (user): the waves never aim at Dudu where she stands; they land in front of her, behind her and on along her way.
// v1.11.4 (user, from a play video: running and dashing straight on left every wave behind her): the spots are taken
// around where she WILL be when the wave gets there, from her recent speed (rz.vAvg), and they are worked out again
// every frame until the wave leaves. So running on means running into them; stopping or turning back lets them pass.
// Offsets from that spot along her way (+ ahead, - behind) and up (- up). A wave whose line would pass where she
// stands now closer than RZ_CLEAR is pushed further out, so standing still is not hit (the snipe below is for that).
const RZ_SPREAD = [[0, 0], [0, -120], [140, 0], [-140, 0], [140, -120], [280, 0], [0, 110], [-140, -120]];
const RZ_VAVG_TAU = 0.35, RZ_VMAX = 700;
const RZ_CLEAR = 100;
// v1.11.3 (user): on top of the table's count, one wave lands one dash ahead of her (beginDash in game.js: 760 px/s for
// 0.16s = about 122px). Its line only has to miss her where she stands (RZ_DASH_CLEAR), so it stays close to that spot.
const RZ_DASH_AHEAD = 122, RZ_DASH_CLEAR = 60;
// v1.11.2 (user): standing still does not keep her safe. Once Dudu has stayed still for RZ_SNIPE_STILL seconds, one
// wave aims right at her (a null aim: her spot when it leaves), then the count starts again. It rides on Ritz's next
// swing that is still at least RZ_SNIPE_WARN away, so the aim line shows for that long.
const RZ_SNIPE_STILL = 1.5, RZ_SNIPE_WARN = 0.4;
// v1.11.1 (user): Ritz's line before the stage starts
const RITZ_LINES = ['지... 지금 수련 중이니 건들지 말아줘...'];
const RZ_GRACE = 2.0;   // seconds without attacks after a (re)start
// v1.11.5 (user): after the checkpoint (the middle save) the attack cycle is 30% faster: the swing plays 1.3 times as
// fast and the rest is 1.3 times shorter (so the aim-line warning is too: 0.52s before Attack2_1's first swing)
const RZ_CP_RATE = 1.3;
// v1.11.7 (user): just past the checkpoint, over about two ledge columns (C6 and R1), Ritz swings in bursts: each
// attack plays 1.5 times faster again than the after-checkpoint speed, then she holds still for a lull. Standing still
// through a burst is the way past it (the spread waves miss a Dudu who stands still), then she moves on in the lull,
// so the snipe at standing Dudu is off in this stretch.
const RZ_BURST = { x1: 2604, x2: 3160, rate: 1.5, lull: 2.5 };
function rzInBurst() { return p.x >= RZ_BURST.x1 && p.x <= RZ_BURST.x2; }
function rzRate() {
  const base = (typeof checkpoint === 'number' && checkpoint >= 1) ? RZ_CP_RATE : 1;
  return rz.burst ? base * RZ_BURST.rate : base;
}

function buildDragonStage54() {
  const s = makeWorldStage({
    id: 'world5_dragon_54',
    stageCode: DC54_CODE,
    name: '리츠의 비밀 수련',
    subtitle: '날아오는 검기를 피해요',
    worldWidth: DC54_WIDTH,
    killY: DC54_FLOOR_Y + 30,
    minCamY: -650,
    maxCamY: 200,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'DC54-S', x: 200, feetY: 580 } },
    segments: [{ start: 0, end: DC54_WIDTH, bg: 'dragoncave' }],
    backgroundRanges: {},
    goal: { id: 'dc54-goal', exitRoute: 'default', x: DC54_GOAL_X, y: 262, w: 60, h: 120, hidden: true }
  });
  s.worldId = DC_WORLD_ID;
  s.dragonCave = true;
  s.routeLabel = '월드 5';
  s.killYAt = () => DC54_FLOOR_Y + 30;
  s.customBackground = drawRitzBackground;
  s.onLoad = () => { loadDragonAssets(); loadKidianAssets(); loadRitzAssets(); rz.introDone = false; };
  s.musicTrack = 13;   // 21. Dragon Cave (Water) (user)
  s.onReset = () => resetRitzStage();
  s.onComplete = () => completeDragonStage(DC54_CODE);
  s.dcHooks = { update: updateRitzStage, back: drawRitzBack, front: drawRitzFront, afterDudu: drawRitzWaves, overlay: drawRitzOverlay };
  const art = { long: 'kd_plain', s: 'kd_plain' };
  for (const [id, x, y, w, a] of DC54_LEDGES) wSurface(s, x, y, w, 'stone', { id: 'DC54-' + id, dcDraw: art[a] });
  for (const [id, x, bottom, w] of DC54_WALLS) wWall(s, x, bottom - 1400, w, 1400, 'stone', { id: 'DC54-' + id, dcDraw: 'kd_wall' });
  wCheckpoint(s, '수련장 입구', 200, 580);
  wCheckpoint(s, '높은 쉼터', DC54_CP_X, -299);
  s.sections.push({ title: '수련장 끝', x: DC54_GOAL_X, y: 262, hint: '', flagX: DC54_GOAL_X });   // the usual goal flag (v1.12.1)
  s.hudStars = 0;
  return s;
}
if (typeof world1Stages !== 'undefined' && !world1Stages.some(st => st.worldId === DC_WORLD_ID && st.stageCode === DC54_CODE)) {
  world1Stages.push(buildDragonStage54());
}
DC_STAGE_INFO[DC54_CODE] = { code: '5-4', name: '리츠의 비밀 수련', desc: '리츠가 휘두르는 대검의 검기를 피해 발판을 건너요. 앞으로 갈수록 검기가 많고 빨라져요.' };

let _rzRequested = false;
function loadRitzAssets() {
  if (_rzRequested) return;
  _rzRequested = true;
  dcLoad('ritz_bg', `assets/world/dragoncave/ritz_bg.webp${DC_ASSET_Q}`);
}

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------
const rz = { gate: -1, stage: 0, state: 'rest', t: 0, motion: 'ritz_idle', mt: 0, aims: [], fired: 0, waves: [], dir: 1,
  grace: RZ_GRACE, face: -1, log: [], attacks: 0, burst: false, lull: false, vAvg: 0, stillT: 0, snipeQ: false, introDone: false, talk: null, spacePrev: false };
window.__rz = rz;
function rzLog(ev, extra = {}) {
  rz.log.push({ ev, stage: rz.stage, gate: rz.gate, x: Math.round(p.x), y: Math.round(p.y), ...extra });
  if (rz.log.length > 300) rz.log.shift();
}
function activeRitzStage() { const st = activeDragonStage(); return st && st.stageCode === DC54_CODE ? st : null; }
function rzGatesBefore(x) { let g = -1; for (let i = 0; i < DC54_GATES.length; i++) if (x >= DC54_GATES[i]) g = i; return g; }
function resetRitzStage() {
  rz.waves = []; rz.aims = []; rz.fired = 0; rz.stillT = 0; rz.snipeQ = false; rz.vAvg = 0; rz.burst = false; rz.lull = false;
  rz.state = 'rest'; rz.t = 0; rz.motion = 'ritz_idle'; rz.mt = 0;
  rz.grace = RZ_GRACE;
  // a restart at the checkpoint keeps the stage reached there (the gates up to the checkpoint count as passed)
  rz.gate = (typeof checkpoint === 'number' && checkpoint >= 1) ? rzGatesBefore(DC54_CP_X) : -1;
  rz.stage = rzStageOf(rz.gate);
  rz.dir = 1;
  // the talk comes when the stage is entered and stays until it is read (a fall afterwards does not bring it back)
  rz.talk = rz.introDone ? null : { line: 0, t: 0 };
  window.__dcLock = !!rz.talk;
  rz.spacePrev = typeof keys !== 'undefined' && keys.has('Space');
  rzLog('reset');
}
function rzStageOf(gate) { return Math.min(RZ_STAGES.length - 1, Math.max(0, Math.floor((gate + 1) / 2))); }
// an aim is {ox, oy, clear} (around where she will be) or null (the snipe: right at her). Resolved to a point each
// frame; `lead` is the time left until its swing releases it
function rzResolveAim(a, lead) {
  const [sx, sy] = rzSwordTip(), py = p.y - 30;
  if (!a) return [p.x, py];
  const S = RZ_STAGES[rz.stage], v = Math.max(-RZ_VMAX, Math.min(RZ_VMAX, rz.vAvg));
  const dir = Math.abs(v) > 60 ? Math.sign(v) : rz.dir;
  let T = 0, tx = p.x, ty = py + a.oy;
  for (let k = 0; k < 4; k++) {
    tx = p.x + v * (Math.max(0, lead) + T) + a.ox * dir;
    T = Math.hypot(tx - sx, ty - sy) / S.speed;
  }
  // keep the line off the spot where she stands now
  const push = (a.ox ? Math.sign(a.ox) : 1) * dir * 40;
  for (let k = 0; k < 15; k++) {
    const L = Math.hypot(tx - sx, ty - sy) || 1;
    if (Math.abs((tx - sx) * (py - sy) - (ty - sy) * (p.x - sx)) / L >= a.clear) break;
    tx += push;
  }
  return [tx, ty];
}
function rzPlanAims(n) {
  const out = [];
  for (let i = 0; i < n; i++) { const [ox, oy] = RZ_SPREAD[i % RZ_SPREAD.length]; out.push({ ox, oy, clear: RZ_CLEAR }); }
  // v1.11.3 (user): one more, one dash ahead of her
  out.push({ ox: RZ_DASH_AHEAD, oy: 0, clear: RZ_DASH_CLEAR });
  return out;
}
// seconds until aim i leaves (the first half on the first swing, the rest on the second)
function rzLeadOf(i) {
  const rel = RZ_MOTIONS[rz.motion]; if (!rel) return 0;
  const k = i < Math.ceil(rz.aims.length / 2) ? 0 : 1;
  return Math.max(0, rel[k] / 1000 - rz.mt) / rzRate();
}
function rzStartAttack() {
  rz.burst = rzInBurst();
  const S = RZ_STAGES[rz.stage];
  rz.motion = rz.stage >= 1 && rz.attacks % 3 === 2 ? 'ritz_attack1' : 'ritz_attack2';
  rz.mt = 0; rz.state = 'attack'; rz.fired = 0; rz.attacks++;
  rz.face = p.x >= DC54_RITZ.x ? 1 : -1;
  rz.aims = rzPlanAims(S.n);
  if (rz.snipeQ) { rz.aims.unshift(null); rz.snipeQ = false; rzLog('snipe'); }
  rzLog(rz.burst ? 'burst' : 'attack', { motion: rz.motion, waves: rz.aims.length, speed: S.speed });
}
function rzSwordTip() { return [DC54_RITZ.x + rz.face * 46, DC54_RITZ.y - 78]; }
function rzFire(from, to) {
  const S = RZ_STAGES[rz.stage], [sx, sy] = rzSwordTip();
  for (let i = from; i < to; i++) {
    const [tx, ty] = rzResolveAim(rz.aims[i], 0), d = Math.hypot(tx - sx, ty - sy) || 1;
    rz.waves.push({ x: sx, y: sy, px: sx, py: sy, vx: (tx - sx) / d * S.speed, vy: (ty - sy) / d * S.speed, age: 0, done: false });
  }
  if (typeof tone === 'function') tone(240, 0.12, 'sawtooth', 0.03);
  rzLog('fire', { from, to });
}
function rzWallAt(x, y) {
  for (const [id, wx, bottom, w] of DC54_WALLS) if (x > wx && x < wx + w && y < bottom) return true;
  return false;
}
function updateRitzStage(dt) {
  if (!activeRitzStage()) return;
  // forward gates: only the furthest one passed counts, so hopping in place or walking back does not add anything,
  // and a dash or double jump past several gates counts all of them
  const g = rzGatesBefore(p.x);
  if (g > rz.gate) { rz.gate = g; const st = rzStageOf(g); if (st !== rz.stage) { rz.stage = st; rzLog('stage_up'); } }
  if (Math.abs(p.vx) > 60) rz.dir = p.vx > 0 ? 1 : -1;
  rz.vAvg += (p.vx - rz.vAvg) * (1 - Math.exp(-dt / RZ_VAVG_TAU));
  const sp = typeof keys !== 'undefined' && keys.has('Space'), spDown = sp && !rz.spacePrev;
  rz.spacePrev = sp;
  rz.mt += dt * (rz.state === 'attack' ? rzRate() : 1);
  if (rz.talk) {
    // Ritz waits in Idle while she speaks; a fresh jump press (after a moment) closes the line
    rz.motion = 'ritz_idle'; rz.face = p.x >= DC54_RITZ.x ? 1 : -1;
    rz.talk.t += dt;
    if (spDown && rz.talk.t >= 0.35) {
      rz.talk.line++; rz.talk.t = 0;
      if (rz.talk.line >= RITZ_LINES.length) { rz.talk = null; rz.introDone = true; window.__dcLock = false; rz.grace = RZ_GRACE; rzLog('talk_done'); }
    }
    return;
  }
  // Ritz
  if (rz.grace > 0) rz.grace -= dt;
  // standing still: count, then queue one wave right at her
  const still = Math.abs(p.vx) < 30 && Math.abs(p.vy) < 30;
  rz.stillT = still && rz.grace <= 0 && !rzInBurst() ? rz.stillT + dt : 0;
  if (rz.stillT >= RZ_SNIPE_STILL && !rz.snipeQ) { rz.snipeQ = true; rz.stillT = 0; rzLog('snipe_queue'); }
  if (rz.snipeQ && rz.state === 'attack') {
    const rel = RZ_MOTIONS[rz.motion], ms = rz.mt * 1000;
    const wms = RZ_SNIPE_WARN * 1000 * rzRate(), slot = rz.fired === 0 && ms < rel[0] - wms ? 0 : (ms < rel[1] - wms ? 1 : -1);
    if (slot === 0) { rz.aims.unshift(null); rz.snipeQ = false; rzLog('snipe'); }
    else if (slot === 1) { rz.aims.push(null); rz.snipeQ = false; rzLog('snipe'); }
  }
  if (rz.state === 'rest') {
    rz.motion = 'ritz_idle';
    if (Math.abs(p.x - DC54_RITZ.x) > 4) rz.face = p.x >= DC54_RITZ.x ? 1 : -1;
    rz.t += dt;
    // in the burst stretch: no rest after a lull, a lull after a burst; elsewhere the stage's rest
    const restT = rzInBurst() ? (rz.lull ? RZ_BURST.lull : 0.15) : RZ_STAGES[rz.stage].rest / rzRate();
    if (rz.grace <= 0 && (rz.snipeQ || rz.t >= restT)) { rz.t = 0; rz.lull = false; rzStartAttack(); }
  } else {
    const rel = RZ_MOTIONS[rz.motion], n = rz.aims.length, first = Math.ceil(n / 2);
    if (rz.fired === 0 && rz.mt * 1000 >= rel[0]) { rzFire(0, first); rz.fired = first; }
    if (rz.fired < n && rz.mt * 1000 >= rel[1]) { rzFire(rz.fired, n); rz.fired = n; }
    const m = dcAtlas && dcAtlas.motions[rz.motion];
    if (rz.mt * 1000 >= (m ? m.duration : 2000)) { rz.state = 'rest'; rz.t = 0; rz.mt = 0; rz.motion = 'ritz_idle'; rz.lull = rz.burst; rz.burst = false; }
  }
  // waves: straight lines (no homing), gone at a wall or after their life; each hurts once
  for (const w of rz.waves) {
    w.px = w.x; w.py = w.y;
    w.x += w.vx * dt; w.y += w.vy * dt; w.age += dt;
    if (rzWallAt(w.x, w.y)) { w.dead = true; continue; }
    if (!w.done && p.invulnerable <= 0 && typeof distPointToSegment === 'function'
      && distPointToSegment(p.x, p.y - 30, w.px, w.py, w.x, w.y) < RZ_WAVE.hitR + 18) {
      w.done = true;
      if (typeof applyStunHit === 'function') applyStunHit(w.x, 'ritz_wave', '앗! 검기에 맞았어요!');
      rzLog('hit');
    }
  }
  rz.waves = rz.waves.filter(w => !w.dead && w.age < RZ_WAVE.life && w.x > -200 && w.x < DC54_WIDTH + 200 && w.y > -1200 && w.y < 1200);
}
window.updateRitzStage = updateRitzStage;

// ----------------------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------------------
function drawRitzBackground() {
  ctx.fillStyle = '#1b1424'; ctx.fillRect(0, 0, W, H);
  const st = activeRitzStage(), im = dcImages.ritz_bg;
  if (!st || !im) return;
  const sc = 1.12, dw = im.width * sc, dh = im.height * sc;
  const vx = Math.max(0, Math.min(1, (rCam + W * 0.5) / st.worldWidth));
  const vy = Math.max(0, Math.min(1, (rCamY - st.minCamY) / Math.max(1, st.maxCamY - st.minCamY)));
  ctx.drawImage(im, -Math.round(vx * (dw - W)), -Math.round(vy * (dh - H)), dw, dh);
}
// the drop under everything: dark violet mist from the floor edge down (Ritz stands on that edge)
function drawRitzBack() {
  if (!activeRitzStage()) return;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const x1 = Math.floor(rCam) - 40, x2 = Math.ceil(rCam + W / zoom) + 40, top = DC54_FLOOR_Y, bot = rCamY + H / zoom + 40;
  if (bot <= top) return;
  const g = ctx.createLinearGradient(0, top - 20, 0, top + 200);
  g.addColorStop(0, 'rgba(70, 48, 96, 0.55)'); g.addColorStop(0.2, 'rgba(26, 16, 38, 0.9)'); g.addColorStop(1, 'rgba(8, 5, 12, 0.98)');
  ctx.fillStyle = g; ctx.fillRect(x1, top, x2 - x1, bot - top);
  ctx.strokeStyle = 'rgba(190, 160, 220, 0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, top + 1); ctx.lineTo(x2, top + 1); ctx.stroke();
}
function drawRitzFront() {
  if (!activeRitzStage()) return;
  // aim lines while she winds up (until the waves for them leave)
  if (rz.state === 'attack') {
    const [sx, sy] = rzSwordTip(), u = 0.35 + 0.35 * Math.sin(rz.mt * 18);
    ctx.save(); ctx.setLineDash([10, 9]); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255, 90, 110, ${u})`;
    for (let i = rz.fired; i < rz.aims.length; i++) {
      const [tx, ty] = rzResolveAim(rz.aims[i], rzLeadOf(i)), d = Math.hypot(tx - sx, ty - sy) || 1, L = Math.min(d + 260, 2400);
      /* the wave aimed at Dudu herself: a brighter, thicker line that follows her */
      if (!rz.aims[i]) { ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255, 40, 60, ${0.55 + u * 0.6})`; }
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (tx - sx) / d * L, sy + (ty - sy) / d * L); ctx.stroke();
      if (!rz.aims[i]) { ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255, 90, 110, ${u})`; }
    }
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(DC54_RITZ.x, DC54_RITZ.y + 1, 40, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (!dcSprite(rz.motion, rz.mt, DC54_RITZ.x, DC54_RITZ.y, rz.face, rz.motion === 'ritz_idle')) {
    ctx.fillStyle = '#4a3040'; ctx.beginPath(); ctx.ellipse(DC54_RITZ.x, DC54_RITZ.y - 60, 30, 60, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// the sword waves: pale crescents with a red edge, turned the way they fly (drawn over Dudu)
function drawRitzWaves() {
  if (!activeRitzStage()) return;
  for (const w of rz.waves) {
    const a = Math.atan2(w.vy, w.vx), R = RZ_WAVE.r;
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(a);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#f5e9ff'; ctx.strokeStyle = '#d0304a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-R * 0.3, 0, R, -Math.PI / 2, Math.PI / 2); ctx.arc(-R * 0.75, 0, R * 0.8, Math.PI / 2, -Math.PI / 2, true); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff6b80';
    ctx.fillRect(-R * 2.6, -3, R * 1.6, 6);
    ctx.restore();
  }
}
// Ritz stands below most of the ledges, so she is often under the screen: then a bubble with her face sits on the
// bottom edge above her (as Jade and Opal in 5-1), red while she swings
function drawRitzMarker() {
  if (!activeRitzStage()) return false;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1, M = DC_MARK;
  const fo = [7 * rz.face, -90];
  const sx = (DC54_RITZ.x + fo[0] - Math.round(rCam)) * zoom, sy = (DC54_RITZ.y + fo[1] - Math.round(rCamY)) * zoom;
  if (sy < H - 12 && sx > -20 && sx < W + 20) return false;
  const x = Math.max(M.r + M.edge, Math.min(W - M.r - M.edge, sx)), y = H - M.r - M.edge - 14;
  const hot = rz.state === 'attack' && rz.fired < rz.aims.length;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; ctx.strokeStyle = hot ? '#d0304a' : '#26302f'; ctx.lineWidth = hot ? 4 : 3;
  ctx.beginPath(); ctx.arc(x, y, M.r, Math.PI * 0.62, Math.PI * 0.38 + Math.PI * 2); ctx.lineTo(x, y + M.r + 13); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, M.inner, 0, Math.PI * 2);
  ctx.fillStyle = '#efe2ea'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a4a5e'; ctx.stroke();
  ctx.clip();
  ctx.translate(x, y); ctx.scale(M.zoom, M.zoom);
  dcSprite(rz.motion, rz.mt, -fo[0], -fo[1], rz.face, rz.motion === 'ritz_idle');
  ctx.restore();
  return false;
}
function drawRitzOverlay() {
  drawRitzMarker();
  const tk = rz.talk;
  if (!tk || !activeRitzStage()) return;
  drawDragonDialog('ritz', RITZ_LINES[Math.min(tk.line, RITZ_LINES.length - 1)], tk.t);   // v1.12.0: the user's box art
}
