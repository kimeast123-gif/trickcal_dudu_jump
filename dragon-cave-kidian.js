'use strict';
// ============================================================================
// v1.10.7 WORLD 5 / 5-3 「키디언의 어두운 미로」
// (package DUDU_WORLD5_STAGE53_KIDIAN_CLAUDE_MASTER_REV2_261125; CLAUDE_WORLD5_STAGE53_KIDIAN_MASTER_REV2.md)
//
// A left-to-right maze in the dark: small ledges, brown rock walls that make Dudu go round above or below, obsidian
// on the ledges marked red on the sketch. Only the start and goal flags of the sketch: no checkpoint in between.
// - Sight: the Gabia darkness of Spirit Mountain (drawSightMask, spirit-mountain.js), a little wider here, and every
//   15 seconds (at 15s, 30s, 45s ...) it closes in for 3 seconds. The clock is the stage's own and stops with the
//   game (paused, menus); it starts again at 0 on every restart.
// - Kidian walks Dudu's own path a little behind her (Move while moving, Idle_2 standing). When Dudu calls out
//   "교주님" (her CallPlayer voice, the same event the village friends answer, game.js onDuduCallPlayerVoice) and
//   Kidian is standing, Kidian dances once (Dance_1 or Dance_2 at random). No new lines.
// - Music: 19. Dragon Cave (Abyss) (track 12) for the whole stage.
//
// Sketch STAGE53_USER_MAP_DRAWING.png (1102 x 425): x = 60 + sketch x * 3.5, y = 580 + (sketch y - 252) * 2, then
// hand-fixed where a jump came out too long (docs/world5/KIDIAN_MAP3_COORDS.csv). Art: the package's candidate sheet
// cut by tools/dragon_cave_kidian_parts.py (its faint red halo cleared).
// ============================================================================

const DC53_CODE = 'dragon_cave_3';
const DC53_WIDTH = 4100;
// ledges: [id, x, y, w, art]  art: sand (the sketch's brown-bottomed ledges) | plain (black ones) | start | goal
const DC53_LEDGES = [
  ['S', 60, 580, 368, 'start'],
  ['A1', 445, 442, 297, 'sand'], ['A2', 182, 318, 200, 'sand'], ['A3', 498, 232, 199, 'sand'],
  // A4 raised 100px (v1.10.7, user): 312px above A1, out of reach of a double jump from A1 (about 279px), so the
  // upper way can no longer skip A2 and A3; from A3 it is a 98px step up
  ['A4', 890, 130, 202, 'sand'], ['A5', 1285, 232, 199, 'sand'],
  ['B1', 410, 696, 332, 'sand'], ['B2', 942, 562, 196, 'plain'], ['B3', 935, 666, 203, 'plain'], ['B4', 935, 762, 217, 'plain'],
  ['C1', 1400, 436, 190, 'sand'], ['C2', 1340, 600, 217, 'plain'], ['C3', 1600, 312, 217, 'sand'],
  ['C4', 1764, 512, 186, 'sand'], ['C5', 1733, 680, 235, 'plain'], ['C6', 1940, 396, 248, 'sand'],
  ['C7', 2114, 770, 246, 'plain'], ['C8', 2237, 270, 196, 'sand'], ['C9', 2363, 500, 245, 'sand'],
  ['C10', 2412, 630, 248, 'plain'], ['D1', 2562, 222, 298, 'sand'], ['D2', 2860, 542, 350, 'plain'],
  ['GOAL', 3430, 542, 347, 'goal']
];
// ground blocks along the bottom of the sketch (solid rock; between them is the drop): [id, x, y, w]
const DC53_GROUND = [['G1', 60, 850, 385], ['G2', 742, 850, 420], ['G3', 2562, 832, 508]];
// brown rock walls: [id, x, y, w, h]
const DC53_WALLS = [
  ['W1', 750, 420, 62, 286],    // the ㄱ: the upright, from the beam down to just above the floor (walk under it)
  ['W2', 760, 420, 490, 20],    // the ㄱ: the beam along the top; v1.10.7 (user): no standing on it, obsidian on top
  ['W3', 2860, 76, 88, 156],    // top right: from the ceiling down to the end of D1
  ['W4', 2937, 656, 105, 180]   // bottom right: standing on G3
];
// obsidian (the sketch's red marks): [id, ledge id, offset from the ledge's left end]
const DC53_OBSIDIAN = [['O1', 'A4', 101], ['O2', 'C1', 30], ['O3', 'C1', 160], ['O4', 'C4', 30], ['O5', 'C4', 156], ['O6', 'C6', 124],
  // along the top of the ㄱ beam, so walking over it from A1 to C1 (a shortcut past both ways round) is closed
  ['OB1', 'W2', 35], ['OB2', 'W2', 105], ['OB3', 'W2', 175], ['OB4', 'W2', 245], ['OB5', 'W2', 315], ['OB6', 'W2', 385], ['OB7', 'W2', 455]];
