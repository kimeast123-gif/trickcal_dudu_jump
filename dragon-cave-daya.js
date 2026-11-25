'use strict';
// ============================================================================
// v1.12.0 WORLD 5 / 5-5 「다야 선샌미의 방」, the last room of the Dragon Cave
// (package DUDU_WORLD5_STAGE55_DAYA_AMELIA_CLAUDE_261126; CLAUDE_WORLD5_STAGE55_DAYA_AMELIA_MASTER.md)
//
// A short flat room and two talks, no enemies, no falls. Left to right as in the sketch (761 x 435): start flag,
// Daya, Amelia, goal flag. Daya scolds twice (Angry_3, Angry_4); when Dudu comes right up to her, Dudu stops and asks
// to see the magical girl, Daya panics (Panic_2) and answers, Dudu moves again. Amelia films with her camera
// (Camera_Polished) until Dudu comes near, then smiles (Happy_1) and says it is time to go home. The goal finishes
// 5-5 and World 5 only after both talks; before that it does nothing (Dudu can still walk back).
//
// Sketch x to game x: 60 + sketch x * 2.6 (flags at 20 and 722, Daya 172, Amelia 497 in the sketch).
// All lines are the user's, letter for letter (package section 4). Music: 07. No Way Out (the package's file is the
// same bytes as track 9). Background: the package's official painting, nothing added.
// Talks lock Dudu like Rude's talk in 5-2 (window.__dcLock) and go on with a fresh jump press.
// ============================================================================

const DC55_CODE = 'dragon_cave_5';
const DC55_WIDTH = 2000;
const DC55_GROUND = 580;
const DC55_DAYA_X = 507, DC55_AMELIA_X = 1352, DC55_GOAL_X = 1937;
// talk ranges (horizontal and vertical distance from Dudu's feet to the NPC's feet), px
const DY_RANGE = { scold: 300, close: 130, back: 340, ameliaIn: 260, ameliaOut: 330, dy: 260 };
const DY_LINES = {
  scold1: '두두! 내가 남의 집은 함부로 들어가는게 아니라고 말했잖지 않느냐!',
  scold2: '특히 리츠의 방에서는 다칠뻔 했지않느냐 어휴.',
  ask: '다야 선샌미, 마법소녀 곤듀님 보여주세요!',
  reply: '그... 그건 아무때나 보여주는게 아니란다. 흠흠',
  amelia: '두두~ 오늘 잘 놀았니? 어서 집에 가자꾸나'
};

function buildDragonStage55() {
  const s = makeWorldStage({
    id: 'world5_dragon_55',
    stageCode: DC55_CODE,
    name: '다야 선샌미의 방',
    subtitle: '다야와 아멜리아를 만나요',
    worldWidth: DC55_WIDTH,
    minCamY: 0,
    maxCamY: 0,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'DC55-FLOOR', x: 112, feetY: DC55_GROUND } },
    segments: [{ start: 0, end: DC55_WIDTH, bg: 'dragoncave' }],
    backgroundRanges: {},
    goal: { id: 'dc55-goal', exitRoute: 'default', x: DC55_GOAL_X, y: DC55_GROUND, w: 60, h: 120, hidden: true }
  });
  s.worldId = DC_WORLD_ID;
  s.dragonCave = true;
  s.routeLabel = '월드 5';
  s.customBackground = drawDayaBackground;
  s.musicTrack = 9;   // 07. No Way Out (package 04_AUDIO, same file as 5-1's track)
  s.onLoad = () => { loadDragonAssets(); loadDayaAssets(); dy.fresh = true; };
  s.onReset = () => resetDayaStage();
  // the goal only counts once both talks are done (package 5-3); until then it does nothing
  s.onComplete = () => { if (dy.requestDone && dy.greetDone && !dy.cleared) { dy.cleared = true; dyLog('clear'); completeDragonStage(DC55_CODE); } };
  s.dcHooks = { update: updateDayaStage, front: drawDayaNpcs, overlay: drawDayaOverlay };
  // one flat floor across the room; the painting's floor is the art, so the floor itself is not drawn
  wFloor(s, 0, DC55_WIDTH, 'stone', DC55_GROUND, { id: 'DC55-FLOOR', dcDraw: 'none' });
  wCheckpoint(s, '다야의 방 입구', 112, DC55_GROUND);
  s.sections.push({ title: '집으로', x: DC55_GOAL_X, y: DC55_GROUND, hint: '', flagX: DC55_GOAL_X });
  s.hudStars = 0;
  return s;
}
if (typeof world1Stages !== 'undefined' && !world1Stages.some(st => st.worldId === DC_WORLD_ID && st.stageCode === DC55_CODE)) {
  world1Stages.push(buildDragonStage55());
}
DC_STAGE_INFO[DC55_CODE] = { code: '5-5', name: '다야 선샌미의 방', desc: '다야의 잔소리를 듣고 아멜리아와 함께 용족동굴 나들이를 마쳐요.' };

