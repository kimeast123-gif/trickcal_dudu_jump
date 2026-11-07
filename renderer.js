'use strict';
// TEST12 Renderer:
// - Gate G1: Renders unmodified `king_candy.png` (32x32px) for regular collectibles and `golden_crayon.png` (42x42px) for special collectibles across `available`, `pending`, and `secured` states.
// - Gate G2: Renders high-rise Monatium tower structures (`y1=-1255..-1247`), 75px `M-ASC-12` (`single_small` without squashing), and faster Section 2 blinking skywalk indicators.
// - Gate G5-2: Smooth cosine S-curve cross-fade (0.85~1.05s over 960px corridor `x=6120..7080`) + foreground ground seam blend at Erpien Gate -> City boundary (`x=6600`).
// - Gate G5-3: Eliminates `erpien-city.webp` sub-pixel vertical downscaling shimmer via multi-step high-quality 720p pre-scaled panorama caching + integer source X snapping.
const terrainImages = {};
const structureImages = {};
const preScaledPanoramas = {};

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
  'erpien/gate_single_small', 'erpien/gate_single_medium',
  'erpien/gate_ground_top', 'erpien/gate_ground_top_a', 'erpien/gate_ground_top_b', 'erpien/gate_ground_top_c',
  'erpien/gate_ground_body_a', 'erpien/gate_ground_body_b',
  'erpien/gate_ground_cliff_left', 'erpien/gate_ground_cliff_right',
  'erpien/stone_left', 'erpien/stone_middle_a', 'erpien/stone_middle_b', 'erpien/stone_middle_c', 'erpien/stone_right',
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

const BACKGROUND_RANGES = {
  'forest:forest-bg': [0, 7400],
  'monatium:city-bg': [0, 19500],
  'erpien:erpien-gate': [0, 6600],
  'erpien:erpien-city': [6600, 14300],
  'erpien:erpien-home': [14300, 21900]
};

