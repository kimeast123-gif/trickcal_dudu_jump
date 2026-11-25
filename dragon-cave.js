'use strict';
// ============================================================================
// v1.10 WORLD 5 「용족동굴」: five dragon rooms visited in story order, each one short mini-game
// (package DUDU_WORLD5_DRAGON_CAVE_MASTER_STAGE51_261125; CLAUDE_WORLD5_MASTER_AND_STAGE51.md).
//   5-1 제이드의 금고 (Jade + Opal: book barrage, then tears and crying stuns)   <- built here
//   5-2 루드의 헬스짐, 5-3 키디언의 보금자리, 5-4 리츠의 비밀 수련, 5-5 다야 선샌미의 방
//   <- planned only: shown as "준비 중" cards until the user sends their sketches, motions and lines.
// The stages ride on the World 1 stage runner (worldmap-mode.js) like the other worlds.
//
// 5-1 layout: USER_JADE_STAGE51_SKETCH.png (1446 x 447). Order, up/down and the three flags follow the sketch; the
// spacing follows the jump (one jump about 148px up, two 279px; run 320px/s): steps 70-110px, gaps 135-200px.
// y = 580 - (357 - sketch y) * 2.4 near the sketch, then tuned so that no low ledge reaches a high ledge it should not
// (docs/world5/JADE_MAP1_UNINTENDED_REACH.csv). The brown floor of the sketch is not ground: a deep misty drop where
// Jade and Opal walk below Dudu; falling into it restarts from the checkpoint (killYAt).
// ============================================================================

const DC_WORLD_ID = 'world5_dragoncave';
const DC_ASSET_Q = '?v=v1_12_3_261126'; // rewritten by tools/release.py on every deploy
const DC_STAGE_ORDER = ['dragon_cave_1', 'dragon_cave_2', 'dragon_cave_3', 'dragon_cave_4', 'dragon_cave_5'];
const DC_STAGE_INFO = {
  dragon_cave_1: { code: '5-1', name: '제이드의 금고', desc: '오팔이 던지는 책을 피하고, 울음이 터지면 눈물을 피해 금고 끝까지 가요.' },
  dragon_cave_2: { code: '5-2', name: '루드의 헬스짐', desc: '루드의 500kg 핀볼에 도전해요.' },
  dragon_cave_3: { code: '5-3', name: '키디언의 보금자리', desc: '어두운 방에서 흑요석을 피해 가요. 가끔 방이 밝아져요.' },
  dragon_cave_4: { code: '5-4', name: '리츠의 비밀 수련', desc: '리츠의 대검과 날아오는 검기를 피해요.' },
  dragon_cave_5: { code: '5-5', name: '다야 선샌미의 방', desc: '다야의 잔소리를 듣고 용족동굴 나들이를 마쳐요.' }
};