let _dyRequested = false;
function loadDayaAssets() {
  if (_dyRequested) return;
  _dyRequested = true;
  dcLoad('daya_bg', `assets/world/dragoncave/daya_bg.webp${DC_ASSET_Q}`);
}

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------
// talk: { lines: [{speaker, text, daya?, amelia?}], i, t, done() } (one talk at a time: the queue of package 5-1)
const dy = { fresh: true, scoldDone: false, requestDone: false, greetDone: false, cleared: false,
  talk: null, spacePrev: false, daya: { key: 'daya_angry3', t: 0 }, amelia: { key: 'amelia_camera', t: 0 }, ameliaNear: false, log: [] };
window.__dy = dy;
function dyLog(ev, extra = {}) {
  dy.log.push({ ev, x: Math.round(p.x), ...extra });
  if (dy.log.length > 200) dy.log.shift();
}
function activeDayaStage() { const st = activeDragonStage(); return st && st.stageCode === DC55_CODE ? st : null; }
function dySet(who, key) { if (dy[who].key !== key) { dy[who].key = key; dy[who].t = 0; } }
function resetDayaStage() {
  if (dy.fresh) {
    dy.scoldDone = false; dy.requestDone = false; dy.greetDone = false; dy.cleared = false;
    dy.log.length = 0;
    dyLog('stage_enter');
  }
  dy.fresh = false;
  dy.talk = null;
  window.__dcLock = false;
  dy.spacePrev = typeof keys !== 'undefined' && keys.has('Space');
  dySet('daya', 'daya_angry3');
  dySet('amelia', 'amelia_camera');
  dy.ameliaNear = false;
}
function dyStartTalk(name, lines, done) {
  dy.talk = { name, lines, i: 0, t: 0, done };
  window.__dcLock = true;
  p.vx = 0;
  dyShowLine();
  dyLog('talk_start', { name });
}
function dyShowLine() {
  const ln = dy.talk.lines[dy.talk.i];
  if (ln.daya) dySet('daya', ln.daya);
  if (ln.amelia) dySet('amelia', ln.amelia);
  const npcX = dy.talk.name === 'amelia' ? DC55_AMELIA_X : DC55_DAYA_X;
  p.face = npcX >= p.x ? 1 : -1;
}
function dyNear(x, r) { return Math.abs(p.x - x) < r && Math.abs(p.y - DC55_GROUND) < DY_RANGE.dy; }
function updateDayaStage(dt) {
  if (!activeDayaStage()) return;
  const sp = typeof keys !== 'undefined' && keys.has('Space'), spDown = sp && !dy.spacePrev;
  dy.spacePrev = sp;
  dy.daya.t += dt; dy.amelia.t += dt;
  if (dy.talk) {
    // locked while a talk runs; a fresh jump press (after the line has been up a moment) shows the next line.
    // Keep Dudu from sliding: no sideways speed while she listens.
    p.vx = 0;
    dy.talk.t += dt;
    if (spDown && dy.talk.t >= 0.35) {
      dyLog('talk_next', { name: dy.talk.name, line: dy.talk.i });
      dy.talk.i++; dy.talk.t = 0;
      if (dy.talk.i < dy.talk.lines.length) dyShowLine();
      else {
        const tk = dy.talk;
        dy.talk = null;
        window.__dcLock = false;
        p.vx = 0;
        tk.done();
        dyLog('talk_done', { name: tk.name });
      }
    }
    return;
  }
  // Daya: two scolds when Dudu comes into range, then the request when she is right next to Daya.
  // Each is one talk at a time and needs the one before, so they never overlap or run out of order.
  if (!dy.scoldDone && dyNear(DC55_DAYA_X, DY_RANGE.scold)) {
    dyStartTalk('scold', [
      { speaker: 'daya', text: DY_LINES.scold1, daya: 'daya_angry3' },
      { speaker: 'daya', text: DY_LINES.scold2, daya: 'daya_angry4' }
    ], () => { dy.scoldDone = true; });
    return;
  }
  if (dy.scoldDone && !dy.requestDone && dyNear(DC55_DAYA_X, DY_RANGE.close)) {
    dyStartTalk('request', [
      { speaker: 'dudu', text: DY_LINES.ask, daya: 'daya_angry4' },
      { speaker: 'daya', text: DY_LINES.reply, daya: 'daya_panic' }
    ], () => { dy.requestDone = true; });
    return;
  }
  // after the request Daya stays flustered while Dudu is close and goes back to Angry once she walks away
  if (dy.requestDone) {
    if (!dyNear(DC55_DAYA_X, DY_RANGE.back)) dySet('daya', 'daya_angry3');
  } else if (!dy.scoldDone || !dyNear(DC55_DAYA_X, DY_RANGE.scold)) {
    dySet('daya', 'daya_angry3');
  }
  // Amelia: camera from afar; Happy and her line the first time Dudu comes near; afterwards Happy near and camera
  // again once Dudu is well away (two ranges, so the edge never flickers between the two)
  if (!dy.ameliaNear && dyNear(DC55_AMELIA_X, DY_RANGE.ameliaIn)) {
    dy.ameliaNear = true;
    dySet('amelia', 'amelia_happy');
    if (!dy.greetDone) {
      dyStartTalk('amelia', [{ speaker: 'amelia', text: DY_LINES.amelia, amelia: 'amelia_happy' }], () => { dy.greetDone = true; });
      return;
    }
  } else if (dy.ameliaNear && !dyNear(DC55_AMELIA_X, DY_RANGE.ameliaOut)) {
    dy.ameliaNear = false;
    dySet('amelia', 'amelia_camera');
  }
}
window.updateDayaStage = updateDayaStage;

