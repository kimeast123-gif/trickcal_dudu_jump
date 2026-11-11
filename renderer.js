'use strict';
// ============================================================================
// TEST26 Graphic 2nd Polish Renderer (Gates A ~ E Complete Implementation)
// - P0-ART26-01: Eliminates all 1~51px clipped end slivers on Erpien A/B (`stone`, `gate`, `home`)
//   and all other thin platforms via `makePlatformModulePlan()` + derived ornament-free neutral strips
//   (`erpien/stone_inner_strip.webp`, `erpien/gate_inner_strip.webp`) and 1:1 source cropping (`dw/sw === dh/sh`).
//   Every complete arch motif (`stone_middle_a/b/c`) is drawn 100% unclipped (`lastClippedWidth === 0`).
// - P0-ART26-02: Eliminates white/sky gaps at Suin Forest tutorial wall junctions (`F-OBS-01` `wallFootOnGround`,
//   `F-CLIFF-02` `wallSideAgainstGround`, `F-DROP-BARRIER` `wallOnThinPlatform`) via square bottom foot anchoring,
//   pure earthen shaft tiling (no mid-shaft grass tufts), `wall_butt_join` ground classification, and post-pass
//   `drawTerrainJunctionOverlays()`.
// - P1-ART26-03: Replaces asymmetric `joinLeft/Right` flag reliance in `drawGroundVisual()` with coordinate- and
//   material-driven `classifyGroundJoint(a, side)` (`same_material_join`, `material_transition`, `wall_butt_join`,
//   `open_edge`), fixing `x=17000` (`road`->`pavement` Monatium curb), `x=20600` (`same_material_join`),
//   `x=23400` (`same_material_join`), and Monatium B open ground edges (`MB-T1-GND`, `MB-T2-GND`, `MB-GND-PLAZA`).
// - ZERO changes to `world.js`, `game.js`, `hazards.js`, `mobile-controls.js`, or `challenge-*` (100% SHA-256 frozen).
// ============================================================================

const terrainImages = {};
const structureImages = {};

const STRUCTURE_ASSET_LIST = [
  'tower_wall_left',
  'tower_wall_right',
  'tower_wall_cap',
  'tower_portal_arch',
  'tower_backdrop',
  'rooftop_pier',
  'rooftop_truss'
];

const TERRAIN_ASSET_LIST = [
  'forest/left', 'forest/middle_a', 'forest/middle_b', 'forest/middle_c', 'forest/right',
  'forest/single_small', 'forest/single_medium',
  'forest/ground_top', 'forest/ground_top_a', 'forest/ground_top_b', 'forest/ground_top_c',
  'forest/ground_body_a', 'forest/ground_body_b',
  'forest/ground_cliff_left', 'forest/ground_cliff_right',
  'forest/decoration_flower_a', 'forest/decoration_flower_b', 'forest/decoration_bush',
  'forest/decoration_tree_a', 'forest/decoration_tree_b',
  'village/left', 'village/middle_a', 'village/middle_b', 'village/middle_c', 'village/right',
  'village/single_small', 'village/single_medium',
  'village/ground_top', 'village/ground_top_a', 'village/ground_top_b', 'village/ground_top_c',
  'village/ground_body_a', 'village/ground_body_b',
  'village/ground_cliff_left', 'village/ground_cliff_right',
  'village/decoration_house_a', 'village/decoration_house_b', 'village/decoration_house_c',
  'village/decoration_stall', 'village/decoration_lamp',
  'village/decoration_fence_short', 'village/decoration_fence_long', 'village/decoration_gate',
  'village/decoration_stump', 'village/decoration_signpost',
  'village/decoration_bush_flower', 'village/decoration_lupine',
  'village/decoration_flower_yellow', 'village/decoration_flower_pink',
  'village/decoration_bush', 'village/decoration_mushroom_red', 'village/decoration_mushroom_purple',
  'monatium/steel_left', 'monatium/steel_middle_a', 'monatium/steel_middle_b', 'monatium/steel_middle_c', 'monatium/steel_right',
  'monatium/steel_single_small', 'monatium/steel_single_medium',
  'monatium/steel_ceiling_left', 'monatium/steel_ceiling_middle', 'monatium/steel_ceiling_right',
  'monatium/road_left', 'monatium/road_middle_a', 'monatium/road_middle_b', 'monatium/road_middle_c', 'monatium/road_right',
  'monatium/road_single_small', 'monatium/road_single_medium',
  'monatium/road_ground_top', 'monatium/road_ground_top_a', 'monatium/road_ground_top_b', 'monatium/road_ground_top_c',
  'monatium/road_ground_body_a', 'monatium/road_ground_body_b',
  'monatium/road_ground_cliff_left', 'monatium/road_ground_cliff_right',
  'monatium/pavement_left', 'monatium/pavement_middle_a', 'monatium/pavement_middle_b', 'monatium/pavement_middle_c', 'monatium/pavement_right',
  'monatium/pavement_single_small', 'monatium/pavement_single_medium',
  'monatium/pavement_ground_top', 'monatium/pavement_ground_top_a', 'monatium/pavement_ground_top_b', 'monatium/pavement_ground_top_c',
  'monatium/pavement_ground_body_a', 'monatium/pavement_ground_body_b',
  'monatium/pavement_ground_cliff_left', 'monatium/pavement_ground_cliff_right',
  'monatium/decoration_bench', 'monatium/decoration_planter', 'monatium/decoration_lamp',
  'monatium/decoration_banner_lamp', 'monatium/decoration_bollard', 'monatium/decoration_guardrail',
  'monatium/decoration_cone', 'monatium/decoration_ac', 'monatium/decoration_elecbox',
  'erpien/gate_left', 'erpien/gate_middle_a', 'erpien/gate_middle_b', 'erpien/gate_middle_c', 'erpien/gate_right',
  'erpien/gate_inner_strip',
  'erpien/gate_single_small', 'erpien/gate_single_medium',
  'erpien/gate_ground_top', 'erpien/gate_ground_top_a', 'erpien/gate_ground_top_b', 'erpien/gate_ground_top_c',
  'erpien/gate_ground_body_a', 'erpien/gate_ground_body_b',
  'erpien/gate_ground_cliff_left', 'erpien/gate_ground_cliff_right',
  'erpien/stone_left', 'erpien/stone_middle_a', 'erpien/stone_middle_b', 'erpien/stone_middle_c', 'erpien/stone_right',
  'erpien/stone_inner_strip',
  'erpien/stone_single_small', 'erpien/stone_single_medium',
  'erpien/stone_ground_top', 'erpien/stone_ground_top_a', 'erpien/stone_ground_top_b', 'erpien/stone_ground_top_c',
  'erpien/stone_ground_body_a', 'erpien/stone_ground_body_b',
  'erpien/stone_ground_cliff_left', 'erpien/stone_ground_cliff_right',
  'erpien/home_left', 'erpien/home_middle_a', 'erpien/home_middle_b', 'erpien/home_middle_c', 'erpien/home_right',
  'erpien/home_single_small', 'erpien/home_single_medium',
  'erpien/home_ground_top', 'erpien/home_ground_top_a', 'erpien/home_ground_top_b', 'erpien/home_ground_top_c',
  'erpien/home_ground_body_a', 'erpien/home_ground_body_b',
  'erpien/home_ground_cliff_left', 'erpien/home_ground_cliff_right',
  'erpien/decoration_stone_planter_a', 'erpien/decoration_stone_planter_b', 'erpien/decoration_stone_balustrade',
  'erpien/decoration_home_pedestal', 'erpien/decoration_home_lantern', 'erpien/decoration_gate_flower'
];

const TERRAIN_SPECS = {
  village: {
    folder: 'village', prefix: '',
    thinWalk: 14, thinScale: 0.52,
    smallWalk: 14, medWalk: 14,
    groundWalk: 47, groundScale: 0.54, bodyTopOffset: 84,
    decorations: [
      { key: 'village/decoration_flower_yellow', walkOffset: 88, scale: 0.48 },
      { key: 'village/decoration_flower_pink', walkOffset: 88, scale: 0.48 },
      { key: 'village/decoration_mushroom_purple', walkOffset: 90, scale: 0.46 }
    ]
  },
  grass: {
    folder: 'forest', prefix: '',
    thinWalk: 42, thinScale: 0.50,
    smallWalk: 29, medWalk: 41,
    groundWalk: 47, groundScale: 0.54, bodyTopOffset: 84,
    decorations: [
      { key: 'forest/decoration_flower_a', walkOffset: 44, scale: 0.52 },
      { key: 'forest/decoration_flower_b', walkOffset: 44, scale: 0.52 },
      { key: 'forest/decoration_bush', walkOffset: 40, scale: 0.50 }
    ]
  },
  steel: {
    folder: 'monatium', prefix: 'steel_',
    thinWalk: 106, thinScale: 0.48,
    smallWalk: 106, medWalk: 100,
    ceilWalk: 6, ceilScale: 0.36,
    groundWalk: 106, groundScale: 0.50, bodyTopOffset: 100,
    decorations: [
      { key: 'monatium/decoration_ac', walkOffset: 64, scale: 0.46 },
      { key: 'monatium/decoration_elecbox', walkOffset: 98, scale: 0.46 }
    ]
  },
  road: {
    folder: 'monatium', prefix: 'road_',
    thinWalk: 100, thinScale: 0.52,
    smallWalk: 100, medWalk: 94,
    groundWalk: 100, groundScale: 0.58, bodyTopOffset: 132,
    decorations: [
      { key: 'monatium/decoration_guardrail', walkOffset: 82, scale: 0.56 },
      { key: 'monatium/decoration_cone', walkOffset: 58, scale: 0.54 }
    ]
  },
  pavement: {
    folder: 'monatium', prefix: 'pavement_',
    thinWalk: 133, thinScale: 0.52,
    smallWalk: 96, medWalk: 132,
    groundWalk: 133, groundScale: 0.56, bodyTopOffset: 162,
    decorations: [
      { key: 'monatium/decoration_planter', walkOffset: 98, scale: 0.54 },
      { key: 'monatium/decoration_bench', walkOffset: 128, scale: 0.54 },
      { key: 'monatium/decoration_lamp', walkOffset: 132, scale: 0.55 },
      { key: 'monatium/decoration_bollard', walkOffset: 64, scale: 0.54 }
    ]
  },
  gate: {
    folder: 'erpien', prefix: 'gate_',
    thinWalk: 43, thinScale: 0.50,
    smallWalk: 32, medWalk: 44,
    groundWalk: 58, groundScale: 0.54, bodyTopOffset: 96,
    decorations: [
      { key: 'erpien/decoration_gate_flower', walkOffset: 54, scale: 0.52 }
    ]
  },
  stone: {
    folder: 'erpien', prefix: 'stone_',
    thinWalk: 95, thinScale: 0.48,
    smallWalk: 46, medWalk: 42,
    groundWalk: 60, groundScale: 0.54, bodyTopOffset: 118,
    decorations: [
      { key: 'erpien/decoration_stone_planter_a', walkOffset: 94, scale: 0.52 },
      { key: 'erpien/decoration_stone_planter_b', walkOffset: 94, scale: 0.52 }
    ]
  },
  home: {
    folder: 'erpien', prefix: 'home_',
    thinWalk: 69, thinScale: 0.48,
    smallWalk: 12, medWalk: 12,
    groundWalk: 69, groundScale: 0.54, bodyTopOffset: 108,
    decorations: []
  }
};

