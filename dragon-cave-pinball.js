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
  // v1.10.2: the flipper art is thick at its pivot and thin at its tip, so the flipper collides as a tapered capsule
  flipper: { len: 108, radHinge: 24, radTip: 10, rest: 0.52, up: -0.44, upSpeed: 18, downSpeed: 12 },   // angles in radians
  plunger: { x: 365, y: 712 }
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
  { id: 'BAGL', x: 462, y: 148, len: 62, thick: 34, ang: -0.66 },
  { id: 'BAGR', x: 795, y: 148, len: 62, thick: 34, ang: 0.66 }
];
const PB_FLIPPERS = [
  { side: -1, hx: 503, hy: 640, key: 'ArrowLeft' },
  { side: 1, hx: 754, hy: 640, key: 'ArrowRight' }
];
const PB_SCORE_PANEL = { x: 552, y: 434, w: 150, h: 86 };   // UI only (the panel art, 414 x 238, at 0.362)

// walls: the rounded outer frame, the launch lane wall, the two inlane guides down to the flipper hinges.
// [x1, y1, x2, y2, kind, half thickness]: the frame line is its inner edge (the rail is drawn outside it); the lane
// wall and the guides are rails drawn on their centre line, so they collide with half their drawn thickness.
function pbBuildWalls() {
  const B = PB_BOARD, segs = [];
  const pts = [];
  const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; pts.push([cx + Math.cos(a) * B.corner, cy + Math.sin(a) * B.corner]); } };
  arc(B.x0 + B.corner, B.y0 + B.corner, Math.PI, Math.PI * 1.5);
  arc(B.x1 - B.corner, B.y0 + B.corner, Math.PI * 1.5, Math.PI * 2);
  arc(B.x1 - B.corner, B.y1 - B.corner, 0, Math.PI * 0.5);
  arc(B.x0 + B.corner, B.y1 - B.corner, Math.PI * 0.5, Math.PI);
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; segs.push([a[0], a[1], b[0], b[1], 'frame', 2]); }
  segs.push([B.laneX, B.laneTop, B.laneX, 722, 'lane', 11]);
  segs.push([326, PB.plunger.y, B.laneX - 11, PB.plunger.y, 'plunger', 2]);
  segs.push([B.laneX, 575, 503, 632, 'guide', 9]);
  segs.push([B.x1, 575, 754, 632, 'guide', 9]);
  return segs;
}
const PB_WALLS = pbBuildWalls();

const pb = { phase: 'gym', introDone: false, clearDone: false, fresh: true, talk: null, score: 0, ball: null,
  flips: [], hits: {}, spacePrev: false, spaceArmed: false, charge: 0, t: 0, fade: null, rude: { key: 'rude_idle', t: 0 },
  stuckT: 0, launches: 0, drains: 0, pops: [] };
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
  loadPinballSfx();
  // the user's pinball parts board, cut by tools/dragon_cave_pinball_parts.py
  dcScript(window.PB_PARTS, `assets/world/dragoncave/pinball/parts.js${DC_ASSET_Q}`, () => {
    if (window.PB_PARTS) for (const k of Object.keys(window.PB_PARTS)) dcLoad('pb_' + k, `assets/world/dragoncave/pinball/${k}.webp${DC_ASSET_Q}`);
  });
}
function pbPart(k) {
  const m = window.PB_PARTS && window.PB_PARTS[k], im = dcImages['pb_' + k];
  return m && im ? { im, w: m[0], h: m[1] } : null;
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
  pb.pops = [];
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
  pb.stuckT = 0; pb.laneStillT = 0;
  // a jump key already held from before does not count: charging starts from a new press
  pb.spaceArmed = !keys.has('Space');
  if (reason) pbLog(reason);
}
// ----------------------------------------------------------------------------
// Flipper sounds (user's packages DUDU_RUDE_PINBALL_FLIPPER_SFX_ORIGINAL_261125 and, overriding its mapping,
// DUDU_RUDE_PINBALL_CONTACT_SFX_FIX_REV1_261125; original synthesized effects):
//   flipper pressed (released -> pressed; held keys and key auto-repeat do not count): swing_miss only, quiet.
//   the ball really meets a flipper (pbStep's ball-flipper collision): hit_01-03, never the same one twice in a row;
//   a hard meeting: hit_strong instead (never both). One sound per contact: a contact counts when the ball comes
//   onto the flipper, or when the swinging flipper drives into a ball already on it; each flipper keeps its own
//   65ms cooldown, and touches slower than 40 units/s (a ball resting on the flipper) make no sound.
//   Strength = the speed at which ball and flipper surface close along the contact normal, just before the bounce.
// Played through the game's own AudioContext (`audio`, game.js tone) at the master volume and mute, through a
// compressor so the loud hits never clip; the hits carry a short low thump for weight (v1.10.4, user). The WAV
// files are used (iPhone Safari may not decode OGG). Opened as a file (fetch refused) they fall back to <audio>.
// ----------------------------------------------------------------------------
const PB_SFX = { hits: ['rude_flipper_hit_01', 'rude_flipper_hit_02', 'rude_flipper_hit_03'], strong: 'rude_flipper_hit_strong',
  swing: 'rude_flipper_swing_miss',
  gain: 1.4, strongGain: 1.3, swingGain: 0.45, thump: 0.5,
  minSpeed: 40, strongSpeed: 520, cooldown: 0.065 };
