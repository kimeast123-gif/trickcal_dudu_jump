"""Build art-v2-pilot.js: the ART V2 test layer (approved pilot rev1, batch 1, batch 2 candidates).

    python tools/art_v2_pilot_build.py

Everything that needs pixels is computed here, offline, from the delivered PNGs:
- the place to cut a repeat tile when a run of tiles does not fill the width exactly ("two-part splice": keep
  columns [0,a) and [b,T) so that the seam a-1 | b is the closest match and both outer edges stay intact);
- the silhouette of each rounded cliff (and its downward extension), so the ground behind it can be clipped.
The browser never reads pixels (file:// safe).
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = 'v2b3a'


def px(path):
    return np.array(Image.open(os.path.join(ROOT, path)).convert('RGBA')).astype(np.int32)


def splice_table(path):
    """For a horizontally periodic tile of width T: for every leftover r (1..T-1) the column a where the kept
    columns are [0,a) + [T-(r-a), T). a == r means a plain [0,r) crop."""
    t = px(path); T = t.shape[1]
    out = [0] * T
    for r in range(1, T):
        best = (1e18, r)
        for a in range(1, r):
            b = T - (r - a)
            d = float(np.abs(t[:, a - 1] - t[:, b]).mean())
            if d < best[0]: best = (d, a)
        d0 = float(np.abs(t[:, r - 1] - t[:, 0]).mean())
        if d0 <= best[0]: best = (d0, r)
        out[r] = best[1]
    return out


def outline(path, side):
    """Columns from the outer edge to the first opaque pixel, per row."""
    a = px(path)[:, :, 3] > 128
    out = []
    for r in range(a.shape[0]):
        row = a[r] if side == 'left' else a[r][::-1]
        out.append(int(np.argmax(row)) if row.any() else -1)
    first = next(v for v in out if v >= 0)
    return [first if v < 0 else v for v in out]


B1, B2, B3, PI = 'assets/art_v2/batch1/', 'assets/art_v2/batch2/', 'assets/art_v2/batch3/', 'assets/art_v2/pilot/'


def forest_kits(prof, src_compact, src_ground, src_ext):
    pre = f'forest_{prof}_'
    k = {
        f'fc_{prof}': {'parts': {n: f'{src_compact}{pre}compact_{n}.png' for n in ('left', 'fill_a', 'fill_b', 'right')},
                       'cap': 24, 'tile': 16, 'h': 64, 'contactY': 18, 'cut': f'{src_compact}{pre}compact_fill_a.png'},
        f'gt_{prof}': {'parts': {n: f'{src_ground}{pre}ground_top_{n}.png' for n in ('a', 'b', 'c')},
                       'tile': 130, 'h': 95, 'contactY': 25, 'cut': f'{src_ground}{pre}ground_top_a.png'},
        f'gb_{prof}': {'parts': {n: f'{src_ground}{pre}ground_body_{n}.png' for n in ('a', 'b')}, 'tile': 151, 'h': 86},
        f'gc_{prof}': {'parts': {'left': f'{src_ground}{pre}ground_cliff_left.png', 'right': f'{src_ground}{pre}ground_cliff_right.png',
                                 'ext_left': f'{src_ext}{pre}ground_cliff_left_ext.png', 'ext_right': f'{src_ext}{pre}ground_cliff_right_ext.png'},
                       'w': 81, 'h': 159, 'extH': 86, 'contactY': 25,
                       'outlineLeft': outline(f'{src_ground}{pre}ground_cliff_left.png', 'left'),
                       'outlineRight': outline(f'{src_ground}{pre}ground_cliff_right.png', 'right'),
                       'extInsetLeft': max(outline(f'{src_ext}{pre}ground_cliff_left_ext.png', 'left')),
                       'extInsetRight': max(outline(f'{src_ext}{pre}ground_cliff_right_ext.png', 'right'))},
        f'wl_{prof}': {'parts': {'top': f'{src_ground}{pre}wall_top.png', 'body': f'{src_ground}{pre}wall_body.png',
                                 'edge_left': f'{src_ground}{pre}wall_edge_left.png', 'edge_right': f'{src_ground}{pre}wall_edge_right.png'},
                       'w': 96, 'h': 128, 'topH': 24, 'topContactY': 6, 'edge': 8},
    }
    return k


K = {}
K.update(forest_kits('w1', PI, B1, B2))
K.update(forest_kits('story', B2, B2, B2))
K.update({
    'us_w1': {'parts': {'mid': B1 + 'forest_w1_under_support.png', 'left': B1 + 'forest_w1_under_support_end_left.png',
                        'right': B1 + 'forest_w1_under_support_end_right.png'},
              'cap': 24, 'tile': 128, 'h': 44, 'cut': B1 + 'forest_w1_under_support.png'},
    # long ledges: World1 = candidate A (one image cut on its module lines), story = batch 2 kit with separate parts
    'fa_w1': {'parts': {'img': 'assets/art_prototype/forest_standard_candidate_A.png'}, 'w': 441, 'h': 80, 'contactY': 21},
    'fl_story': {'parts': {n: f'{B2}forest_story_long_{n}.png' for n in ('left', 'mid_a', 'mid_b', 'mid_c', 'right')},
                 'lw': 70, 'rw': 71, 'mw': 100, 'h': 80, 'contactY': 21},
    # Spirit lava (pilot rev1 long + batch 1 glow / wall)
    'll': {'parts': {n: f'{PI}spirit_lava_long_{n}.png' for n in ('left', 'mid_a', 'mid_b', 'right')},
           'cap': 44, 'tile': 394, 'h': 74, 'contactY': 6, 'overhang': 6, 'cut': PI + 'spirit_lava_long_mid_a.png'},
    'lg': {'parts': {n: f'{B1}spirit_lava_glow_{n}.png' for n in ('left', 'fill_a', 'fill_b', 'right')},
           'cap': 24, 'tile': 24, 'h': 34, 'contactY': 2, 'overhang': 5, 'cut': B1 + 'spirit_lava_glow_fill_a.png'},
    'lw': {'parts': {'tile': B1 + 'spirit_lava_wall_tile.png', 'edge_left': B1 + 'spirit_lava_wall_edge_left.png',
                     'edge_right': B1 + 'spirit_lava_wall_edge_right.png'}, 'w': 128, 'h': 192, 'edge': 10},
    # Spirit lakeside (batch 2)
    'ol': {'parts': {n: f'{B2}spirit_out_long_{n}.png' for n in ('left', 'mid_a', 'right')},
           'cap': 44, 'tile': 394, 'h': 72, 'contactY': 6, 'overhang': 6, 'cut': B2 + 'spirit_out_long_mid_a.png'},
    'ow': {'parts': {'tile': B2 + 'spirit_out_wall_tile.png', 'edge_left': B2 + 'spirit_out_wall_edge_left.png',
                     'edge_right': B2 + 'spirit_out_wall_edge_right.png'}, 'w': 128, 'h': 192, 'edge': 10},
    # Spirit cave (batch 3): long ledges stay on approved candidate A (art-prototype.js), shown with contact row 9
    'ct': {'parts': {n: f'{B3}spirit_cave_tiny_{n}.png' for n in ('left', 'fill_a', 'fill_b', 'right')},
           'cap': 28, 'tile': 12, 'h': 48, 'contactY': 2, 'overhang': 5, 'cut': B3 + 'spirit_cave_tiny_fill_a.png'},
    'cf': {'parts': {n: f'{B3}spirit_cave_floor_{n}.png' for n in ('left', 'mid', 'right')},
           'cap': 64, 'tile': 256, 'h': 120, 'contactY': 6, 'cut': B3 + 'spirit_cave_floor_mid.png'},
    'cw': {'parts': {'tile': B3 + 'spirit_cave_wall_tile.png', 'edge_left': B3 + 'spirit_cave_wall_edge_left.png',
                     'edge_right': B3 + 'spirit_cave_wall_edge_right.png'}, 'w': 128, 'h': 192, 'edge': 10},
    # Spirit snow (batch 3)
    'sl': {'parts': {n: f'{B3}spirit_snow_long_{n}.png' for n in ('left', 'mid_a', 'mid_b', 'right')},
           'cap': 44, 'tile': 394, 'h': 73, 'contactY': 6, 'overhang': 6, 'cut': B3 + 'spirit_snow_long_mid_a.png'},
    'st': {'parts': {n: f'{B3}spirit_snow_tiny_{n}.png' for n in ('left', 'fill_a', 'fill_b', 'right')},
           'cap': 28, 'tile': 12, 'h': 56, 'contactY': 2, 'overhang': 5, 'cut': B3 + 'spirit_snow_tiny_fill_a.png'},
    'sg': {'parts': {n: f'{B3}spirit_snow_glow_{n}.png' for n in ('left', 'fill_a', 'fill_b', 'right')},
           'cap': 24, 'tile': 24, 'h': 40, 'contactY': 6, 'overhang': 5, 'cut': B3 + 'spirit_snow_glow_fill_a.png'},
})
for k, v in K.items():
    if 'cut' in v:
        v['cutTable'] = splice_table(v['cut']); del v['cut']
    for n, p in v['parts'].items():
        im = Image.open(os.path.join(ROOT, p)); assert im.mode == 'RGBA', p
    v['parts'] = {n: p + '?v=' + CACHE for n, p in v['parts'].items()}

js = r"""// ============================================================================
// ART V2 TEST LAYER (branch art-unification-phase2 only; never merge as is)
// Generated by tools/art_v2_pilot_build.py. Do not edit by hand.
//
// Draws the ART V2 parts at 1:1 with each part's contact row on the platform top. Only drawing changes:
// platform objects, coordinates, collision and physics are untouched. Repeat tiles that do not fill a width
// exactly are cut at an offline "two-part splice" table; cliff silhouettes are offline outlines (no pixel
// reading in the browser, file:// safe).
//
// Forest, two colour profiles with the same shapes (gate B option A):
//   World1 수인숲 1-1..1-4 ('w1')   story 수인숲 ('story')
//   ledges < 141px      compact kit (24 | 16 x n | 24, contactY 18)
//   ledges >= 141px     long kit (left 70 | middle 100 x n | right 71, contactY 21); World1 = candidate A
//   ground              top a/b/c (contactY 25) over body a/b; at open ends a rounded cliff and, below it,
//                       a repeated cliff extension; the ground behind is clipped to their silhouette
//   walls               body + edges; the grass cap only on walls you can stand on ('wood' walls of 1-2 too)
//   World1 only         under-ledge slabs and the 1-3 ceiling: under support kit
//   story only          the old junction decorations (bush / flower collars) are not drawn
// Spirit Mountain:
//   lava ledges >= 120px     long kit (44 | 394 x n | 44, contactY 6, 6px overhang)
//   lava blinking ledges     glow kit (24 | 24 x n | 24, contactY 2, 5px overhang)
//   MW3, MW4, B6             basalt wall tile + edges (the open drop above the hall stays undrawn)
//   lakeside ledges (E1-E3)  lakeside long kit (44 | 394 x n | 44, contactY 6, 6px overhang)
//   MW1                      lakeside rock wall tile + edges
//   cave ledges >= 120px     approved candidate A (art-prototype.js), display contact row 9
//   cave ledges < 120px      cave tiny kit (28 | 12 x n | 28, contactY 2, 5px overhang)
//   cave floor (Gabia)       cave floor kit (64 | 256 x n | 64, contactY 6)
//   MW2, B1, B2, B3, B5      cave wall tile + edges; B1 (you can stand on it) gets a cave tiny cap
//   snow ledges              snow long kit (>= 120px) / snow tiny kit (< 120px)
//   snow blinking ledges     snow glow kit (24 | 24 x n | 24, contactY 6, 5px overhang)
// Toggles: ?artv2=0 turns this layer off (v1.1 prototype only); ?arttest=0 turns off every test layer.
// ============================================================================
(function () {
  'use strict';
  const q = location.search;
  window.__DUDU_ART_V2_PILOT = !/[?&]arttest=0\b/.test(q) && !/[?&]artv2=0\b/.test(q);
  const K = __KITS__;
  window.__DUDU_ART_V2 = K;
  for (const k of Object.keys(K)) {
    K[k].img = {};
    for (const n of Object.keys(K[k].parts)) {
      const im = new Image();
      im.onload = () => { K[k].img[n] = im; };
      im.src = K[k].parts[n];
    }
  }
  const failed = {};
  function fail(k, e) { failed[k] = true; console.warn('[art v2] ' + k + ' off:', e); }
  const ready = (...ks) => ks.every(k => Object.keys(K[k].parts).every(n => K[k].img[n]));
  function piece(im, sx, sy, w, h, dx, dy) { if (w > 0 && h > 0) ctx.drawImage(im, sx, sy, w, h, dx, dy, w, h); }
  function runX(k, names, x, total, top, h) {
    const T = K[k].tile, tab = K[k].cutTable;
    let i = 0;
    while (total >= T) { piece(K[k].img[names[i % names.length]], 0, 0, T, h, x, top); x += T; total -= T; i++; }
    if (total > 0) {
      const im = K[k].img[names[i % names.length]], a = tab[total] || total, b = T - (total - a);
      piece(im, 0, 0, a, h, x, top);
      if (a < total) piece(im, b, 0, T - b, h, x + a, top);
    }
  }
  function capped(k, mids, x0, total, top) {
    const C = K[k].cap, h = K[k].h;
    piece(K[k].img.left, 0, 0, C, h, x0, top);
    runX(k, mids, x0 + C, total - 2 * C, top, h);
    piece(K[k].img.right, 0, 0, C, h, x0 + total - C, top);
  }
  function fillRect(im, tw, th, x, y, w, h, y1, y2) {
    const sx = Math.max(0, Math.floor((tw - w) / 2)), cw = Math.min(w, tw);
    for (let cx = 0; cx < w; cx += cw) {
      const ww = Math.min(cw, w - cx);
      let ty = y + Math.floor((Math.max(y1, y) - y) / th) * th;
      for (; ty < Math.min(y + h, y2); ty += th) piece(im, sx, 0, ww, Math.min(th, y + h - ty), x + cx, ty);
    }
  }
  const view = () => (typeof smView === 'function') ? smView() : { x1: rCam, x2: rCam + W, y1: rCamY, y2: rCamY + H };

  // ---------------------------------------------------------------- forest (World1 + story)
  function forestProfile() {
    if (!window.__DUDU_ART_V2_PILOT || typeof gameMode === 'undefined') return null;
    if (gameMode === 'world') {
      const st = typeof world1Stages !== 'undefined' ? world1Stages[activeWorldStageIndex] : null;
      return (st && !st.worldId && ['1-1', '1-2', '1-3', '1-4'].includes(st.stageCode)) ? 'w1' : null;
    }
    if (gameMode === 'story') {
      const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
      return (l && l.id === 'forest') ? 'story' : null;
    }
    return null;
  }
  const grass = (a) => (a.visual?.material || a.skin || 'grass') === 'grass';
  /* the tree-interior walls of 1-2 use the 'wood' skin; the release draws them with the same forest soil */
  const forestWall = (a) => grass(a) || (a.visual?.material || a.skin) === 'wood';
  const pk = (k, p) => k + '_' + p;
  function drawLong(p, a, drawX, drawY) {
    const lw = 70, rw = 71, mw = 100, seed = a.visual?.seed || 202;
    let im, h, top, srcL, srcR, srcMid;
    if (p === 'w1') {
      const F = K.fa_w1; im = F.img.img; h = F.h; top = Math.round(drawY - F.contactY);
      srcL = (sx, w, dx) => piece(im, sx, 0, w, h, dx, top);
      srcR = (sx, w, dx) => piece(im, 370 + sx, 0, w, h, dx, top);
      srcMid = (i, sx, w, dx) => piece(im, [70, 170, 270][i] + sx, 0, w, h, dx, top);
    } else {
      const F = K.fl_story; h = F.h; top = Math.round(drawY - F.contactY);
      srcL = (sx, w, dx) => piece(F.img.left, sx, 0, w, h, dx, top);
      srcR = (sx, w, dx) => piece(F.img.right, sx, 0, w, h, dx, top);
      srcMid = (i, sx, w, dx) => piece(F.img[['mid_a', 'mid_b', 'mid_c'][i]], sx, 0, w, h, dx, top);
    }
    if (a.w <= lw + rw) {
      const halfW = Math.round(a.w * 0.5), rightHalfW = a.w - halfW;
      srcL(0, halfW, drawX); srcR(rw - rightHalfW, rightHalfW, drawX + halfW);
      return;
    }
    const plan = makePlatformModulePlan(a.w, lw, rw, mw, 0);
    srcL(0, lw, drawX);
    let x = drawX + lw;
    const neutral = (w) => { srcMid(0, Math.round((mw - w) * 0.5), w, x); x += w; };
    if (plan.neutralLeft > 0) neutral(plan.neutralLeft);
    for (let i = 0; i < plan.count; i++) { srcMid(Math.floor(seededUnit(seed, i + 7) * 3) % 3, 0, mw, x); x += mw; }
    if (plan.neutralRight > 0) neutral(plan.neutralRight);
    srcR(0, rw, drawX + a.w - rw);
  }
  function thinOk(p, a) {
    return p && !failed['thin_' + p] && ready(pk('fc', p), p === 'w1' ? 'fa_w1' : 'fl_story') &&
      !a.wall && !a.ceiling && !a.groundTile && !a.smDraw && !a.nonCollidable && grass(a);
  }
  function groundNeighbour(a, side) {
    for (const b of platforms) {
      if (b === a || !b.groundTile || Math.abs(b.y - a.y) > 4) continue;
      if (side < 0 && Math.abs(b.x + b.w - a.x) <= 2) return true;
      if (side > 0 && Math.abs(a.x + a.w - b.x) <= 2) return true;
    }
    return false;
  }
  function drawGround(p, a, x, y) {
    const gt = K[pk('gt', p)], gb = K[pk('gb', p)], gc = K[pk('gc', p)], top = Math.round(y - gt.contactY);
    /* like the release, the ground body runs down past the bottom of the view, whatever the object height */
    const v = view(), bottom = Math.max(y + (a.h || 260), v.y2 + 40);
    const openL = !groundNeighbour(a, -1), openR = !groundNeighbour(a, 1);
    const OL = gc.outlineLeft, OR = gc.outlineRight, n = OL.length;
    ctx.save();
    // clip the ground to the cliff silhouettes at open ends; below the cliff, to the extension's inner line
    ctx.beginPath();
    ctx.moveTo(openL ? x + OL[0] : x, top - 10);
    if (openL) { for (let r = 0; r < n; r += 3) ctx.lineTo(x + OL[r], top + r); ctx.lineTo(x + gc.extInsetLeft, top + n); ctx.lineTo(x + gc.extInsetLeft, bottom); }
    else ctx.lineTo(x, bottom);
    if (openR) { ctx.lineTo(x + a.w - gc.extInsetRight, bottom); ctx.lineTo(x + a.w - gc.extInsetRight, top + n); for (let r = n - 1; r >= 0; r -= 3) ctx.lineTo(x + a.w - OR[r], top + r); ctx.lineTo(x + a.w - OR[0], top - 10); }
    else { ctx.lineTo(x + a.w, bottom); ctx.lineTo(x + a.w, top - 10); }
    ctx.closePath(); ctx.clip();
    // body starts exactly under the top strip
    const bodyTop = top + gt.h;
    for (let by = bodyTop, row = 0; by < Math.min(bottom, v.y2 + 20); by += gb.h, row++) {
      if (by + gb.h < v.y1 - 20) continue;
      let i = row;
      for (let bx = x; bx < x + a.w; bx += gb.tile, i++) piece(gb.img[i % 2 ? 'b' : 'a'], 0, 0, Math.min(gb.tile, x + a.w - bx), gb.h, bx, by);
    }
    const seed = a.visual?.seed || 202, names = ['a', 'b', 'c'];
    const order = [0, 1, 2].map(i => names[Math.floor(seededUnit(seed, i + 3) * 3) % 3]);
    runX(pk('gt', p), order, x, a.w, top, gt.h);
    ctx.restore();
    // cliffs and their downward extensions keep their own silhouettes (drawn outside the clip)
    const extTop = top + gc.h, extEnd = Math.min(bottom, v.y2 + 20);
    if (openL) {
      piece(gc.img.left, 0, 0, gc.w, gc.h, x, top);
      for (let ey = extTop; ey < extEnd; ey += gc.extH) if (ey + gc.extH > v.y1 - 20) piece(gc.img.ext_left, 0, 0, gc.w, gc.extH, x, ey);
    }
    if (openR) {
      piece(gc.img.right, 0, 0, gc.w, gc.h, x + a.w - gc.w, top);
      for (let ey = extTop; ey < extEnd; ey += gc.extH) if (ey + gc.extH > v.y1 - 20) piece(gc.img.ext_right, 0, 0, gc.w, gc.extH, x + a.w - gc.w, ey);
    }
  }
  function drawWall(p, a, x, y) {
    const wl = K[pk('wl', p)], v = view();
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, a.w, a.h); ctx.clip();
    fillRect(wl.img.body, wl.w, wl.h, x, y, a.w, a.h, v.y1 - 20, v.y2 + 20);
    fillRect(wl.img.edge_left, wl.edge, wl.h, x, y, wl.edge, a.h, v.y1 - 20, v.y2 + 20);
    fillRect(wl.img.edge_right, wl.edge, wl.h, x + a.w - wl.edge, y, wl.edge, a.h, v.y1 - 20, v.y2 + 20);
    ctx.restore();
    if (!a.noTopLand) {   /* only walls you can stand on get the grass cap */
      const sx = Math.max(0, Math.floor((wl.w - a.w) / 2));
      piece(wl.img.top, sx, 0, Math.min(a.w, wl.w), wl.topH, x, Math.round(y - wl.topContactY));
    }
  }

  if (typeof drawThinPlatformVisual === 'function') {
    const prevThin = drawThinPlatformVisual;
    drawThinPlatformVisual = function (a, drawX, drawY) {
      const p = forestProfile();
      if (thinOk(p, a)) {
        try {
          if (a.w < 141) capped(pk('fc', p), ['fill_a', 'fill_b'], drawX, a.w, Math.round(drawY - K[pk('fc', p)].contactY));
          else drawLong(p, a, drawX, drawY);
          return;
        } catch (e) { fail('thin_' + p, e); }
      }
      return prevThin(a, drawX, drawY);
    };
  }
  if (typeof drawGroundVisual === 'function') {
    const prevGround = drawGroundVisual;
    drawGroundVisual = function (a, drawX, drawY) {
      const p = forestProfile();
      if (p && !failed['ground_' + p] && ready(pk('gt', p), pk('gb', p), pk('gc', p)) && a.groundTile && grass(a)) {
        try { drawGround(p, a, drawX, drawY); return; } catch (e) { fail('ground_' + p, e); }
      }
      return prevGround(a, drawX, drawY);
    };
  }
  if (typeof drawStructuralWall === 'function') {
    const prevWall = drawStructuralWall;
    drawStructuralWall = function (a, drawX, drawY) {
      const p = forestProfile();
      if (p && !failed['wall_' + p] && forestWall(a) && (a.wall || a.ceiling)) {
        const under = a.ceiling || /UNDER/.test(a.id || '');
        if (under && p === 'w1' && ready('us_w1')) {
          try { capped('us_w1', ['mid'], drawX, a.w, Math.round(drawY)); return; } catch (e) { fail('wall_' + p, e); }
        } else if (!under && ready(pk('wl', p))) {
          try { drawWall(p, a, drawX, drawY); return; } catch (e) { fail('wall_' + p, e); }
        }
      }
      return prevWall(a, drawX, drawY);
    };
  }
  if (typeof drawTerrainJunctionOverlays === 'function') {
    const prevJunction = drawTerrainJunctionOverlays;
    drawTerrainJunctionOverlays = function () {
      /* story forest: the release bush / flower / grass collars at wall feet are old art; the V2 walls and
         ground meet cleanly on their own */
      if (forestProfile() === 'story' && ready('wl_story', 'gt_story')) return;
      return prevJunction();
    };
  }

  // ---------------------------------------------------------------- Spirit Mountain (lava + lakeside)
  const ZONE_WALLS = { 'SM-MW3': 'lw', 'SM-MW4': 'lw', 'SM-B6': 'lw', 'SM-MW1': 'ow',
    'SM-MW2': 'cw', 'SM-B1': 'cw', 'SM-B2': 'cw', 'SM-B3': 'cw', 'SM-B5': 'cw' };
  function spiritOn() { return window.__DUDU_ART_V2_PILOT && typeof smZoneOf === 'function'; }
  /* the approved cave long ledge (candidate A, drawn by art-prototype.js) is shown with its top line on the
     platform: display contact row 9 instead of the metadata 16 (gate B decision; collision unchanged) */
  if (window.__DUDU_ART_V2_PILOT && window.__DUDU_ART_PROTOTYPE && window.__DUDU_ART_PROTOTYPE.cave) window.__DUDU_ART_PROTOTYPE.cave.contactY = 9;
  // ledge kit for a Spirit Mountain platform: [kit, middle variants] or null (cave long ledges stay on candidate A)
  function spiritLongKit(a) {
    if (!spiritOn() || !a.smDraw || a.blink) return null;
    if (['rock', 'pillar', 'floor', 'roof', 'blink'].includes(a.smDraw)) return null;
    const z = smZoneOf(a), tiny = a.w < 120;
    const pick = (k, mids) => (!failed[k] && ready(k)) ? [k, mids] : null;
    if (z === 'lava') return tiny ? null : pick('ll', ['mid_a', 'mid_b']);
    if (z === 'out') return tiny ? null : pick('ol', ['mid_a']);
    if (z === 'cave') return tiny ? pick('ct', ['fill_a', 'fill_b']) : null;
    if (z === 'snow') return tiny ? pick('st', ['fill_a', 'fill_b']) : pick('sl', ['mid_a', 'mid_b']);
    return null;
  }
  const GLOW = { lava: 'lg', snow: 'sg' };
  function drawZoneWall(k, a, x, y) {
    const w = K[k], v = view();
    if (y + a.h < v.y1 - 20 || y > v.y2 + 20) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, a.w, a.h); ctx.clip();
    fillRect(w.img.tile, w.w, w.h, x, y, a.w, a.h, v.y1 - 20, v.y2 + 20);
    fillRect(w.img.edge_left, w.edge, w.h, x, y, w.edge, a.h, v.y1 - 20, v.y2 + 20);
    fillRect(w.img.edge_right, w.edge, w.h, x + a.w - w.edge, y, w.edge, a.h, v.y1 - 20, v.y2 + 20);
    ctx.restore();
  }
  if (typeof drawSpiritPlatform === 'function') {
    const prevSpirit = drawSpiritPlatform;
    drawSpiritPlatform = function (a, x, y) {
      const wk = ZONE_WALLS[a.id];
      if (wk && spiritOn() && !failed[wk] && ready(wk)) {
        try {
          drawZoneWall(wk, a, x, y);
          /* a pillar you can stand on gets the cave small-ledge kit as its cap (capless pillars hide under a ledge) */
          if (a.smDraw === 'pillar' && !(typeof SM_CAPLESS !== 'undefined' && SM_CAPLESS.has(a.id)) && wk === 'cw' && ready('ct')) {
            const T = K.ct; capped('ct', ['fill_a', 'fill_b'], x - 4, a.w + 8, Math.round(y - T.contactY));
          }
          return;
        } catch (e) { fail(wk, e); }
      }
      if (a.smDraw === 'floor' && spiritOn() && !failed.cf && ready('cf')) {
        try { capped('cf', ['mid'], x, a.w, Math.round(y - K.cf.contactY)); return; } catch (e) { fail('cf', e); }
      }
      const lk = spiritLongKit(a);
      if (lk) {
        try { const L = K[lk[0]]; capped(lk[0], lk[1], x - L.overhang, a.w + 2 * L.overhang, Math.round(y - L.contactY)); return; }
        catch (e) { fail(lk[0], e); }
      }
      return prevSpirit(a, x, y);
    };
    window.drawSpiritPlatform = drawSpiritPlatform;
  }
  if (typeof drawSpiritGlow === 'function') {
    const prevGlow = drawSpiritGlow;
    drawSpiritGlow = function (a, x, y) {
      const gk = spiritOn() ? GLOW[smZoneOf(a)] : null;
      if (gk && !failed[gk] && ready(gk)) {
        try { const G = K[gk]; capped(gk, ['fill_a', 'fill_b'], x - G.overhang, a.w + 2 * G.overhang, Math.round(y - G.contactY)); return; }
        catch (e) { fail(gk, e); }
      }
      return prevGlow(a, x, y);
    };
  }

  // QA hook: does the V2 layer draw this object?
  window.__artV2Pilot = {
    applies(a) {
      if (a.smDraw) {
        if (ZONE_WALLS[a.id]) return spiritOn();
        if (a.smDraw === 'floor') return spiritOn();
        if (a.blink) return spiritOn() && !!GLOW[smZoneOf(a)];
        if (spiritOn() && smZoneOf(a) === 'cave' && a.w >= 120) return !!(window.__artProto && window.__artProto.applies(a));
        return !!spiritLongKit(a);
      }
      const p = forestProfile();
      if (!p) return false;
      if (a.wall || a.ceiling) return forestWall(a) && (p === 'w1' || !(a.ceiling || /UNDER/.test(a.id || '')));
      if (!grass(a)) return false;
      if (a.groundTile) return true;
      return thinOk(p, a);
    },
    profile() { return forestProfile(); }
  };
})();
"""
js = js.replace('__KITS__', json.dumps(K, separators=(',', ':')))
open(os.path.join(ROOT, 'art-v2-pilot.js'), 'w', encoding='utf-8', newline='\n').write(js)
print('written', len(js), 'bytes; kits', ', '.join(f"{k}{'(cut %d)' % len(v['cutTable']) if 'cutTable' in v else ''}" for k, v in K.items()))
print('ext insets', {p: (K['gc_' + p]['extInsetLeft'], K['gc_' + p]['extInsetRight'], K['gc_' + p]['outlineLeft'][-1], K['gc_' + p]['outlineRight'][-1]) for p in ('w1', 'story')})
