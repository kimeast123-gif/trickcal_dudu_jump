'use strict';
// ============================================================================
// v1.10 WORLD 5 / 5-2 「루드의 헬스짐」: 500kg pinball
// (package DUDU_WORLD5_STAGE52_RUDE_PINBALL_MOTION_REV2_261125; CLAUDE_WORLD5_STAGE52_RUDE_PINBALL_MOTION_REV2.md)
//
// Flow: Rude waits (Idle_1) -> Dudu walks up to her: Happy_3 and the user's two lines (advanced with the jump key)
// -> the blue entry on the second ledge opens -> pinball (background 3): Dudu curled up (her double-jump spin frames)
// waits on the launcher (checkpoint 2 of the sketch); hold the jump key to charge, release to launch; left/right move
// keys work the flippers -> plates 20/10/3kg and the two sandbags add kg -> 500kg: success, Dudu is put back in front
// of Rude -> Happy_5 and the user's line -> after that line only: 5-2 cleared, 5-3 opened.
//
// The pinball is its own little physics loop in board coordinates (the sketch's pixels, 01_RUDE_PINBALL_SKETCH.png
// 914 x 807): a circle against segments, circles and two rotating flippers, 4 substeps per 120Hz step. Dudu's
// platformer body is held still (window.__dcLock) and hidden behind the board while it runs.
// The blue box in the middle of the board is the score panel only: drawn, never collided with.
// Every number marked "tuning" is a first value, to be set by playing.
// ============================================================================

const DC52_CODE = 'dragon_cave_2';
// The user's lines, exactly as given (가법게, 하는거다, 이정도, 무리없이 kept as written)
const RUDE_LINES = {
  intro: [
    '음! 어린 꼬마 용족 아니 공룡이군! 만나서 반갑다. 이 몸의 거처에 왔으니 가법게 몸풀기로 헬스를 하는거다!',
    '무리 없이 500kg을 쳐낸다면 오늘치 운동은 끝이다! 이정도는 할 수 있겠지?!'
  ],
  clear: ['음! 역시 이정도는 무리없이 해내는군! 아주 잘 했다!']
};
// Gym room (world px): the sketch's two ledges on the left, Rude by the first flag, the blue entry on the second
const DC52_GYM = { width: 1280, rudeX: 470, talkReach: 120, entryX: 905, entryReach: 46, meetX: 360 };
const DC52_GOAL_KG = 500;
const SANDBAG_SCORE_KG = 5;   // tuning: the user has not set the sandbag's kg yet (package suggestion 5kg)

// Pinball tuning (board units = sketch pixels; the board is drawn about 0.86x)
const PB = {
  r: 17,                    // ball radius (the curled-up Dudu is drawn just over this)
  g: 1100,                  // gravity along the table
  maxSpeed: 1500,
  substeps: 4,
  charge: 1.2,              // seconds to full charge (package proposal)
  launchMin: 620,           // speed of the weakest launch (falls back down the lane)
  launchMax: 1520,          // speed of a full launch (round the top into the table)
  wallE: 0.5, bumperE: 0.85, bumperKick: 260, bagE: 0.7, bagKick: 140, flipperE: 0.3,
  hitCool: 0.15,            // seconds before the same target can score again (and it must be left first)
  drainY: 745,
  stuckSpeed: 25, stuckTime: 1.5,
  flipper: { len: 108, rad: 9, rest: 0.52, up: -0.44, upSpeed: 18, downSpeed: 12 },   // angles in radians
  plunger: { x: 375, y: 712 }
};
const PB_BOARD = { x0: 322, y0: 14, x1: 833, y1: 778, corner: 95, laneX: 420, laneTop: 100 };
// targets from the sketch: plates (circles) and sandbags (tilted boxes)
const PB_PLATES = [
  { id: 'P20', x: 626, y: 92, r: 50, kg: 20 },
  { id: 'P10L', x: 525, y: 237, r: 30, kg: 10 }, { id: 'P10R', x: 712, y: 240, r: 30, kg: 10 },
  { id: 'P10C', x: 620, y: 327, r: 31, kg: 10 },
  { id: 'P3L', x: 503, y: 446, r: 19, kg: 3 }, { id: 'P3R', x: 742, y: 452, r: 19, kg: 3 }
];
const PB_BAGS = [
  { id: 'BAGL', x: 459, y: 143, len: 56, thick: 20, ang: -0.66 },
  { id: 'BAGR', x: 798, y: 143, len: 56, thick: 20, ang: 0.66 }
];
const PB_FLIPPERS = [
  { side: -1, hx: 503, hy: 640, key: 'ArrowLeft' },
  { side: 1, hx: 754, hy: 640, key: 'ArrowRight' }
];
const PB_SCORE_PANEL = { x: 567, y: 460, w: 120, h: 34 };   // UI only