// ----------------------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------------------
// the official painting, a little larger than the screen so it can slide with the camera; its floor is the floor
// Dudu walks on (game y 580 lands on the painting's floor in front of the stairs)
function drawDayaBackground() {
  ctx.fillStyle = '#1d2a36'; ctx.fillRect(0, 0, W, H);
  const st = activeDayaStage(), im = dcImages.daya_bg;
  if (!st || !im) return;
  const sc = 1.1, dw = W * sc, dh = dw * im.height / im.width;
  const vx = Math.max(0, Math.min(1, rCam / Math.max(1, st.worldWidth - W)));
  ctx.drawImage(im, -Math.round(vx * (dw - W)), -Math.round((dh - H) * 0.5), dw, dh);
}
function dyDrawNpc(n, x) {
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#0b1622';
  ctx.beginPath(); ctx.ellipse(x, DC55_GROUND + 1, 42, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const loop = !(n.key === 'daya_panic' && dy.talk);   /* Panic plays once under the answer and holds its last frame */
  if (!dcSprite(n.key, n.t, x, DC55_GROUND, -1, loop)) {
    ctx.fillStyle = '#c9d4e0'; ctx.beginPath(); ctx.ellipse(x, DC55_GROUND - 60, 30, 60, 0, 0, Math.PI * 2); ctx.fill();
  }
}
function drawDayaNpcs() {
  if (!activeDayaStage()) return;
  dyDrawNpc(dy.daya, DC55_DAYA_X);
  dyDrawNpc(dy.amelia, DC55_AMELIA_X);
}
function drawDayaOverlay() {
  const tk = dy.talk;
  if (!tk || !activeDayaStage()) return;
  const ln = tk.lines[Math.min(tk.i, tk.lines.length - 1)];
  drawDragonDialog(ln.speaker, ln.text, tk.t);
}
