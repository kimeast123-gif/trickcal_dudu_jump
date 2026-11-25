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
const DC54_WIDTH = 3700;
const DC54_FLOOR_Y = 685;          // the sketch's brown floor: a drop; Ritz stands on its edge
const DC54_RITZ = { x: 1791, y: DC54_FLOOR_Y };
// ledges: [id, x, y, w, art]  columns 1-9 of the sketch, bottom to top
const DC54_LEDGES = [
  ['S', 120, 580, 216, 'start'],
  ['C1a', 465, 520, 201, 's'], ['C1b', 462, 385, 192, 's'], ['C1c', 459, 244, 192, 's'], ['C1d', 471, 106, 183, 's'],
  ['C2a', 792, 364, 171, 's'], ['C2b', 789, 235, 156, 's'], ['C2c', 780, 109, 156, 's'], ['C2d', 783, -29, 150, 's'],
  ['C3a', 1119, 217, 129, 's'], ['C3b', 1116, 100, 120, 's'], ['C3c', 1116, -17, 111, 's'], ['C3d', 1116, -158, 105, 's'],
  ['C4a', 1368, 91, 147, 's'], ['C4b', 1368, -29, 144, 's'], ['C4c', 1368, -149, 132, 's'],
  ['CP', 1554, -299, 390, 'long'],
  ['C5a', 1668, 85, 153, 's'], ['C5b', 1668, -35, 144, 's'], ['C5c', 1659, -152, 147, 's'],
  ['C6a', 2025, 79, 156, 's'], ['C6b', 2022, -29, 141, 's'], ['C6c', 2010, -152, 141, 's'],
  ['C7a', 2349, 187, 192, 's'], ['C7b', 2343, 79, 183, 's'], ['C7c', 2346, -38, 135, 's'], ['C7d', 2340, -173, 129, 's'],
  ['C8a', 2676, 277, 168, 's'], ['C8b', 2679, 175, 150, 's'], ['C8c', 2664, 58, 153, 's'], ['C8d', 2658, -50, 150, 's'],
  ['C9a', 3021, 415, 171, 's'], ['C9b', 3006, 289, 159, 's'], ['C9c', 2994, 172, 168, 's'], ['C9d', 2985, 61, 171, 's'],
  ['GOAL', 3348, 262, 213, 'goal']
];
// the three brown walls hanging from the ceiling: [id, x, bottom y, w]; they run up far above the screen
const DC54_WALLS = [['W1', 1386, -278, 78], ['W2', 2658, -194, 87], ['W3', 2997, -80, 117]];
// forward gates (x): passing one counts once; every two raise the attack stage
const DC54_GATES = [560, 860, 1175, 1440, 1600, 2090, 2410, 2740, 3080, 3300];
const DC54_CP_X = 1749;
// attack stages (package suggestion table): waves per attack, speed px/s, rest after the motion (s)
// v1.11.1 (user): twice the waves of the package table, twice as wide
const RZ_STAGES = [
  { n: 2, speed: 240, rest: 1.6 }, { n: 4, speed: 265, rest: 1.4 }, { n: 4, speed: 290, rest: 1.1 },
  { n: 6, speed: 310, rest: 1.0 }, { n: 6, speed: 330, rest: 0.8 }, { n: 8, speed: 350, rest: 0.7 }
];
// the swings in the motions (frames checked one by one): Attack2_1 swings down at 670ms (#10) and across at 1600ms
// (#24); Attack1_1 at 1070ms (#16) and 2400ms (#36). The first waves leave on the first swing, the rest on the
// second; the wind-up before the first swing is the warning (0.67s / 1.07s), with the aim line shown.
const RZ_MOTIONS = { ritz_attack2: [670, 1600], ritz_attack1: [1070, 2400] };
const RZ_WAVE = { r: 44, hitR: 36, life: 9 };
// v1.11.1 (user): the waves never aim at Dudu herself; they land in front of her, behind her and on along her way.
// Offsets along her way (+ ahead, - behind) and up; each line is pushed out until it passes her by RZ_CLEAR or more.
const RZ_SPREAD = [[130, 0], [-130, 0], [260, 0], [390, 0], [-260, 0], [520, 0], [200, -150], [340, -150]];
const RZ_CLEAR = 100;
// v1.11.2 (user): standing still does not keep her safe. Once Dudu has stayed still for RZ_SNIPE_STILL seconds, one
// wave aims right at her (a null aim: her spot when it leaves), then the count starts again. It rides on Ritz's next
// swing that is still at least RZ_SNIPE_WARN away, so the aim line shows for that long.
const RZ_SNIPE_STILL = 1.5, RZ_SNIPE_WARN = 0.4;
// v1.11.1 (user): Ritz's line before the stage starts
const RITZ_LINES = ['지... 지금 수련 중이니 건들지 말아줘...'];
const RZ_GRACE = 2.0;   // seconds without attacks after a (re)start

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
    goal: { id: 'dc54-goal', exitRoute: 'default', x: 3454, y: 262, w: 60, h: 120, hidden: true }
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
  const art = { start: 'kd_start', goal: 'kd_goal', long: 'kd_plain', s: 'kd_plain' };
  for (const [id, x, y, w, a] of DC54_LEDGES) wSurface(s, x, y, w, 'stone', { id: 'DC54-' + id, dcDraw: art[a] });
  for (const [id, x, bottom, w] of DC54_WALLS) wWall(s, x, bottom - 1400, w, 1400, 'stone', { id: 'DC54-' + id, dcDraw: 'kd_wall' });
  wCheckpoint(s, '수련장 입구', 200, 580);
  wCheckpoint(s, '높은 쉼터', DC54_CP_X, -299);
  s.sections.push({ title: '수련장 끝', x: 3454, y: 262, hint: '', flagX: 3454, hiddenFlag: true });   // the goal pad has its flag
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
  grace: RZ_GRACE, face: -1, log: [], attacks: 0, stillT: 0, snipeQ: false, introDone: false, talk: null, spacePrev: false };
