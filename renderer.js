'use strict';
// TEST16 Renderer:
// - Gate 1 (P0): Renders Suin Village BACKGROUND_PROP and DECORATION layers separately from COLLIDABLE_PLATFORM with optional developer QA overlay (`window.__showArtQaOverlay`).
// - Gate 4 (P0): Single Source of Truth (SSOT) panorama rendering from `levels[levelIndex].backgroundRanges` with smooth symmetric cross-fade and ZERO artificial white fog or boundary gradient boxes.
// - Gate 6 (P0): Zero non-tutorial text labels on blinking platforms, moving platforms, golden crayons, or tower sectors; communicates blink/motion states purely through visual alpha, color rim, and vibration.

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

// Gate 4 (P0): Single Source of Truth (SSOT) panorama rendering from `l.backgroundRanges[bgKey]`
function drawPanoramaByBgKey(bgKey, alpha = 1) {
  const im = worldImages[bgKey];
  if (!im) return;
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  const [bgStart, bgEnd] = (l.backgroundRanges && l.backgroundRanges[bgKey]) || [0, l.worldWidth];
  const travel = Math.max(1, bgEnd - bgStart - W);
  const progress = Math.max(0, Math.min(1, (rCam - bgStart) / travel));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = H / im.height;
  const effectiveImgW = bgKey === 'city-bg' ? 1722 : im.width;
  const sw = Math.min(effectiveImgW, Math.round(W / scale));
  const maxSx = Math.max(0, effectiveImgW - sw);
  const sx = Math.round(progress * maxSx);
  ctx.drawImage(im, sx, 0, sw, im.height, 0, 0, W, H);
  ctx.restore();
}

function renderBackground() {
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex], segments = l.segments;
  const center = rCam + W * 0.5;
  let activeIdx = segments.findIndex(s => center >= s.start && center < s.end);
  if (activeIdx < 0) activeIdx = segments.length - 1;
  const active = segments[activeIdx];

  // Unified symmetric cross-fade (halfWindow = 320px) across any segment boundary where bg changes, with ZERO artificial white fog!
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

function drawTowerStructures() {
  const curId = (typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex])?.id;
  if (curId !== 'monatium') return;
  const m = STAGE_ANCHORS.monatium;
  const backdrop = structureImages['tower_backdrop'];
  const portalArch = structureImages['tower_portal_arch'];
  const pier = structureImages['rooftop_pier'];
  const truss = structureImages['rooftop_truss'];

  // Rooftop Skybridge & Building Substructure (Gate 6: clean architectural sprites only, zero English sector boards!)
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
        for (let gx = sp.x1; gx < sp.x2; gx += 260) {
          ctx.drawImage(truss, gx, sp.y, 262, 128);
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

  // West Ascent Tower & East Descent Tower shafts (Gate 6: clean architectural portals & rails without floating text boxes)
  const shafts = [
    {
      x1: m.ascentStart + 64, x2: m.ascentEnd - 64, y1: -1945, y2: 580,
      rails: [m.ascentStart + 240, m.ascentStart + 580, m.ascentStart + 1100, m.ascentStart + 1440],
      portals: [
        { x: m.ascentStart - 8, y: 356, w: 84, h: 224 },
        { x: m.ascentEnd - 72, y: -1919, w: 84, h: 204 }
      ]
    },
    {
      x1: m.descentStart + 64, x2: m.descentEnd - 64, y1: -1937, y2: 580,
      rails: [m.descentStart + 214, m.descentStart + 559, m.descentStart + 904],
      portals: [
        { x: m.descentStart - 8, y: -1909, w: 84, h: 204 },
        { x: m.descentEnd - 72, y: 356, w: 84, h: 224 }
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
        ctx.drawImage(portalArch, pt.x, pt.y, pt.w, pt.h);
      }
    }
  }
}