function seededUnit(seed, step) {
  let h = (seed ^ (step * 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function getTerrainImg(folder, prefix, part) {
  return terrainImages[`${folder}/${prefix}${part}`] || terrainImages[`${folder}/${part}`];
}

// ============================================================================
// P0-ART26-01: Pure Visual Module Planner (`makePlatformModulePlan`)
// - Computes exact integer count of full, unclipped middle motif tiles (`fullCount`),
//   optional complete half-bay arch (`halfCount`, for 2-arch symmetric stone tiles),
//   and ornament-free neutral connector widths (`neutralLeft`, `neutralRight`).
// - Guarantees `lastClippedWidth === 0` (zero 1~20px cut-off ornament slivers!).
// ============================================================================
function makePlatformModulePlan(platformWidth, leftCapWidth, rightCapWidth, moduleWidth, halfBayWidth = 0) {
  const inner = Math.max(0, platformWidth - leftCapWidth - rightCapWidth);
  if (inner <= 0 || moduleWidth <= 0) {
    return {
      lw: leftCapWidth, rw: rightCapWidth,
      inner: 0, innerW: 0, count: 0, fullCount: 0,
      halfCount: 0, remainder: 0, neutralLeft: 0, neutralRight: 0, lastClippedWidth: 0
    };
  }
  const count = Math.floor(inner / moduleWidth);
  const remAfterFull = inner - count * moduleWidth;
  const halfCount = (halfBayWidth > 0 && remAfterFull >= halfBayWidth) ? 1 : 0;
  const remainder = remAfterFull - halfCount * halfBayWidth;
  const neutralLeft = Math.floor(remainder / 2);
  const neutralRight = remainder - neutralLeft;
  return {
    lw: leftCapWidth,
    rw: rightCapWidth,
    inner,
    innerW: inner,
    count,
    fullCount: count,
    halfCount,
    remainder,
    neutralLeft,
    neutralRight,
    lastClippedWidth: 0
  };
}
window.makePlatformModulePlan = makePlatformModulePlan;

// Helper: Draw a 1:1 aspect-ratio horizontal source crop from an ornament-free neutral strip
function drawNeutralStripCrop(stripImg, s, dx, dy, dw, dh, srcCenterRatio = 0.5) {
  if (!stripImg || dw <= 0 || dh <= 0) return;
  const sh = stripImg.height;
  const exactScale = dh / sh;
  const sw = Math.max(0.5, Math.min(stripImg.width, dw / exactScale));
  const maxSx = Math.max(0, stripImg.width - sw);
  const sx = Math.max(0, Math.min(maxSx, Math.round(maxSx * srcCenterRatio)));
  ctx.drawImage(stripImg, sx, 0, sw, sh, dx, dy, dw, dh);
}

// Gate 4 (P0): Single Source of Truth (SSOT) panorama rendering from `l.backgroundRanges[bgKey]`
const _warnedMissingBgKeys = new Set();
// TEST30.1: Keep at most two full-width offscreen panoramas in memory.
// A crossfade renders at most two backgrounds at once; 3x 720p-wide panoramas
// may retain tens of MB of additional canvas memory on mobile devices.
const _prescaledPanoramaCache = new Map();
function getPrescaledPanorama(bgKey, im) {
  let cached = _prescaledPanoramaCache.get(bgKey);
  if (cached) {
    _prescaledPanoramaCache.delete(bgKey);
    _prescaledPanoramaCache.set(bgKey, cached);
    return cached;
  }
  const scale = H / im.height;
  const effectiveImgW = bgKey === 'city-bg' ? 1722 : im.width;
  const scaledW = Math.max(W, Math.round(effectiveImgW * scale));
  const off = document.createElement('canvas');
  off.width = scaledW;
  off.height = H;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(im, 0, 0, effectiveImgW, im.height, 0, 0, scaledW, H);
  cached = { canvas: off, width: scaledW, height: H };
  _prescaledPanoramaCache.set(bgKey, cached);
  if (_prescaledPanoramaCache.size > 2) {
    const oldestKey = _prescaledPanoramaCache.keys().next().value;
    _prescaledPanoramaCache.delete(oldestKey);
  }
  return cached;
}
function drawPanoramaByBgKey(bgKey, alpha = 1) {
  const im = worldImages[bgKey];
  if (!im) {
    if (!_warnedMissingBgKeys.has(bgKey)) {
      _warnedMissingBgKeys.add(bgKey);
      console.warn(`[Renderer] Missing background image for bgKey="${bgKey}" (expected assets/world/${bgKey}.webp)`);
    }
    return;
  }
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  const [bgStart, bgEnd] = (l.backgroundRanges && l.backgroundRanges[bgKey]) || [0, l.worldWidth];
  const travel = Math.max(1, bgEnd - bgStart - W);
  const progress = Math.max(0, Math.min(1, (rCam - bgStart) / travel));

  const pre = getPrescaledPanorama(bgKey, im);
  const sw = Math.min(pre.width, W);
  const maxSx = Math.max(0, pre.width - sw);
  const sx = Math.round(progress * maxSx);

  if (alpha >= 0.999) {
    ctx.drawImage(pre.canvas, sx, 0, sw, H, 0, 0, W, H);
  } else {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(pre.canvas, sx, 0, sw, H, 0, 0, W, H);
    ctx.restore();
  }
}

function renderBackground() {
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex], segments = l.segments;
  const center = rCam + W * 0.5;
  let activeIdx = segments.findIndex(s => center >= s.start && center < s.end);
  if (activeIdx < 0) activeIdx = segments.length - 1;
  const active = segments[activeIdx];

  const halfWin = 320;
  const prev = activeIdx > 0 ? segments[activeIdx - 1] : null;
  const next = activeIdx < segments.length - 1 ? segments[activeIdx + 1] : null;

  if (prev && prev.bg !== active.bg && center < active.start + halfWin) {
    const rawU = Math.max(0, Math.min(1, (center - (active.start - halfWin)) / (halfWin * 2)));
    const smoothU = 0.5 - 0.5 * Math.cos(Math.PI * rawU);
    drawPanoramaByBgKey(prev.bg, 1);
    drawPanoramaByBgKey(active.bg, smoothU);
  } else if (next && next.bg !== active.bg && center > active.end - halfWin) {
    const rawU = Math.max(0, Math.min(1, (center - (active.end - halfWin)) / (halfWin * 2)));
    const smoothU = 0.5 - 0.5 * Math.cos(Math.PI * rawU);
    drawPanoramaByBgKey(active.bg, 1);
    drawPanoramaByBgKey(next.bg, smoothU);
  } else {
    drawPanoramaByBgKey(active.bg, 1);
  }

  const light = dayPhase();
  ctx.save();
  ctx.fillStyle = light.tint;
  ctx.globalAlpha = light.opacity * (active.indoor ? 0.65 : 1);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (active.indoor) {
    const night = light.night;
    ctx.save();
    ctx.globalAlpha = 0.12 + night * 0.25;
    ctx.fillStyle = '#ffe7a6';
    for (const x of [220, 650, 1080]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 160, H);
      ctx.lineTo(x + 310, H);
      ctx.lineTo(x + 55, 0);
      ctx.fill();
    }
    ctx.restore();
  }
  const t = eventMode ? eventElapsed / LIMIT : 0;
  ctx.save();
  ctx.strokeStyle = '#fff8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(460, 64);
  ctx.quadraticCurveTo(640, 0, 820, 64);
  ctx.stroke();
  const x = 460 + 360 * t, y = 64 - 128 * t * (1 - t);
  ellipse(x, y, 10, 10, t > 0.9 ? '#ffc19c' : '#ffe39a');
  ctx.restore();
}

// ============================================================================
// P0-ART-01: Dedicated Horizontal Steel Girder / Ceiling Tiling Renderer
// ============================================================================
function drawSteelHorizontalGirder(a, drawX, drawY) {
  const cl = getTerrainImg('monatium', 'steel_ceiling_', 'left');
  const cm = getTerrainImg('monatium', 'steel_ceiling_', 'middle');
  const cr = getTerrainImg('monatium', 'steel_ceiling_', 'right');

  const drawH = Math.max(24, a.h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, a.w, drawH, 5);
  ctx.clip();

  const bgGrad = ctx.createLinearGradient(0, drawY, 0, drawY + drawH);
  bgGrad.addColorStop(0, '#5a687c');
  bgGrad.addColorStop(0.5, '#3e4a5c');
  bgGrad.addColorStop(1, '#28313f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(drawX, drawY, a.w, drawH);

  if (cl && cm && cr) {
    const s = drawH / cl.height;
    const lw = Math.round(cl.width * s);
    const rw = Math.round(cr.width * s);
    const midW = Math.max(24, Math.round(cm.width * s));

    if (a.w <= lw + rw) {
      const halfW = Math.round(a.w * 0.5);
      drawNeutralStripCrop(cl, s, drawX, drawY, halfW, drawH, 0.0);
      drawNeutralStripCrop(cr, s, drawX + halfW, drawY, a.w - halfW, drawH, 1.0);
    } else {
      const plan = makePlatformModulePlan(a.w, lw, rw, midW, 0);
      let curX = drawX + lw;
      if (plan.neutralLeft > 0) {
        drawNeutralStripCrop(cm, s, curX, drawY, plan.neutralLeft, drawH, 0.5);
        curX += plan.neutralLeft;
      }
      for (let i = 0; i < plan.count; i++) {
        ctx.drawImage(cm, curX, drawY, midW, drawH);
        curX += midW;
      }
      if (plan.neutralRight > 0) {
        drawNeutralStripCrop(cm, s, curX, drawY, plan.neutralRight, drawH, 0.5);
      }
      ctx.drawImage(cl, drawX, drawY, lw, drawH);
      ctx.drawImage(cr, drawX + a.w - rw, drawY, rw, drawH);
    }
  }

  ctx.fillStyle = 'rgba(220, 236, 255, 0.28)';
  ctx.fillRect(drawX + 2, drawY + 1, a.w - 4, 3);
  ctx.strokeStyle = '#1f2631';
  ctx.lineWidth = 2;
  ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, drawH - 2);
  ctx.restore();
}

function drawTowerStructures() {
  const curId = (typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex])?.id;
  if (curId !== 'monatium' && curId !== 'monatium_a') return;
  const m = STAGE_ANCHORS.monatium;
  const backdrop = structureImages['tower_backdrop'];
  const portalArch = structureImages['tower_portal_arch'];
  const pier = structureImages['rooftop_pier'];
  const truss = structureImages['rooftop_truss'];

  if (rCam + W > m.ascentEnd - 640 && rCam < m.skywalkEnd + 100) {
    const trussSpans = [
      { x1: m.ascentEnd - 464, x2: m.skywalkStart + 456, y: -1720 },
      { x1: m.skywalkMidStart, x2: m.skywalkMidEnd, y: -1705 },
      { x1: m.skywalkStage2End, x2: m.skywalkStage3Start, y: -1680 },
      { x1: m.skywalkEnd - 450, x2: m.skywalkEnd + 64, y: -1665 }
    ];
    if (truss) {
      for (const sp of trussSpans) {
        if (sp.x2 < rCam - 100 || sp.x1 > rCam + W + 100) continue;
        ctx.save();
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.rect(sp.x1, sp.y, sp.x2 - sp.x1, 130);
        ctx.clip();
        for (let gx = sp.x1; gx < sp.x2; gx += 256) {
          ctx.drawImage(truss, gx, sp.y, 256, 128);
        }
        ctx.restore();
      }
    }

    const pierColumns = [
      { x: m.skywalkStart + 36, topY: -1720, w: 220 },
      { x: m.skywalkMidStart + 60, topY: -1705, w: 220 },
      { x: m.skywalkStage2End + 45, topY: -1680, w: 220 },
      { x: m.skywalkEnd - 360, topY: -1665, w: 220 }
    ];
    if (pier) {
      for (const pc of pierColumns) {
        if (pc.x + pc.w < rCam - 120 || pc.x > rCam + W + 120) continue;
        const bottomY = 740;
        const tileH = Math.round(pc.w * (pier.height / pier.width));
        ctx.save();
        ctx.beginPath();
        ctx.rect(pc.x, pc.topY, pc.w, bottomY - pc.topY);
        ctx.clip();
        for (let gy = pc.topY; gy < bottomY; gy += tileH) {
          ctx.drawImage(pier, pc.x, gy, pc.w, tileH);
        }
        ctx.restore();
      }
    }
  }

  const shafts = [
    {
      x1: m.ascentStart + 64, x2: m.ascentEnd - 64, y1: -1945, y2: 580,
      rails: [m.ascentStart + 240, m.ascentStart + 580, m.ascentStart + 1100, m.ascentStart + 1440],
      portals: [
        { x: m.ascentStart - 8, y: 356, w: 84, h: 126 },
        { x: m.ascentEnd - 72, y: -1919, w: 84, h: 126 }
      ]
    },
    {
      x1: m.descentStart + 64, x2: m.descentEnd - 64, y1: -1937, y2: 580,
      rails: [m.descentStart + 214, m.descentStart + 559, m.descentStart + 904],
      portals: [
        { x: m.descentStart - 8, y: -1909, w: 84, h: 126 },
        { x: m.descentEnd - 72, y: 356, w: 84, h: 126 }
      ],
      hasBottomPit: true, pitX1: m.descentStart + 64, pitX2: m.descentEnd - 64
    }
  ];

  for (const sh of shafts) {
    if (sh.x2 < rCam - 180 || sh.x1 > rCam + W + 180) continue;
    const spanW = sh.x2 - sh.x1;
    const spanH = sh.y2 - sh.y1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sh.x1, sh.y1, spanW, spanH);
    ctx.clip();

    const grad = ctx.createLinearGradient(0, sh.y1, 0, sh.y2);
    grad.addColorStop(0, 'rgba(42, 56, 78, 0.72)');
    grad.addColorStop(0.5, 'rgba(34, 46, 66, 0.76)');
    grad.addColorStop(1, 'rgba(26, 36, 52, 0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(sh.x1, sh.y1, spanW, spanH);

    if (backdrop) {
      const tileW = 480, tileH = 480;
      for (let gy = sh.y1; gy < sh.y2; gy += tileH) {
        for (let gx = sh.x1; gx < sh.x2; gx += tileW) {
          ctx.drawImage(backdrop, gx, gy, tileW, tileH);
        }
      }
    }

    ctx.fillStyle = 'rgba(186, 224, 255, 0.10)';
    for (const rx of (sh.rails || [])) {
      ctx.fillRect(rx - 28, sh.y1 + 24, 56, spanH - 48);
    }

    ctx.strokeStyle = 'rgba(160, 200, 235, 0.24)';
    ctx.lineWidth = 4;
    for (const rx of (sh.rails || [sh.x1 + 150, sh.x1 + 495])) {
      ctx.beginPath();
      ctx.moveTo(rx, sh.y1 + 40);
      ctx.lineTo(rx, sh.y2 - 20);
      ctx.stroke();
    }

    if (sh.hasBottomPit) {
      const pGrad = ctx.createLinearGradient(0, 515, 0, 580);
      pGrad.addColorStop(0, 'rgba(235, 88, 64, 0.0)');
      pGrad.addColorStop(1, 'rgba(235, 88, 64, 0.45)');
      ctx.fillStyle = pGrad;
      ctx.fillRect(sh.pitX1, 515, sh.pitX2 - sh.pitX1, 65);
    }
    ctx.restore();

    if (portalArch) {
      for (const pt of sh.portals) {
        const pH = Math.round(pt.w * (portalArch.height / portalArch.width));
        ctx.drawImage(portalArch, pt.x, pt.y, pt.w, pH);
      }
    }
  }
}