const KD_OBS = { w: 66, hitHalfW: 22, hitH: 46 };
const KD_SIGHT = { normal: 250, narrow: 150, every: 15, hold: 3, ease: 0.3 };   // Gabia's sight is 210
const KD_FOLLOW = { behind: 110, moveSpeed: 26, standAfter: 0.15, maxTrail: 900 };

function buildDragonStage53() {
  const s = makeWorldStage({
    id: 'world5_dragon_53',
    stageCode: DC53_CODE,
    name: '키디언의 어두운 미로',
    subtitle: '어둠 속 흑요석을 피해요',
    worldWidth: DC53_WIDTH,
    killY: 1000,
    minCamY: -300,
    maxCamY: 400,
    cameraProfile: 'world1_standard',
    entrySpawns: { default: { route: 'default', platformId: 'DC53-S', x: 200, feetY: 580 } },
    segments: [{ start: 0, end: DC53_WIDTH, bg: 'dragoncave' }],
    backgroundRanges: {},
    goal: { id: 'dc53-goal', exitRoute: 'default', x: 3604, y: 542, w: 60, h: 120, hidden: true }
  });
  s.worldId = DC_WORLD_ID;
  s.dragonCave = true;
  s.routeLabel = '월드 5';
  s.musicTrack = 12;   // 19. Dragon Cave (Abyss)
  s.customBackground = drawKidianBackground;
  s.onLoad = () => { loadDragonAssets(); loadKidianAssets(); };
  s.onReset = () => resetKidianStage();
  s.onComplete = () => completeDragonStage(DC53_CODE);
  s.dcHooks = { update: updateKidianStage, back: drawKidianBack, front: drawKidianFront, overlay: drawKidianOverlay };
  for (const [id, x, y, w, art] of DC53_LEDGES) wSurface(s, x, y, w, 'stone', { id: 'DC53-' + id, dcDraw: 'kd_' + art });
  for (const [id, x, y, w] of DC53_GROUND) wFloor(s, x, w, 'stone', y, { id: 'DC53-' + id, dcDraw: 'kd_ground' });
  for (const [id, x, y, w, h] of DC53_WALLS) wWall(s, x, y, w, h, 'stone', { id: 'DC53-' + id, dcDraw: w > h ? 'kd_beam' : 'kd_wall', noTopLand: id === 'W2' });
  wCheckpoint(s, '어두운 미로 입구', 200, 580);
  const goalSec = { title: '미로 출구', x: 3604, y: 542, hint: '', flagX: 3604, hiddenFlag: true };   // the goal pad carries its own flag
  s.sections.push(goalSec);
  s.hudStars = 0;
  return s;
}
if (typeof world1Stages !== 'undefined' && !world1Stages.some(st => st.worldId === DC_WORLD_ID && st.stageCode === DC53_CODE)) {
  world1Stages.push(buildDragonStage53());
}
DC_STAGE_INFO[DC53_CODE] = { code: '5-3', name: '키디언의 어두운 미로', desc: '어두운 미로에서 흑요석을 피해 키디언과 함께 빠져나가요. 가끔 앞이 더 캄캄해져요.' };