// walls: the rounded outer frame, the launch lane wall, the two inlane guides down to the flipper hinges
function pbBuildWalls() {
  const B = PB_BOARD, segs = [];
  const pts = [];
  const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; pts.push([cx + Math.cos(a) * B.corner, cy + Math.sin(a) * B.corner]); } };
  arc(B.x0 + B.corner, B.y0 + B.corner, Math.PI, Math.PI * 1.5);
  arc(B.x1 - B.corner, B.y0 + B.corner, Math.PI * 1.5, Math.PI * 2);
  arc(B.x1 - B.corner, B.y1 - B.corner, 0, Math.PI * 0.5);
  arc(B.x0 + B.corner, B.y1 - B.corner, Math.PI * 0.5, Math.PI);
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; segs.push([a[0], a[1], b[0], b[1], 'frame']); }
  segs.push([B.laneX, B.laneTop, B.laneX, 722, 'lane']);
  segs.push([B.laneX, B.laneTop, B.laneX + 26, B.laneTop - 12, 'lane']);
  segs.push([332, PB.plunger.y, B.laneX, PB.plunger.y, 'plunger']);
  segs.push([B.laneX, 575, 503, 632, 'guide']);
  segs.push([B.x1 - 4, 575, 754, 632, 'guide']);
  return segs;
}
const PB_WALLS = pbBuildWalls();

const pb = { phase: 'gym', introDone: false, clearDone: false, fresh: true, talk: null, score: 0, ball: null,
  flips: [], hits: {}, spacePrev: false, spaceArmed: false, charge: 0, t: 0, fade: null, rude: { key: 'rude_idle', t: 0 },
  stuckT: 0, launches: 0, drains: 0 };
window.__pb = pb;
window.__pbLog = [];
function pbLog(ev, extra = {}) {
  window.__pbLog.push({ ev, phase: pb.phase, score: pb.score, t: Number((typeof levelClock === 'number' ? levelClock : 0).toFixed(2)), ...extra });
  if (window.__pbLog.length > 400) window.__pbLog.shift();
}

// ----------------------------------------------------------------------------
// Stage
// ----------------------------------------------------------------------------
let _pbBgRequested = false;
function loadPinballAssets() {
  if (_pbBgRequested) return;
  _pbBgRequested = true;
  dcLoad('gym', `assets/world/dragoncave/gym.webp${DC_ASSET_Q}`);
  dcLoad('pinball', `assets/world/dragoncave/pinball.webp${DC_ASSET_Q}`);
}
function buildDragonStage52() {
  const s = makeWorldStage({
    id: 'world5_dragon_52',
    stageCode: DC52_CODE,
    name: '루드의 헬스짐',
    subtitle: '500kg 핀볼',
    worldWidth: DC52_GYM.width,
    killY: 760,
    minCamY: -200,
    maxCamY: 220,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'DC52-START', x: 170, feetY: 580 } },
    segments: [{ start: 0, end: DC52_GYM.width, bg: 'dragoncave' }],
    backgroundRanges: {},
    // no goal to walk into: the stage ends after Rude's last line
    goal: { id: 'dc52-none', exitRoute: 'default', x: -99999, y: -99999, w: 0, h: 0, hidden: true }
  });
  s.worldId = DC_WORLD_ID;
  s.dragonCave = true;
  s.routeLabel = '월드 5';
  s.musicTrack = 10;   // 33. This Is Awkward (user): the gym and the talks; the pinball plays 11
  s.customBackground = drawGymBackground;
  s.onLoad = () => { loadDragonAssets(); loadPinballAssets(); pb.fresh = true; };
  s.onReset = () => resetPinballStage();
  s.dcHooks = { update: updatePinballStage, front: drawGymFront, overlay: drawPinballOverlay };
  // sketch: first ledge (flag 1 and Rude), small gap, second ledge (the blue entry)
  wSurface(s, 40, 580, 660, 'stone', { id: 'DC52-START', dcDraw: 'gym' });
  wSurface(s, 800, 580, 240, 'stone', { id: 'DC52-ENTRY', dcDraw: 'gym' });
  wCheckpoint(s, '루드의 헬스짐', 170, 580);
  s.hudStars = 0;
  return s;
}
if (typeof world1Stages !== 'undefined' && !world1Stages.some(st => st.worldId === DC_WORLD_ID && st.stageCode === DC52_CODE)) {
  world1Stages.push(buildDragonStage52());
}