// ============================================================================
// Erpien A Grounded Architectural Accents (Zero floating vector triangles or translucent bars!)
// ============================================================================
function drawErpienAArchitecture() {
  const curId = (typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex])?.id;
  if (curId !== 'erpien_a') return;

  const balustrade = getTerrainImg('erpien', '', 'decoration_stone_balustrade');
  const planterA = getTerrainImg('erpien', '', 'decoration_stone_planter_a');

  if (rCam + W > 8250 && rCam < 10650) {
    if (balustrade) {
      const s = 0.46;
      const bw = Math.round(balustrade.width * s);
      const bh = Math.round(balustrade.height * s);
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.drawImage(balustrade, 10320, 580 - bh + 6, bw, bh);
      ctx.restore();
    }
    if (planterA) {
      const s = 0.44;
      const pw = Math.round(planterA.width * s);
      const ph = Math.round(planterA.height * s);
      ctx.drawImage(planterA, 8550 - pw + 4, 580 - ph + 4, pw, ph);
    }
  }
}

// ============================================================================
// P0-ART-01, P1-ART-03, P0-ART26-02: Material-Specific Structural Wall & Beam Renderer
// ============================================================================
function drawStructuralWall(a, drawX, drawY) {
  const mat = a.visual?.material || a.skin || 'steel';

  if (mat === 'steel' && (a.ceiling || a.horizontalBeam || a.w >= a.h * 2.0)) {
    drawSteelHorizontalGirder(a, drawX, drawY);
    return;
  }

  if (mat === 'stone' || mat === 'gate') {
    const prefix = mat === 'gate' ? 'gate_' : 'stone_';
    const bodyA = getTerrainImg('erpien', prefix, 'ground_body_a') || getTerrainImg('erpien', 'stone_', 'ground_body_a');
    const bodyB = getTerrainImg('erpien', prefix, 'ground_body_b') || bodyA;

    // 1) Under-platform collision beam (`underPlatformBeam`):
    // The upper stone platform (`stone_left/middle/right`, drawH=104px) already covers `y - 46 .. y + 58`
    // with complete stone arches. Do NOT draw protruding ribs or boxes that stick out beyond the caps!
    if (a.underPlatformBeam) {
      return;
    }

    // 2) Standalone horizontal stone beam / ceiling (`horizontalBeam` / `EA-WALL-TOP-C` / `E-CITY-C01-EAVES`)
    if (a.horizontalBeam || (a.ceiling && a.h <= 42)) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, a.w, a.h, 6);
      ctx.clip();
      ctx.fillStyle = '#746c7e';
      ctx.fillRect(drawX, drawY, a.w, a.h);
      if (bodyA) {
        const s = 0.38;
        const bw = Math.round(bodyA.width * s);
        const bh = Math.round(bodyA.height * s);
        for (let gx = drawX; gx < drawX + a.w; gx += bw - 1) {
          ctx.drawImage(bodyA, gx, drawY - 12, bw, bh);
        }
      }
      ctx.fillStyle = 'rgba(248, 240, 228, 0.34)';
      ctx.fillRect(drawX + 2, drawY + 2, a.w - 4, 4);
      ctx.strokeStyle = '#3f3847';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, a.h - 2);
      ctx.restore();
      return;
    }

    // 3) Vertical Stone Columns & Barrier Walls (`EA-WALL-COL-C`, `EA-WALL-BARRIER-R`, `E-CITY-C01-WALL`, `B-EXIT-WALL`)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, a.w, a.h, 6);
    ctx.clip();
    ctx.fillStyle = mat === 'gate' ? '#586249' : '#766e80';
    ctx.fillRect(drawX, drawY, a.w, a.h);
    if (bodyA) {
      const s = 0.36;
      const bw = Math.round(bodyA.width * s);
      const bh = Math.round(bodyA.height * s);
      let rIdx = 0;
      for (let gy = drawY; gy < drawY + a.h; gy += bh - 1, rIdx++) {
        let cIdx = 0;
        for (let gx = drawX; gx < drawX + a.w; gx += bw - 1, cIdx++) {
          const pick = (rIdx + cIdx) % 2 === 0 ? bodyA : bodyB;
          ctx.drawImage(pick, gx, gy, bw, bh);
        }
      }
    }
    ctx.fillStyle = 'rgba(252, 244, 232, 0.28)';
    ctx.fillRect(drawX + 3, drawY + 4, 7, a.h - 8);
    ctx.fillStyle = 'rgba(46, 38, 56, 0.28)';
    ctx.fillRect(drawX + a.w - 10, drawY + 4, 7, a.h - 8);
    ctx.strokeStyle = 'rgba(58, 50, 68, 0.32)';
    ctx.lineWidth = 1.5;
    for (let gy = drawY + 86; gy < drawY + a.h - 20; gy += 86) {
      ctx.beginPath();
      ctx.moveTo(drawX + 4, gy);
      ctx.lineTo(drawX + a.w - 4, gy);
      ctx.stroke();
    }

    // Clean Ashlar Capital Molding & Base Plinth (no clipped ivy leaves inside column!)
    if (a.h >= 120) {
      ctx.fillStyle = 'rgba(84, 76, 96, 0.62)';
      ctx.fillRect(drawX, drawY, a.w, 22);
      ctx.fillStyle = 'rgba(248, 240, 228, 0.42)';
      ctx.fillRect(drawX + 2, drawY + 18, a.w - 4, 4);

      const baseH = 26;
      const by = drawY + a.h - baseH;
      ctx.fillStyle = 'rgba(62, 54, 74, 0.55)';
      ctx.fillRect(drawX, by, a.w, baseH);
      ctx.fillStyle = 'rgba(244, 234, 220, 0.35)';
      ctx.fillRect(drawX + 2, by, a.w - 4, 4);
    }

    ctx.strokeStyle = mat === 'gate' ? '#36402a' : '#3d3646';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, a.h - 2);
    ctx.restore();
    return;
  }

  // ==========================================================================
  // P0-ART26-02: Suin Forest / Village Vertical Earthen Walls
  // (`F-OBS-01` wallFootOnGround, `F-CLIFF-02` wallSideAgainstGround, `F-DROP-BARRIER` wallOnThinPlatform)
  // - Removes mid-shaft grass tuft repetition (`ground_cliff_left/right` is NOT tiled down the shaft).
  // - Extends bottom corners squarely into supporting ground/platform so zero white corner gap appears.
  // - Renders full-height grass crown (`lh = 58px`) at the top without harsh 36px vertical clipping.
  // ==========================================================================
  if (mat === 'grass' || mat === 'village') {
    const folder = mat === 'village' ? 'village' : 'forest';
    const bodyA = getTerrainImg(folder, '', 'ground_body_a');
    const bodyB = getTerrainImg(folder, '', 'ground_body_b') || bodyA;
    const topLeft = getTerrainImg(folder, '', 'left');
    const topRight = getTerrainImg(folder, '', 'right');
    const topMid = getTerrainImg(folder, '', 'middle_a');
    const singleSmall = getTerrainImg(folder, '', 'single_small');

    // Classify junction type for bottom corner anchoring
    const isFootOnGround = (a.y + a.h >= 575 && a.y < 580);
    if (a._isOnThinPlat === undefined || a._platLenTag !== platforms.length) {
      a._platLenTag = platforms.length;
      a._isOnThinPlat = (typeof platforms !== 'undefined' && platforms.some(pl =>
        pl !== a && pl.thin && !pl.wall && a.x < pl.x + pl.w + 8 && a.x + a.w > pl.x - 8 && Math.abs((a.y + a.h) - pl.y) <= 22
      ));
    }
    const isOnThinPlatform = a._isOnThinPlat;
    const extendBottom = isFootOnGround ? 14 : 0;
    const bodyH = isOnThinPlatform ? Math.max(24, 372 - drawY) : (a.h + extendBottom);
    const bottomRadii = (isFootOnGround || isOnThinPlatform || a.y + a.h >= 850) ? 0 : 10;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, a.w, bodyH, [10, 10, bottomRadii, bottomRadii]);
    ctx.clip();

    ctx.fillStyle = '#5c4430';
    ctx.fillRect(drawX, drawY, a.w, bodyH);
    if (bodyA) {
      const s = 0.45;
      const bw = Math.round(bodyA.width * s);  // 126px
      const bh = Math.round(bodyA.height * s); // 72px (ratio = 1.00)
      let rIdx = 0;
      for (let gy = drawY; gy < drawY + bodyH; gy += bh - 1, rIdx++) {
        let cIdx = 0;
        for (let gx = drawX; gx < drawX + a.w; gx += bw - 1, cIdx++) {
          const pick = (rIdx + cIdx) % 2 === 0 ? bodyA : bodyB;
          ctx.drawImage(pick, gx, gy, bw, bh);
        }
      }
    }

    // Natural vertical earthen rock bevels along left & right sides (no green grass tufts mid-shaft!)
    ctx.fillStyle = 'rgba(128, 96, 62, 0.28)';
    ctx.fillRect(drawX + 2, drawY + 8, 7, bodyH - 8);
    ctx.fillStyle = 'rgba(48, 34, 20, 0.34)';
    ctx.fillRect(drawX + a.w - 9, drawY + 8, 7, bodyH - 8);

    ctx.strokeStyle = 'rgba(54, 72, 38, 0.52)';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, bodyH - 2);
    ctx.restore();

    // If `isOnThinPlatform` (`F-DROP-BARRIER` at x=3080..3134, y=180..385 on `F-DROP-01` at x=2760..3100, y=370),
    // blend the lower root body seamlessly into the right end of `F-DROP-01` (`y=360..428`) using `topRight` root cap!
    if (isOnThinPlatform && topRight) {
      const sRoot = 0.50;
      const rw = Math.round(topRight.width * sRoot);  // 71px
      const rh = Math.round(topRight.height * sRoot); // 81px
      const platY = 370;
      const rTopY = Math.round(platY - 42 * sRoot);
      ctx.save();
      ctx.beginPath();
      ctx.rect(drawX - 4, platY - 6, a.w + 6, rh);
      ctx.clip();
      ctx.drawImage(topRight, drawX + a.w - rw, rTopY, rw, rh);
      ctx.restore();
    }

    // Lush grass crown aligned with collision top `drawY` (full natural height of grass overhang, zero mid-blade cut!)
    if (topLeft && topRight) {
      const s = 0.36;
      const lw = Math.round(topLeft.width * s);   // 50px
      const lh = Math.round(topLeft.height * s);  // 58px (ratio = 1.00)
      const rw = Math.round(topRight.width * s);  // 51px
      const rh = Math.round(topRight.height * s); // 58px (ratio = 1.00)
      const topY = Math.round(drawY - 15 * s);
      const totalCrownW = a.w + 4;
      const halfW = Math.round(totalCrownW * 0.5);
      // Clip only the bottom soil of `topLeft/topRight` (at `y = drawY + 26`), keeping the entire green grass overhang (`26px`) intact!
      const crownClipH = Math.min(34, a.h + 8);

      ctx.save();
      ctx.beginPath();
      ctx.rect(drawX - 2, topY, halfW, crownClipH);
      ctx.clip();
      ctx.drawImage(topLeft, drawX - 2, topY, lw, lh);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(drawX - 2 + halfW, topY, totalCrownW - halfW, crownClipH);
      ctx.clip();
      ctx.drawImage(topRight, drawX + a.w + 2 - rw, topY, rw, rh);
      ctx.restore();
    } else if (singleSmall) {
      const uS = (a.w + 4) / singleSmall.width;
      const ch = Math.round(singleSmall.height * uS);
      ctx.drawImage(singleSmall, drawX - 2, Math.round(drawY - 29 * uS), a.w + 4, ch);
    }
    return;
  }

  // Vertical Steel Tower Walls
  const side = a.wallSide === 'right' ? 'right' : 'left';
  const wallImg = structureImages[`tower_wall_${side}`] || structureImages['tower_wall_left'];
  const capImg = structureImages['tower_wall_cap'];

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, a.w, a.h, 6);
  ctx.clip();

  if (wallImg) {
    const tileH = Math.max(32, Math.round(a.w * (wallImg.height / wallImg.width)));
    for (let gy = drawY; gy < drawY + a.h; gy += tileH) {
      ctx.drawImage(wallImg, drawX, gy, a.w, tileH);
    }
  } else {
    ctx.fillStyle = '#4c586c';
    ctx.fillRect(drawX, drawY, a.w, a.h);
  }

  if (capImg && a.h >= 44) {
    const capH = Math.max(16, Math.round(a.w * (capImg.height / capImg.width)));
    ctx.drawImage(capImg, drawX, drawY, a.w, capH);
    if (a.portalBottom) {
      ctx.drawImage(capImg, drawX, drawY + a.h - capH, a.w, capH);
    }
  }

  ctx.strokeStyle = '#242b37';
  ctx.lineWidth = 3;
  ctx.strokeRect(drawX + 1.5, drawY + 1.5, a.w - 3, a.h - 3);
  if (a.hazardExteriorRight) {
    ctx.fillStyle = 'rgba(255, 107, 82, 0.72)';
    ctx.fillRect(drawX + a.w - 7, drawY + 4, 5, a.h - 8);
  }
  ctx.restore();
}