let _kdRequested = false;
function loadKidianAssets() {
  if (_kdRequested) return;
  _kdRequested = true;
  dcLoad('kidian_bg', `assets/world/dragoncave/kidian_bg.webp${DC_ASSET_Q}`);
  dcScript(window.KD_PARTS, `assets/world/dragoncave/kidian/parts.js${DC_ASSET_Q}`, () => {
    if (window.KD_PARTS) for (const k of Object.keys(window.KD_PARTS)) dcLoad('kd_' + k, `assets/world/dragoncave/kidian/${k}.webp${DC_ASSET_Q}`);
  });
}
function kdPart(k) {
  const m = window.KD_PARTS && window.KD_PARTS[k], im = dcImages['kd_' + k];
  return m && im ? { im, w: m[0], h: m[1], surf: m[2] } : null;
}

// ----------------------------------------------------------------------------
// Runtime
// ----------------------------------------------------------------------------
const kd = { clock: 0, sight: KD_SIGHT.normal, trail: [], kid: null, mask: {}, log: [] };
window.__kd = kd;
window.__kdLog = kd.log;
function kdLog(ev, extra = {}) {
  kd.log.push({ ev, t: Number(kd.clock.toFixed(2)), x: Math.round(p.x), y: Math.round(p.y), ...extra });
  if (kd.log.length > 300) kd.log.shift();
}
function activeKidianStage() { const st = activeDragonStage(); return st && st.stageCode === DC53_CODE ? st : null; }
function resetKidianStage() {
  kd.clock = 0;
  kd.sight = KD_SIGHT.normal;
  kd.trail = [[p.x - KD_FOLLOW.behind, p.y], [p.x, p.y]];   // she starts just behind Dudu
  kd.kid = { x: p.x - KD_FOLLOW.behind, y: p.y, prevX: p.x - KD_FOLLOW.behind, prevY: p.y, face: 1, key: 'kidian_idle', t: 0, still: 1, dist: 0 };
  kd.narrow = false;
  kdLog('reset');
}
// Sight radius at a stage time: normal, and from each multiple of 15s for 3s narrow. The easing sits inside the 3s
// (closing over the first 0.3s, opening over the last 0.3s), so the narrow window never runs longer than 3s.
function kdSightAt(t) {
  const S = KD_SIGHT;
  if (t < S.every) return S.normal;
  const u = t % S.every;
  if (u >= S.hold) return S.normal;
  const k = Math.min(1, u / S.ease, (S.hold - u) / S.ease), e = k * k * (3 - 2 * k);
  return S.normal + (S.narrow - S.normal) * e;
}
// Kidian walks the path Dudu took, KD_FOLLOW.behind px of path behind her
function kdTrailPoint(dist) {
  const tr = kd.trail;
  let left = dist;
  for (let i = tr.length - 1; i > 0; i--) {
    const [x1, y1] = tr[i], [x0, y0] = tr[i - 1], seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg >= left) { const u = seg ? left / seg : 0; return [x1 + (x0 - x1) * u, y1 + (y0 - y1) * u]; }
    left -= seg;
  }
  return tr[0];
}
function updateKidian(dt) {
  const k = kd.kid, tr = kd.trail, last = tr[tr.length - 1];
  if (Math.hypot(p.x - last[0], p.y - last[1]) > 3) {
    tr.push([p.x, p.y]);
    if (tr.length > KD_FOLLOW.maxTrail) tr.shift();
  }
  const [tx, ty] = kdTrailPoint(KD_FOLLOW.behind);
  k.prevX = k.x; k.prevY = k.y;
  const a = Math.min(1, dt * 14);
  k.x += (tx - k.x) * a; k.y += (ty - k.y) * a;
  const moved = Math.hypot(k.x - k.prevX, k.y - k.prevY) / Math.max(dt, 1e-6);
  if (Math.abs(k.x - k.prevX) > 0.15) k.face = k.x > k.prevX ? 1 : -1;
  k.t += dt;
  if (moved > KD_FOLLOW.moveSpeed) {
    k.still = 0;
    if (k.key !== 'kidian_move') { k.key = 'kidian_move'; k.t = 0; }   // moving wins over a dance
    return;
  }
  k.still += dt;
  if (k.key === 'kidian_move' && k.still >= KD_FOLLOW.standAfter) { k.key = 'kidian_idle'; k.t = 0; }
  if (k.key === 'kidian_dance1' || k.key === 'kidian_dance2') {
    const m = dcAtlas && dcAtlas.motions[k.key];
    if (!m || k.t * 1000 >= m.duration) { k.key = 'kidian_idle'; k.t = 0; kdLog('dance_end'); }
  }
  if (k.key !== 'kidian_move' && Math.abs(k.x - p.x) > 4) k.face = p.x > k.x ? 1 : -1;
}
// "교주님": Dudu's CallPlayer voice (game.js). Kidian dances once if she is standing; otherwise the old handler runs.
const _kdPrevCall = window.onDuduCallPlayerVoice;
window.onDuduCallPlayerVoice = function (clip) {
  if (activeKidianStage() && kd.kid) {
    const k = kd.kid;
    if (k.key === 'kidian_idle' && k.still >= KD_FOLLOW.standAfter) {
      k.key = Math.random() < 0.5 ? 'kidian_dance1' : 'kidian_dance2'; k.t = 0;
      kdLog('dance', { clip, motion: k.key });
      return true;
    }
    kdLog('call_no_dance', { clip, state: k.key });
    return false;
  }
  return typeof _kdPrevCall === 'function' ? _kdPrevCall(clip) : false;
};
function kdObsidianRects() {
  const out = [];
  for (const [id, ledgeId, off] of DC53_OBSIDIAN) {
    const l = platforms.find(a => a.id === 'DC53-' + ledgeId);
    if (l) out.push({ id, x: l.x + off, y: l.y });
  }
  return out;
}
function updateKidianStage(dt) {
  if (!activeKidianStage() || !kd.kid) return;
  kd.clock += dt;
  const was = kd.narrow;
  kd.sight = kdSightAt(kd.clock);
  kd.narrow = (kd.clock >= KD_SIGHT.every) && (kd.clock % KD_SIGHT.every) < KD_SIGHT.hold;
  if (kd.narrow !== was) kdLog(kd.narrow ? 'sight_narrow' : 'sight_normal');
  updateKidian(dt);
  // obsidian: 1 health and knocked away, like the forest thorns (invulnerable for a moment after)
  if (p.invulnerable <= 0 && typeof applyStunHit === 'function') {
    for (const o of kdObsidianRects()) {
      if (Math.abs(p.x - o.x) < KD_OBS.hitHalfW + 18 && p.y > o.y - KD_OBS.hitH && p.y - 60 < o.y) {
        applyStunHit(o.x, 'kidian_obsidian', '앗! 흑요석에 찔렸어요!');
        kdLog('obsidian_hit', { id: o.id });
        break;
      }
    }
  }
}
window.updateKidianStage = updateKidianStage;