function pbNewBall() { return { x: PB.plunger.x, y: PB.plunger.y - PB.r, vx: 0, vy: 0, roll: 0, face: 1 }; }
function pbResetFlippers() {
  pb.flips = PB_FLIPPERS.map(f => ({ ...f, a: PB.flipper.rest, w: 0 }));
}
// A fresh entry clears the run; a fall into the gap keeps the talk done and the kg already earned.
function resetPinballStage() {
  if (pb.fresh) {
    pb.introDone = false; pb.clearDone = false; pb.score = 0; pb.launches = 0; pb.drains = 0;
    window.__pbLog.length = 0;
    pbLog('stage_enter');
  }
  pb.fresh = false;
  pb.phase = 'gym';
  pb.talk = null; pb.fade = null; pb.ball = null; pb.charge = 0; pb.hits = {};
  pb.rude = { key: 'rude_idle', t: 0 };
  pb.spacePrev = typeof keys !== 'undefined' && keys.has('Space');
  window.__dcLock = false;
  pbResetFlippers();
  if (typeof playTrack === 'function') playTrack(10, false);
}

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------
function startTalk(kind) {
  pb.phase = kind === 'intro' ? 'talkIntro' : 'talkClear';
  pb.talk = { kind, line: 0, t: 0 };
  pb.rude = { key: kind === 'intro' ? 'rude_happy3' : 'rude_happy5', t: 0 };
  window.__dcLock = true;
  p.vx = 0;
  p.face = DC52_GYM.rudeX >= p.x ? 1 : -1;
  pbLog('talk_start', { kind, motion: pb.rude.key });
}
function updateTalk(dt, spDown) {
  const tk = pb.talk;
  tk.t += dt;
  // a fresh press of the jump key (after the line has been up a moment) shows the next line
  if (!spDown || tk.t < 0.35) return;
  pbLog('talk_next', { kind: tk.kind, line: tk.line });
  tk.line++; tk.t = 0;
  const lines = RUDE_LINES[tk.kind];
  if (tk.line < lines.length) return;
  pb.talk = null;
  if (tk.kind === 'intro') {
    pb.introDone = true;
    pb.phase = 'gym';
    pb.rude = { key: 'rude_idle', t: 0 };
    window.__dcLock = false;
    pbLog('intro_done');
    return;
  }
  // Happy_5 has run at least once by now (0.39s), and the line was read to the end
  pb.clearDone = true;
  pb.phase = 'done';
  pbLog('clear_done');
  window.__dcLock = false;
  completeDragonStage(DC52_CODE);
}
function enterPinball() {
  pb.phase = 'enter';
  pb.fade = { t: 0, dir: 1 };
  window.__dcLock = true;
  p.vx = 0;
  pbLog('pinball_enter');
}
function pbReady(reason) {
  pb.phase = 'ready';
  pb.ball = pbNewBall();
  pb.charge = 0;
  pb.stuckT = 0;
  // a jump key already held from before does not count: charging starts from a new press
  pb.spaceArmed = !keys.has('Space');
  if (reason) pbLog(reason);
}
function updateFlippers(dt) {
  const F = PB.flipper;
  for (const f of pb.flips) {
    const held = keys.has(f.key);
    const target = held ? F.up : F.rest;
    const prev = f.a;
    if (f.a > target) f.a = Math.max(target, f.a - F.upSpeed * dt);
    else if (f.a < target) f.a = Math.min(target, f.a + F.downSpeed * dt);
    f.w = (f.a - prev) / Math.max(1e-6, dt);   // + is down, - is up (left flipper; mirrored on the right)
    if (held && !f.wasHeld && typeof tone === 'function') tone(520, 0.03, 'square', 0.012);
    f.wasHeld = held;
  }
}
function pbFlipperEnds(f) {
  const ang = f.side < 0 ? f.a : Math.PI - f.a;
  return [f.hx, f.hy, f.hx + Math.cos(ang) * PB.flipper.len, f.hy + Math.sin(ang) * PB.flipper.len];
}
function closestOnSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return [x1 + dx * t, y1 + dy * t];
}
// push the ball out of a contact at (cx, cy) with clearance `rad`; reflect its velocity relative to (svx, svy)
function pbCollide(b, cx, cy, rad, e, svx = 0, svy = 0) {
  let nx = b.x - cx, ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  if (d >= PB.r + rad || d < 1e-6) return false;
  nx /= d; ny /= d;
  b.x = cx + nx * (PB.r + rad); b.y = cy + ny * (PB.r + rad);
  const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
  if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
  b.lastN = [nx, ny];
  return true;
}
function pbScore(id, kg) {
  const h = pb.hits[id] || (pb.hits[id] = { cool: 0, touching: false, flash: 0, count: 0 });
  h.flash = 0.28;
  if (h.touching || h.cool > 0) { h.touching = true; return; }
  h.touching = true; h.cool = PB.hitCool; h.count++;
  pb.score += kg;
  if (typeof tone === 'function') tone(kg >= 20 ? 990 : kg >= 10 ? 780 : 620, 0.06, 'triangle', 0.03);
  pbLog('hit', { id, kg, count: h.count });
}
function pbStep(dt) {
  const b = pb.ball, touched = {};
  b.vy += PB.g * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  for (const w of PB_WALLS) {
    const [cx, cy] = closestOnSeg(b.x, b.y, w[0], w[1], w[2], w[3]);
    pbCollide(b, cx, cy, 2, PB.wallE);
  }
  // the lane's one-way gate: once out on the table the ball cannot drop back into the lane at the top
  if (b.x > PB_BOARD.laneX + PB.r * 0.5 && b.y < PB_BOARD.laneTop) {
    const [cx, cy] = closestOnSeg(b.x, b.y, PB_BOARD.laneX, PB_BOARD.y0, PB_BOARD.laneX, PB_BOARD.laneTop);
    pbCollide(b, cx, cy, 2, PB.wallE);
  }
  for (const t of PB_PLATES) {
    if (pbCollide(b, t.x, t.y, t.r, PB.bumperE)) {
      b.vx += b.lastN[0] * PB.bumperKick; b.vy += b.lastN[1] * PB.bumperKick;
      touched[t.id] = true; pbScore(t.id, t.kg);
    }
  }
  for (const s of PB_BAGS) {
    const hx = Math.cos(s.ang) * s.len / 2, hy = Math.sin(s.ang) * s.len / 2;
    const [cx, cy] = closestOnSeg(b.x, b.y, s.x - hx, s.y - hy, s.x + hx, s.y + hy);
    if (pbCollide(b, cx, cy, s.thick / 2, PB.bagE)) {
      b.vx += b.lastN[0] * PB.bagKick; b.vy += b.lastN[1] * PB.bagKick;
      touched[s.id] = true; pbScore(s.id, SANDBAG_SCORE_KG);
    }
  }
  for (const f of pb.flips) {
    const [x1, y1, x2, y2] = pbFlipperEnds(f);
    const [cx, cy] = closestOnSeg(b.x, b.y, x1, y1, x2, y2);
    // surface speed of the flipper at the contact point: w x r (the right flipper turns the other way)
    const w = f.side < 0 ? f.w : -f.w, rx = cx - f.hx, ry = cy - f.hy;
    pbCollide(b, cx, cy, PB.flipper.rad, PB.flipperE, -w * ry, w * rx);
  }
  for (const id of Object.keys(pb.hits)) if (!touched[id]) pb.hits[id].touching = false;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > PB.maxSpeed) { b.vx *= PB.maxSpeed / sp; b.vy *= PB.maxSpeed / sp; }
}
function updatePinballPlay(dt) {
  const b = pb.ball, n = PB.substeps, h = dt / n;
  for (let i = 0; i < n; i++) { pbStep(h); if (pb.score >= DC52_GOAL_KG) break; }
  for (const id of Object.keys(pb.hits)) { const k = pb.hits[id]; k.cool = Math.max(0, k.cool - dt); k.flash = Math.max(0, k.flash - dt); }
  const sp = Math.hypot(b.vx, b.vy);
  b.roll += sp * dt / (2 * Math.PI * PB.r);
  if (Math.abs(b.vx) > 30) b.face = b.vx > 0 ? 1 : -1;
  // 500kg: success is settled in this same step; nothing scores or drains after it
  if (pb.score >= DC52_GOAL_KG) {
    pb.phase = 'success'; pb.t = 0;
    pbLog('success', { score: pb.score });
    if (typeof tone === 'function') tone(1180, 0.3, 'triangle', 0.05);
    return;
  }
  // a weak launch that falls back down the lane: back on the launcher, nothing lost
  if (b.x < PB_BOARD.laneX && b.y >= PB.plunger.y - PB.r - 1 && b.vy >= 0) { pbReady('lane_return'); return; }
  if (b.y > PB.drainY) { pb.drains++; pbReady('drain'); return; }
  // a ball that comes to rest somewhere on the table gets a small nudge
  if (sp < PB.stuckSpeed && b.y < 600) {
    pb.stuckT += dt;
    if (pb.stuckT > PB.stuckTime) { b.vx += (Math.random() - 0.5) * 240; b.vy -= 220; pb.stuckT = 0; pbLog('nudge'); }
  } else pb.stuckT = 0;
}
function leavePinball() {
  // Dudu stands where she first met Rude, on her feet again, facing her
  pb.ball = null;
  pb.phase = 'talkClear';
  window.__dcLock = true;
  p.x = p.prevX = DC52_GYM.meetX; p.y = p.prevY = 580; p.vx = 0; p.vy = 0;
  p.on = platforms.find(a => a.id === 'DC52-START') || null; p.ground = Boolean(p.on);
  p.dash = 0; p.buffer = 0; p.jumps = 0;
  if (typeof computeInitialCameraForPoint === 'function') {
    const c = computeInitialCameraForPoint(p.x, p.y);
    cam = c.cam; camY = c.camY; window.camBaseY = camY; if (typeof syncRenderCoords === 'function') syncRenderCoords();
  }
  if (typeof playTrack === 'function') playTrack(10, false);
  pbLog('return_to_rude');
  startTalk('clear');
}