// ============================================================================
// P1-ART26-03 & P0-ART26-02: Coordinate- & Material-Driven Ground Joint Classifier
// - Classifies each ground edge (`'left'` | `'right'`) into:
//   1. `'same_material_join'`  (adjacent ground within ±4px at same y with identical material)
//   2. `'material_transition'` (adjacent ground within ±4px at same y with different material)
//   3. `'wall_butt_join'`      (abuts a vertical structural wall of the same material, e.g. `F-CLIFF-02`)
//   4. `'open_edge'`           (true open cliff edge over pit or boundary)
// ============================================================================
function classifyGroundJoint(a, side) {
  if (typeof platforms === 'undefined' || !platforms) {
    return { kind: 'open_edge', neighbor: null, neighborMat: null };
  }
  const cacheProp = side === 'left' ? '_jointCacheL' : '_jointCacheR';
  if (a[cacheProp] && a._jointCacheLen === platforms.length) {
    return a[cacheProp];
  }
  const mat = a.visual?.material || a.skin || 'grass';
  const edgeX = side === 'left' ? a.x : (a.x + a.w);

  // 1. Check adjacent ground platforms at the same y (±4px)
  for (const b of platforms) {
    if (b === a || !b.groundTile || Math.abs(b.y - a.y) > 4) continue;
    const bMat = b.visual?.material || b.skin || 'grass';
    if (side === 'left' && Math.abs((b.x + b.w) - edgeX) <= 4) {
      const res = {
        kind: bMat === mat ? 'same_material_join' : 'material_transition',
        neighbor: b,
        neighborMat: bMat
      };
      a._jointCacheLen = platforms.length;
      a[cacheProp] = res;
      return res;
    }
    if (side === 'right' && Math.abs(b.x - edgeX) <= 4) {
      const res = {
        kind: bMat === mat ? 'same_material_join' : 'material_transition',
        neighbor: b,
        neighborMat: bMat
      };
      a._jointCacheLen = platforms.length;
      a[cacheProp] = res;
      return res;
    }
  }

  // 2. Check if this ground edge abuts a vertical wall of the same material (e.g. F-GND-02A & F-GND-02B meeting F-CLIFF-02)
  for (const b of platforms) {
    if (b === a || !b.wall || b.ceiling) continue;
    const bMat = b.visual?.material || b.skin || 'grass';
    if (bMat !== mat) continue;
    if (b.y < a.y && b.y + b.h > a.y) {
      if (side === 'right' && Math.abs(b.x - edgeX) <= 4) {
        const res = { kind: 'wall_butt_join', neighbor: b, neighborMat: bMat };
        a._jointCacheLen = platforms.length;
        a[cacheProp] = res;
        return res;
      }
      if (side === 'left' && Math.abs((b.x + b.w) - edgeX) <= 4) {
        const res = { kind: 'wall_butt_join', neighbor: b, neighborMat: bMat };
        a._jointCacheLen = platforms.length;
        a[cacheProp] = res;
        return res;
      }
    }
  }

  const res = { kind: 'open_edge', neighbor: null, neighborMat: null };
  a._jointCacheLen = platforms.length;
  a[cacheProp] = res;
  return res;
}
window.classifyGroundJoint = classifyGroundJoint;