// Gate G1 (P0): Material-specific wall rendering!
// - `grass` / `village`: Natural earthen cliff / mossy root barrier / grass-topped mound using forest terrain textures (ZERO steel bolts or grey metal plates!).
// - `steel`: Original Monatium `tower_wall_*` structure preserved 100% pixel-identically.
function drawStructuralWall(a, drawX, drawY) {
  const mat = a.visual?.material || a.skin || 'steel';
  if (mat === 'stone') {
    const bodyA = getTerrainImg('erpien', 'stone_', 'ground_body_a');
    const bodyB = getTerrainImg('erpien', 'stone_', 'ground_body_b') || bodyA;
    const cliffL = getTerrainImg('erpien', 'stone_', 'ground_cliff_left');
    const cliffR = getTerrainImg('erpien', 'stone_', 'ground_cliff_right');
    const topLeft = getTerrainImg('erpien', 'stone_', 'left');
    const topRight = getTerrainImg('erpien', 'stone_', 'right');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, a.w, a.h, 8);
    ctx.clip();
    ctx.fillStyle = '#6c6574';
    ctx.fillRect(drawX, drawY, a.w, a.h);
    if (bodyA) {
      const s = 0.45;
      const bw = Math.max(36, Math.round(bodyA.width * s));
      const bh = Math.max(36, Math.round(bodyA.height * s));
      for (let gy = drawY; gy < drawY + a.h; gy += bh) {
        for (let gx = drawX; gx < drawX + a.w; gx += bw) {
          ctx.drawImage(bodyA, gx, gy, bw + 2, bh + 2);
        }
      }
    }
    if (cliffL && cliffR) {
      const edgeW = Math.min(Math.round(a.w * 0.45), 26);
      const edgeH = Math.max(64, Math.round(cliffL.height * 0.42));
      for (let gy = drawY; gy < drawY + a.h; gy += edgeH - 8) {
        ctx.drawImage(cliffL, drawX - 2, gy, edgeW + 4, edgeH);
        ctx.drawImage(cliffR, drawX + a.w - edgeW - 2, gy, edgeW + 4, edgeH);
      }
    }
    ctx.strokeStyle = '#3f3947';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, a.h - 2);
    ctx.restore();
    if (topLeft && topRight) {
      const crownH = 26;
      const halfW = Math.round(a.w * 0.52);
      ctx.drawImage(topLeft, drawX - 2, drawY - 6, halfW + 2, crownH);
      ctx.drawImage(topRight, drawX + a.w - halfW, drawY - 6, halfW + 2, crownH);
    }
    return;
  }
  if (mat === 'grass' || mat === 'village') {
    const folder = mat === 'village' ? 'village' : 'forest';
    const bodyA = getTerrainImg(folder, '', 'ground_body_a');
    const bodyB = getTerrainImg(folder, '', 'ground_body_b') || bodyA;
    const cliffL = getTerrainImg(folder, '', 'ground_cliff_left');
    const cliffR = getTerrainImg(folder, '', 'ground_cliff_right');
    const topLeft = getTerrainImg(folder, '', 'left');
    const topRight = getTerrainImg(folder, '', 'right');
    const topMid = getTerrainImg(folder, '', 'middle_a');
    const bushImg = getTerrainImg('forest', '', 'decoration_bush');

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, a.w, a.h, 12);
    ctx.clip();

    // Rich earthen base fill + tiled forest soil body
    ctx.fillStyle = '#5c4430';
    ctx.fillRect(drawX, drawY, a.w, a.h);
    if (bodyA) {
      const s = 0.46;
      const bw = Math.max(36, Math.round(bodyA.width * s));
      const bh = Math.max(36, Math.round(bodyA.height * s));
      let rIdx = 0;
      for (let gy = drawY; gy < drawY + a.h; gy += bh, rIdx++) {
        let cIdx = 0;
        for (let gx = drawX; gx < drawX + a.w; gx += bw, cIdx++) {
          const pick = (rIdx + cIdx) % 2 === 0 ? bodyA : bodyB;
          ctx.drawImage(pick, gx, gy, bw + 2, bh + 2);
        }
      }
    }
    // Natural rocky/mossy cliff edges along left and right sides
    if (cliffL && cliffR) {
      const edgeW = Math.min(Math.round(a.w * 0.48), 34);
      const edgeH = Math.max(64, Math.round(cliffL.height * 0.42));
      for (let gy = drawY; gy < drawY + a.h; gy += edgeH - 8) {
        ctx.drawImage(cliffL, drawX - 2, gy, edgeW + 4, edgeH);
        ctx.drawImage(cliffR, drawX + a.w - edgeW - 2, gy, edgeW + 4, edgeH);
      }
    }
    // Soft natural earthen shading border (no dark steel rectangle)
    ctx.strokeStyle = 'rgba(54, 72, 38, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, a.h - 2);
    ctx.restore();

    // Lush grass crown aligned with collision top `drawY` so the walkable top & visual surface match!
    if (topLeft && topRight) {
      const s = 0.42;
      const crownH = Math.min(34, Math.round(topLeft.height * s));
      const topY = Math.round(drawY - 14 * s);
      const halfW = Math.round(a.w * 0.52);
      ctx.drawImage(topLeft, drawX - 2, topY, halfW + 2, crownH);
      ctx.drawImage(topRight, drawX + a.w - halfW, topY, halfW + 2, crownH);
      if (topMid && a.w > 76) {
        ctx.drawImage(topMid, drawX + Math.round(a.w * 0.25), topY, Math.round(a.w * 0.5), crownH);
      }
    }
    // Bottom mossy root / bush grounding if resting near ground
    if (bushImg && a.h <= 70) {
      const bw = Math.min(a.w + 12, 86);
      const bh = Math.round(bushImg.height * (bw / bushImg.width));
      ctx.drawImage(bushImg, Math.round(drawX + (a.w - bw) * 0.5), Math.round(drawY + a.h - bh + 4), bw, bh);
    }
    return;
  }

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

  const zoomNow = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const bottomY = Math.max(drawY + a.h, Math.ceil(rCamY + (H / zoomNow) + 80));
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

  if (a.ceiling && mat === 'stone') {
    const leftImg = getTerrainImg('erpien', 'stone_', 'left');
    const midImg = getTerrainImg('erpien', 'stone_', 'middle_a');
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
      ctx.drawImage(leftImg, drawX, drawY - 6, lw, a.h + 12);
      ctx.drawImage(rightImg, drawX + a.w - rw, drawY - 6, rw, a.h + 12);
      for (let gx = drawX + lw; gx < drawX + a.w - rw; gx += 90) {
        ctx.drawImage(midImg, gx, drawY - 6, 94, a.h + 12);
      }
    }
    ctx.strokeStyle = '#3f3947';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(drawX + 1, drawY + 1, a.w - 2, a.h - 2);
    ctx.restore();
    return;
  }
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

  if ((a.useSmallVisual || a.w <= 96 || (a.w <= 145 && !a.towerStep && !a.descentStep)) && a.behavior !== 'blink') {
    const smallImg = getTerrainImg(spec.folder, spec.prefix, 'single_small');
    if (smallImg) {
      // Gate G2 (Section 3.1): Prevent narrow 38~70px platforms from shrinking into tiny flat specks!
      // Maintain a minimum vertical thickness (minScale = 0.42 -> drawH >= 32px) so narrow perches have a clear, readable turf & root body whose width matches [drawX, drawX + a.w].
      const rawS = a.w / smallImg.width;
      const vS = Math.max(0.42, rawS);
      const drawH = Math.round(smallImg.height * vS);
      const topY = Math.round(drawY - spec.smallWalk * vS);
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

// Gate 1 (P0): Render separated stage props (`BACKGROUND_PROP` & `DECORATION`) with grounded anchorBottom
function drawStageProps(layerFilter) {
  const l = typeof getActiveLevel === 'function' ? getActiveLevel() : levels[levelIndex];
  if (!l || !l.villageProps || !l.villageProps.length) return;
  for (const fp of l.villageProps) {
    if (fp.layer !== layerFilter) continue;
    if (fp.x2 < rCam - 160 || fp.x1 > rCam + W + 160) continue;
    const im = terrainImages[fp.key];
    if (!im) continue;
    const dw = Math.round(im.width * fp.scale);
    const dh = Math.round(im.height * fp.scale);
    const dx = Math.round(fp.x - dw * 0.5);
    const dy = Math.round(fp.anchorBottom - fp.walkOffset * fp.scale);
    ctx.drawImage(im, dx, dy, dw, dh);
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
    if (l.id === 'monatium' && dx > (STAGE_ANCHORS.monatium.bukgyeongBldgX - 100) && dx < (STAGE_ANCHORS.monatium.bukgyeongBldgX + 540)) continue;
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
    ctx.setLineDash([5, 6]);
    if (a.motion.axis === 'x') {
      line(a.baseX - a.motion.range + a.w * 0.5, drawY + 10, a.baseX + a.motion.range + a.w * 0.5, drawY + 10, a.fastMoving ? '#ffbe4dc8' : '#8fe8dca8', 2.8);
    } else {
      line(drawX + a.w / 2, a.baseY - a.motion.range, drawX + a.w / 2, a.baseY + a.motion.range, '#a6e1d9', 2);
    }
    ctx.restore();
  }

  // Gate 6 (P0): Blinking platforms communicate state purely via alpha, subtle vibration, and color rim — ZERO text labels!
  if (a.behavior === 'blink') {
    if (a.silentBlink && a.blinkState === 'off') {
      // Unmarked blink platforms vanish cleanly when OFF so player never mistakes them for solid ground!
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

// Developer QA Overlay for Gate 1.4 (`window.__showArtQaOverlay = true` draws reservedFootprint, art anchorBottom, and collision tops)
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

  for (const a of platforms) {
    if (!a.groundTile) continue;
    if (a.x + a.w < rCam - 120 || a.x > rCam + viewW + 120) continue;
    drawPlatform(a);
  }
  // Gate 1: Render BACKGROUND_PROP (cottages/stalls/gates) and midground DECORATION behind floating platforms & player!
  drawStageProps('background');
  drawStageProps('midground');

  for (const a of platforms) {
    if (a.groundTile) continue;
    if (a.x + a.w < rCam - 160 || a.x > rCam + viewW + 160 || a.y - rCamY > viewH + 280 || a.y + a.h - rCamY < -280) continue;
    drawPlatform(a);
  }

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
  // Section 1-2 (P0): Render tutorial signs ONLY when in Story Mode AND active level is Suin Forest!
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