function updatePinballStage(dt) {
  if (!activeDragonStage() || activeDragonStage().stageCode !== DC52_CODE) return;
  const sp = keys.has('Space'), spDown = sp && !pb.spacePrev, spUp = !sp && pb.spacePrev;
  pb.spacePrev = sp;
  pb.rude.t += dt;
  if (pb.fade) {
    pb.fade.t += dt;
    if (pb.fade.dir > 0 && pb.phase === 'enter' && pb.fade.t >= 0.28) {
      pb.fade = { t: 0, dir: -1 };
      pbResetFlippers();
      if (typeof playTrack === 'function') playTrack(11, false);
      pbReady('plunger_ready');
    } else if (pb.fade.dir > 0 && pb.phase === 'success' && pb.fade.t >= 0.28) {
      pb.fade = { t: 0, dir: -1 };
      leavePinball();
    } else if (pb.fade.dir < 0 && pb.fade.t >= 0.28) pb.fade = null;
  }
  switch (pb.phase) {
    case 'gym': {
      const on = p.ground && p.on;
      if (!pb.introDone && on && Math.abs(p.x - DC52_GYM.rudeX) < DC52_GYM.talkReach) startTalk('intro');
      else if (pb.introDone && on && p.on.id === 'DC52-ENTRY' && Math.abs(p.x - DC52_GYM.entryX) < DC52_GYM.entryReach) enterPinball();
      return;
    }
    case 'talkIntro': case 'talkClear': updateTalk(dt, spDown); return;
    case 'enter': return;
    case 'ready':
      updateFlippers(dt);
      if (!pb.spaceArmed) { if (!sp) pb.spaceArmed = true; return; }
      if (spDown) { pb.phase = 'charging'; pb.charge = 0; }
      return;
    case 'charging':
      updateFlippers(dt);
      pb.charge = Math.min(PB.charge, pb.charge + dt);
      if (spUp || !sp) {
        const u = pb.charge / PB.charge, v = PB.launchMin + (PB.launchMax - PB.launchMin) * u;
        pb.ball.vy = -v; pb.ball.vx = 0;
        pb.phase = 'play'; pb.launches++;
        pbLog('launch', { charge: Number(pb.charge.toFixed(2)), speed: Math.round(v) });
        if (typeof tone === 'function') tone(300 + 400 * u, 0.08, 'triangle', 0.03);
      }
      return;
    case 'play': updateFlippers(dt); updatePinballPlay(dt); return;
    case 'success':
      pb.t += dt;
      if (pb.t >= 1.4 && !pb.fade) pb.fade = { t: 0, dir: 1 };
      return;
    default: return;
  }
}
window.updatePinballStage = updatePinballStage;