// Erpien Gate (`gate`) <-> Royal City (`stone`) Transition Seam (ONLY for gate <-> stone!)
function drawErpienGateStoneTransitionSeam(seamX, seamY) {
  const stoneSmall = getTerrainImg('erpien', 'stone_', 'single_small');
  const planterA = getTerrainImg('erpien', '', 'decoration_stone_planter_a');
  const gateFlower = getTerrainImg('erpien', '', 'decoration_gate_flower');
  const bushImg = getTerrainImg('forest', '', 'decoration_bush');

  ctx.save();
  if (stoneSmall) {
    const s = 0.42;
    const sw = Math.round(stoneSmall.width * s);
    const sh = Math.round(stoneSmall.height * s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(seamX - 66, seamY - 18, 132, 46);
    ctx.clip();
    ctx.drawImage(stoneSmall, Math.round(seamX - sw * 0.5), Math.round(seamY - 46 * s), sw, sh);
    ctx.restore();
  }
  if (planterA) {
    const s = 0.46;
    const pw = Math.round(planterA.width * s);
    const ph = Math.round(planterA.height * s);
    ctx.drawImage(planterA, Math.round(seamX + 8), Math.round(seamY - ph + 5), pw, ph);
  }
  if (bushImg) {
    const s = 0.56;
    const bw = Math.round(bushImg.width * s);
    const bh = Math.round(bushImg.height * s);
    ctx.drawImage(bushImg, Math.round(seamX - bw - 4), Math.round(seamY - bh + 5), bw, bh);
  }
  if (gateFlower) {
    const s = 0.52;
    const fw = Math.round(gateFlower.width * s);
    const fh = Math.round(gateFlower.height * s);
    ctx.drawImage(gateFlower, Math.round(seamX - fw * 0.5 - 12), Math.round(seamY - fh + 6), fw, fh);
  }
  ctx.restore();
}

// P1-ART26-03: Monatium Road (`road`) <-> Sidewalk (`pavement`) Curbstone Transition Seam (e.g. `x = 17000`)
function drawMonatiumRoadPavementTransitionSeam(seamX, seamY) {
  const paveLeft = getTerrainImg('monatium', 'pavement_', 'left');
  const bollard = getTerrainImg('monatium', '', 'decoration_bollard');

  ctx.save();
  // Clean bevelled sidewalk curb cap bridging the road-to-pavement step at seamX
  if (paveLeft) {
    const s = 0.46;
    const pw = Math.round(paveLeft.width * s);  // 55px
    const ph = Math.round(paveLeft.height * s); // 102px (ratio = 1.00)
    const topY = Math.round(seamY - 133 * s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(seamX - 18, seamY - 26, pw, 62);
    ctx.clip();
    ctx.drawImage(paveLeft, seamX - 16, topY, pw, ph);
    ctx.restore();
  }
  if (bollard) {
    const s = 0.56;
    const bw = Math.round(bollard.width * s);  // 26px
    const bh = Math.round(bollard.height * s); // 39px (ratio = 1.00)
    ctx.drawImage(bollard, Math.round(seamX + 18), Math.round(seamY - 66 * s), bw, bh);
  }
  ctx.restore();
}

function drawGroundVisual(a, drawX, drawY) {
  const mat = a.visual?.material || a.skin || 'grass';
  const spec = TERRAIN_SPECS[mat] || TERRAIN_SPECS.grass;
  const s = spec.groundScale;
  const seed = a.visual?.seed || 101;

  const cl = getTerrainImg(spec.folder, spec.prefix, 'ground_cliff_left');
  const cr = getTerrainImg(spec.folder, spec.prefix, 'ground_cliff_right');
  const topA = getTerrainImg(spec.folder, spec.prefix, 'ground_top_a') || getTerrainImg(spec.folder, spec.prefix, 'ground_top');
  const topB = getTerrainImg(spec.folder, spec.prefix, 'ground_top_b') || topA;
  const topC = getTerrainImg(spec.folder, spec.prefix, 'ground_top_c') || topA;
  const bodyA = getTerrainImg(spec.folder, spec.prefix, 'ground_body_a');
  const bodyB = getTerrainImg(spec.folder, spec.prefix, 'ground_body_b') || bodyA;
  if (!topA || !bodyA) return;

  // P1-ART26-03: Classify left & right ground boundaries by actual coordinates and materials!
  const leftJoint = classifyGroundJoint(a, 'left');
  const rightJoint = classifyGroundJoint(a, 'right');

  const showCliffLeft = (leftJoint.kind === 'open_edge' && Boolean(cl));
  const showCliffRight = (rightJoint.kind === 'open_edge' && Boolean(cr));

  const topY = Math.round(drawY - spec.groundWalk * s);
  const topH = Math.round(topA.height * s);
  const clW = showCliffLeft ? Math.round(cl.width * s) : 0;
  const clH = showCliffLeft ? Math.round(cl.height * s) : 0;
  const crW = showCliffRight ? Math.round(cr.width * s) : 0;
  const crH = showCliffRight ? Math.round(cr.height * s) : 0;

  const zoomNow = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const bottomY = Math.max(drawY + a.h, Math.ceil(rCamY + (H / zoomNow) + 80));
  const bodyStartY = mat === 'home' ? (topY + topH - 8) : (topY + Math.round(spec.bodyTopOffset * s));

  // For `same_material_join`, `material_transition`, or `wall_butt_join`, extend the lower ground body
  // all the way to `drawX` / `drawX + a.w` (plus a 4px overlap into wall_butt_join) so there is ZERO vertical hole!
  const bodyX1 = leftJoint.kind === 'wall_butt_join'
    ? (drawX - 6)
    : (showCliffLeft ? (drawX + Math.round(clW * 0.36)) : drawX);
  const bodyX2 = rightJoint.kind === 'wall_butt_join'
    ? (drawX + a.w + 6)
    : (showCliffRight ? (drawX + a.w - Math.round(crW * 0.36)) : (drawX + a.w));

  const viewLeft = rCam - 96;
  const viewRight = rCam + (W / zoomNow) + 96;

  if (bodyX2 > bodyX1 && bottomY > bodyStartY) {
    const bw = Math.round(bodyA.width * s);
    const bh = Math.round(bodyA.height * s);
    const visBodyX1 = Math.max(bodyX1, Math.floor(viewLeft));
    const visBodyX2 = Math.min(bodyX2, Math.ceil(viewRight));
    if (visBodyX2 > visBodyX1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(visBodyX1, bodyStartY, visBodyX2 - visBodyX1, bottomY - bodyStartY);
      ctx.clip();
      const stepX = Math.max(1, bw - 1);
      const startCol = Math.max(0, Math.floor((visBodyX1 - bodyX1) / stepX));
      let colIdx = startCol;
      for (let gx = bodyX1 + startCol * stepX; gx < visBodyX2; gx += stepX, colIdx++) {
        let rowIdx = 0;
        for (let gy = bodyStartY; gy < bottomY; gy += bh - 1, rowIdx++) {
          const pick = ((colIdx + rowIdx) % 2 === 0 || seededUnit(seed, colIdx * 31 + rowIdx) < 0.5) ? bodyA : bodyB;
          ctx.drawImage(pick, gx, gy, bw, bh);
        }
      }
      ctx.restore();
    }
  }

  if (showCliffLeft && cl && drawX + clW >= viewLeft && drawX <= viewRight) {
    ctx.drawImage(cl, drawX, topY, clW, clH);
  }
  if (showCliffRight && cr && drawX + a.w >= viewLeft && drawX + a.w - crW <= viewRight) {
    ctx.drawImage(cr, drawX + a.w - crW, topY, crW, crH);
  }

  // Top surface span (`midX1 .. midX2`):
  // On `wall_butt_join`, overlap 4px into the vertical wall so zero gap appears at the corner (`F-CLIFF-02`).
  const midX1 = leftJoint.kind === 'wall_butt_join' ? (drawX - 4) : (drawX + clW);
  const midX2 = rightJoint.kind === 'wall_butt_join' ? (drawX + a.w + 4) : (drawX + a.w - crW);
  const midSpan = midX2 - midX1;

  if (midSpan > 2) {
    const nomW = Math.max(24, Math.round(topA.width * s));
    const tops = [topA, topB, topC];
    const plan = makePlatformModulePlan(midSpan, 0, 0, nomW, 0);
    const visMidX1 = Math.max(midX1, Math.floor(viewLeft));
    const visMidX2 = Math.min(midX2, Math.ceil(viewRight));

    if (visMidX2 > visMidX1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(visMidX1, topY - 12, visMidX2 - visMidX1, topH + 24);
      ctx.clip();

      let curX = midX1;
      if (plan.neutralLeft > 0) {
        if (curX + plan.neutralLeft >= viewLeft && curX <= viewRight) {
          drawNeutralStripCrop(topA, s, curX, topY, plan.neutralLeft, topH, 0.5);
        }
        curX += plan.neutralLeft;
      }
      const startI = Math.max(0, Math.floor((viewLeft - curX) / nomW));
      const endI = Math.min(plan.count, Math.ceil((viewRight - curX) / nomW));
      for (let i = startI; i < endI; i++) {
        const tx = curX + i * nomW;
        const worldTileIdx = Math.floor((tx + 1) / nomW);
        const pickIdx = mat === 'home' ? (worldTileIdx % 3) : (Math.floor(seededUnit(seed, worldTileIdx + 17) * 3) % 3);
        const tImg = tops[pickIdx];
        ctx.drawImage(tImg, tx, topY, nomW, topH);
      }
      curX += plan.count * nomW;
      if (plan.neutralRight > 0 && curX + plan.neutralRight >= viewLeft && curX <= viewRight) {
        drawNeutralStripCrop(topA, s, curX, topY, plan.neutralRight, topH, 0.5);
      }
      ctx.restore();
    }
  }

  // Render material-appropriate transition seam ONLY when `leftJoint.kind === 'material_transition'`
  if (leftJoint.kind === 'material_transition') {
    const leftMat = leftJoint.neighborMat;
    if ((leftMat === 'gate' && mat === 'stone') || (leftMat === 'stone' && mat === 'gate')) {
      drawErpienGateStoneTransitionSeam(drawX, drawY);
    } else if ((leftMat === 'road' && mat === 'pavement') || (leftMat === 'pavement' && mat === 'road')) {
      drawMonatiumRoadPavementTransitionSeam(drawX, drawY);
    }
  }
}

// ============================================================================
// P0-ART26-02: Post-Pass Visual Junction Overlay (`drawTerrainJunctionOverlays`)
// - Executed in `draw()` AFTER both ground platforms and non-ground platforms/walls are rendered,
//   and BEFORE actors/player.
// - Seals the exact contact joints of:
//   1. `F-OBS-01` (`wallFootOnGround` at `x=520..610, y=580`): earthen grass-tuft & bush foot collar
//   2. `F-CLIFF-02` (`wallSideAgainstGround` at `x=2040, y=580` and `x=2120, y=580`): left & right
//      soil/grass corner seams hiding the vertical crack between ground and cliff wall
//   3. `F-DROP-BARRIER` (`wallOnThinPlatform` at `x=3080..3134, y=370`): inner corner grass/bush anchor
//      where the barrier meets thin platform `F-DROP-01` (`x=2760..3100, y=370`)
// ============================================================================
function drawTerrainJunctionOverlays() {
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  if (!l || l.id !== 'forest') return;

  const topA = getTerrainImg('forest', '', 'ground_top_a') || getTerrainImg('forest', '', 'ground_top');
  const bushImg = getTerrainImg('forest', '', 'decoration_bush');
  const flowerA = getTerrainImg('forest', '', 'decoration_flower_a');
  if (!topA) return;

  const sTop = TERRAIN_SPECS.grass.groundScale; // 0.54
  const topH = Math.round(topA.height * sTop);  // 95px
  const topY580 = Math.round(580 - TERRAIN_SPECS.grass.groundWalk * sTop); // 555

  for (const a of platforms) {
    if (!a.wall || a.hidden) continue;
    const mat = a.visual?.material || a.skin || 'grass';
    if (mat !== 'grass') continue;
    if (a.x + a.w < rCam - 120 || a.x > rCam + W + 120) continue;

    // Case 1: `F-OBS-01` (`wallFootOnGround`, `y + h === 580`)
    if (Math.abs((a.y + a.h) - 580) <= 4) {
      // Draw continuous grass-blade turf across `[a.x - 10, a.x + a.w + 10]` at `y = 580` so the wall's
      // bottom corners are embedded inside the lawn turf with 0px gap!
      const spanW = a.w + 20;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a.x - 10, 566, spanW, 32);
      ctx.clip();
      drawNeutralStripCrop(topA, sTop, a.x - 10, topY580, spanW, topH, 0.5);
      ctx.restore();

      if (bushImg) {
        const bw = Math.min(a.w + 10, 84);
        const bh = Math.round(bushImg.height * (bw / bushImg.width));
        ctx.drawImage(bushImg, Math.round(a.x + (a.w - bw) * 0.5), Math.round(580 - bh + 5), bw, bh);
      }
      continue;
    }

    // Case 2: `F-CLIFF-02` (`wallSideAgainstGround`, `x = 2040..2120, y = 420..900` meeting ground at `y = 580`)
    if (a.y < 580 && a.y + a.h > 620) {
      // Seal both left (`a.x = 2040`) and right (`a.x + a.w = 2120`) vertical ground-to-wall joints at `y = 580`
      for (const seamX of [a.x, a.x + a.w]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(seamX - 18, 560, 36, 44);
        ctx.clip();
        drawNeutralStripCrop(topA, sTop, seamX - 18, topY580, 36, topH, 0.5);
        ctx.restore();
      }
      if (bushImg) {
        const sB = 0.48;
        const bw = Math.round(bushImg.width * sB);  // 55px
        const bh = Math.round(bushImg.height * sB); // 22px
        ctx.drawImage(bushImg, Math.round(a.x - bw * 0.65), Math.round(580 - bh + 4), bw, bh);
        ctx.drawImage(bushImg, Math.round(a.x + a.w - bw * 0.35), Math.round(580 - bh + 4), bw, bh);
      }
      continue;
    }

    // Case 3: `F-DROP-BARRIER` (`wallOnThinPlatform`, `x = 3080..3134, y = 180..385` on `F-DROP-01` `y = 370`)
    if (a._touchPlatCached === undefined || a._touchPlatLen !== platforms.length) {
      a._touchPlatLen = platforms.length;
      a._touchPlatCached = platforms.find(pl =>
        pl !== a && pl.thin && !pl.wall && a.x < pl.x + pl.w + 8 && a.x + a.w > pl.x - 8 && Math.abs((a.y + a.h) - pl.y) <= 22
      ) || null;
    }
    const touchPlat = a._touchPlatCached;
    if (touchPlat) {
      const py = touchPlat.y;
      if (bushImg) {
        const sB = 0.46;
        const bw = Math.round(bushImg.width * sB);  // 53px
        const bh = Math.round(bushImg.height * sB); // 21px
        ctx.drawImage(bushImg, Math.round(a.x - bw * 0.45), Math.round(py - bh + 4), bw, bh);
      }
      if (flowerA) {
        const sF = 0.36;
        const fw = Math.round(flowerA.width * sF);
        const fh = Math.round(flowerA.height * sF);
        ctx.drawImage(flowerA, Math.round(a.x + (a.w - fw) * 0.5), Math.round(a.y - fh + 4), fw, fh);
      }
    }
  }
}

// ============================================================================
// P0-ART26-01: Sliver-Free Thin Platform Visual Renderer
// - Uses `makePlatformModulePlan()` + `stone_inner_strip.webp` / `gate_inner_strip.webp`
//   so every complete arch/motif tile (`middle_a/b/c`) is drawn 100% unclipped (`lastClippedWidth === 0`).
// - Never exposes a 1~20px cut-off ornament sliver at either end of a platform!
// ============================================================================
function drawThinPlatformVisual(a, drawX, drawY) {
  if (a.wall) {
    drawStructuralWall(a, drawX, drawY);
    return;
  }
  const mat = a.visual?.material || a.skin || 'grass';
  const spec = TERRAIN_SPECS[mat] || TERRAIN_SPECS.grass;
  const seed = a.visual?.seed || 202;

  if (a.ceiling && mat === 'stone') {
    const leftImg = getTerrainImg('erpien', 'stone_', 'left');
    const midImg = getTerrainImg('erpien', 'stone_', 'middle_a');
    const stripImg = getTerrainImg('erpien', 'stone_', 'inner_strip') || midImg;
    const rightImg = getTerrainImg('erpien', 'stone_', 'right');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, a.w, a.h, 8);
    ctx.clip();
    ctx.fillStyle = '#6c6574';
    ctx.fillRect(drawX, drawY, a.w, a.h);
    if (leftImg && midImg && rightImg) {
      const s = 0.42;
      const lw = Math.round(leftImg.width * s), rw = Math.round(rightImg.width * s);
      const lh = Math.round(leftImg.height * s);
      const mw = Math.round(midImg.width * s), mh = Math.round(midImg.height * s);
      const plan = makePlatformModulePlan(a.w, lw, rw, mw, 0);
      let curX = drawX + lw;
      if (plan.neutralLeft > 0) {
        drawNeutralStripCrop(stripImg, s, curX, drawY - 6, plan.neutralLeft, mh, 0.5);
        curX += plan.neutralLeft;
      }
      for (let i = 0; i < plan.count; i++) {
        ctx.drawImage(midImg, curX, drawY - 6, mw, mh);
        curX += mw;
      }
      if (plan.neutralRight > 0) {
        drawNeutralStripCrop(stripImg, s, curX, drawY - 6, plan.neutralRight, mh, 0.5);
      }
      ctx.drawImage(leftImg, drawX, drawY - 6, lw, lh);
      ctx.drawImage(rightImg, drawX + a.w - rw, drawY - 6, rw, lh);
    }
    ctx.strokeStyle = '#3f3947';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, a.h - 2);
    ctx.restore();
    return;
  }

  if (a.ceiling && mat === 'steel') {
    drawSteelHorizontalGirder(a, drawX, drawY);
    return;
  }

  // For non-stone small perches (or explicitly flagged `useSmallVisual`), allow `single_small` when scale is natural
  const smallImg = getTerrainImg(spec.folder, spec.prefix, 'single_small');
  if (smallImg && (a.useSmallVisual || (mat !== 'stone' && a.w <= 140))) {
    const uS = a.w / smallImg.width;
    if (uS >= 0.36 && uS <= 0.58) {
      const drawH = Math.round(smallImg.height * uS);
      const topY = Math.round(drawY - spec.smallWalk * uS);
      ctx.drawImage(smallImg, drawX, topY, a.w, drawH);
      return;
    }
  }

  const leftImg = getTerrainImg(spec.folder, spec.prefix, 'left');
  const midA = getTerrainImg(spec.folder, spec.prefix, 'middle_a');
  const midB = getTerrainImg(spec.folder, spec.prefix, 'middle_b') || midA;
  const midC = getTerrainImg(spec.folder, spec.prefix, 'middle_c') || midA;
  const rightImg = getTerrainImg(spec.folder, spec.prefix, 'right');
  const innerStrip = getTerrainImg(spec.folder, spec.prefix, 'inner_strip') || midA;
  if (!leftImg || !midA || !rightImg) return;

  const s = spec.thinScale;
  const topY = Math.round(drawY - spec.thinWalk * s);
  const drawH = Math.round(leftImg.height * s);
  const lw = Math.round(leftImg.width * s);
  const rw = Math.round(rightImg.width * s);

  // Compact platforms (`a.w <= lw + rw`): join the outer `halfW` of `leftImg` and outer `a.w - halfW` of `rightImg`
  // via 1:1 source cropping (`dw/sw === dh/sh === s`), so neither cap is distorted and no middle sliver exists!
  if (a.w <= lw + rw) {
    const halfW = Math.round(a.w * 0.5);
    const rightHalfW = a.w - halfW;
    drawNeutralStripCrop(leftImg, s, drawX, topY, halfW, drawH, 0.0);
    drawNeutralStripCrop(rightImg, s, drawX + halfW, topY, rightHalfW, drawH, 1.0);
    return;
  }

  const nomW = Math.max(24, Math.round(midA.width * s));
  // For `stone` (`260x216`), each `stone_middle_a` / `stone_middle_c` contains two symmetric `130px` complete arch bays (`halfBayW = 62px`).
  const halfBayW = mat === 'stone' ? Math.round(130 * s) : 0;
  const plan = makePlatformModulePlan(a.w, lw, rw, nomW, halfBayW);
  const mids = [midA, midB, midC];

  ctx.save();
  ctx.beginPath();
  ctx.rect(drawX, topY - 4, a.w, drawH + 8);
  ctx.clip();

  // 1. Left complete cap
  ctx.drawImage(leftImg, drawX, topY, lw, drawH);

  // 2. Sliver-free middle assembly: `neutralLeft` + `plan.count` complete middle tiles + optional `halfCount` 1-arch bay + `neutralRight`
  let curX = drawX + lw;
  if (plan.neutralLeft > 0) {
    drawNeutralStripCrop(innerStrip, s, curX, topY, plan.neutralLeft, drawH, 0.5);
    curX += plan.neutralLeft;
  }
  for (let i = 0; i < plan.count; i++) {
    const mImg = mids[Math.floor(seededUnit(seed, i + 7) * 3) % 3];
    ctx.drawImage(mImg, curX, topY, nomW, drawH);
    curX += nomW;
  }
  if (plan.halfCount === 1) {
    // Draw a single complete 1-arch bay (`sx=0, sw=130, sh=216`) from `midA` at exact 1:1 scale (`62x104`)
    ctx.drawImage(midA, 0, 0, halfBayW / (drawH / midA.height), midA.height, curX, topY, halfBayW, drawH);
    curX += halfBayW;
  }
  if (plan.neutralRight > 0) {
    drawNeutralStripCrop(innerStrip, s, curX, topY, plan.neutralRight, drawH, 0.5);
  }

  // 3. Right complete cap
  ctx.drawImage(rightImg, drawX + a.w - rw, topY, rw, drawH);
  ctx.restore();
}