const pbSfx = { buf: {}, el: {}, requested: false, last: -1, clock: 0, bus: null };
function pbSfxBus() {
  if (pbSfx.bus && pbSfx.bus.context === audio) return pbSfx.bus;
  const c = audio.createDynamicsCompressor();
  c.threshold.value = -14; c.knee.value = 6; c.ratio.value = 5; c.attack.value = 0.002; c.release.value = 0.12;
  c.connect(audio.destination);
  pbSfx.bus = c;
  return c;
}
// a quick falling low tone under a hit: the weight of the strike
function pbThump(gain) {
  const vol = typeof getEffectiveSoundVolume === 'function' ? getEffectiveSoundVolume() : 1;
  if (vol <= 0 || !audio) return;
  try {
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    g.gain.setValueAtTime(gain * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g); g.connect(pbSfxBus()); o.start(t); o.stop(t + 0.12);
  } catch (e) {}
}
// Target sounds (user's package DUDU_RUDE_PINBALL_TARGET_SCORE_SFX_REV1_261125, original synthesized effects): one
// sound each time a target really scores (pbScore, the same place the kg go up), picked by the kg the target gives
// (3, 10, 20, and 30 should a 30kg target ever exist), the sandbag sound for the sandbags, and the 500kg jingle once
// at success, just after the last hit. Never the same variant twice in a row per group. OGG where the browser
// plays it, else WAV (iPhone Safari).
const PB_TARGET_SFX = {
  3: ['rude_target_3kg_hit_01', 'rude_target_3kg_hit_02'], 10: ['rude_target_10kg_hit_01', 'rude_target_10kg_hit_02'],
  20: ['rude_target_20kg_hit_01', 'rude_target_20kg_hit_02'], 30: ['rude_target_30kg_hit_01', 'rude_target_30kg_hit_02'],
  sandbag: ['rude_target_sandbag_hit_01', 'rude_target_sandbag_hit_02'],
  clear: 'rude_target_500kg_clear', gain: 1.1, lastHitAtClear: 0.75, clearDelay: 0.12
};
const pbTargetLast = {};
function pbPlayTarget(group, gain) {
  const list = PB_TARGET_SFX[group];
  if (!list) return null;
  let i = Math.floor(Math.random() * list.length);
  if (i === pbTargetLast[group]) i = (i + 1) % list.length;
  pbTargetLast[group] = i;
  pbPlay(list[i], gain);
  return list[i];
}
function loadPinballSfx() {
  if (pbSfx.requested) return;
  pbSfx.requested = true;
  let ogg = '';
  try { ogg = new Audio().canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) {}
  const T = PB_TARGET_SFX, targets = [...T[3], ...T[10], ...T[20], ...T[30], ...T.sandbag, T.clear];
  for (const n of [...PB_SFX.hits, PB_SFX.strong, PB_SFX.swing, ...targets]) {
    const ext = targets.includes(n) && ogg ? 'ogg' : 'wav';
    const src = `assets/sfx/dragoncave/${n}.${ext}${DC_ASSET_Q}`;
    const fallback = () => { const a = new Audio(src); a.preload = 'auto'; pbSfx.el[n] = a; };
    try {
      fetch(src).then(r => r.arrayBuffer()).then(ab => {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        return audio.decodeAudioData(ab);
      }).then(b => { pbSfx.buf[n] = b; }).catch(fallback);
    } catch (e) { fallback(); }
  }
}
function pbPlay(name, gain, delay = 0) {
  const vol = typeof getEffectiveSoundVolume === 'function' ? getEffectiveSoundVolume() : 1;
  if (vol <= 0) return;
  try {
    const b = pbSfx.buf[name];
    if (b && audio) {
      audio.resume();
      const s = audio.createBufferSource(), g = audio.createGain();
      s.buffer = b; g.gain.value = gain * vol;
      s.connect(g); g.connect(pbSfxBus()); s.start(audio.currentTime + delay);
      return;
    }
    const el = pbSfx.el[name];
    if (el) {
      const go = () => { const a = el.cloneNode(); a.volume = Math.min(1, gain * vol); a.play().catch(() => {}); };
      if (delay > 0) setTimeout(go, delay * 1000); else go();
    }
  } catch (e) {}
}
// one ball-flipper contact: hit_01-03, or hit_strong for a hard one
function pbPlayContact(f, speed) {
  const strong = speed >= PB_SFX.strongSpeed;
  let name;
  if (strong) name = PB_SFX.strong;
  else {
    let i = Math.floor(Math.random() * PB_SFX.hits.length);
    if (i === pbSfx.last) i = (i + 1) % PB_SFX.hits.length;
    pbSfx.last = i;
    name = PB_SFX.hits[i];
  }
  pbPlay(name, strong ? PB_SFX.strongGain : PB_SFX.gain);
  pbThump(PB_SFX.thump);
  pbLog('ball_flipper_contact', { side: f.side < 0 ? 'left' : 'right', speed: Math.round(speed), sound: name });
}
function updateFlippers(dt) {
  const F = PB.flipper;
  pbSfx.clock += dt;
  let pressed = false;
  for (const f of pb.flips) {
    const held = keys.has(f.key);
    const target = held ? F.up : F.rest;
    const prev = f.a;
    if (f.a > target) f.a = Math.max(target, f.a - F.upSpeed * dt);
    else if (f.a < target) f.a = Math.min(target, f.a + F.downSpeed * dt);
    f.w = (f.a - prev) / Math.max(1e-6, dt);   // + is down, - is up (left flipper; mirrored on the right)
    if (held && !f.wasHeld) pressed = true;
    f.wasHeld = held;
    if (f.sfxCool > 0) f.sfxCool -= dt;
  }
  // pressing only moves the flipper: the light swing sound (both pressed in the same step: one sound)
  if (pressed) { pbPlay(PB_SFX.swing, PB_SFX.swingGain); pbLog('flipper_press'); }
}
function pbFlipperEnds(f) {
  const ang = f.side < 0 ? f.a : Math.PI - f.a;
  return [f.hx, f.hy, f.hx + Math.cos(ang) * PB.flipper.len, f.hy + Math.sin(ang) * PB.flipper.len];
}
function closestOnSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return [x1 + dx * t, y1 + dy * t, t];
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
function pbScore(id, kg, group = kg) {
  const h = pb.hits[id] || (pb.hits[id] = { cool: 0, touching: false, flash: 0, count: 0 });
  h.flash = 0.28;
  if (h.touching || h.cool > 0) { h.touching = true; return; }
  h.touching = true; h.cool = PB.hitCool; h.count++;
  pb.score += kg;
  pb.pops.push({ x: pb.ball ? pb.ball.x : 0, y: pb.ball ? pb.ball.y - 30 : 0, kg, t: 0 });
  // one target sound per kg gained (the hit that reaches 500kg a little softer, the jingle follows it)
  const sound = pbPlayTarget(group, PB_TARGET_SFX.gain * (pb.score >= DC52_GOAL_KG ? PB_TARGET_SFX.lastHitAtClear : 1));
  pbLog('hit', { id, kg, count: h.count, sound });
}
function pbStep(dt) {
  const b = pb.ball, touched = {};
  b.vy += PB.g * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  for (const w of PB_WALLS) {
    const [cx, cy] = closestOnSeg(b.x, b.y, w[0], w[1], w[2], w[3]);
    pbCollide(b, cx, cy, w[5], PB.wallE);
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
      touched[s.id] = true; pbScore(s.id, SANDBAG_SCORE_KG, 'sandbag');
    }
  }
  for (const f of pb.flips) {
    const [x1, y1, x2, y2] = pbFlipperEnds(f);
    const [cx, cy, t] = closestOnSeg(b.x, b.y, x1, y1, x2, y2);
    // surface speed of the flipper at the contact point: w x r (the right flipper turns the other way)
    const w = f.side < 0 ? f.w : -f.w, rx = cx - f.hx, ry = cy - f.hy;
    const svx = -w * ry, svy = w * rx;
    // closing speed along the contact normal, measured before the bounce changes it
    const nd = Math.hypot(b.x - cx, b.y - cy) || 1;
    const closing = -((b.vx - svx) * (b.x - cx) + (b.vy - svy) * (b.y - cy)) / nd;
    const hit = pbCollide(b, cx, cy, PB.flipper.radHinge + (PB.flipper.radTip - PB.flipper.radHinge) * t, PB.flipperE, svx, svy);
    if (hit) {
      // sound: a fresh contact, or the swinging flipper driving into a ball that is already on it
      const fresh = !f.contact || (f.w < 0 && closing > PB_SFX.minSpeed);
      if (fresh && closing > PB_SFX.minSpeed && !(f.sfxCool > 0)) { f.sfxCool = PB_SFX.cooldown; pbPlayContact(f, closing); }
    }
    f.contact = hit;
  }
  for (const id of Object.keys(pb.hits)) if (!touched[id]) pb.hits[id].touching = false;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > PB.maxSpeed) { b.vx *= PB.maxSpeed / sp; b.vy *= PB.maxSpeed / sp; }
}
function updatePinballPlay(dt) {
  const b = pb.ball, n = PB.substeps, h = dt / n;
  for (let i = 0; i < n; i++) { pbStep(h); if (pb.score >= DC52_GOAL_KG) break; }
  for (const id of Object.keys(pb.hits)) { const k = pb.hits[id]; k.cool = Math.max(0, k.cool - dt); k.flash = Math.max(0, k.flash - dt); }
  for (const q of pb.pops) q.t += dt;
  pb.pops = pb.pops.filter(q => q.t < 0.8);
  const sp = Math.hypot(b.vx, b.vy);
  b.roll += sp * dt / (2 * Math.PI * PB.r);
  if (Math.abs(b.vx) > 30) b.face = b.vx > 0 ? 1 : -1;
  // 500kg: success is settled in this same step; nothing scores or drains after it
  if (pb.score >= DC52_GOAL_KG) {
    pb.phase = 'success'; pb.t = 0;
    pbLog('success', { score: pb.score });
    pbPlay(PB_TARGET_SFX.clear, PB_TARGET_SFX.gain, PB_TARGET_SFX.clearDelay);
    pbLog('sfx_clear', { sound: PB_TARGET_SFX.clear });
    return;
  }
  // a weak launch that falls back down the lane: back on the launcher, nothing lost, launch again freely.
  // v1.10.1 fix: the ball comes to rest on the spring 2px higher than where it starts (the spring's own thickness),
  // so the old check (start height) never fired and the ball sat on the spring for good.
  if (b.x < PB_BOARD.laneX && b.y >= PB.plunger.y - PB.r - 8 && b.vy >= -5) { pbReady('lane_return'); return; }
  // any other way the ball comes to rest inside the lane: same
  if (b.x < PB_BOARD.laneX && sp < 30 && b.y > PB_BOARD.laneTop) {
    pb.laneStillT = (pb.laneStillT || 0) + dt;
    if (pb.laneStillT > 0.4) { pb.laneStillT = 0; pbReady('lane_return'); return; }
  } else pb.laneStillT = 0;
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
// gym ledges: the parts board's stone floor piece, its two ends kept and its middle repeated (evenly scaled)
function drawGymLedge(a, x, y) {
  const F = pbPart('floor');
  if (!F) { ctx.fillStyle = '#5c534d'; ctx.fillRect(x, y, a.w, 40); return; }
  const k = 46 / F.h, cap = 46, cw = cap * k;
  ctx.drawImage(F.im, 0, 0, cap, F.h, x, y, cw, F.h * k);
  const midSrc = F.w - cap * 2, midW = midSrc * k, end = x + a.w - cw;
  for (let cx = x + cw - 1; cx < end; cx += midW - 1) {
    const w = Math.min(midW, end - cx + 1);
    ctx.drawImage(F.im, cap, 0, w / k, F.h, cx, y, w, F.h * k);
  }
  ctx.drawImage(F.im, F.w - cap, 0, cap, F.h, end - 1, y, cw, F.h * k);
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

// board units -> screen: the whole board, rails included, fits the screen height
const PB_RAIL = 24;   // drawn thickness of the outer rail (it sits outside the frame line the ball bounces on)
const PB_VIEW = (() => {
  const B = PB_BOARD, m = PB_RAIL + 6, s = 680 / (B.y1 - B.y0 + m * 2);
  return { s, ox: W / 2 - ((B.x0 + B.x1) / 2) * s + 70, oy: 20 - (B.y0 - m) * s };
})();
function pbText(txt, x, y, size, color, align = 'center', stroke = null, glow = null) {
  ctx.font = `${size}px 'ONE Mobile POP', 'Malgun Gothic', sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(3, size / 5); ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); }
  if (glow) { ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = size * 0.6; ctx.fillStyle = color; ctx.fillText(txt, x, y); ctx.restore(); }
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
// draw part k with its point (px, py) (part pixels) at (x, y), scaled by k, turned by rot
function pbDraw(name, x, y, k, px, py, rot = 0, alpha = 1) {
  const P = pbPart(name);
  if (!P) return false;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(P.im, -px * k, -py * k, P.w * k, P.h * k);
  ctx.restore();
  return true;
}
// a metal rail along a segment, the rail art scaled evenly to its length (no stretching one way)
function pbRail(name, x1, y1, x2, y2) {
  const P = pbPart(name);
  if (!P) return;
  const len = Math.hypot(x2 - x1, y2 - y1), k = len / P.w;
  pbDraw(name, (x1 + x2) / 2, (y1 + y2) / 2, k, P.w / 2, P.h / 2, Math.atan2(y2 - y1, x2 - x1));
}
// the outer rail in the parts' colours: dark edge, grey metal, red stripes, bolts
function pbFramePath(grow) {
  const B = PB_BOARD;
  ctx.beginPath();
  ctx.roundRect(B.x0 - grow, B.y0 - grow, B.x1 - B.x0 + grow * 2, B.y1 - B.y0 + grow * 2, B.corner + grow);
}
function drawPinballFrame() {
  const g = PB_RAIL / 2;
  ctx.save();
  pbFramePath(g); ctx.lineWidth = PB_RAIL + 6; ctx.strokeStyle = '#34353b'; ctx.stroke();
  pbFramePath(g); ctx.lineWidth = PB_RAIL; ctx.strokeStyle = '#b9bbc1'; ctx.stroke();
  pbFramePath(g - 6); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
  pbFramePath(g + 3); ctx.lineWidth = 7; ctx.strokeStyle = '#c4313a'; ctx.setLineDash([30, 46]); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
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
  pbFramePath(0); ctx.fillStyle = 'rgba(30, 32, 40, 0.62)'; ctx.fill();
  drawPinballFrame();
  // lane wall, the two guides down to the flippers
  const RV = pbPart('rail_vert');
  if (RV) {
    const k = 22 / RV.w, th = RV.h * k;
    for (let y = B.laneTop - 10; y < 722; y += th - 2) pbDraw('rail_vert', B.laneX, y, k, RV.w / 2, 0);
  }
  for (const w of PB_WALLS) if (w[4] === 'guide') pbRail('rail_short', w[0], w[1], w[2], w[3]);
  // arrows up the lane while Dudu waits on the launcher
  if (pb.phase === 'ready' || pb.phase === 'charging') {
    const A = pbPart('arrows');
    if (A) pbDraw('arrows', 365, 420, 74 / A.w, A.w / 2, A.h / 2, -Math.PI / 2, 0.55 + 0.35 * Math.sin(pb.rude.t * 5));
  }
  // score panel (UI only, never collided with): TOTAL and the current kg
  const P = PB_SCORE_PANEL, PP = pbPart('panel');
  if (PP) {
    const k = P.w / PP.w;
    pbDraw('panel', P.x, P.y, k, 0, 0);
    pbText(`${Math.min(pb.score, DC52_GOAL_KG)}kg`, P.x + 210 * k, P.y + 152 * k, 25, '#ffe7b0', 'center', null, 'rgba(255,150,60,0.9)');
    pbText(`/ ${DC52_GOAL_KG}kg`, P.x + 210 * k, P.y + 205 * k, 9, '#f3d7d7', 'center');
  }
  // plates: the weight plate art (disc and base together are about round) centred on the target, as wide as it
  for (const t of PB_PLATES) {
    const name = t.kg >= 20 ? 'plate20' : t.kg >= 10 ? 'plate10' : 'plate3', A = pbPart(name);
    const fl = (pb.hits[t.id] && pb.hits[t.id].flash) || 0;
    if (!A) continue;
    const k = (t.r * 2) / A.w, bob = fl > 0 ? Math.sin(fl * 50) * 2 : 0;
    pbDraw(name, t.x, t.y + bob, k, A.w / 2, A.h / 2);
    if (fl > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      pbDraw(name, t.x, t.y + bob, k, A.w / 2, A.h / 2, 0, Math.min(0.6, fl * 2.4));
      ctx.restore();
    }
  }
  // sandbags: the bag hangs along the sketch's tilted bar, the hook at its upper end
  for (const s of PB_BAGS) {
    const A = pbPart('sandbag');
    if (!A) continue;
    const fl = (pb.hits[s.id] && pb.hits[s.id].flash) || 0;
    let ux = Math.cos(s.ang), uy = Math.sin(s.ang);
    if (uy > 0) { ux = -ux; uy = -uy; }
    const rot = Math.atan2(ux, -uy) + Math.sin(fl * 40) * fl * 0.5, k = s.thick / 125;
    pbDraw('sandbag', s.x, s.y, k, A.w / 2, 180, rot);
  }
  // flippers: the art turned about its pivot (pivot and tip centres measured on the art)
  for (const f of pb.flips) {
    const left = f.side < 0, name = left ? 'flipper_l' : 'flipper_r', A = pbPart(name);
    const ang = left ? f.a : Math.PI - f.a;
    if (A) {
      const k = PB.flipper.len / 287, hx = left ? 71 : A.w - 71, native = left ? 0.094 : Math.PI - 0.094;
      pbDraw(name, f.hx, f.hy, k, hx, 73, ang - native);
    }
  }
  // launcher (checkpoint 2): the spring box squeezed by the charge, the green flag on it, a light beside the lane
  const pl = PB.plunger, u = pb.phase === 'charging' ? pb.charge / PB.charge : 0, PL = pbPart('plunger');
  const sq = u * 18;
  if (PL) {
    const k = 80 / PL.w, h = PL.h * k;
    ctx.save();
    ctx.translate(pl.x, pl.y + h - 4); ctx.scale(1, (h - sq) / h);
    ctx.drawImage(PL.im, -40, -h, 80, h);
    ctx.restore();
  }
  const FL = pbPart('flag');
  if (FL) pbDraw('flag', 338, pl.y - 2 + sq, 40 / FL.w, FL.w * 0.2, FL.h);
  const lightName = (pb.phase === 'ready' || pb.phase === 'charging') ? 'light_green' : 'light_red', LI = pbPart(lightName);
  if (LI) pbDraw(lightName, B.x0 - PB_RAIL - 12, 640, 34 / LI.w, LI.w / 2, LI.h);
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
  // +kg badges rising from each hit
  const BD = pbPart('badge');
  for (const q of pb.pops) {
    const a = q.t < 0.1 ? q.t / 0.1 : Math.max(0, 1 - (q.t - 0.5) / 0.3), y = q.y - q.t * 40;
    if (BD) pbDraw('badge', q.x, y, 70 / BD.w, BD.w / 2, BD.h / 2, 0, a);
    ctx.save(); ctx.globalAlpha = a;
    pbText(`+${q.kg}kg`, q.x, y + 1, 17, '#ffffff', 'center', 'rgba(110,20,20,0.7)');
    ctx.restore();
  }
  ctx.restore();
  // charge gauge beside the lane, and the controls (left of the board)
  const gx = V.ox + (B.x0 - PB_RAIL - 22) * V.s, gy0 = V.oy + 600 * V.s, gh = 160;
  if (pb.phase === 'ready' || pb.phase === 'charging') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(gx - 7, gy0 - gh, 14, gh);
    ctx.fillStyle = u >= 1 ? '#ff6b6b' : '#ffd43b'; ctx.fillRect(gx - 5, gy0 - gh * u, 10, gh * u);
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
    const a = Math.min(1, pb.t / 0.25);
    ctx.save(); ctx.globalAlpha = a;
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
  const lines = RUDE_LINES[tk.kind];
  drawDragonDialog('rude', lines[Math.min(tk.line, lines.length - 1)], tk.t);   // v1.12.0: the user's box art
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