// ----------------------------------------------------------------------------
// Drawing: the gym (world), the pinball and the talks (screen)
// ----------------------------------------------------------------------------
function drawGymBackground() {
  ctx.fillStyle = '#1b1210'; ctx.fillRect(0, 0, W, H);
  const im = dcImages.gym;
  if (!im) return;
  const sc = Math.max(W / im.width, H / im.height);
  ctx.drawImage(im, Math.round((W - im.width * sc) / 2), Math.round((H - im.height * sc) / 2), im.width * sc, im.height * sc);
}
// a plain cut-stone slab in the gym's colours
function drawGymLedge(a, x, y) {
  const h = 46;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#7d736b'); g.addColorStop(0.18, '#5c534d'); g.addColorStop(1, '#2f2926');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, a.w, h, 8) : ctx.rect(x, y, a.w, h); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x + 4, y + 2, a.w - 8, 3);
  ctx.strokeStyle = 'rgba(20,14,12,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, a.w, h, 8) : ctx.rect(x, y, a.w, h); ctx.stroke();
  ctx.fillStyle = 'rgba(220, 40, 40, 0.7)';
  for (let k = x + 50; k < x + a.w - 30; k += 140) ctx.fillRect(k, y + 18 + ((k * 7) % 11), 14, 3);
  ctx.restore();
}
function drawGymFront() {
  if (pb.phase === 'enter' || pb.phase === 'ready' || pb.phase === 'charging' || pb.phase === 'play' || pb.phase === 'success') return;
  // blue entry: the sketch's blue square, a doorway on the second ledge; dim until Rude has talked
  const ex = DC52_GYM.entryX, ey = 580, open = pb.introDone;
  ctx.save();
  ctx.globalAlpha = open ? 0.9 : 0.4;
  ctx.fillStyle = open ? 'rgba(90, 170, 255, 0.28)' : 'rgba(110, 120, 140, 0.25)';
  ctx.fillRect(ex - 34, ey - 92, 68, 92);
  ctx.strokeStyle = open ? '#74c0fc' : '#8a929e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(ex - 36, ey); ctx.lineTo(ex - 36, ey - 94); ctx.lineTo(ex + 36, ey - 94); ctx.lineTo(ex + 36, ey); ctx.stroke();
  if (open) {
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin((pb.rude.t || 0) * 4);
    ctx.fillStyle = '#a5d8ff'; ctx.fillRect(ex - 30, ey - 88, 60, 88);
  }
  ctx.restore();
  // Rude by the first flag, looking left towards where Dudu comes from
  const fy = 580;
  ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#120a08';
  ctx.beginPath(); ctx.ellipse(DC52_GYM.rudeX, fy + 1, 34, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  dcSprite(pb.rude.key, pb.rude.t, DC52_GYM.rudeX, fy, p.x > DC52_GYM.rudeX ? 1 : -1, true);
}

// board units -> screen: the whole board fits the screen height
const PB_VIEW = (() => {
  const B = PB_BOARD, s = 660 / (B.y1 - B.y0);
  return { s, ox: W / 2 - ((B.x0 + B.x1) / 2) * s + 70, oy: 30 - B.y0 * s };
})();
function pbText(txt, x, y, size, color, align = 'center', stroke = null) {
  ctx.font = `${size}px 'ONE Mobile POP', 'Malgun Gothic', sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(3, size / 5); ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); }
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
function drawPinballBoard() {
  const B = PB_BOARD, V = PB_VIEW;
  // background 3, the bright gym
  ctx.fillStyle = '#20262c'; ctx.fillRect(0, 0, W, H);
  const im = dcImages.pinball;
  if (im) { const sc = Math.max(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * sc) / 2, (H - im.height * sc) / 2, im.width * sc, im.height * sc); }
  ctx.save();
  ctx.translate(V.ox, V.oy); ctx.scale(V.s, V.s);
  // table: a soft dark wash inside the frame so the targets read against the busy background
  ctx.beginPath(); ctx.roundRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, B.corner);
  ctx.fillStyle = 'rgba(28, 34, 44, 0.62)'; ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = '#4a4f5a'; ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
  ctx.lineCap = 'round';
  for (const w of PB_WALLS) {
    if (w[4] === 'frame') continue;
    ctx.strokeStyle = w[4] === 'plunger' ? '#6b7280' : '#596070'; ctx.lineWidth = w[4] === 'guide' ? 9 : 7;
    ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[2], w[3]); ctx.stroke();
  }
  // score panel (UI only): current kg / 500kg
  const P = PB_SCORE_PANEL;
  ctx.fillStyle = 'rgba(62, 140, 220, 0.55)'; ctx.strokeStyle = 'rgba(165, 216, 255, 0.9)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(P.x, P.y, P.w, P.h, 8); ctx.fill(); ctx.stroke();
  pbText(`${Math.min(pb.score, DC52_GOAL_KG)} / ${DC52_GOAL_KG}kg`, P.x + P.w / 2, P.y + P.h / 2 + 1, 19, '#ffffff', 'center', 'rgba(20,50,90,0.8)');
  // plates: weight plates with their kg
  for (const t of PB_PLATES) {
    const fl = (pb.hits[t.id] && pb.hits[t.id].flash) || 0;
    const base = t.kg >= 20 ? '#d6453d' : t.kg >= 10 ? '#3d78c9' : '#e0a92e';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = fl > 0 ? '#fff4d6' : base; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#2a2d34'; ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.68, 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
    pbText(`${t.kg}kg`, t.x, t.y + 1, t.kg >= 20 ? 26 : t.kg >= 10 ? 17 : 12, fl > 0 ? base : '#ffffff', 'center', 'rgba(0,0,0,0.5)');
  }
  // sandbags
  for (const s of PB_BAGS) {
    const fl = (pb.hits[s.id] && pb.hits[s.id].flash) || 0;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.ang + Math.sin(fl * 40) * fl * 0.6);
    ctx.fillStyle = fl > 0 ? '#ffb3a7' : '#c9483f'; ctx.strokeStyle = '#3a1f1c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-s.len / 2 - s.thick / 2, -s.thick / 2, s.len + s.thick, s.thick, s.thick / 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(-s.len / 2, 0); ctx.lineTo(s.len / 2, 0); ctx.stroke();
    ctx.restore();
  }
  // flippers
  for (const f of pb.flips) {
    const [x1, y1, x2, y2] = pbFlipperEnds(f);
    ctx.strokeStyle = '#2a2d34'; ctx.lineWidth = PB.flipper.rad * 2 + 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#eef0f3'; ctx.lineWidth = PB.flipper.rad * 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = '#9aa3b2'; ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI * 2); ctx.fill();
  }
  // launcher (checkpoint 2): spring squeezed by the charge, flag beside it
  const pl = PB.plunger, sq = (pb.phase === 'charging' ? pb.charge / PB.charge : 0) * 18;
  ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) { const y = pl.y + 2 + sq + i * (40 - sq) / 8; ctx.lineTo(pl.x + (i % 2 ? 16 : -16), y); }
  ctx.stroke();
  ctx.fillStyle = '#7ccf3a'; ctx.beginPath(); ctx.moveTo(346, 664); ctx.lineTo(370, 672); ctx.lineTo(346, 680); ctx.fill();
  ctx.strokeStyle = '#3d5a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(346, 664); ctx.lineTo(346, 708); ctx.stroke();
  // Dudu curled up: her double-jump spin frames (3-13 of the sheet), the ball's centre on the curl's centre
  const b = pb.ball;
  if (b) {
    const bx = b.x, by = b.y + (pb.phase === 'charging' ? sq : 0);
    const spin = typeof images !== 'undefined' && images.spin;
    if (spin && spin.complete) {
      const fr = 2 + (Math.floor(b.roll * 11) % 11), k = (PB.r * 2.2) / 91;
      ctx.save(); ctx.translate(bx, by); ctx.scale(b.face > 0 ? -k : k, k);
      ctx.drawImage(spin, fr * 192, 0, 192, 192, -96, -133, 192, 192);
      ctx.restore();
    } else { ctx.fillStyle = '#9bd26a'; ctx.beginPath(); ctx.arc(bx, by, PB.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  // charge gauge beside the lane, and the controls (left of the board)
  const gx = V.ox + 300 * V.s, gy0 = V.oy + 740 * V.s, gh = 180;
  if (pb.phase === 'ready' || pb.phase === 'charging') {
    const u = pb.phase === 'charging' ? pb.charge / PB.charge : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(gx - 10, gy0 - gh, 14, gh);
    ctx.fillStyle = u >= 1 ? '#ff6b6b' : '#ffd43b'; ctx.fillRect(gx - 8, gy0 - gh * u, 10, gh * u);
  }
  const kt = (t) => (typeof duduKeyText === 'function' ? duduKeyText(t) : t);
  ctx.save();
  ctx.fillStyle = 'rgba(20, 26, 34, 0.62)';
  ctx.beginPath(); ctx.roundRect(28, 230, 300, 150, 18); ctx.fill();
  pbText('500kg 핀볼', 178, 262, 24, '#ffe8a3', 'center');
  pbText(kt('{JUMP} 꾹 눌렀다 떼면 발사!'), 178, 304, 16, '#ffffff', 'center');
  pbText(kt('{MOVE} 왼쪽, 오른쪽 핀 튕기기'), 178, 334, 16, '#ffffff', 'center');
  ctx.restore();
  if (pb.phase === 'success') {
    const u = Math.min(1, pb.t / 0.25);
    ctx.save(); ctx.globalAlpha = u;
    pbText('500kg 달성!', W / 2 + 70, H / 2 - 20, 56, '#fff3bf', 'center', 'rgba(120, 60, 0, 0.85)');
    ctx.restore();
  }
}
function wrapLines(txt, maxW) {
  const out = [];
  let cur = '';
  for (const word of txt.split(' ')) {
    const t = cur ? cur + ' ' + word : word;
    if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = word; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
function drawTalkBox() {
  const tk = pb.talk;
  if (!tk) return;
  const lines = RUDE_LINES[tk.kind], line = lines[Math.min(tk.line, lines.length - 1)];
  const bw = 820, bx = (W - bw) / 2, by = 96;
  ctx.save();
  ctx.font = `22px 'ONE Mobile POP', 'Malgun Gothic', sans-serif`;
  const rows = wrapLines(line, bw - 64);
  const bh = 66 + rows.length * 34;
  ctx.fillStyle = 'rgba(255, 250, 240, 0.96)'; ctx.strokeStyle = '#7a2b25'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8332b';
  ctx.beginPath(); ctx.roundRect(bx + 24, by - 18, 86, 34, 17); ctx.fill();
  pbText('루드', bx + 67, by - 1, 19, '#ffffff', 'center');
  rows.forEach((r, i) => pbText(r, bx + 32, by + 44 + i * 34, 22, '#3b2a26', 'left'));
  const kt = (t) => (typeof duduKeyText === 'function' ? duduKeyText(t) : t);
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(tk.t * 6);
  pbText(kt('{JUMP} 다음'), bx + bw - 28, by + bh - 20, 15, '#8a5a50', 'right');
  ctx.restore();
}
function drawPinballOverlay() {
  if (!activeDragonStage() || activeDragonStage().stageCode !== DC52_CODE) return;
  const inBoard = pb.phase === 'ready' || pb.phase === 'charging' || pb.phase === 'play' || pb.phase === 'success'
    || (pb.phase === 'enter' && pb.fade && pb.fade.dir < 0);
  if (inBoard) drawPinballBoard();
  if (pb.phase === 'gym' && !pb.introDone && p.ground && p.on && p.on.id === 'DC52-ENTRY') {
    pbText('루드와 먼저 이야기해요', W / 2, 120, 24, '#ffffff', 'center', 'rgba(60,20,16,0.8)');
  }
  drawTalkBox();
  if (pb.fade) {
    const u = pb.fade.dir > 0 ? Math.min(1, pb.fade.t / 0.28) : Math.max(0, 1 - pb.fade.t / 0.28);
    ctx.fillStyle = `rgba(10, 8, 8, ${u})`; ctx.fillRect(0, 0, W, H);
  }
}