// Gate 1 (P0): Render separated stage props (`BACKGROUND_PROP` & `DECORATION`) with grounded anchorBottom
function drawStageProps(layerFilter) {
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  if (!l || !l.villageProps || !l.villageProps.length) return;
  const topA = l.id === 'village' ? (getTerrainImg('village', '', 'ground_top_a') || getTerrainImg('village', '', 'ground_top')) : null;
  for (const fp of l.villageProps) {
    if (fp.layer !== layerFilter) continue;
    if (fp.x2 < rCam - 160 || fp.x1 > rCam + W + 160) continue;
    const im = terrainImages[fp.key];
    if (!im) continue;
    const dw = Math.round(im.width * fp.scale);
    const dh = Math.round(im.height * fp.scale);
    const dx = Math.round(fp.x - dw * 0.5);
    const anchorRow = (typeof fp.groundAnchorPx === 'number') ? fp.groundAnchorPx : fp.walkOffset;
    const dy = Math.round(fp.anchorBottom - anchorRow * fp.scale);
    ctx.drawImage(im, dx, dy, dw, dh);
    if (topA && fp.anchorBottom === 580 && l.id === 'village') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx + 6, 581, Math.max(0, dw - 12), 8);
      ctx.clip();
      ctx.globalAlpha = 0.65;
      const tileW = Math.round(topA.width * 0.54);
      const tileH = Math.round(topA.height * 0.54);
      const startX = Math.floor(dx / tileW) * tileW;
      for (let gx = startX; gx < dx + dw; gx += tileW) {
        ctx.drawImage(topA, gx, 555, tileW, tileH);
      }
      ctx.restore();
    }
  }
}