const TERRAIN_SPECS = {
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
    smallWalk: 46, medWalk: 12,
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

// Gate G5-3: Pre-scale 1024px-high world panoramas to exact canvas height H=720 using high-quality 2-step resampling
// so per-frame scrolling samples 1:1 vertically (`sh=720 -> dh=720`, `sw=1280 -> dw=1280`) with zero sub-pixel shimmer!
function buildPreScaledPanorama(key, im) {
  if (!im || !im.width || !im.height) return;
  try {
    const scale = H / im.height;
    const srcW = key === 'city-bg' ? Math.min(im.width, 1722) : im.width;
    const targetW = Math.max(W, Math.round(srcW * scale));
    const midH = Math.round((im.height + H) * 0.5);
    const midW = Math.round(srcW * (midH / im.height));

    const c1 = document.createElement('canvas');
    c1.width = midW;
    c1.height = midH;
    const x1 = c1.getContext('2d');
    x1.imageSmoothingEnabled = true;
    x1.imageSmoothingQuality = 'high';
    x1.drawImage(im, 0, 0, srcW, im.height, 0, 0, midW, midH);

    const c2 = document.createElement('canvas');
    c2.width = targetW;
    c2.height = H;
    const x2 = c2.getContext('2d');
    x2.imageSmoothingEnabled = true;
    x2.imageSmoothingQuality = 'high';
    x2.drawImage(c1, 0, 0, midW, midH, 0, 0, targetW, H);

    preScaledPanoramas[key] = c2;
  } catch {}
}

function drawPanorama(segment, alpha = 1) {
  const im = worldImages[segment.bg];
  if (!im) return;
  const l = levels[levelIndex];
  const rangeKey = `${l.id}:${segment.bg}`;
  const [bgStart, bgEnd] = BACKGROUND_RANGES[rangeKey] || [segment.start, segment.end];
  const travel = Math.max(1, bgEnd - bgStart - W);
  const progress = Math.max(0, Math.min(1, (rCam - bgStart) / travel));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const pre = preScaledPanoramas[segment.bg];
  if (pre) {
    const maxSx = Math.max(0, pre.width - W);
    // Snap horizontal source crop to 0.5px increments to eliminate sub-pixel texture crawl while keeping smooth scrolling
    const sx = Math.round(progress * maxSx * 2) * 0.5;
    ctx.drawImage(pre, sx, 0, W, H, 0, 0, W, H);
  } else {
    const scale = H / im.height;
    const effectiveImgW = segment.bg === 'city-bg' ? 1722 : im.width;
    const sx = progress * Math.max(0, effectiveImgW - W / scale);
    ctx.drawImage(im, sx, 0, Math.min(effectiveImgW, W / scale), im.height, 0, 0, W, H);
  }
  ctx.restore();
}

function renderBackground() {
  const l = levels[levelIndex], segments = l.segments;
  const center = rCam + W * 0.5;

  // Gate G5-2: Dedicated smooth S-curve cross-fade across Erpien Gate -> City boundary (center 6120 .. 7080, width 960px, ~0.9~1.1s duration)
  if (levelIndex === 2 && center >= 6120 && center <= 7080) {
    const gateSeg = segments[0];
    const citySeg = segments[1];
    const rawU = Math.max(0, Math.min(1, (center - 6120) / 960));
    const smoothU = 0.5 - 0.5 * Math.cos(Math.PI * rawU);
    drawPanorama(gateSeg, 1);
    drawPanorama(citySeg, smoothU);
    // Warm sunlit mist veil peaking smoothly at the boundary so the scene change feels organic
    const mistAlpha = 0.20 * Math.sin(Math.PI * rawU);
    if (mistAlpha > 0.005) {
      ctx.save();
      ctx.fillStyle = '#f8f2e4';
      ctx.globalAlpha = mistAlpha;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  } else {
    let active = segments.find(s => center >= s.start && center < s.end) || segments.at(-1);
    drawPanorama(active);
    const next = segments[segments.indexOf(active) + 1];
    if (next && next.bg !== active.bg && center > active.end - 420) {
      const rawU = Math.max(0, Math.min(1, (center - (active.end - 420)) / 420));
      const smoothU = 0.5 - 0.5 * Math.cos(Math.PI * rawU);
      drawPanorama(next, smoothU);
    }
  }

  let active = segments.find(s => center >= s.start && center < s.end) || segments.at(-1);
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

function drawTowerStructures() {
  if (levelIndex === 2) {
    // Gate G5-2: Soft foreground archway/ground transition veil at Erpien Gate->City boundary (x = 6600)
    if (rCam + W > 6450 && rCam < 6750) {
      ctx.save();
      const gGrad = ctx.createLinearGradient(6510, 0, 6690, 0);
      gGrad.addColorStop(0, 'rgba(235, 228, 210, 0)');
      gGrad.addColorStop(0.5, 'rgba(235, 228, 210, 0.36)');
      gGrad.addColorStop(1, 'rgba(235, 228, 210, 0)');
      ctx.fillStyle = gGrad;
      ctx.fillRect(6510, 520, 180, 320);
      ctx.restore();
    }
    // Temple Sanctuary entrance beam at x = 14300
    if (rCam + W > 14200 && rCam < 14420) {
      ctx.save();
      const grad = ctx.createLinearGradient(14265, 0, 14335, 0);
      grad.addColorStop(0, 'rgba(255, 244, 214, 0)');
      grad.addColorStop(0.5, 'rgba(255, 244, 214, 0.38)');
      grad.addColorStop(1, 'rgba(255, 244, 214, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(14265, 60, 70, 520);
      ctx.restore();
    }
    return;
  }
  if (levelIndex !== 1) return;
  const backdrop = structureImages['tower_backdrop'];
  const portalArch = structureImages['tower_portal_arch'];
  const pier = structureImages['rooftop_pier'];
  const truss = structureImages['rooftop_truss'];

  // Gate G2-2: Rooftop Skybridge & Building Substructure shifted up by +475px (y = -1030 .. -995)
  if (rCam + W > 4150 && rCam < 8300) {
    const trussSpans = [
      { x1: 4180, x2: 4620, y: -1030 },
      { x1: 5820, x2: 6130, y: -1015 },
      { x1: 7335, x2: 8220, y: -995 }
    ];
    if (truss) {
      for (const sp of trussSpans) {
        if (sp.x2 < rCam - 100 || sp.x1 > rCam + W + 100) continue;
        ctx.save();
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.rect(sp.x1, sp.y, sp.x2 - sp.x1, 130);
        ctx.clip();
        for (let gx = sp.x1; gx < sp.x2; gx += 260) {
          ctx.drawImage(truss, gx, sp.y, 262, 128);
        }
        ctx.restore();
      }
    }

    const pierColumns = [
      { x: 4300, topY: -1030, w: 220 },
      { x: 5860, topY: -1015, w: 220 },
      { x: 7420, topY: -995, w: 220 },
      { x: 7940, topY: -995, w: 220 }
    ];
    if (pier) {
      for (const pc of pierColumns) {
        if (pc.x + pc.w < rCam - 120 || pc.x > rCam + W + 120) continue;
        const bottomY = 580;
        const tileH = 440;
        ctx.save();
        ctx.beginPath();
        ctx.rect(pc.x, pc.topY, pc.w, bottomY - pc.topY);
        ctx.clip();
        for (let gy = pc.topY; gy < bottomY; gy += tileH) {
          ctx.drawImage(pier, pc.x, gy, pc.w, tileH + 2);
        }
        ctx.restore();
      }
    }
  }

  // West Ascent Tower & East Descent Tower Interior Backdrops & Portals (extended to y = -1255 / -1247)
  const shafts = [
    {
      x1: 3464, x2: 4420, y1: -1255, y2: 580,
      labelTop: 'MONATIUM WEST ASCENT TOWER · 제1수직상승타워 (12단 고층)',
      portals: [
        { x: 3392, y: 356, w: 84, h: 224, label: '입구 ↑' },
        { x: 4412, y: -1229, w: 84, h: 204, label: '옥상 출구 →' }
      ]
    },
    {
      x1: 8284, x2: 9356, y1: -1247, y2: 580,
      labelTop: 'MONATIUM EAST DESCENT TOWER · 제2수직하강타워 (6단 · 고속이동)',
      portals: [
        { x: 8212, y: -1219, w: 84, h: 204, label: '하강 입구 ↓' },
        { x: 9348, y: 356, w: 84, h: 224, label: '지상 출구 →' }
      ],
      hasBottomPit: true, pitX1: 8284, pitX2: 8980
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
    grad.addColorStop(0, 'rgba(34, 45, 64, 0.78)');
    grad.addColorStop(0.5, 'rgba(28, 38, 55, 0.82)');
    grad.addColorStop(1, 'rgba(22, 30, 44, 0.86)');
    ctx.fillStyle = grad;
    ctx.fillRect(sh.x1, sh.y1, spanW, spanH);

    if (backdrop) {
      const tileW = 480, tileH = 480;
      for (let gy = sh.y1; gy < sh.y2; gy += tileH) {
        for (let gx = sh.x1; gx < sh.x2; gx += tileW) {
          ctx.drawImage(backdrop, gx, gy, tileW + 1, tileH + 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(145, 185, 220, 0.20)';
    ctx.lineWidth = 4;
    for (const rx of [sh.x1 + 150, sh.x1 + 495]) {
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

    ctx.save();
    ctx.fillStyle = '#263142ee';
    ctx.strokeStyle = '#8aa4c8';
    ctx.lineWidth = 2;
    const plateW = 470, plateH = 30;
    const plateX = Math.round((sh.x1 + sh.x2) * 0.5 - plateW * 0.5);
    const plateY = sh.y1 - 40;
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateW, plateH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e5f2ff';
    ctx.font = 'bold 14px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sh.labelTop, (sh.x1 + sh.x2) * 0.5, plateY + 20);
    ctx.restore();

    if (portalArch) {
      for (const pt of sh.portals) {
        ctx.drawImage(portalArch, pt.x, pt.y, pt.w, pt.h);
        ctx.save();
        ctx.fillStyle = '#1f2b3bcc';
        ctx.beginPath();
        ctx.roundRect(pt.x - 18, pt.y - 26, pt.w + 36, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#9ef3e6';
        ctx.font = 'bold 13px "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pt.label, pt.x + pt.w * 0.5, pt.y - 10);
        ctx.restore();
      }
    }
  }
}

function drawStructuralWall(a, drawX, drawY) {
  const side = a.wallSide === 'right' ? 'right' : 'left';
  const wallImg = structureImages[`tower_wall_${side}`] || structureImages['tower_wall_left'];
  const capImg = structureImages['tower_wall_cap'];

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, a.w, a.h, 6);
  ctx.clip();

  if (wallImg) {
    const tileH = Math.max(96, Math.round(a.w * 2));
    for (let gy = drawY; gy < drawY + a.h; gy += tileH) {
      ctx.drawImage(wallImg, drawX, gy, a.w, Math.min(tileH + 2, drawY + a.h - gy + 2));
    }
  } else {
    ctx.fillStyle = '#4c586c';
    ctx.fillRect(drawX, drawY, a.w, a.h);
  }

  if (capImg && a.h >= 40) {
    const capH = Math.min(32, Math.round(a.h * 0.25));
    ctx.drawImage(capImg, drawX, drawY, a.w, capH);
    if (a.portalBottom) {
      ctx.drawImage(capImg, drawX, drawY + a.h - capH, a.w, capH);
    }
  }

  ctx.strokeStyle = '#242b37';
  ctx.lineWidth = 3;
  ctx.strokeRect(drawX + 1.5, drawY + 1.5, a.w - 3, a.h - 3);
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

  const topY = Math.round(drawY - spec.groundWalk * s);
  const topH = Math.round(topA.height * s);
  const clW = (!a.joinLeft && cl) ? Math.round(cl.width * s) : 0;
  const clH = (!a.joinLeft && cl) ? Math.round(cl.height * s) : 0;
  const crW = (!a.joinRight && cr) ? Math.round(cr.width * s) : 0;
  const crH = (!a.joinRight && cr) ? Math.round(cr.height * s) : 0;

  const bottomY = Math.max(drawY + a.h, Math.ceil(rCamY + H + 60));
  const bodyStartY = mat === 'home' ? (topY + topH - 8) : (topY + Math.round(spec.bodyTopOffset * s));

  const bodyX1 = drawX + (clW > 0 ? Math.round(clW * 0.42) : 0);
  const bodyX2 = drawX + a.w - (crW > 0 ? Math.round(crW * 0.42) : 0);
  if (bodyX2 > bodyX1 && bottomY > bodyStartY) {
    const bw = Math.round(bodyA.width * s);
    const bh = Math.round(bodyA.height * s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyX1, bodyStartY, bodyX2 - bodyX1, bottomY - bodyStartY);
    ctx.clip();
    let colIdx = 0;
    for (let gx = bodyX1; gx < bodyX2; gx += bw, colIdx++) {
      let rowIdx = 0;
      for (let gy = bodyStartY; gy < bottomY; gy += bh, rowIdx++) {
        const pick = ((colIdx + rowIdx) % 2 === 0 || seededUnit(seed, colIdx * 31 + rowIdx) < 0.5) ? bodyA : bodyB;
        ctx.drawImage(pick, gx, gy, bw + 1, bh + 1);
      }
    }
    ctx.restore();
  }

  if (clW > 0 && cl) {
    ctx.drawImage(cl, drawX, topY, clW, clH);
  }
  if (crW > 0 && cr) {
    ctx.drawImage(cr, drawX + a.w - crW, topY, crW, crH);
  }

  const midX1 = drawX + clW;
  const midX2 = drawX + a.w - crW;
  const midSpan = midX2 - midX1;
  if (midSpan > 2) {
    const nomW = topA.width * s;
    const tops = [topA, topB, topC];
    if (midSpan >= nomW * 0.85) {
      const count = Math.max(1, Math.round(midSpan / nomW));
      const stepW = midSpan / count;
      for (let i = 0; i < count; i++) {
        const tx = Math.round(midX1 + i * stepW);
        const tw = Math.round(midX1 + (i + 1) * stepW) - tx;
        const pickIdx = mat === 'home' ? (i % 3) : (Math.floor(seededUnit(seed, i + 17) * 3) % 3);
        const tImg = tops[pickIdx];
        ctx.drawImage(tImg, tx - 1, topY, tw + 2, topH);
      }
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(midX1 - 2, topY - 10, midSpan + 4, topH + 20);
      ctx.clip();
      ctx.drawImage(topA, midX1 - 4, topY, Math.round(nomW), topH);
      ctx.restore();
    }
  }
}

function drawThinPlatformVisual(a, drawX, drawY) {
  if (a.wall) {
    drawStructuralWall(a, drawX, drawY);
    return;
  }
  const mat = a.visual?.material || a.skin || 'grass';
  const spec = TERRAIN_SPECS[mat] || TERRAIN_SPECS.grass;
  const seed = a.visual?.seed || 202;

  if (a.ceiling && mat === 'steel') {
    const cl = getTerrainImg('monatium', 'steel_ceiling_', 'left');
    const cm = getTerrainImg('monatium', 'steel_ceiling_', 'middle');
    const cr = getTerrainImg('monatium', 'steel_ceiling_', 'right');
    if (cl && cm && cr) {
      const s = Math.max(0.34, Math.min(0.45, a.h / 90));
      const topY = Math.round(drawY - 4 * s);
      const drawH = Math.round(cl.height * s);
      const lw = Math.round(cl.width * s);
      const rw = Math.round(cr.width * s);
      ctx.drawImage(cl, drawX, topY, lw, drawH);
      ctx.drawImage(cr, drawX + a.w - rw, topY, rw, drawH);
      const span = a.w - lw - rw;
      if (span > 0) {
        ctx.drawImage(cm, drawX + lw - 1, topY, span + 2, drawH);
      }
      return;
    }
  }

  // Gate G2-1(4): Use dedicated `single_small` sprite for narrow 75px `M-ASC-12` (`a.useSmallVisual || a.w <= 95`) preserving aspect ratio without squashing a 150px modular bar
  if ((a.useSmallVisual || a.w <= 95 || (a.w <= 145 && !a.towerStep && !a.descentStep)) && a.behavior !== 'blink') {
    const smallImg = getTerrainImg(spec.folder, spec.prefix, 'single_small');
    if (smallImg) {
      const s = a.w / smallImg.width;
      const drawH = Math.round(smallImg.height * s);
      const topY = Math.round(drawY - spec.smallWalk * s);
      ctx.drawImage(smallImg, drawX, topY, a.w, drawH);
      return;
    }
  }

  if (a.w <= 225 && !a.towerStep && !a.descentStep && a.behavior !== 'blink') {
    const medImg = getTerrainImg(spec.folder, spec.prefix, 'single_medium');
    if (medImg && a.w >= medImg.width * 0.36 && a.w <= medImg.width * 0.52) {
      const s = a.w / medImg.width;
      const drawH = Math.round(medImg.height * s);
      const topY = Math.round(drawY - spec.medWalk * s);
      ctx.drawImage(medImg, drawX, topY, a.w, drawH);
      return;
    }
  }

  const leftImg = getTerrainImg(spec.folder, spec.prefix, 'left');
  const midA = getTerrainImg(spec.folder, spec.prefix, 'middle_a');
  const midB = getTerrainImg(spec.folder, spec.prefix, 'middle_b') || midA;
  const midC = getTerrainImg(spec.folder, spec.prefix, 'middle_c') || midA;
  const rightImg = getTerrainImg(spec.folder, spec.prefix, 'right');
  if (!leftImg || !midA || !rightImg) return;

  const s = spec.thinScale;
  const topY = Math.round(drawY - spec.thinWalk * s);
  const drawH = Math.round(leftImg.height * s);
  const lw = Math.round(leftImg.width * s);
  const rw = Math.round(rightImg.width * s);

  if (a.w <= lw + rw) {
    const us = a.w / (leftImg.width + rightImg.width);
    const uTopY = Math.round(drawY - spec.thinWalk * us);
    const uH = Math.round(leftImg.height * us);
    const uLw = Math.round(leftImg.width * us);
    ctx.drawImage(leftImg, drawX, uTopY, uLw + 1, uH);
    ctx.drawImage(rightImg, drawX + uLw, uTopY, a.w - uLw, uH);
    return;
  }

  const midX1 = drawX + lw;
  const midX2 = drawX + a.w - rw;
  const midSpan = midX2 - midX1;
  const nomW = midA.width * s;
  const mids = [midA, midB, midC];

  if (midSpan >= nomW * 0.90) {
    const count = Math.max(1, Math.round(midSpan / nomW));
    const stepW = midSpan / count;
    for (let i = 0; i < count; i++) {
      const tx = Math.round(midX1 + i * stepW);
      const tw = Math.round(midX1 + (i + 1) * stepW) - tx;
      const mImg = mids[Math.floor(seededUnit(seed, i + 7) * 3) % 3];
      ctx.drawImage(mImg, tx - 1, topY, tw + 2, drawH);
    }
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(midX1 - 2, topY - 8, midSpan + 4, drawH + 16);
    ctx.clip();
    ctx.drawImage(midA, midX1 - 4, topY, Math.round(nomW), drawH);
    ctx.restore();
  }

  ctx.drawImage(leftImg, drawX, topY, lw, drawH);
  ctx.drawImage(rightImg, drawX + a.w - rw, topY, rw, drawH);
}

function drawPlatformDecorations(a, drawX, drawY) {
  if (a.customDecorations && a.customDecorations.length) {
    for (const dec of a.customDecorations) {
      const im = terrainImages[dec.key];
      if (!im) continue;
      const dx = dec.x;
      if (dx < rCam - 160 || dx > rCam + W + 160) continue;
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
    if (dx < rCam - 160 || dx > rCam + W + 160) continue;

    if (flags.some(f => Math.abs(f.x - dx) < 90)) continue;
    if (levelIndex === 1 && dx > 18480 && dx < 19120) continue;
    const g = levels[levelIndex]?.goal;
    if (g && dx > g.x - 120 && dx < g.x + g.w + 120) continue;

    const dw = Math.round(im.width * dec.scale);
    const dh = Math.round(im.height * dec.scale);
    const dy = Math.round(drawY - dec.walkOffset * dec.scale);
    ctx.drawImage(im, Math.round(dx - dw * 0.5), dy, dw, dh);
  }
}

function drawPlatform(a) {
  const drawX = Math.round((a.prevX ?? a.x) + (a.x - (a.prevX ?? a.x)) * renderAlpha);
  const drawY = Math.round((a.prevY ?? a.y) + (a.y - (a.prevY ?? a.y)) * renderAlpha);

  if (a.motion) {
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
    ctx.save();
    ctx.globalAlpha = a.blinkAlpha ?? 1;
    drawThinPlatformVisual(a, drawX, drawY);
    if (a.blinkState === 'warning') {
      ctx.strokeStyle = a.fastBlink ? '#ff6b4a' : '#ffcf4d';
      ctx.lineWidth = 3;
      ctx.strokeRect(drawX + 2, drawY - 4, a.w - 4, 24);
      ctx.fillStyle = a.fastBlink ? '#ffd8cc' : '#ffe58f';
      ctx.font = 'bold 13px "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.fastBlink ? '⚡ 고속 점멸' : '⚡ 점멸 주의', drawX + a.w * 0.5, drawY - 12);
    } else if (a.blinkState === 'off') {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#9cc5ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX + 2, drawY, a.w - 4, 18);
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

  if (a.descendHint) {
    const gx = a.descendHint === 'left' ? drawX - 24 : drawX + a.w + 24;
    const gy = drawY + 18 + Math.sin(time * 4) * 4;
    ctx.save();
    ctx.fillStyle = '#73f0df';
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(a.descendHint === 'left' ? '↙' : '↘', gx, gy);
    ctx.restore();
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
    label(a.motion.axis === 'x' ? (a.fastMoving ? '⚡ ↔' : '↔') : '↕', drawX + a.w / 2, drawY - 26);
  }
}

// Gate G1-1 & G1-3: Render Golden Crayons (`golden_crayon.png`, 42x42px) across available, pending, and secured states
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
      // Golden outer pulse aura so Golden Crayon stands out distinctly from King Candy
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
      if (sc.parentPlatformId) {
        ctx.font = 'bold 11px "Malgun Gothic", sans-serif';
        ctx.fillStyle = '#fff5cf';
        ctx.strokeStyle = '#5c3409';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText('발판 착지 획득', 0, -27);
        ctx.fillText('발판 착지 획득', 0, -27);
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
      ctx.font = 'bold 11px "Malgun Gothic", sans-serif';
      ctx.fillStyle = '#9e4c14';
      ctx.textAlign = 'center';
      ctx.fillText('안전 착지!', 0, -20);
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

function draw() {
  ctx.clearRect(0, 0, W, H);
  renderBackground();
  ctx.save();
  ctx.translate(-Math.round(rCam), -Math.round(rCamY));

  drawTowerStructures();

  for (const a of platforms) {
    if (!a.groundTile) continue;
    if (a.x + a.w < rCam - 80 || a.x > rCam + W + 80) continue;
    drawPlatform(a);
  }
  for (const a of platforms) {
    if (a.groundTile) continue;
    if (a.x + a.w < rCam - 120 || a.x > rCam + W + 120 || a.y - rCamY > H + 260 || a.y + a.h - rCamY < -260) continue;
    drawPlatform(a);
  }

  drawActors();
  drawBombs();
  if (typeof drawWindDarts === 'function') drawWindDarts();

  // Gate G1-1: Render regular collectibles using unmodified `king_candy.png` (32x32px, 1:1 aspect ratio)
  const candyImg = collectibleImages['king_candy'];
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (c.got || c.x < rCam - 40 || c.x > rCam + W + 40 || c.y - rCamY > H + 90 || c.y - rCamY < -90) continue;
    const cy = c.y + Math.sin(time * 3.2 + i * 0.7) * 3;
    ctx.save();
    ctx.translate(Math.round(c.x), Math.round(cy));
    // Soft warm backing halo for clear readability against all backgrounds
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
    if (f.x < rCam - 100 || f.x > rCam + W + 100) continue;
    line(f.x, f.y, f.x, f.y - 100, '#665d52', 4);
    ctx.fillStyle = checkpoint > i ? '#87bb90' : '#f4ce83';
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - 100);
    ctx.lineTo(f.x + 45, f.y - 90);
    ctx.lineTo(f.x, f.y - 65);
    ctx.fill();
  }
  for (const s of levels[levelIndex].signs) {
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
  const goal = levels[levelIndex].goal;
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
    ctx.fillText('엄마의 방', goal.x + goal.w / 2, goal.y - goal.h - 18);
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
  drawProtection();
  ctx.restore();
  if (state === 'night') {
    ctx.save();
    ctx.globalAlpha = Math.min(0.23, sceneElapsed * 0.15);
    ctx.fillStyle = '#101b39';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