// ----------------------------------------------------------------------------
// Drawing
// ----------------------------------------------------------------------------
function drawKidianBackground() {
  ctx.fillStyle = '#0b0a0e'; ctx.fillRect(0, 0, W, H);
  const st = activeKidianStage(), im = dcImages.kidian_bg;
  if (!st || !im) return;
  const sc = 1.12, dw = im.width * sc, dh = im.height * sc;
  const vx = Math.max(0, Math.min(1, (rCam + W * 0.5) / st.worldWidth));
  const vy = Math.max(0, Math.min(1, (rCamY - st.minCamY) / Math.max(1, st.maxCamY - st.minCamY)));
  ctx.drawImage(im, -Math.round(vx * (dw - W)), -Math.round(vy * (dh - H)), dw, dh);
  // the painting's sandy floor would read as ground under the ledges: its lower part is dimmed into the distance
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, 'rgba(6,5,10,0)'); g.addColorStop(0.35, 'rgba(6,5,10,0.55)'); g.addColorStop(1, 'rgba(6,5,10,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55);
}
// the drop between the ground blocks: dark mist from just under their tops down (world coordinates, behind them)
function drawKidianBack() {
  if (!activeKidianStage()) return;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const x1 = Math.floor(rCam) - 40, x2 = Math.ceil(rCam + W / zoom) + 40, top = 800, bot = rCamY + H / zoom + 40;
  if (bot <= top) return;
  const g = ctx.createLinearGradient(0, top, 0, top + 180);
  g.addColorStop(0, 'rgba(8,6,12,0)'); g.addColorStop(0.5, 'rgba(8,6,12,0.8)'); g.addColorStop(1, 'rgba(4,3,6,0.97)');
  ctx.fillStyle = g; ctx.fillRect(x1, top, x2 - x1, bot - top);
}
// three pieces: left end, middle repeated, right end, all at one even scale k, the walking surface on y
function kdThreeSlice(pre, x, y, w, k) {
  const L = kdPart(pre + '_l'), M = kdPart(pre + '_m'), R = kdPart(pre + '_r');
  if (!L || !M || !R) return false;
  const lw = L.w * k, rw = R.w * k;
  ctx.drawImage(L.im, x, y - L.surf * k, lw, L.h * k);
  const end = x + w - rw, mw = M.w * k;
  for (let cx = x + lw - 1; cx < end; cx += mw - 1) {
    const cw = Math.min(mw, end - cx + 1);
    ctx.drawImage(M.im, 0, 0, cw / k, M.h, cx, y - M.surf * k, cw, M.h * k);
  }
  ctx.drawImage(R.im, end - 1, y - R.surf * k, rw, R.h * k);
  return true;
}
function kdTile(name, x, y, w, h, k) {
  const P = kdPart(name);
  if (!P) return false;
  const tw = P.w * k, th = P.h * k;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let ty = y; ty < y + h; ty += th - 1) for (let tx = x; tx < x + w; tx += tw - 1) ctx.drawImage(P.im, tx, ty, tw, th);
  ctx.restore();
  return true;
}
function drawKidianPiece(a, x, y) {
  const kind = a.dcDraw.slice(3);
  if (kind === 'start' || kind === 'goal') {
    const P = kdPart(kind === 'start' ? 'pad_start' : 'pad_goal');
    if (P) { const k = a.w / P.w; ctx.drawImage(P.im, x, y - P.surf * k, a.w, P.h * k); return; }
  } else if (kind === 'sand' || kind === 'plain') {
    // long ledges: three pieces; short ones: the wide float piece scaled evenly to the ledge
    if (a.w >= 300 && kdThreeSlice(kind, x, y, a.w, 0.55)) return;
    const P = kdPart(kind + '_f');
    if (P) { const k = a.w / P.w; ctx.drawImage(P.im, x, y - P.surf * k, a.w, P.h * k); return; }
  } else if (kind === 'ground') {
    const k = 0.6;
    kdTile('cliff', x, y + 20, a.w, Math.max(0, (rCamY + H + 40) - (y + 20)), k);
    if (kdThreeSlice('plain', x, y, a.w, k)) return;
  } else if (kind === 'wall') {
    if (kdTile('pillar', x, y, a.w, a.h, a.w / 89)) return;
  } else if (kind === 'beam') {
    if (kdThreeSlice('plain', x, y, a.w, a.h / 60)) return;
  }
  ctx.fillStyle = '#3a3440'; ctx.fillRect(x, y, a.w, Math.max(16, a.h || 16));
}
window.drawKidianPiece = drawKidianPiece;
function drawKidianFront() {
  if (!activeKidianStage() || !kd.kid) return;
  // obsidian clusters standing on their ledges
  const O = kdPart('shard3');
  for (const o of kdObsidianRects()) {
    if (O) { const k = KD_OBS.w / O.w; ctx.drawImage(O.im, o.x - KD_OBS.w / 2, o.y - O.h * k + 8, KD_OBS.w, O.h * k); }
    else { ctx.fillStyle = '#2a2236'; ctx.beginPath(); ctx.moveTo(o.x - 20, o.y); ctx.lineTo(o.x, o.y - 46); ctx.lineTo(o.x + 20, o.y); ctx.fill(); }
  }
  // Kidian, feet on the path Dudu walked
  const k = kd.kid, ra = typeof renderAlpha === 'number' ? renderAlpha : 1;
  const x = k.prevX + (k.x - k.prevX) * ra, y = k.prevY + (k.y - k.prevY) * ra;
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y + 1, 26, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (!dcSprite(k.key, k.t, x, y, k.face, true)) { ctx.fillStyle = '#4a4058'; ctx.beginPath(); ctx.ellipse(x, y - 50, 22, 50, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawKidianOverlay() {
  if (!activeKidianStage() || typeof drawSightMask !== 'function') return;
  drawSightMask(kd.mask, [[rPx, rPy - 32]], kd.sight, 1);
}