function drawPlatformDecorations(a, drawX, drawY) {
  if (a.noAutoDecor) return;
  if (a.customDecorations && a.customDecorations.length) {
    for (const dec of a.customDecorations) {
      const im = terrainImages[dec.key];
      if (!im) continue;
      const dx = dec.x;
      const decViewW = (typeof rCamZoom === 'number' && rCamZoom > 0) ? (W / rCamZoom) : W;
      if (dx < rCam - 160 || dx > rCam + decViewW + 160) continue;
      const dw = Math.round(im.width * dec.scale);
      const dh = Math.round(im.height * dec.scale);
      const dy = Math.round(drawY - dec.walkOffset * dec.scale);
      ctx.drawImage(im, Math.round(dx - dw * 0.5), dy, dw, dh);
    }
    return;
  }

  if ((!a.groundTile && !a.rooftop) || a.w < 380) return;
  const mat = a.visual?.material || a.skin || 'grass';
  const spec = TERRAIN_SPECS[mat];
  if (!spec || !spec.decorations || !spec.decorations.length) return;
  const seed = a.visual?.seed || 303;
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];

  const margin = 130;
  const usableW = a.w - margin * 2;
  if (usableW < 180) return;
  const step = 540;
  const count = Math.floor(usableW / step);

  for (let i = 0; i < count; i++) {
    const u = seededUnit(seed, i * 19 + 3);
    if (u < 0.28) continue;
    const decIdx = Math.floor(seededUnit(seed, i * 37 + 11) * spec.decorations.length) % spec.decorations.length;
    const dec = spec.decorations[decIdx];
    const im = terrainImages[dec.key];
    if (!im) continue;

    const jitter = (seededUnit(seed, i * 53 + 5) - 0.5) * 140;
    const dx = Math.round(drawX + margin + i * step + step * 0.4 + jitter);
    const decViewW = (typeof rCamZoom === 'number' && rCamZoom > 0) ? (W / rCamZoom) : W;
    if (dx < rCam - 160 || dx > rCam + decViewW + 160) continue;

    if (flags.some(f => Math.abs(f.x - dx) < 90)) continue;
    if (l.decorFootprints && l.decorFootprints.some(fp => dx >= fp.x1 - 40 && dx <= fp.x2 + 40)) continue;
    if ((l.id === 'monatium' || l.id === 'monatium_a') && dx > (STAGE_ANCHORS.monatium.bukgyeongBldgX - 100) && dx < (STAGE_ANCHORS.monatium.bukgyeongBldgX + 540)) continue;
    const g = l.goal;
    if (g && dx > g.x - 120 && dx < g.x + g.w + 120) continue;

    const dw = Math.round(im.width * dec.scale);
    const dh = Math.round(im.height * dec.scale);
    const dy = Math.round(drawY - dec.walkOffset * dec.scale);
    ctx.drawImage(im, Math.round(dx - dw * 0.5), dy, dw, dh);
  }
}

