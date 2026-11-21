// ============================================================================
// ART PROTOTYPE TEST (branch art-prototype-v1 only; never merge into the release branch as is)
//
// Draws two approved candidate sprites in place of the release platform art. Only drawing changes:
// platform objects, coordinates, sizes, collision and physics are not touched.
//
//   Forest  assets/art_prototype/forest_standard_candidate_A.png   441x80, contact row 21
//           = the shipped forest modules at 0.50x, colour-graded, laid out as
//             left [0,70) | middle_a [70,170) | middle_b [170,270) | middle_c [270,370) | right [370,441)
//           (checked pixel-for-pixel). Cut on those lines and fed through the same module plan the release
//           renderer uses (makePlatformModulePlan, seeded middle choice, neutral strips), at 1:1.
//   Cave    assets/art_prototype/cave_standard_candidate_A.png     482x81, contact row 16
//           = drop-in for SM_TILES.cave_long (1419x237, surface row 47) at SM_LEDGE_SC 0.34.
//           3-sliced like drawSpiritTile (6px overhang each side, 44px end caps = SM_CAP*0.34, 394px middle),
//           at 1:1, with the leftover middle length removed at a seam-matched cut (see drawCave).
//
// Neither sprite is ever scaled: every drawImage below uses the same source and destination size.
//
// Left on the release art on purpose (no approved asset for them yet):
//   forest: single_small (117-184px) and World1 single_medium (200-308px) platforms, walls, ground tiles,
//           Challenge mode. Scope = story 수인숲 + World1 수인숲 stages (the art package's colour reference is the
//           World1 background w1-forest-bg).
//   cave:   tiny ledges (<120px), blinking glow slabs, Gabia's floor, rock walls and pillars.
//
// Toggle: on by default in this branch. Add ?arttest=0 to the address to see the release art.
// ============================================================================
(function () {
  'use strict';
  window.__DUDU_ART_PROTOTYPE_TEST = !/[?&]arttest=0\b/.test(location.search);

  const ART = {
    forest: {
      src: 'assets/art_prototype/forest_standard_candidate_A.png', w: 441, h: 80, contactY: 21,
      left: [0, 70], mids: [[70, 100], [170, 100], [270, 100]], right: [370, 71], img: null
    },
    cave: {
      src: 'assets/art_prototype/cave_standard_candidate_A.png', w: 482, h: 81, contactY: 16,
      cap: 44, overhang: 6, img: null
    }
  };
  window.__DUDU_ART_PROTOTYPE = ART;
  for (const k of Object.keys(ART)) {
    const A = ART[k], im = new Image();
    im.onload = () => { if (im.naturalWidth === A.w && im.naturalHeight === A.h) A.img = im; };
    im.src = A.src;
  }

  // 1:1 vertical slice of a candidate: source columns sx..sx+w drawn at dx, full height, no scaling.
  function piece(A, sx, w, dx, top) {
    if (w <= 0) return;
    ctx.drawImage(A.img, sx, 0, w, A.h, dx, top, w, A.h);
  }

  // ---------------------------------------------------------------- forest
  function forestSingleSmall(a) {
    const smallImg = getTerrainImg('forest', '', 'single_small');
    if (!smallImg || !(a.useSmallVisual || (a.w >= 117 && a.w <= 184))) return false;
    const uS = a.w / smallImg.width;
    return uS >= 0.36 && uS <= 0.58;
  }
  function forestSingleMedium(a) {
    /* World1 draws 200-308px platforms with single_medium; no approved replacement, so they stay on release art */
    const medImg = getTerrainImg('forest', '', 'single_medium');
    if (!medImg || gameMode !== 'world' || a.w < 200 || a.w > 308) return false;
    const uM = a.w / medImg.width;
    return uM >= 0.36 && uM <= 0.56;
  }
  function forestApplies(a) {
    if (!window.__DUDU_ART_PROTOTYPE_TEST || !ART.forest.img) return false;
    if (a.wall || a.ceiling || a.groundTile || a.smDraw) return false;
    if ((a.visual?.material || a.skin || 'grass') !== 'grass') return false;
    if (gameMode === 'story') {
      const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
      if (!l || l.id !== 'forest') return false;
    } else if (gameMode === 'world') {
      /* World1 (수인숲) only: Night Monatium and Spirit Mountain reuse the grass skin. World1 stages have no worldId. */
      const st = typeof world1Stages !== 'undefined' ? world1Stages[activeWorldStageIndex] : null;
      if (!st || st.worldId) return false;
    } else return false;
    return !forestSingleSmall(a) && !forestSingleMedium(a);
  }
  function drawForest(a, drawX, drawY) {
    const F = ART.forest;
    const top = Math.round(drawY - F.contactY);
    const lw = F.left[1], rw = F.right[1];
    if (a.w <= lw + rw) {
      // Narrow perch: outer part of each end cap plus a short middle patch over the join (release layout).
      const halfW = Math.round(a.w * 0.5), rightHalfW = a.w - halfW;
      piece(F, F.left[0], halfW, drawX, top);
      piece(F, F.right[0] + rw - rightHalfW, rightHalfW, drawX + halfW, top);
      const seamW = Math.min(10, Math.max(4, Math.round(a.w * 0.16))), m = F.mids[0];
      piece(F, m[0] + Math.round((m[1] - seamW) * 0.5), seamW, Math.round(drawX + halfW - seamW * 0.5), top);
      return;
    }
    const plan = makePlatformModulePlan(a.w, lw, rw, F.mids[0][1], 0);
    const seed = a.visual?.seed || 202;
    ctx.save();
    try {
    ctx.beginPath();
    ctx.rect(drawX, top - 4, a.w, F.h + 8);
    ctx.clip();
    piece(F, F.left[0], lw, drawX, top);
    let x = drawX + lw;
    const neutral = (w) => { const m = F.mids[0]; piece(F, m[0] + Math.round((m[1] - w) * 0.5), w, x, top); x += w; };
    if (plan.neutralLeft > 0) neutral(plan.neutralLeft);
    for (let i = 0; i < plan.count; i++) {
      const m = F.mids[Math.floor(seededUnit(seed, i + 7) * 3) % 3];   /* same seeded pick as the release */
      piece(F, m[0], m[1], x, top);
      x += m[1];
    }
    if (plan.neutralRight > 0) neutral(plan.neutralRight);
    piece(F, F.right[0], rw, drawX + a.w - rw, top);
    } finally { ctx.restore(); }   /* keep the canvas save stack balanced even if a draw call throws */
  }
  // Safety: this test layer must never stop the game. If drawing a prototype ever throws, that kind is switched off for
  // the rest of the session and the release drawer takes over (one console warning).
  const failed = { forest: false, cave: false };
  function fail(kind, e) {
    if (!failed[kind]) { failed[kind] = true; console.warn('[art-prototype] ' + kind + ' prototype disabled after an error:', e); }
  }
  const releaseThin = drawThinPlatformVisual;
  drawThinPlatformVisual = function (a, drawX, drawY) {
    if (!failed.forest) {
      try {
        if (forestApplies(a)) return drawForest(a, drawX, drawY);
      } catch (e) { fail('forest', e); }
    }
    return releaseThin(a, drawX, drawY);
  };

  // ---------------------------------------------------------------- cave
  function caveApplies(a) {
    if (!window.__DUDU_ART_PROTOTYPE_TEST || !ART.cave.img) return false;
    if (typeof smZoneOf !== 'function' || !a.id) return false;
    if (a.smDraw === 'floor' || a.smDraw === 'rock' || a.smDraw === 'pillar' || a.smDraw === 'roof') return false;
    if (a.blink || a.w < 120) return false;
    return smZoneOf(a) === 'cave';
  }
  // Seam-matched middle. The release drawer repeats the middle and crops the last copy wherever the width ends,
  // so the cropped column meets the right cap's first column at random (bottom outline steps 2-6px, cut cracks).
  // Here the middle still starts at source column 44 and still ends at column 438 (both natural joins); the length
  // that does not fit a whole number of 394px copies is removed at ONE cut chosen so the two columns that end up side
  // by side match best (colour + bottom outline). Pixels are still copied 1:1; nothing is scaled or repainted.
  // The table is computed offline by tools/art_cave_cuts.py from the approved PNG: index = leftover length (1..393),
  // value = source column where the cut goes. No pixel reading in the browser: getImageData throws on a tainted
  // canvas (game opened as a local file), and that exception stopped the game loop (fixed 2026-11-22).
  const CAVE_CUTS = [0,45,45,46,47,48,49,50,51,52,53,54,54,53,54,54,54,54,54,54,63,64,65,66,67,67,65,66,67,66,66,67,67,64,63,63,64,65,66,67,54,55,45,45,45,45,45,45,45,46,46,47,62,62,62,51,52,62,68,68,68,68,68,68,68,69,70,71,73,73,68,74,75,76,74,74,74,74,74,75,76,79,79,79,45,80,81,81,83,83,84,84,83,84,84,85,86,86,52,87,88,89,45,45,45,46,46,47,48,62,62,49,49,51,51,52,68,68,68,68,68,68,69,108,108,108,109,123,124,110,110,110,74,74,74,74,74,74,75,112,79,79,79,112,80,81,80,81,80,80,80,82,81,80,81,82,82,83,85,86,86,136,87,138,142,126,87,87,87,87,87,87,45,45,48,49,50,51,52,54,55,105,104,105,105,93,94,95,97,97,99,99,100,101,102,73,72,185,186,187,195,196,197,197,199,199,199,199,199,199,201,201,201,110,202,203,204,205,113,114,115,116,117,117,212,213,117,118,118,118,118,213,119,120,149,149,149,149,149,148,148,123,124,123,124,111,111,111,122,123,123,124,124,97,98,99,100,101,102,195,185,186,186,186,186,186,187,186,187,186,187,187,188,189,192,191,192,183,203,139,204,254,86,85,86,86,86,207,87,87,87,87,143,87,87,87,87,88,89,90,215,216,216,215,214,214,214,215,216,217,218,219,220,104,105,105,107,46,47,263,148,149,149,265,266,267,267,167,167,168,169,169,170,168,168,169,170,346,172,337,331,346,346,348,348,74,349,349,350,350,177,177,177,178,179,178,179,179,180,179,180,180,184,184,184,184,45,185,185,185,185,186,186,185,185,185,185,186,186,186,187,188,189,190,191,192,193,194,186,188,228,189,401,403];
  function caveCut(rem) { return CAVE_CUTS[rem] || (ART.cave.cap + 1); }
  function drawCave(a, x, y) {
    const C = ART.cave;
    const top = Math.round(y - C.contactY);
    const x0 = x - C.overhang, x1 = x + a.w + C.overhang;
    const cap = Math.min(C.cap, Math.floor((x1 - x0) / 2));
    piece(C, 0, cap, x0, top);
    piece(C, C.w - cap, cap, x1 - cap, top);
    if (cap < C.cap) return;
    const m0 = C.cap, m1 = C.w - C.cap, P = m1 - m0;
    const M = x1 - x0 - 2 * cap, full = Math.floor(M / P), rem = M - full * P;
    let tx = x0 + cap;
    for (let i = 0; i < full; i++) { piece(C, m0, P, tx, top); tx += P; }
    if (rem > 0) {
      const cut = caveCut(rem), skip = P - rem;
      piece(C, m0, cut - m0, tx, top); tx += cut - m0;
      piece(C, cut + skip, m1 - cut - skip, tx, top);
    }
  }
  if (typeof drawSpiritPlatform === 'function') {
    const releaseSpirit = drawSpiritPlatform;
    drawSpiritPlatform = function (a, x, y) {
      if (!failed.cave) {
        try {
          if (caveApplies(a)) return drawCave(a, x, y);
        } catch (e) { fail('cave', e); }
      }
      return releaseSpirit(a, x, y);
    };
    window.drawSpiritPlatform = drawSpiritPlatform;
  }

  // QA hook for tools/qa/art_prototype.py
  window.__artProto = {
    applies(a) { return a.smDraw !== undefined ? caveApplies(a) : forestApplies(a); },
    kind(a) { return a.smDraw !== undefined ? 'cave' : 'forest'; }
  };
})();