// ----------------------------------------------------------------------------
// Assets: room backgrounds and the 5-1 ledge parts (tools/dragon_cave_assets.py). The parts are the package's
// TEST CANDIDATE art; they are drawn at their own proportions, never stretched in one direction only.
// ----------------------------------------------------------------------------
const dcImages = {};
let dcParts = null, dcAtlas = null, _dcRequested = false;
function dcLoad(key, src) {
  if (dcImages[key] !== undefined) return;
  dcImages[key] = null;
  const im = new Image();
  im.onload = async () => { try { if (im.decode) await im.decode(); } catch (e) {} dcImages[key] = im; };
  im.onerror = () => console.warn('[dragon cave] failed to load', src);
  im.src = src;
}
// v1.12.0 (user): the talk boxes of World 5 use the user's box art, one per speaker (Rude, Ritz, Daya: the user's
// attachments; Dudu and Amelia: the story cutscene boxes already in the game, same art family). Name tag drawn in.
const DC_DIALOG_ART = {
  rude: 'assets/world/dragoncave/dialog/rude.webp',
  ritz: 'assets/world/dragoncave/dialog/ritz.webp',
  daya: 'assets/world/dragoncave/dialog/daya.webp',
  dudu: 'assets/cinematics/dudu-dialogue.png',
  amelia: 'assets/cinematics/amelia-dialogue.png'
};
// one talk line in the speaker's box, across the top of the screen (clear of the touch controls at the bottom).
// The text sits where the story cutscenes put it (left 21%, 59% wide); t blinks the next-line hint.
function drawDragonDialog(speaker, text, t) {
  const im = dcImages['dlg_' + speaker];
  const bw = W, bh = im ? bw * im.height / im.width : 224, by = 26;
  ctx.save();
  if (im) ctx.drawImage(im, 0, by, bw, bh);
  else { ctx.fillStyle = 'rgba(250, 250, 250, 0.96)'; ctx.beginPath(); ctx.roundRect(bw * 0.185, by + bh * 0.22, bw * 0.635, bh * 0.7, 40); ctx.fill(); }
  ctx.font = `24px 'ONE Mobile POP', 'Malgun Gothic', sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#333333';
  const maxW = bw * 0.57, rows = [];
  let cur = '';
  for (const word of String(text).split(' ')) {
    const tryLine = cur ? cur + ' ' + word : word;
    if (ctx.measureText(tryLine).width > maxW && cur) { rows.push(cur); cur = word; } else cur = tryLine;
  }
  if (cur) rows.push(cur);
  const lh = 34, cy = by + bh * 0.585;
  rows.forEach((r, i) => ctx.fillText(r, bw * 0.215, cy + (i - (rows.length - 1) / 2) * lh));
  const hint = typeof duduKeyText === 'function' ? duduKeyText('{JUMP} 다음') : '다음';
  ctx.font = `15px 'ONE Mobile POP', 'Malgun Gothic', sans-serif`;
  ctx.textAlign = 'right'; ctx.fillStyle = '#8a8a8a';
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 6);
  ctx.fillText(hint, bw * 0.775, by + bh * 0.79);
  ctx.restore();
}
window.drawDragonDialog = drawDragonDialog;
function loadDragonAssets() {
  if (_dcRequested) return;
  _dcRequested = true;
  dcLoad('bg1', `assets/world/dragoncave/bg1.webp${DC_ASSET_Q}`);
  for (const [k, src] of Object.entries(DC_DIALOG_ART)) dcLoad('dlg_' + k, src + DC_ASSET_Q);
  const done = () => {
    dcParts = window.DC_PARTS || null;
    if (!dcParts) return;
    for (const k of Object.keys(dcParts)) dcLoad('pt_' + k, `assets/terrain/dragon_cave/${k}.webp${DC_ASSET_Q}`);
  };
  dcScript(window.DC_PARTS, `assets/terrain/dragon_cave/parts.js${DC_ASSET_Q}`, done);
  // Jade and Opal motions (tools/dragon_cave_motions.py); a script, not fetched JSON, so file:// works too
  dcScript(window.DC_ATLAS, `assets/npc/dragoncave/atlas.js${DC_ASSET_Q}`, () => {
    dcAtlas = window.DC_ATLAS || null;
    if (dcAtlas) for (const k of Object.keys(dcAtlas.motions)) dcLoad('m_' + k, `assets/npc/dragoncave/${k}.webp${DC_ASSET_Q}`);
  });
}
function dcScript(ready, src, done) {
  if (ready) { done(); return; }
  const sc = document.createElement('script');
  sc.src = src;
  sc.onload = done;
  sc.onerror = () => { console.warn('[dragon cave] failed to load', src); _dcRequested = false; };
  document.head.appendChild(sc);
}
function dcPart(k) {
  const m = dcParts && dcParts[k], im = dcImages['pt_' + k];
  return m && im ? { im, w: m[0], h: m[1], surf: m[2] } : null;
}

// ----------------------------------------------------------------------------
// 5-1 layout. [id, x, y, w, art, zone, sketch]   art: pad | long | small    zone: book zone A-D or tear zone
// ----------------------------------------------------------------------------
const DC51_WIDTH = 9700;
const DC51_PLATFORMS = [
  // first flag (start, checkpoint 1) and the low row to the right: book zone A
  ['START', 60, 580, 380, 'pad', 'A', 'flag 1'],
  ['A1', 620, 491, 460, 'long', 'A', 'a'],
  ['A2', 1270, 556, 460, 'long', 'A', 'b'],
  ['A3', 1900, 479, 160, 'small', 'A', 'c'],
  // back up and to the left: book zone B
  ['B1', 2230, 384, 160, 'small', 'B', 'd'],
  ['B2', 1660, 290, 430, 'long', 'B', 'e'],
  ['B3', 1040, 210, 420, 'long', 'B', 'f'],
  ['B4', 700, 140, 150, 'small', 'B', 'g'],
  // the small steps at the far left, then the top row to the right: book zones C and D
  ['C1', 380, 40, 150, 'small', 'C', 'h'],
  ['C2', 710, -70, 150, 'small', 'C', 'i'],
  ['C3', 1040, -180, 600, 'long', 'C', 'j'],
  ['C4', 1840, -100, 600, 'long', 'C', 'k'],
  ['D1', 2640, -20, 600, 'long', 'D', 'l'],
  ['D2', 3440, 60, 600, 'long', 'D', 'm'],
  ['D3', 4240, -30, 560, 'long', 'D', 'n'],
  // middle flag: checkpoint 2, the tears start here
  ['CP2', 5000, 90, 420, 'pad', 'CP2', 'flag 2'],
  // the field of small blocks in three rows: tear zones T1-T3 (by x)
  ['L1', 5555, 200, 170, 'small', 'T', 'low 1'], ['M1', 5858, 95, 170, 'small', 'T', 'mid 1'],
  ['U1', 6195, -10, 170, 'small', 'T', 'top 1'], ['L2', 6186, 200, 170, 'small', 'T', 'low 2'],
  ['M2', 6547, 95, 170, 'small', 'T', 'mid 2'],
  ['U2', 6924, -10, 170, 'small', 'T', 'top 2'], ['L3', 7006, 200, 170, 'small', 'T', 'low 3'],
  ['M3', 7367, 95, 170, 'small', 'T', 'mid 3'],
  ['U3', 7769, -10, 170, 'small', 'T', 'top 3'], ['L4', 7810, 200, 170, 'small', 'T', 'low 4'],
  ['M4', 8253, 95, 170, 'small', 'T', 'mid 4'],
  ['U4', 8597, -10, 170, 'small', 'T', 'top 4'], ['L5', 8614, 200, 170, 'small', 'T', 'low 5'],
  // last flag: goal
  ['GOAL', 8940, 40, 520, 'pad', 'GOAL', 'flag 3']
];
const DC51_TEAR_ZONES = [{ id: 'T1', from: 5420 }, { id: 'T2', from: 6800 }, { id: 'T3', from: 7950 }];
// The sketch's brown floor: [x, y] corners, straight lines between. Render-only; below it is the fall.
const DC51_FLOOR = [[-200, 700], [3000, 700], [3300, 600], [3900, 600], [4150, 420], [DC51_WIDTH + 200, 420]];
function dcFloorY(x) {
  const F = DC51_FLOOR;
  if (x <= F[0][0]) return F[0][1];
  for (let i = 1; i < F.length; i++) {
    if (x <= F[i][0]) { const [x0, y0] = F[i - 1], [x1, y1] = F[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return F[F.length - 1][1];
}

function buildDragonStage51() {
  const s = makeWorldStage({
    id: 'world5_dragon_51',
    stageCode: 'dragon_cave_1',
    name: '제이드의 금고',
    subtitle: '오팔의 책과 눈물을 피해요',
    worldWidth: DC51_WIDTH,
    killY: 760,
    minCamY: -640,
    maxCamY: 220,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'DC51-START', x: 200, feetY: 580 } },
    segments: [{ start: 0, end: DC51_WIDTH, bg: 'dragoncave' }],
    backgroundRanges: {},
    goal: { id: 'dc51-goal', exitRoute: 'default', x: 9200, y: 40, w: 60, h: 120, hidden: true }
  });
  s.worldId = DC_WORLD_ID;
  s.dragonCave = true;
  s.routeLabel = '월드 5';
  s.musicTrack = 9;   // 07. No Way Out (user, event.js DRAGON_BGM_TRACKS.JADE)
  s.customBackground = drawDragonBackground;
  s.killYAt = (x) => dcFloorY(x) + 30;
  s.onLoad = () => loadDragonAssets();
  s.onReset = () => resetDragonRuntime();
  s.onComplete = () => completeDragonStage('dragon_cave_1');
  for (const [id, x, y, w, art, zone, sketch] of DC51_PLATFORMS) {
    wSurface(s, x, y, w, 'stone', { id: 'DC51-' + id, dcDraw: art, dcZone: zone, dcSketch: sketch });
  }
  wCheckpoint(s, '금고 입구', 200, 580);
  wCheckpoint(s, '금고 한가운데', 5210, 90);
  wCheckpoint(s, '금고 끝', 9200, 40);
  s.hudStars = 0;
  return s;
}

const DC_STAGE_BUILDERS = { dragon_cave_1: buildDragonStage51 };
if (typeof world1Stages !== 'undefined') {
  for (const code of Object.keys(DC_STAGE_BUILDERS)) {
    if (!world1Stages.some(st => st.worldId === DC_WORLD_ID && st.stageCode === code)) world1Stages.push(DC_STAGE_BUILDERS[code]());
  }
}
function dragonStageIndex(code) { return world1Stages.findIndex(st => st.worldId === DC_WORLD_ID && st.stageCode === code); }
function activeDragonStage() {
  if (typeof gameMode === 'undefined' || gameMode !== 'world') return null;
  const st = world1Stages[activeWorldStageIndex];
  return st && st.worldId === DC_WORLD_ID ? st : null;
}
window.activeDragonStage = activeDragonStage;

// ----------------------------------------------------------------------------
// 5-1 runtime (REV3, DUDU_WORLD5_STAGE51_JADE_OPAL_MOTION_REV3_261125):
//   books:    Opal runs (Move) a stretch, stops, plays Happy_7 or Happy_8 (picked at random each stop) and throws a
//             volley of books at the motion's release moment, then runs on. No books while she runs.
//   cp2:      landing on checkpoint 2 holds Dudu briefly and clears the books; no new book cycle starts.
//   waitBlue: Dudu walks on; the blue dotted line of the sketch (DC51_BLUE_X, right of the CP2 flag) is the trigger.
//   relocate: crossing it once sends Opal and Jade (Move) straight to the crying spot, with no stop and no attack.
//   tears:    from the crying spot Opal plays Sad_6 or Sad_10 and throws tears; now and then her big cry freezes
//             Dudu. When Dudu passes into the next tear zone Opal runs (no tears) to that zone's crying spot.
// Jade keeps her angry face (Angry_2) whenever she stands and follows Dudu (Move while she walks). She never throws.
// Book zones (A-D) and tear zones (T1-T3) follow the furthest ledge or x Dudu reached, not single trigger ledges, so
// jumping or dashing past a ledge does not skip them. Projectiles work like Marie's bombs (hazards.js makeMarieBomb):
// a dashed arc and a landing mark warn first; each hurts at most once (applyStunHit: 1 health, invulnerable after).
// All numbers are first tuning values, to be set by playing.
// ----------------------------------------------------------------------------
const DC_BOOK = {
  zones: ['A', 'B', 'C', 'D'],
  count: { A: 4, B: 6, C: 6, D: 8 },   // v1.10.1 (user): twice as many
  // v1.12.1 (user): plus books thrown where Dudu will be when they land, from her recent speed (as Ritz's waves in
  // 5-4), so running straight on runs under them: one in A and B, two in C and D. The second lands a little further on.
  ahead: { A: 1, B: 1, C: 2, D: 2 }, aheadStep: 110, vTau: 0.35, vMax: 700,
  flight: [1.35, 1.6],          // seconds in the air (random in between)
  landRadius: 40, bodyRadius: 14
};
const DC_TEAR = {
  every: { T1: 2.1, T2: 1.8, T3: 1.55 },   // seconds between volleys while Opal cries
  // v1.10.1 (user): twice as many, and more than the books. v1.12.1 (user): 20% fewer (6, 8, 10 -> 5, 6, 8), and the
  // tears that poured down from above the screen are gone
  count: { T1: 5, T2: 6, T3: 8 },
  flight: [1.0, 1.25],
  landRadius: 30, bodyRadius: 11
};
// Opal's big cry: a warning, then Dudu freezes for a moment (cannot be dodged). It only lands while she stands on a
// ledge away from its edges, and no tear can hurt her while frozen or just after, so it never forces a hit or a fall.
const DC_CRY = {
  zones: { T2: 6.5, T3: 5.5 },   // seconds between cries (none in T1: the tears are introduced first)
  warn: 0.9,
  stun: 0.38,                    // tuning value (package proposal 0.30-0.45)
  safeAfter: 0.3,
  waitGround: 1.2,               // give up this cry if she is not standing safely by then
  edge: 24
};
// The motions have no clear throwing pose, so the release is the top of their bounce (frames checked one by one):
// Happy_7 #15 (500ms, hand up), Happy_8 #10 (330ms), Sad_6 #8 (270ms), Sad_10 #4 (130ms).
const DC_RELEASE_MS = { opal_happy7: 500, opal_happy8: 330, opal_sad6: 270, opal_sad10: 130 };
const DC_OPAL = {
  run: 340,                 // px/s while running between stops in the book part
  stretch: [250, 500],      // px run between two stops (package range)
  relocate: 520,            // px/s on the way to the crying spot
  catchUp: 700,             // further than this from Dudu: she runs (no stop, no books) to 150px behind her
  catchUpRun: 560,
  bookHand: 78              // books and tears leave this high above her feet
};
const DC_JADE = { walk: 300, behind: 170, startMove: 120, stopAt: 18 };
const DC_CP2_HOLD = 0.8;    // seconds Dudu is held on landing on checkpoint 2
const DC51_BLUE_X = 5240;   // the blue dotted line of the sketch: right of the CP2 flag (5210), under the CP2 pad
const DC51_CRY_SPOTS = [6300, 7450, 8550];   // Opal's crying spot for T1, T2, T3 (Jade stands 120px to her left)

const dc = { phase: 'books', zone: -1, shots: [], cry: null, cryT: 0, stunT: 0, safeT: 0, holdT: 0, blueDone: false,
  tearT: 0, clock: 0, jade: null, opal: null, lastStoodId: null, token: 0 };
window.__dcLog = [];
function dcLog(ev, extra = {}) {
  window.__dcLog.push({ ev, phase: dc.phase, zone: dc.zone, x: Math.round(p.x), y: Math.round(p.y), t: Number(dc.clock.toFixed(2)),
    opalX: dc.opal ? Math.round(dc.opal.x) : null, jadeX: dc.jade ? Math.round(dc.jade.x) : null, ...extra });
  if (window.__dcLog.length > 300) window.__dcLog.shift();
}
function dcRand() { return Math.random(); }

function makeDragonNpc(kind, x) {
  return { kind, x, prevX: x, vx: 0, face: -1, state: 'stand', key: kind === 'jade' ? 'jade_angry' : 'opal_happy7',
    t: 0, targetX: x, thrown: true, shake: 0 };
}
function dcSetMotion(n, key) { if (n.key !== key) { n.key = key; n.t = 0; } }
function resetDragonRuntime() {
  dc.token++;
  dc.shots = [];
  dc.cry = null; dc.stunT = 0; dc.safeT = 0; dc.holdT = 0; dc.cryT = 0; dc.tearT = 0;
  dc.lastStoodId = null;
  dc.blueDone = false;
  window.__dcLock = false;
  const fromCp2 = typeof checkpoint === 'number' && checkpoint >= 1;
  // checkpoint 2: wait for the blue line again (the books do not come back); start: the book part
  dc.phase = fromCp2 ? 'waitBlue' : 'books';
  dc.zone = -1;
  // the sketch's two red circles at the bottom left; from checkpoint 2 both wait below the CP2 pad
  dc.jade = makeDragonNpc('jade', fromCp2 ? 5020 : 560);
  dc.opal = makeDragonNpc('opal', fromCp2 ? 5130 : 720);
  dcLog(fromCp2 ? 'restart_cp2' : 'restart_start');
}

function dcBookZoneOf(plat) { return DC_BOOK.zones.indexOf(plat && plat.dcZone); }
function dcTearZone() {
  let z = -1;
  for (let i = 0; i < DC51_TEAR_ZONES.length; i++) if (p.x >= DC51_TEAR_ZONES[i].from) z = i;
  return z;
}
// the surface a projectile aimed at tx lands on: the ledge level nearest to Dudu's own
function dcResolveTarget(tx, refY) {
  let best = null;
  for (const a of platforms) {
    if (!a.dcDraw || tx < a.x + 6 || tx > a.x + a.w - 6) continue;
    if (a.y < refY - 170) continue;
    if (!best || Math.abs(a.y - refY) < Math.abs(best.y - refY)) best = a;
  }
  return best ? { ty: best.y, overPit: false } : { ty: refY, overPit: true };
}
function dcFire(kind, count) {
  const isTear = kind === 'tear', C = isTear ? DC_TEAR : DC_BOOK, o = dc.opal;
  const refY = (p.ground && p.on) ? p.on.y : p.y;
  const ox = o.x + o.face * 10, oy = dcFloorY(o.x) - DC_OPAL.bookHand;
  for (let i = 0; i < count; i++) {
    const u = dcRand();
    // the first lands near Dudu, the next ones on either side, further out the more there are
    const off = i === 0 ? (u - 0.5) * 70 : (i % 2 ? 1 : -1) * (60 + i * 45 + u * 90);
    const tx = Math.round(Math.max(40, Math.min(DC51_WIDTH - 40, p.x + off + (isTear ? 0 : p.vx * 0.35))));
    const tgt = dcResolveTarget(tx, refY);
    const flight = C.flight[0] + (C.flight[1] - C.flight[0]) * dcRand();
    const rise = Math.max(0, oy - tgt.ty);
    dc.shots.push({ kind, x0: ox, y0: oy, tx, ty: tgt.ty, overPit: tgt.overPit, flight, age: -i * (isTear ? 0.12 : 0.16),
      arcH: 150 + Math.min(220, rise * 0.18) + dcRand() * 40, bx: ox, by: oy, prevBx: ox, prevBy: oy,
      spin: (dcRand() - 0.5) * 9, hue: Math.floor(dcRand() * 4), done: false, sounded: false });
  }
  // v1.12.1 (user): books aimed at where Dudu will be when they come down
  const ahead = isTear ? 0 : (DC_BOOK.ahead[DC_BOOK.zones[dc.zone]] || 0);
  const v = Math.max(-DC_BOOK.vMax, Math.min(DC_BOOK.vMax, dc.vAvg || 0)), dir = Math.abs(v) > 60 ? Math.sign(v) : (p.face || 1);
  for (let i = 0; i < ahead; i++) {
    const flight = C.flight[0] + (C.flight[1] - C.flight[0]) * dcRand(), delay = (count + i) * 0.16;
    const tx = Math.round(Math.max(40, Math.min(DC51_WIDTH - 40, p.x + v * (flight + delay) + dir * i * DC_BOOK.aheadStep)));
    const tgt = dcResolveTarget(tx, refY), rise = Math.max(0, oy - tgt.ty);
    dc.shots.push({ kind, x0: ox, y0: oy, tx, ty: tgt.ty, overPit: tgt.overPit, flight, age: -delay,
      arcH: 150 + Math.min(220, rise * 0.18) + dcRand() * 40, bx: ox, by: oy, prevBx: ox, prevBy: oy,
      spin: (dcRand() - 0.5) * 9, hue: Math.floor(dcRand() * 4), done: false, sounded: false, ahead: true });
  }
  if (typeof tone === 'function') tone(isTear ? 620 : 360, 0.07, 'triangle', 0.025);
  dcLog(isTear ? 'tear_volley' : 'book_volley', { count, ahead, motion: o.key, zoneName: isTear ? DC51_TEAR_ZONES[dc.zone].id : DC_BOOK.zones[dc.zone] });
}
function dcCanHurt() { return dc.stunT <= 0 && dc.safeT <= 0 && dc.holdT <= 0; }
function updateDragonShots(dt) {
  dc.vAvg = (dc.vAvg || 0) + (p.vx - (dc.vAvg || 0)) * (1 - Math.exp(-dt / DC_BOOK.vTau));
  const pcx = p.x, pcy = p.y - 30;
  for (const b of dc.shots) {
    b.age += dt;
    if (b.age < 0) continue;
    const C = b.kind === 'tear' ? DC_TEAR : DC_BOOK;
    const u = Math.min(1, b.age / b.flight);
    b.prevBx = b.bx; b.prevBy = b.by;
    b.bx = b.x0 + (b.tx - b.x0) * u;
    b.by = b.y0 + (b.ty - 12 - b.y0) * u - b.arcH * 4 * u * (1 - u);
    if (b.done) continue;
    if (b.age < b.flight) {
      if (typeof distPointToSegment === 'function' && distPointToSegment(pcx, pcy, b.prevBx, b.prevBy, b.bx, b.by) < C.bodyRadius + 18) {
        b.done = true;
        if (dcCanHurt() && typeof applyStunHit === 'function') applyStunHit(b.bx, b.kind === 'tear' ? 'opal_tear' : 'opal_book');
      }
    } else if (b.age < b.flight + 0.3) {
      if (!b.sounded) {
        b.sounded = true;
        if (!b.overPit && typeof burst === 'function') burst(b.tx, b.ty - 8, b.kind === 'tear' ? '#a5d8ff' : '#e9c48f', 9);
      }
      if (!b.overPit && Math.abs(p.x - b.tx) < C.landRadius + 14 && p.y > b.ty - 56 && p.y - 56 < b.ty + 10) {
        b.done = true;
        if (dcCanHurt() && typeof applyStunHit === 'function') applyStunHit(b.tx, b.kind === 'tear' ? 'opal_tear' : 'opal_book');
      }
    }
  }
  dc.shots = dc.shots.filter(b => b.age < b.flight + (b.overPit ? 1.2 : 0.45));
}

function dcMotionMs(key) { const m = dcAtlas && dcAtlas.motions[key]; return m ? m.duration : 1000; }
// run n toward n.targetX on the floor: eased start and stop, Move motion while running. Returns true on arrival.
function dcRun(n, speed, dt) {
  n.prevX = n.x;
  const d = n.targetX - n.x;
  if (Math.abs(d) < 4) { n.x = n.targetX; n.vx = 0; return true; }
  const want = Math.sign(d) * Math.min(speed, Math.abs(d) * 3 + 60);
  n.vx += (want - n.vx) * Math.min(1, dt * 6);
  let step = n.vx * dt;
  if (Math.sign(step) !== Math.sign(d)) step = Math.sign(d) * 20 * dt;
  if (Math.abs(step) > Math.abs(d)) step = d;
  n.x += step;
  n.face = d > 0 ? 1 : -1;
  dcSetMotion(n, n.kind === 'jade' ? 'jade_move' : 'opal_move');
  n.t += dt;
  n.state = 'move';
  return false;
}
function dcFaceDudu(n) { n.face = p.x >= n.x ? 1 : -1; }

// Opal in the book part: run a stretch toward Dudu, stop, Happy + one volley, again
function dcOpalNextStop(o) {
  const lo = DC_OPAL.stretch[0], hi = DC_OPAL.stretch[1];
  if (Math.abs(p.x - o.x) > DC_OPAL.catchUp) {
    o.targetX = Math.max(80, Math.min(DC51_BLUE_X - 260, p.x - 150 * Math.sign(p.x - o.x)));
    o.state = 'move'; o.catchUp = true;
    dcLog('opal_catch_up', { to: Math.round(o.targetX) });
    return;
  }
  o.catchUp = false;
  const t = p.x + (dcRand() - 0.5) * 300;
  let d = t - o.x;
  if (Math.abs(d) < lo) d = (d === 0 ? (p.face || 1) : Math.sign(d)) * lo;
  if (Math.abs(d) > hi) d = Math.sign(d) * hi;
  o.targetX = Math.max(80, Math.min(DC51_BLUE_X - 260, o.x + d));
  o.state = 'move';
  dcLog('opal_move', { to: Math.round(o.targetX) });
}
function dcOpalStop(o, throwing) {
  o.state = 'stand';
  o.vx = 0;
  o.key = dcRand() < 0.5 ? 'opal_happy7' : 'opal_happy8';
  o.t = 0;
  o.thrown = !throwing;
  dcFaceDudu(o);
  if (throwing) dcLog('opal_stop_happy', { motion: o.key });
}
function updateOpalBooks(dt) {
  const o = dc.opal, zoneOn = dc.zone >= 0 && !(p.ground && p.on && p.on.id === 'DC51-START');
  if (o.state === 'move') {
    if (dcRun(o, o.catchUp ? DC_OPAL.catchUpRun : DC_OPAL.run, dt)) dcOpalStop(o, zoneOn);
    return;
  }
  o.prevX = o.x;
  o.t += dt;
  if (!o.thrown && zoneOn && o.t * 1000 >= DC_RELEASE_MS[o.key]) {
    o.thrown = true;
    dcFire('book', DC_BOOK.count[DC_BOOK.zones[dc.zone]]);
  }
  if (o.t * 1000 >= dcMotionMs(o.key)) {
    // before the first zone (Dudu still on the start pad) she just keeps bouncing where she is
    if (zoneOn || Math.abs(p.x - o.x) > 420) dcOpalNextStop(o);
    else dcOpalStop(o, false);
  }
}
// Jade follows Dudu a little behind; she stands with her angry face, Move only while she walks
function updateJade(dt, targetX) {
  const j = dc.jade;
  if (j.state === 'move' || Math.abs(targetX - j.x) > DC_JADE.startMove) {
    j.targetX = targetX;
    if (dcRun(j, Math.abs(targetX - j.x) > DC_OPAL.catchUp ? DC_OPAL.catchUpRun : DC_JADE.walk, dt)) j.state = 'stand';
  }
  if (j.state !== 'move') { j.prevX = j.x; j.t += dt; dcSetMotion(j, 'jade_angry'); dcFaceDudu(j); }
}
function dcJadeFollowX() {
  let t = p.x - DC_JADE.behind * (p.face || 1);
  if (Math.abs(t - dc.opal.x) < 100) t = dc.opal.x - 110 * (p.x >= dc.opal.x ? 1 : -1);
  return Math.max(120, t);
}

function startCp2Hold() {
  dc.phase = 'cp2';
  dc.shots = [];
  dc.holdT = DC_CP2_HOLD;
  window.__dcLock = true;
  if (dc.opal.state === 'move') dcOpalStop(dc.opal, false);
  else dc.opal.thrown = true;   // a volley not thrown yet is cancelled
  dcLog('cp2_reached');
}
function startRelocate() {
  dc.blueDone = true;
  dc.phase = 'relocate';
  dc.shots = [];
  const z = Math.max(0, dcTearZone());
  dc.opal.targetX = DC51_CRY_SPOTS[z];
  dc.jade.targetX = DC51_CRY_SPOTS[z] - 120;
  dcLog('blue_line_crossed', { spot: DC51_CRY_SPOTS[z] });
}
function dcStartCrying(o) {
  o.state = 'cry';
  o.vx = 0;
  o.key = dcRand() < 0.5 ? 'opal_sad6' : 'opal_sad10';
  o.t = 0; o.thrown = false;
  dcFaceDudu(o);
  dc.tearT = 0;
  dcLog('opal_cry_start', { motion: o.key });
}

function dcSafeStanding() {
  if (!p.ground || !p.on || !p.on.dcDraw) return false;
  return p.x - p.on.x > DC_CRY.edge && p.on.x + p.on.w - p.x > DC_CRY.edge && Math.abs(p.vx) < 400;
}
function updateCry(dt) {
  if (dc.stunT > 0) {
    dc.stunT -= dt;
    if (dc.stunT <= 0) { window.__dcLock = false; dc.safeT = DC_CRY.safeAfter; dcLog('cry_stun_end'); }
    return;
  }
  if (dc.safeT > 0) dc.safeT -= dt;
  const zoneId = DC51_TEAR_ZONES[dc.zone] && DC51_TEAR_ZONES[dc.zone].id;
  const every = DC_CRY.zones[zoneId];
  if (!dc.cry) {
    if (!every || dc.opal.state !== 'cry') return;
    dc.cryT += dt;
    if (dc.cryT >= every) { dc.cryT = 0; dc.cry = { t: 0 }; dcLog('cry_warn'); if (typeof tone === 'function') tone(880, 0.25, 'sine', 0.03); }
    return;
  }
  dc.cry.t += dt;
  if (dc.cry.t < DC_CRY.warn) return;
  if (dcSafeStanding()) {
    dc.cry = null;
    dc.stunT = DC_CRY.stun;
    window.__dcLock = true;
    p.vx = 0; p.dash = 0; p.buffer = 0; p.jumpHeld = false;
    if (typeof burst === 'function') burst(p.x, p.y - 40, '#a5d8ff', 10);
    if (typeof tone === 'function') tone(300, 0.3, 'sawtooth', 0.03);
    dcLog('cry_stun', { stun: DC_CRY.stun });
  } else if (dc.cry.t > DC_CRY.warn + DC_CRY.waitGround) {
    dc.cry = null;
    dcLog('cry_skipped_unsafe');
  }
}
function updateOpalTears(dt) {
  const o = dc.opal;
  const zi = Math.max(0, dcTearZone());
  // a new tear zone: run (no tears) to its crying spot
  if (zi > dc.zone) {
    dc.zone = zi; dc.cryT = 0;
    dcLog('tear_zone_enter', { zoneName: DC51_TEAR_ZONES[zi].id });
    o.targetX = DC51_CRY_SPOTS[zi];
    if (Math.abs(o.x - o.targetX) > 4) { o.state = 'move'; o.shake = 0; dc.cry = null; dcLog('opal_move', { to: o.targetX }); }
  }
  if (o.state === 'move') {
    if (dcRun(o, DC_OPAL.relocate, dt)) dcStartCrying(o);
    return;
  }
  o.prevX = o.x;
  o.t += dt;
  o.shake = (dc.cry || dc.stunT > 0) ? 1 : 0;
  // one volley per Sad motion, at its release moment; a new Sad motion starts when the zone's interval has passed
  dc.tearT += dt;
  if (!o.thrown && !dc.cry && dc.stunT <= 0 && o.t * 1000 >= DC_RELEASE_MS[o.key]) {
    o.thrown = true;
    dcFire('tear', DC_TEAR.count[DC51_TEAR_ZONES[dc.zone].id]);
  }
  const dur = dcMotionMs(o.key) / 1000;
  if (o.t >= dur) {
    if (dc.tearT >= DC_TEAR.every[DC51_TEAR_ZONES[dc.zone].id]) {
      o.key = dcRand() < 0.5 ? 'opal_sad6' : 'opal_sad10';
      o.t = 0; o.thrown = false; dc.tearT = 0;
    } else o.t -= dur;
  }
  updateCry(dt);
}

function updateDragonCave(dt) {
  const st = activeDragonStage();
  if (!st) { if (window.__dcLock) window.__dcLock = false; return; }
  // other rooms bring their own runtime (5-2: dragon-cave-pinball.js)
  if (st.dcHooks) { if (state === 'playing' && st.dcHooks.update) st.dcHooks.update(dt); return; }
  if (state !== 'playing' || !dc.opal) return;
  dc.clock += dt;
  // ledges Dudu has stood on move the book zone forward (never back)
  const on = (p.ground && p.on) ? p.on : null;
  if (on && on.id !== dc.lastStoodId) {
    dc.lastStoodId = on.id;
    if (on.dcZone === 'GOAL') dcLog('goal_landing');
    if (dc.phase === 'books') {
      const zi = dcBookZoneOf(on);
      if (zi > dc.zone) { dc.zone = zi; dcLog('book_zone_enter', { zoneName: DC_BOOK.zones[zi] }); }
      if (on.dcZone === 'CP2') {
        if (dc.zone >= DC_BOOK.zones.length - 1) startCp2Hold();
        else dcLog('cp2_without_zone_d');
      }
    }
  }
  updateDragonShots(dt);
  if (dc.phase === 'books') {
    updateOpalBooks(dt);
    updateJade(dt, dcJadeFollowX());
    return;
  }
  if (dc.phase === 'cp2' || dc.phase === 'waitBlue') {
    if (dc.phase === 'cp2') {
      dc.holdT -= dt;
      if (dc.holdT <= 0) { dc.holdT = 0; window.__dcLock = false; dc.phase = 'waitBlue'; dcLog('cp2_hold_end'); }
    }
    // both wait below the CP2 pad: Opal runs there if she is not (no throws) and bounces in place, Jade stands angry
    const o = dc.opal;
    if (o.state !== 'move' && Math.abs(o.x - 5130) > 200) { o.targetX = 5130; o.state = 'move'; }
    if (o.state === 'move') { if (dcRun(o, DC_OPAL.catchUpRun, dt)) dcOpalStop(o, false); }
    else { o.prevX = o.x; o.t += dt; if (o.t * 1000 >= dcMotionMs(o.key)) dcOpalStop(o, false); }
    updateJade(dt, dcJadeFollowX());
    if (dc.phase === 'waitBlue' && !dc.blueDone && p.x >= DC51_BLUE_X) startRelocate();
    return;
  }
  if (dc.phase === 'relocate') {
    // straight to the crying spot: no stop, no books, no tears; the spot follows the zone Dudu is in by now
    const z = Math.max(0, dcTearZone());
    dc.opal.targetX = DC51_CRY_SPOTS[z];
    dc.jade.targetX = DC51_CRY_SPOTS[z] - 120;
    if (dc.jade.state === 'move' || Math.abs(dc.jade.x - dc.jade.targetX) > 4) {
      if (dcRun(dc.jade, DC_OPAL.relocate, dt)) { dc.jade.state = 'stand'; dcSetMotion(dc.jade, 'jade_angry'); dcFaceDudu(dc.jade); }
    } else { dc.jade.prevX = dc.jade.x; dc.jade.t += dt; }
    if (dcRun(dc.opal, DC_OPAL.relocate, dt)) {
      dc.phase = 'tears';
      dc.zone = z;
      dcLog('crying_spot_reached', { spot: DC51_CRY_SPOTS[z] });
      dcStartCrying(dc.opal);
    }
    return;
  }
  if (dc.phase === 'tears') {
    updateOpalTears(dt);
    const j = dc.jade;
    j.targetX = dc.opal.targetX - 120;
    if (j.state === 'move' || Math.abs(j.x - j.targetX) > 4) {
      if (dcRun(j, DC_OPAL.relocate, dt)) j.state = 'stand';
    }
    if (j.state !== 'move') { j.prevX = j.x; j.t += dt; dcSetMotion(j, 'jade_angry'); dcFaceDudu(j); }
  }
}
window.updateDragonCave = updateDragonCave;

// ----------------------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------------------
function drawDragonBackground() {
  ctx.fillStyle = '#0f2a2a'; ctx.fillRect(0, 0, W, H);
  const st = activeDragonStage(), im = dcImages.bg1;
  if (!st || !im) return;
  // the painting is 1280x820: shown 12% larger so it can drift slowly with the camera (as in World 4)
  const sc = 1.12, dw = im.width * sc, dh = im.height * sc;
  const vx = Math.max(0, Math.min(1, (rCam + W * 0.5) / st.worldWidth));
  const vy = Math.max(0, Math.min(1, (rCamY - st.minCamY) / Math.max(1, st.maxCamY - st.minCamY)));
  ctx.drawImage(im, -Math.round(vx * (dw - W)), -Math.round(vy * (dh - H)), dw, dh);
}

// The sketch's brown floor, drawn as a deep misty drop (world coordinates, behind the ledges): it must not read as
// ground Dudu could land on.
function dcHook(name) {
  const st = activeDragonStage();
  if (!st) return true;
  if (st.dcHooks) { if (st.dcHooks[name]) st.dcHooks[name](); return true; }
  return false;
}
function drawDragonBack() {
  if (dcHook('back')) return;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const x1 = Math.floor(rCam) - 40, x2 = Math.ceil(rCam + W / zoom) + 40, yBot = rCamY + H / zoom + 40;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, yBot);
  for (let x = x1; x <= x2; x += 20) ctx.lineTo(x, dcFloorY(x));
  ctx.lineTo(x2, dcFloorY(x2));
  ctx.lineTo(x2, yBot);
  ctx.closePath();
  const top = Math.min(dcFloorY(x1), dcFloorY(x2));
  const g = ctx.createLinearGradient(0, top - 30, 0, top + 220);
  g.addColorStop(0, 'rgba(36, 92, 90, 0.55)');
  g.addColorStop(0.25, 'rgba(14, 44, 46, 0.9)');
  g.addColorStop(1, 'rgba(4, 14, 16, 0.98)');
  ctx.fillStyle = g;
  ctx.fill();
  // drifting mist along the edge of the drop
  for (let k = 0; k < 2; k++) {
    ctx.globalAlpha = 0.16 - k * 0.05;
    ctx.fillStyle = '#9fe3d8';
    ctx.beginPath();
    for (let x = x1; x <= x2; x += 24) {
      const y = dcFloorY(x) - 6 + k * 16 + Math.sin(x * 0.011 + dc.clock * (0.7 + k * 0.4)) * 7;
      if (x === x1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let x = x2; x >= x1; x -= 24) ctx.lineTo(x, dcFloorY(x) + 34 + k * 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Ledges from the candidate parts: long ledges = left cap + repeated middle + right cap, small ones and the three
// flag pads = one piece scaled evenly to the ledge width. Fallback while loading: a plain teal slab.
const DC_LONG_SCALE = 0.45;
function drawDragonPlatform(a, x, y) {
  if (a.dcDraw === 'none') return;   /* 5-5: the background painting's floor is the floor */
  if (a.dcDraw === 'gym' && typeof drawGymLedge === 'function') { drawGymLedge(a, x, y); return; }
  if (a.dcDraw.startsWith('kd_') && typeof drawKidianPiece === 'function') { drawKidianPiece(a, x, y); return; }
  if (a.dcDraw === 'long') {
    const L = dcPart('long_left'), M = dcPart('long_mid'), R = dcPart('long_right'), k = DC_LONG_SCALE;
    if (L && M && R && a.w >= (L.w + R.w) * k) {
      const JOIN = 2;
      const lw = Math.round(L.w * k), rw = Math.round(R.w * k), mw = Math.round(M.w * k) - JOIN * 2;
      const yl = Math.round(y - L.surf * k), ym = Math.round(y - M.surf * k), yr = Math.round(y - R.surf * k);
      ctx.drawImage(L.im, 0, 0, L.w, L.h, x, yl, lw, Math.round(L.h * k));
      const end = x + a.w - rw;
      for (let cx = x + lw - 1; cx < end; cx += mw - 1) {
        const cw = Math.min(mw, end - cx + 1);
        ctx.drawImage(M.im, JOIN / k, 0, cw / k, M.h, cx, ym, cw, Math.round(M.h * k));
      }
      ctx.drawImage(R.im, 0, 0, R.w, R.h, end - 1, yr, rw, Math.round(R.h * k));
      return;
    }
  } else {
    const F = dcPart(a.dcDraw === 'pad' ? 'checkpoint_pad' : 'float_compact');
    if (F) {
      const s = a.w / F.w;
      ctx.drawImage(F.im, x, Math.round(y - F.surf * s), a.w, Math.round(F.h * s));
      return;
    }
  }
  ctx.fillStyle = '#4f8a84';
  ctx.fillRect(x, y, a.w, 24);
}

// One motion frame with the feet at (x, y). face 1 = looking right (every sheet looks left).
function dcSprite(key, t, x, y, face = -1, loop = true) {
  const m = dcAtlas && dcAtlas.motions[key], im = dcImages['m_' + key];
  if (!m || !im) return false;
  let ms = t * 1000;
  ms = loop ? ms % m.duration : Math.min(ms, m.duration - 1);
  let f = m.frames[m.frames.length - 1];
  for (const fr of m.frames) { if (ms < fr[6]) { f = fr; break; } ms -= fr[6]; }
  if (!f[2]) return true;
  const ss = dcAtlas.superSample;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (face > 0) ctx.scale(-1, 1);
  ctx.drawImage(im, f[0], f[1], f[2], f[3], f[4], f[5], f[2] / ss, f[3] / ss);
  ctx.restore();
  return true;
}
// Jade and Opal stand on the floor line below Dudu (their x is interpolated between physics steps)
function drawDragonNpc(n) {
  const a = typeof renderAlpha === 'number' ? renderAlpha : 1;
  const x = (n.prevX ?? n.x) + (n.x - (n.prevX ?? n.x)) * a;
  const y = dcFloorY(x);
  const sx = n.shake ? Math.sin(dc.clock * 60) * 2.5 : 0;
  ctx.save();
  ctx.globalAlpha = 0.28; ctx.fillStyle = '#04100f';
  ctx.beginPath(); ctx.ellipse(x, y + 1, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (dcSprite(n.key, n.t, x + sx, y, n.face, true)) return;
  // not loaded yet: a plain marker
  ctx.fillStyle = n.kind === 'jade' ? '#5fae96' : '#f1d2e6';
  ctx.beginPath(); ctx.ellipse(x, y - 50, 22, 50, 0, 0, Math.PI * 2); ctx.fill();
}
function drawDragonFront() {
  if (dcHook('front') || !dc.opal) return;
  drawDragonNpc(dc.jade);
  drawDragonNpc(dc.opal);
  // landing marks and dashed arcs (behind Dudu, like Marie's bombs)
  for (const b of dc.shots) {
    if (b.age < 0 || b.age >= b.flight || b.overPit) continue;
    const C = b.kind === 'tear' ? DC_TEAR : DC_BOOK, u = b.age / b.flight, late = u >= 0.68;
    ctx.save();
    ctx.fillStyle = b.kind === 'tear' ? (late ? 'rgba(77,171,247,0.42)' : 'rgba(165,216,255,0.3)') : (late ? 'rgba(255,107,74,0.4)' : 'rgba(255,218,142,0.34)');
    ctx.strokeStyle = b.kind === 'tear' ? '#1c7ed6' : (late ? '#e03131' : '#c87936');
    ctx.lineWidth = late ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(b.tx, b.ty - 3, C.landRadius, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let s = 0; s <= 14; s++) {
      const su = u + (1 - u) * s / 14;
      const px = b.x0 + (b.tx - b.x0) * su, py = b.y0 + (b.ty - 12 - b.y0) * su - b.arcH * 4 * su * (1 - su);
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}
const DC_BOOK_COLORS = ['#b5523b', '#3b6fb5', '#5b8f3a', '#8a5bb5'];
// the projectiles themselves, drawn over Dudu
function drawDragonAfterDudu() {
  if (dcHook('afterDudu')) return;
  for (const b of dc.shots) {
    if (b.age < 0) continue;
    const landed = b.age >= b.flight;
    if (landed && !b.overPit) {
      // a short splash or thud where it landed
      const v = Math.min(1, (b.age - b.flight) / 0.4);
      ctx.save();
      ctx.globalAlpha = 1 - v;
      ctx.strokeStyle = b.kind === 'tear' ? '#74c0fc' : '#e9c48f';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(b.tx, b.ty - 4, 14 + v * 26, 4 + v * 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      continue;
    }
    const x = landed ? b.tx : b.bx, y = landed ? b.by + (b.age - b.flight) * 600 : b.by;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (b.kind === 'tear') {
      ctx.fillStyle = 'rgba(116, 192, 252, 0.95)'; ctx.strokeStyle = '#1971c2'; ctx.lineWidth = 2;
      const ang = Math.atan2(b.by - b.prevBy, b.bx - b.prevBx) - Math.PI / 2;
      ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.bezierCurveTo(11, 2, 9, -10, 0, -10); ctx.bezierCurveTo(-9, -10, -11, 2, 0, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-3, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.rotate(b.age * b.spin);
      ctx.fillStyle = DC_BOOK_COLORS[b.hue]; ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 2;
      ctx.fillRect(-15, -11, 30, 22); ctx.strokeRect(-15, -11, 30, 22);
      ctx.fillStyle = '#f4ead2'; ctx.fillRect(-12, 7, 26, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-13, -9, 4, 18);
    }
    ctx.restore();
  }
}
// screen space: the crying warning has to be seen even when Opal is below the screen
// v1.10.3 (user): when Jade or Opal is below (or beside) the screen, a speech-bubble marker at the screen edge shows
// where she is, with her face playing her current motion inside (the sheet frame itself, zoomed on the head).
const DC_FACE = { jade: -84, opal: -64 };   // head centre above the feet (game px), measured on the sheets
// per motion: face centre from the feet [x, y] with the sheet looking left (running poses lean forward)
const DC_FACE_OFF = { jade_move: [-12, -86], jade_angry: [-2, -84], opal_move: [6, -70], opal_happy7: [0, -62],
  opal_happy8: [0, -62], opal_sad6: [0, -62], opal_sad10: [6, -62] };
function dcFaceOffset(n) {
  const o = DC_FACE_OFF[n.key] || [0, DC_FACE[n.kind]];
  return [n.face > 0 ? -o[0] : o[0], o[1]];
}
const DC_MARK = { r: 32, inner: 25, zoom: 1.15, edge: 18 };
function drawDragonFaceMarkers() {
  if (!dc.opal || !dcAtlas) return;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1, M = DC_MARK;
  const marks = [];
  for (const n of [dc.jade, dc.opal]) {
    const a = typeof renderAlpha === 'number' ? renderAlpha : 1;
    const wx = (n.prevX ?? n.x) + (n.x - (n.prevX ?? n.x)) * a;
    const fo = dcFaceOffset(n);
    const sx = (wx + fo[0] - Math.round(rCam)) * zoom, sy = (dcFloorY(wx) + fo[1] - Math.round(rCamY)) * zoom;
    if (sy < H - 12 && sx > -20 && sx < W + 20) continue;   // her face is on screen: no marker
    marks.push({ n, x: Math.max(M.r + M.edge, Math.min(W - M.r - M.edge, sx)), y: H - M.r - M.edge - 14, sx });
  }
  // two markers never cover each other
  if (marks.length === 2 && Math.abs(marks[0].x - marks[1].x) < M.r * 2 + 8) {
    const mid = (marks[0].x + marks[1].x) / 2, l = marks[0].sx <= marks[1].sx ? 0 : 1;
    marks[l].x = mid - M.r - 4; marks[1 - l].x = mid + M.r + 4;
  }
  for (const m of marks) {
    const { n, x, y } = m;
    ctx.save();
    // bubble with its tail pointing down towards her
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; ctx.strokeStyle = '#26302f'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, M.r, Math.PI * 0.62, Math.PI * 0.38 + Math.PI * 2);
    ctx.lineTo(x, y + M.r + 13);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, M.inner, 0, Math.PI * 2);
    ctx.fillStyle = n.kind === 'jade' ? '#cfe9dc' : '#f4e3ef'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = n.kind === 'jade' ? '#4f8f7a' : '#b98aa8'; ctx.stroke();
    ctx.clip();
    ctx.translate(x, y); ctx.scale(M.zoom, M.zoom);
    const fo = dcFaceOffset(n);
    dcSprite(n.key, n.t, -fo[0], -fo[1], n.face, true);
    ctx.restore();
  }
}
function drawDragonOverlay() {
  if (dcHook('overlay')) return;
  drawDragonFaceMarkers();
  const c = dc.cry;
  if (!c && dc.stunT <= 0) return;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pulse = c ? 0.5 + 0.5 * Math.sin(c.t * 18) : 1;
  ctx.globalAlpha = 0.18 + 0.14 * pulse;
  ctx.fillStyle = '#4dabf7';
  ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 14, W, 14);
  ctx.globalAlpha = 0.95;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillStyle = '#d0ebff'; ctx.strokeStyle = 'rgba(10,40,80,0.85)'; ctx.lineWidth = 7;
  const txt = dc.stunT > 0 ? '으아아앙!!' : '오팔이 울먹여요!';
  const tx = W / 2 + (dc.stunT > 0 ? Math.sin(dc.clock * 70) * 4 : 0);
  ctx.strokeText(txt, tx, 96);
  ctx.fillText(txt, tx, 96);
  ctx.restore();
}

// ----------------------------------------------------------------------------
// Stage select, start, clear
// ----------------------------------------------------------------------------
function dragonRecord(code, save) {
  save = save || loadWorldMapSave();
  return save.worlds[DC_WORLD_ID].stages[code];
}
function openDragonStageSelect() {
  loadDragonAssets();
  worldMapScreen = 'dragonStageSelect';
  const wrap = $('worldmapOverlay'); if (!wrap) return;
  const save = loadWorldMapSave();
  const cards = DC_STAGE_ORDER.map(code => {
    const rec = dragonRecord(code, save), info = DC_STAGE_INFO[code];
    const built = dragonStageIndex(code) >= 0, open = built && rec.unlocked;
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
          <div class="wmStageBtnRow"><button type="button" class="wmStagePlayBtn" id="wmStageBtn-${code}" ${open ? '' : 'disabled'} onclick="startDragonStage('${code}')">${open ? '스테이지 시작' : (built ? '앞 스테이지를 깨면 열려요' : '준비 중')}</button></div>
        </div>`;
  }).join('');
  wrap.innerHTML = `
    <div class="wmPanel" role="dialog" aria-modal="true" aria-labelledby="wmDragonHeaderTitle">
      <div class="wmHeader">
        <div><span class="wmEyebrow">월드 5</span><h2 id="wmDragonHeaderTitle">용족동굴</h2></div>
        <div class="wmHeaderActions"><button type="button" class="wmBackBtn" onclick="openWorldMapMenu({forceDevOpen:true})">세계지도로</button></div>
      </div>
      <div class="wmStageGrid">${cards}</div>
    </div>`;
  wrap.hidden = false;
}
window.openDragonStageSelect = openDragonStageSelect;