function drawPlatform(a) {
  if (a.hidden) return;
  const drawX = Math.round((a.prevX ?? a.x) + (a.x - (a.prevX ?? a.x)) * renderAlpha);
  const drawY = Math.round((a.prevY ?? a.y) + (a.y - (a.prevY ?? a.y)) * renderAlpha);

  if (a.motion) {
    ctx.save();
    ctx.strokeStyle = 'rgba(210, 225, 245, 0.45)';
    ctx.lineWidth = 3.5;
    if (a.motion.axis === 'x') {
      const tx1 = a.trackX1 !== undefined ? a.trackX1 : (a.baseX - a.motion.range);
      const tx2 = a.trackX2 !== undefined ? a.trackX2 : (a.baseX + a.motion.range + a.w);
      const railY = a.baseY + Math.round(a.h * 0.5);
      ctx.beginPath();
      ctx.moveTo(tx1, railY);
      ctx.lineTo(tx2, railY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(226, 197, 106, 0.75)';
      ctx.fillRect(tx1 - 3, railY - 5, 6, 10);
      ctx.fillRect(tx2 - 3, railY - 5, 6, 10);
    } else if (a.motion.axis === 'y') {
      const ty1 = a.trackY1 !== undefined ? a.trackY1 : (a.baseY - a.motion.range);
      const ty2 = a.trackY2 !== undefined ? a.trackY2 : (a.baseY + a.motion.range);
      const railX = a.baseX + Math.round(a.w * 0.5);
      ctx.beginPath();
      ctx.moveTo(railX, ty1);
      ctx.lineTo(railX, ty2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(226, 197, 106, 0.75)';
      ctx.fillRect(railX - 6, ty1 - 3, 12, 6);
      ctx.fillRect(railX - 6, ty2 - 3, 12, 6);
    }
    ctx.restore();
    ctx.save();
    ctx.setLineDash([5, 6]);
    if (a.motion.axis === 'x') {
      line(a.baseX - a.motion.range + a.w * 0.5, drawY + 10, a.baseX + a.motion.range + a.w * 0.5, drawY + 10, a.fastMoving ? '#ffbe4dc8' : '#8fe8dca8', 2.8);
    } else {
      line(drawX + a.w / 2, a.baseY - a.motion.range, drawX + a.w / 2, a.baseY + a.motion.range, '#a6e1d9', 2);
    }
    ctx.restore();
  }

  if (a.behavior === 'blink') {
    if (a.silentBlink && a.blinkState === 'off') {
      return;
    }
    ctx.save();
    const shakeX = (a.blinkState === 'warning' && !a.silentBlink) ? Math.round(Math.sin(time * 55) * 2) : 0;
    ctx.globalAlpha = a.blinkAlpha ?? 1;
    drawThinPlatformVisual(a, drawX + shakeX, drawY);
    if (!a.silentBlink) {
      if (a.ultraFastBlink && a.blinkState === 'on') {
        ctx.strokeStyle = '#ff922bcc';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(drawX + 2, drawY - 1, a.w - 4, 20);
      } else if (a.blinkState === 'warning') {
        ctx.strokeStyle = a.ultraFastBlink ? '#ff2b5e' : (a.fastBlink ? '#ff6b4a' : '#ffcf4d');
        ctx.lineWidth = 3;
        ctx.strokeRect(drawX + shakeX + 2, drawY - 2, a.w - 4, 22);
      } else if (a.blinkState === 'off') {
        ctx.setLineDash([5, 6]);
        ctx.strokeStyle = a.ultraFastBlink ? '#ff6b9d66' : '#9cc5ff55';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(drawX + 3, drawY + 2, a.w - 6, 14);
      }
    }
    ctx.restore();
    return;
  }

  if (a.groundTile) {
    drawGroundVisual(a, drawX, drawY);
    drawPlatformDecorations(a, drawX, drawY);
  } else {
    drawThinPlatformVisual(a, drawX, drawY);
    if (a.rooftop || a.customDecorations) drawPlatformDecorations(a, drawX, drawY);
  }

  if (a.motion) {
    ctx.save();
    ctx.strokeStyle = a.fastMoving ? '#ffbe4d' : '#93e8dd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(drawX + 6, drawY);
    ctx.lineTo(drawX + a.w - 6, drawY);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSpecialCoins() {
  if (typeof specialCoins === 'undefined' || !specialCoins.length) return;
  if (typeof syncSpecialCoinPositions === 'function') syncSpecialCoinPositions();
  const crayonImg = collectibleImages['golden_crayon'];

  for (let i = 0; i < specialCoins.length; i++) {
    const sc = specialCoins[i];
    const bob = Math.sin(time * 3.8 + i) * 4;

    if (sc.state === 'available') {
      if (sc.x < rCam - 70 || sc.x > rCam + W + 70 || sc.y - rCamY > H + 130 || sc.y - rCamY < -130) continue;
      ctx.save();
      ctx.translate(sc.x, sc.y + bob);
      const pulseR = 23 + Math.sin(time * 5.2 + i) * 2.5;
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, pulseR + 6);
      grad.addColorStop(0, 'rgba(255, 232, 130, 0.55)');
      grad.addColorStop(0.65, 'rgba(255, 190, 55, 0.25)');
      grad.addColorStop(1, 'rgba(255, 170, 30, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffae2bcc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      if (crayonImg) {
        const sz = 42;
        ctx.drawImage(crayonImg, -sz * 0.5, -sz * 0.5, sz, sz);
      }
      ctx.restore();
    } else if (sc.state === 'pending') {
      if (sc.x >= rCam - 70 && sc.x <= rCam + W + 70 && sc.y - rCamY <= H + 120 && sc.y - rCamY >= -120) {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.strokeStyle = '#ffb84d99';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.stroke();
        if (crayonImg) {
          ctx.globalAlpha = 0.28;
          ctx.drawImage(crayonImg, -17, -17, 34, 34);
        }
        ctx.restore();
      }
      const ox = rPx - p.face * 36;
      const oy = rPy - 76 + Math.sin(time * 7) * 5;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.strokeStyle = '#ffbe3bcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();
      if (crayonImg) {
        ctx.drawImage(crayonImg, -15, -15, 30, 30);
      }
      ctx.restore();
    } else if (sc.state === 'secured') {
      if (sc.x < rCam - 70 || sc.x > rCam + W + 70 || sc.y - rCamY > H + 130 || sc.y - rCamY < -130) continue;
      ctx.save();
      ctx.translate(sc.x, sc.y);
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = '#4e8c69';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.stroke();
      if (crayonImg) {
        ctx.drawImage(crayonImg, -18, -18, 36, 36);
      }
      ctx.restore();
    }
  }
}

function drawDeveloperQaOverlay() {
  if (!window.__showArtQaOverlay) return;
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  ctx.save();
  ctx.font = 'bold 11px monospace';
  if (l.villageProps) {
    for (const fp of l.villageProps) {
      if (fp.x2 < rCam - 100 || fp.x1 > rCam + W + 100) continue;
      ctx.strokeStyle = fp.assetType === 'BACKGROUND_PROP' ? '#ff922bcc' : '#51cf66cc';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(fp.x1, fp.y1, fp.x2 - fp.x1, fp.y2 - fp.y1);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff2b5e';
      ctx.beginPath();
      ctx.arc(fp.x, fp.anchorBottom, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(`${fp.id} [${fp.assetType}] anchor=${fp.anchorBottom}`, fp.x1 + 4, fp.y1 - 6);
    }
  }
  for (const a of platforms) {
    if (a.x + a.w < rCam - 100 || a.x > rCam + W + 100) continue;
    if (a.wall || a.ceiling) {
      ctx.strokeStyle = a.ceiling ? '#ffd43bcc' : '#ff6b6bcc';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(a.x, a.y, a.w, a.h);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = a.groundTile ? '#339af0' : '#00f5d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + a.w, a.y);
    ctx.stroke();
    ctx.fillStyle = '#00f5d4';
    ctx.fillText(`${a.id} (y=${a.y}, w=${a.w})`, a.x + 4, a.y + 14);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  renderBackground();
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const viewW = W / zoom;
  const viewH = H / zoom;
  ctx.save();
  if (Math.abs(zoom - 1) > 0.001) {
    ctx.scale(zoom, zoom);
  }
  ctx.translate(-Math.round(rCam), -Math.round(rCamY));

  drawTowerStructures();
  drawMonatiumBArchitecture();
  drawErpienAArchitecture();

  for (const a of platforms) {
    if (!a.groundTile) continue;
    if (a.x + a.w < rCam - 120 || a.x > rCam + viewW + 120) continue;
    drawPlatform(a);
  }
  drawStageProps('background');
  drawStageProps('midground');

  for (const a of platforms) {
    if (a.groundTile) continue;
    if (a.x + a.w < rCam - 160 || a.x > rCam + viewW + 160 || a.y - rCamY > viewH + 280 || a.y + a.h - rCamY < -280) continue;
    drawPlatform(a);
  }

  // P0-ART26-02: Post-pass visual junction overlay for Suin Forest tutorial wall-to-ground/platform joints
  drawTerrainJunctionOverlays();

  if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
    if (typeof drawChallengeHazards === 'function') drawChallengeHazards();
  } else {
    drawActors();
    drawBombs();
    if (typeof drawWindDarts === 'function') drawWindDarts();
  }

  const candyImg = collectibleImages['king_candy'];
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (c.got || c.x < rCam - 60 || c.x > rCam + viewW + 60 || c.y - rCamY > viewH + 110 || c.y - rCamY < -110) continue;
    const cy = c.y + Math.sin(time * 3.2 + i * 0.7) * 3;
    ctx.save();
    ctx.translate(Math.round(c.x), Math.round(cy));
    ctx.fillStyle = 'rgba(255, 245, 235, 0.32)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    if (candyImg) {
      const sz = 32;
      ctx.drawImage(candyImg, -sz * 0.5, -sz * 0.5, sz, sz);
    }
    ctx.restore();
  }

  drawSpecialCoins();

  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    if (f.x < rCam - 100 || f.x > rCam + viewW + 100) continue;
    line(f.x, f.y, f.x, f.y - 100, '#665d52', 4);
    ctx.fillStyle = checkpoint > i ? '#87bb90' : '#f4ce83';
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - 100);
    ctx.lineTo(f.x + 45, f.y - 90);
    ctx.lineTo(f.x, f.y - 65);
    ctx.fill();
  }
  const activeLvForSigns = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  if ((typeof gameMode === 'undefined' || gameMode === 'story') && activeLvForSigns?.id === 'forest') {
    for (const s of (activeLvForSigns.signs || [])) {
      if (s.x < rCam - 250 || s.x > rCam + W + 250 || s.y - rCamY > H + 120 || s.y - rCamY < -120) continue;
      ctx.font = 'bold 17px "Malgun Gothic",sans-serif';
      const width = ctx.measureText(s.text).width + 26;
      ctx.fillStyle = '#fff9e8ed';
      ctx.beginPath();
      ctx.roundRect(s.x - width / 2, s.y - 25, width, 39, 12);
      ctx.fill();
      ctx.fillStyle = '#465646';
      ctx.textAlign = 'center';
      ctx.fillText(s.text, s.x, s.y);
    }
  }
  const activeLv = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  const goal = activeLv ? activeLv.goal : null;
  if (goal) {
    ctx.fillStyle = '#80634d';
    ctx.beginPath();
    ctx.roundRect(goal.x, goal.y - goal.h, goal.w, goal.h, [70, 70, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffeac0';
    ctx.beginPath();
    ctx.roundRect(goal.x + 12, goal.y - goal.h + 12, goal.w - 24, goal.h - 12, [60, 60, 0, 0]);
    ctx.fill();
    ellipse(goal.x + goal.w - 30, goal.y - 65, 5, 5, '#aa7e46');
    ctx.font = 'bold 18px "Malgun Gothic"';
    ctx.fillStyle = '#6c5742';
    ctx.textAlign = 'center';
    ctx.fillText(goal.label || '엄마의 방', goal.x + goal.w / 2, goal.y - goal.h - 18);
  }
  for (const t of trail) {
    ctx.save();
    ctx.globalAlpha = t.life * 0.8;
    line(t.x - t.face * 40, t.y - 35, t.x - t.face * 90, t.y - 35, '#f9fff4', 8);
    ctx.restore();
  }
  for (const q of particles) {
    ctx.globalAlpha = Math.min(1, q.life * 2);
    ellipse(q.x, q.y, q.r, q.r, q.color);
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.globalAlpha = shadow.alpha;
  ellipse(Math.round(rPx), shadow.y, shadow.width, 4, '#334b3a');
  ctx.restore();
  renderCharacter();
  drawStageProps('foreground');
  drawProtection();
  drawDeveloperQaOverlay();
  ctx.restore();
  if (state === 'night') {
    ctx.save();
    ctx.globalAlpha = Math.min(0.23, sceneElapsed * 0.15);
    ctx.fillStyle = '#101b39';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function drawMonatiumBArchitecture() {
  const curId = (typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex])?.id;
  if (curId !== 'monatium_b') return;
  const mb = STAGE_ANCHORS.monatium_b;
  const backdrop = structureImages['tower_backdrop'];
  const portalArch = structureImages['tower_portal_arch'];
  const pier = structureImages['rooftop_pier'];
  const truss = structureImages['rooftop_truss'];

  const trussSpans = [
    { x1: mb.arch1Start - 20, x2: mb.arch1End + 20, y: -600 },
    { x1: mb.arch1Start - 20, x2: mb.arch1End + 20, y: -940 },
    { x1: mb.summitStart - 20, x2: mb.summitEnd + 20, y: -1520 },
    { x1: mb.summitStart - 20, x2: mb.summitEnd + 20, y: -2120 }
  ];
  if (truss) {
    for (const sp of trussSpans) {
      if (sp.x2 < rCam - 120 || sp.x1 > rCam + W + 120) continue;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.rect(sp.x1, sp.y, sp.x2 - sp.x1, 128);
      ctx.clip();
      for (let gx = sp.x1; gx < sp.x2; gx += 256) {
        ctx.drawImage(truss, gx, sp.y, 256, 128);
      }
      ctx.restore();
    }
  }

  const pierColumns = [
    { x: mb.arch1Start + 20, topY: -560, w: 180 },
    { x: mb.arch1End - 200, topY: -560, w: 180 },
    { x: mb.summitStart + 20, topY: -1520, w: 210 },
    { x: mb.summitEnd - 230, topY: -1520, w: 210 }
  ];
  if (pier) {
    for (const pc of pierColumns) {
      if (pc.x + pc.w < rCam - 120 || pc.x > rCam + W + 120) continue;
      const bottomY = 740;
      const tileH = Math.round(pc.w * (pier.height / pier.width));
      ctx.save();
      ctx.beginPath();
      ctx.rect(pc.x, pc.topY, pc.w, bottomY - pc.topY);
      ctx.clip();
      for (let gy = pc.topY; gy < bottomY; gy += tileH) {
        ctx.drawImage(pier, pc.x, gy, pc.w, tileH);
      }
      ctx.restore();
    }
  }

  const shafts = [
    {
      x1: mb.tower1Start + 64, x2: mb.tower1End - 64, y1: -1120, y2: 580,
      rails: [805, 1045, 1260],
      portals: [
        { x: mb.tower1Start - 8, y: 356, w: 84, h: 126 },
        { x: mb.tower1End - 76, y: -945, w: 84, h: 126 }
      ]
    },
    {
      x1: mb.tower2Start + 64, x2: mb.tower2End - 64, y1: -2180, y2: 580,
      rails: [2760, 3050, 3340],
      portals: [
        { x: mb.tower2Start - 8, y: -945, w: 84, h: 126 },
        { x: mb.tower2End - 76, y: -1940, w: 84, h: 126 }
      ]
    },
    {
      x1: mb.tower3Start + 64, x2: mb.tower3End - 64, y1: -2420, y2: 580,
      rails: [5680, 5995, 6310],
      portals: [
        { x: mb.tower3Start - 8, y: -1940, w: 84, h: 126 },
        { x: mb.tower3End - 76, y: 356, w: 84, h: 126 }
      ],
      hasBottomPit: true, pitX1: mb.tower3Start + 64, pitX2: mb.tower3End - 64
    }
  ];

  for (const sh of shafts) {
    if (sh.x2 < rCam - 180 || sh.x1 > rCam + W + 180) continue;
    const spanW = sh.x2 - sh.x1;
    const spanH = sh.y2 - sh.y1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sh.x1, sh.y1, spanW, spanH);
    ctx.clip();

    const grad = ctx.createLinearGradient(0, sh.y1, 0, sh.y2);
    grad.addColorStop(0, 'rgba(42, 56, 78, 0.74)');
    grad.addColorStop(0.5, 'rgba(34, 46, 66, 0.78)');
    grad.addColorStop(1, 'rgba(26, 36, 52, 0.84)');
    ctx.fillStyle = grad;
    ctx.fillRect(sh.x1, sh.y1, spanW, spanH);

    if (backdrop) {
      const tileW = 480, tileH = 480;
      for (let gy = sh.y1; gy < sh.y2; gy += tileH) {
        for (let gx = sh.x1; gx < sh.x2; gx += tileW) {
          ctx.drawImage(backdrop, gx, gy, tileW, tileH);
        }
      }
    }

    ctx.fillStyle = 'rgba(188, 226, 255, 0.11)';
    for (const rx of sh.rails) {
      ctx.fillRect(rx - 30, sh.y1 + 28, 60, spanH - 56);
    }

    ctx.strokeStyle = 'rgba(160, 200, 235, 0.25)';
    ctx.lineWidth = 4;
    for (const rx of sh.rails) {
      ctx.beginPath();
      ctx.moveTo(rx, sh.y1 + 40);
      ctx.lineTo(rx, sh.y2 - 20);
      ctx.stroke();
    }

    if (sh.hasBottomPit) {
      const pGrad = ctx.createLinearGradient(0, 515, 0, 580);
      pGrad.addColorStop(0, 'rgba(235, 88, 64, 0.0)');
      pGrad.addColorStop(1, 'rgba(235, 88, 64, 0.48)');
      ctx.fillStyle = pGrad;
      ctx.fillRect(sh.pitX1, 515, sh.pitX2 - sh.pitX1, 65);
    }
    ctx.restore();

    if (portalArch) {
      for (const pt of sh.portals) {
        const pH = Math.round(pt.w * (portalArch.height / portalArch.width));
        ctx.drawImage(portalArch, pt.x, pt.y, pt.w, pH);
      }
    }
  }
}