window.__rz = rz;
function rzLog(ev, extra = {}) {
  rz.log.push({ ev, stage: rz.stage, gate: rz.gate, x: Math.round(p.x), y: Math.round(p.y), ...extra });
  if (rz.log.length > 300) rz.log.shift();
}
function activeRitzStage() { const st = activeDragonStage(); return st && st.stageCode === DC54_CODE ? st : null; }
function rzGatesBefore(x) { let g = -1; for (let i = 0; i < DC54_GATES.length; i++) if (x >= DC54_GATES[i]) g = i; return g; }
function resetRitzStage() {
  rz.waves = []; rz.aims = []; rz.fired = 0; rz.stillT = 0; rz.snipeQ = false;
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
// the waves' aims (fixed when the swing starts): around Dudu along her way, never on her
function rzPlanAims(n) {
  const out = [], [sx, sy] = rzSwordTip(), py = p.y - 30;
  for (let i = 0; i < n; i++) {
    const [ox, oy] = RZ_SPREAD[i % RZ_SPREAD.length];
    let dx = ox * rz.dir, k = 0, tx, ty;
    do {
      tx = p.x + dx; ty = py + oy;
      const L = Math.hypot(tx - sx, ty - sy) || 1;
      const clear = Math.abs((tx - sx) * (py - sy) - (ty - sy) * (p.x - sx)) / L;
      if (clear >= RZ_CLEAR) break;
      dx *= 1.25; k++;
    } while (k < 12);
    out.push([tx, ty]);
  }
  return out;
}
function rzStartAttack() {
  const S = RZ_STAGES[rz.stage];
  rz.motion = rz.stage >= 1 && rz.attacks % 3 === 2 ? 'ritz_attack1' : 'ritz_attack2';
  rz.mt = 0; rz.state = 'attack'; rz.fired = 0; rz.attacks++;
  rz.face = p.x >= DC54_RITZ.x ? 1 : -1;
  rz.aims = rzPlanAims(S.n);
  if (rz.snipeQ) { rz.aims.unshift(null); rz.snipeQ = false; rzLog('snipe'); }
  rzLog('attack', { motion: rz.motion, waves: rz.aims.length, speed: S.speed });
}
function rzAimAt(a) { return a || [p.x, p.y - 30]; }
function rzSwordTip() { return [DC54_RITZ.x + rz.face * 46, DC54_RITZ.y - 78]; }
function rzFire(from, to) {
  const S = RZ_STAGES[rz.stage], [sx, sy] = rzSwordTip();
  for (let i = from; i < to; i++) {
    const [tx, ty] = rzAimAt(rz.aims[i]), d = Math.hypot(tx - sx, ty - sy) || 1;
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
  const sp = typeof keys !== 'undefined' && keys.has('Space'), spDown = sp && !rz.spacePrev;
  rz.spacePrev = sp;
  rz.mt += dt;
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
  rz.stillT = still && rz.grace <= 0 ? rz.stillT + dt : 0;
  if (rz.stillT >= RZ_SNIPE_STILL && !rz.snipeQ) { rz.snipeQ = true; rz.stillT = 0; rzLog('snipe_queue'); }
  if (rz.snipeQ && rz.state === 'attack') {
    const rel = RZ_MOTIONS[rz.motion], ms = rz.mt * 1000;
    const slot = rz.fired === 0 && ms < rel[0] - RZ_SNIPE_WARN * 1000 ? 0 : (ms < rel[1] - RZ_SNIPE_WARN * 1000 ? 1 : -1);
    if (slot === 0) { rz.aims.unshift(null); rz.snipeQ = false; rzLog('snipe'); }
    else if (slot === 1) { rz.aims.push(null); rz.snipeQ = false; rzLog('snipe'); }
  }
  if (rz.state === 'rest') {
    rz.motion = 'ritz_idle';
    if (Math.abs(p.x - DC54_RITZ.x) > 4) rz.face = p.x >= DC54_RITZ.x ? 1 : -1;
    rz.t += dt;
    if (rz.grace <= 0 && (rz.snipeQ || rz.t >= RZ_STAGES[rz.stage].rest)) { rz.t = 0; rzStartAttack(); }
  } else {
    const rel = RZ_MOTIONS[rz.motion], n = rz.aims.length, first = Math.ceil(n / 2);
    if (rz.fired === 0 && rz.mt * 1000 >= rel[0]) { rzFire(0, first); rz.fired = first; }
    if (rz.fired < n && rz.mt * 1000 >= rel[1]) { rzFire(rz.fired, n); rz.fired = n; }
    const m = dcAtlas && dcAtlas.motions[rz.motion];
    if (rz.mt * 1000 >= (m ? m.duration : 2000)) { rz.state = 'rest'; rz.t = 0; rz.mt = 0; rz.motion = 'ritz_idle'; }
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
      const [tx, ty] = rzAimAt(rz.aims[i]), d = Math.hypot(tx - sx, ty - sy) || 1, L = Math.min(d + 260, 2400);
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
  const line = RITZ_LINES[Math.min(tk.line, RITZ_LINES.length - 1)];
  const bw = 820, bx = (W - bw) / 2, by = 96;
  ctx.save();
  ctx.font = `22px 'ONE Mobile POP', 'Malgun Gothic', sans-serif`;
  const rows = wrapLines(line, bw - 64), bh = 66 + rows.length * 34;
  ctx.fillStyle = 'rgba(255, 250, 240, 0.96)'; ctx.strokeStyle = '#5a2638'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a2e4a';
  ctx.beginPath(); ctx.roundRect(bx + 24, by - 18, 86, 34, 17); ctx.fill();
  pbText('리츠', bx + 67, by - 1, 19, '#ffffff', 'center');
  rows.forEach((r, i) => pbText(r, bx + 32, by + 44 + i * 34, 22, '#3b2a26', 'left'));
  const kt = (t) => (typeof duduKeyText === 'function' ? duduKeyText(t) : t);
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(tk.t * 6);
  pbText(kt('{JUMP} 다음'), bx + bw - 28, by + bh - 20, 15, '#8a5a50', 'right');
  ctx.restore();
}