function startDragonStage(code = 'dragon_cave_1', section = 0) {
  const idx = dragonStageIndex(code);
  if (idx < 0) return;
  loadDragonAssets();
  loadWorld1Stage(idx, { section, entryRoute: 'default' });
}
window.startDragonStage = startDragonStage;

// 5-1 clear: saves 5-1 and opens 5-2 only (the world is cleared by 5-5, not here)
function completeDragonStage(code) {
  const save = loadWorldMapSave(), rec = dragonRecord(code, save);
  rec.cleared = true;
  const elapsed = Number(worldStageElapsed.toFixed(2));
  if (rec.bestSeconds === null || elapsed < rec.bestSeconds) rec.bestSeconds = elapsed;
  const next = DC_STAGE_ORDER[DC_STAGE_ORDER.indexOf(code) + 1];
  if (next) save.worlds[DC_WORLD_ID].stages[next].unlocked = true;
  if (code === 'dragon_cave_5') save.worlds[DC_WORLD_ID].regionCleared = true;
  saveWorldMapData(save);
  window.__dcLock = false;
  dc.shots = []; dc.cry = null; dc.stunT = 0;
  dcLog('stage_clear', { code, elapsed });
  const nextBuilt = next && dragonStageIndex(next) >= 0;
  if (nextBuilt) {
    startDragonStage(next);
    window.__screenFade = { start: performance.now(), dur: 520, from: 0.92 };
    return;
  }
  if (typeof tone === 'function') tone(960, 0.22, 'triangle', 0.06);
  if (typeof releaseAllInputs === 'function') releaseAllInputs(); else keys.clear();
  state = 'paused';
  worldMapScreen = 'dragonClearModal';
  const wrap = $('worldmapOverlay'); if (!wrap) return;
  const nextName = next ? `${DC_STAGE_INFO[next].code} ${DC_STAGE_INFO[next].name}` : '';
  wrap.innerHTML = `
    <div class="wmPanel wmClearPanel" role="dialog" aria-modal="true">
      <div class="wmHeader"><div><span class="wmEyebrow">월드 5</span><h2>${DC_STAGE_INFO[code].code} ${DC_STAGE_INFO[code].name} 통과!</h2></div></div>
      <p class="wmClearSummary">걸린 시간 <b>${worldStageElapsed.toFixed(1)}초</b>, 피격 <b>${worldStageHitsThisRun}회</b></p>
      ${next ? `<p class="wmClearSummary">다음 방 ${nextName}: 아직 준비 중이에요.</p>` : ''}
      <div class="wmClearBtnRow">
        <button type="button" class="primary" onclick="startDragonStage('${code}')">다시 하기</button>
        <button type="button" class="secondary" onclick="openDragonStageSelect()">스테이지 선택</button>
      </div>
    </div>`;
  wrap.hidden = false;
}
window.completeDragonStage = completeDragonStage;

// DEV: jump straight to a point in a World 5 stage (QA only)
function devPracticeDragon(code = 'dragon_cave_1', x = null, y = null, section = 0) {
  startDragonStage(code, section);
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
window.devPracticeDragon = devPracticeDragon;
