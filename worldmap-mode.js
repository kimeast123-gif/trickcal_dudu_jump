'use strict';
// ============================================================================
// TEST31 v6: World Map 7-Card System & WORLD 1 「수인숲 나들이」 (1-1 ~ 1-5)
// - Full Upper/Lower Entry-Exit Route Graph (1-2 upper/lower -> 1-3 upper/lower -> 1-4 upper/lower)
// - Preserves entryRoute across initial spawn, pit-fall respawn, 0/5 HP reset, and R retry
// ============================================================================

const WORLDMAP_STORAGE_KEY = 'DUDU_WORLDMAP_SAVE_V1';

let worldMapScreen = 'none'; // 'none' | 'worldmapMenu' | 'world1StageSelect' | 'world1ClearModal'
let activeWorldStageIndex = 0;
let activeWorldEntryRoute = 'default'; // 'default' | 'upper' | 'lower'
let worldStageElapsed = 0;
let worldStageHitsThisRun = 0;
let worldMapStorageAvailable = true;
let _memoryWorldMapSave = null;
let _routePlayLog = [];
window.__getRoutePlayLog = () => _routePlayLog;

function makePlaceholderSvgDataUri(title, subtitle, gradStart, gradEnd, accentColor, iconText) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" width="400" height="225">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${gradStart}"/>
        <stop offset="100%" stop-color="${gradEnd}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="225" fill="url(#bg)"/>
    <circle cx="330" cy="52" r="38" fill="${accentColor}" opacity="0.22"/>
    <path d="M0 175 Q110 130 210 168 T400 150 L400 225 L0 225 Z" fill="#000000" opacity="0.28"/>
    <rect x="14" y="14" width="148" height="26" rx="13" fill="#000000" opacity="0.55"/>
    <text x="88" y="31" font-family="sans-serif" font-size="11.5" font-weight="bold" fill="#ffd89b" text-anchor="middle">임시 썸네일 · 준비 중</text>
    <text x="200" y="102" font-family="sans-serif" font-size="38" text-anchor="middle">${iconText}</text>
    <text x="200" y="142" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="200" y="166" font-family="sans-serif" font-size="12" fill="#e0e8f6" text-anchor="middle">${subtitle}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const WORLDMAP_CARDS = [
  {
    order: 0,
    id: 'story_replay',
    title: '스토리 모드 재도전',
    subtitle: '수인숲 1구간부터 25분 산책 본편 새 회차 시작',
    kind: 'story_replay',
    implementationStatus: 'playable',
    unlockCondition: 'storyClearConfirmed',
    action: 'openStoryReplay',
    thumbnail: 'assets/event/opening.png?v=31',
    fallbackThumb: makePlaceholderSvgDataUri('스토리 모드 재도전', '25분 본편 6개 맵 재시작', '#5f8d6b', '#2b4c3f', '#ffe082', '🏡'),
    statusBadge: '플레이 가능 · 25분 본편',
    isPlaceholderArt: false
  },
  {
    order: 1,
    id: 'world1_beastforest',
    title: '수인숲 나들이',
    subtitle: 'WORLD 1 · 밝은 초원과 거목 미로, 마을 귀환 (1-1 ~ 1-5)',
    kind: 'world',
    implementationStatus: 'playable',
    unlockCondition: 'storyClearConfirmed',
    action: 'openWorld1StageSelect',
    thumbnail: 'assets/world/w1-meadow-bg.webp?v=31',
    fallbackThumb: makePlaceholderSvgDataUri('수인숲 나들이', 'WORLD 1 · 1-1 ~ 1-5', '#689f38', '#33691e', '#fff59d', '🌳'),
    statusBadge: '플레이 가능 · WORLD 1',
    isPlaceholderArt: false
  },
  {
    order: 2,
    id: 'world2_spiritmountain',
    title: '정령산의 아침',
    subtitle: 'WORLD 2 · 정령산 지역 (전용 배경 아트 미제공 · 추후 업데이트)',
    kind: 'world',
    implementationStatus: 'coming_soon',
    unlockCondition: null,
    action: 'showComingSoon',
    thumbnail: makePlaceholderSvgDataUri('정령산의 아침', '전용 아트 미제공 · 추후 공개 예정', '#3a6073', '#16222a', '#a1ffce', '⛰️'),
    fallbackThumb: makePlaceholderSvgDataUri('정령산의 아침', '준비 중인 지역입니다', '#3a6073', '#16222a', '#a1ffce', '⛰️'),
    statusBadge: '준비 중',
    isPlaceholderArt: true
  },
  {
    order: 3,
    id: 'world3_monatium_night',
    title: '모나티엄의 야경',
    titleNote: '임시 썸네일(주간 city-bg 기반)',
    subtitle: 'WORLD 3 · 도심 야경 지역 (야경 전용 원본 미제공 · 추후 업데이트)',
    kind: 'world',
    implementationStatus: 'coming_soon',
    unlockCondition: null,
    action: 'showComingSoon',
    thumbnail: makePlaceholderSvgDataUri('모나티엄의 야경', '야경 전용 원본 미제공 · 임시 썸네일', '#1f2942', '#0d1326', '#74c0fc', '🌃'),
    fallbackThumb: makePlaceholderSvgDataUri('모나티엄의 야경', '준비 중인 지역입니다', '#1f2942', '#0d1326', '#74c0fc', '🌃'),
    statusBadge: '준비 중 · 임시 썸네일',
    isPlaceholderArt: true
  },
  {
    order: 4,
    id: 'world4_ghostswamp',
    title: '무시무시 유령늪',
    subtitle: 'WORLD 4 · 안개 낀 유령늪 지역 (전용 아트 미제공 · 추후 업데이트)',
    kind: 'world',
    implementationStatus: 'coming_soon',
    unlockCondition: null,
    action: 'showComingSoon',
    thumbnail: makePlaceholderSvgDataUri('무시무시 유령늪', '전용 아트 미제공 · 추후 공개 예정', '#3b2d4a', '#1b1424', '#d0bfff', '👻'),
    fallbackThumb: makePlaceholderSvgDataUri('무시무시 유령늪', '준비 중인 지역입니다', '#3b2d4a', '#1b1424', '#d0bfff', '👻'),
    statusBadge: '준비 중',
    isPlaceholderArt: true
  },
  {
    order: 5,
    id: 'world5_dragoncave',
    title: '지하로 떠나는 여정 1 — 용족동굴',
    subtitle: 'WORLD 5 · 깊은 지하 광맥과 용족동굴 (전용 아트 미제공 · 추후 업데이트)',
    kind: 'world',
    implementationStatus: 'coming_soon',
    unlockCondition: null,
    action: 'showComingSoon',
    thumbnail: makePlaceholderSvgDataUri('용족동굴', '전용 아트 미제공 · 추후 공개 예정', '#4a2c2a', '#1f1211', '#ff922b', '💎'),
    fallbackThumb: makePlaceholderSvgDataUri('용족동굴', '준비 중인 지역입니다', '#4a2c2a', '#1f1211', '#ff922b', '💎'),
    statusBadge: '준비 중',
    isPlaceholderArt: true
  },
  {
    order: 6,
    id: 'world6_witchkingdom',
    title: '지하로 떠나는 여정 2 — 마녀왕국',
    subtitle: 'WORLD 6 · 지하 세계의 마녀왕국 (전용 아트 미제공 · 추후 업데이트)',
    kind: 'world',
    implementationStatus: 'coming_soon',
    unlockCondition: null,
    action: 'showComingSoon',
    thumbnail: makePlaceholderSvgDataUri('마녀왕국', '전용 아트 미제공 · 추후 공개 예정', '#2d1e4a', '#110b22', '#f783ac', '🔮'),
    fallbackThumb: makePlaceholderSvgDataUri('마녀왕국', '준비 중인 지역입니다', '#2d1e4a', '#110b22', '#f783ac', '🔮'),
    statusBadge: '준비 중',
    isPlaceholderArt: true
  }
];
window.__WORLDMAP_CARDS = WORLDMAP_CARDS;

function makeDefaultWorldMapSave() {
  return {
    schemaVersion: 2,
    storyClearConfirmed: false,
    storyClearedAt: null,
    storyClearKind: null,
    worlds: {
      world1_beastforest: {
        regionCleared: false,
        stages: {
          '1-1': { unlocked: true,  cleared: false, bestSeconds: null, retries: 0, hits: 0, collectibles: [], lastEntryRoute: 'default', lastExitRoute: null },
          '1-2': { unlocked: false, cleared: false, bestSeconds: null, retries: 0, hits: 0, collectibles: [], lastEntryRoute: 'default', lastExitRoute: null },
          '1-3': { unlocked: false, cleared: false, bestSeconds: null, retries: 0, hits: 0, collectibles: [], lastEntryRoute: 'lower',   lastExitRoute: null },
          '1-4': { unlocked: false, cleared: false, bestSeconds: null, retries: 0, hits: 0, collectibles: [], lastEntryRoute: 'lower',   lastExitRoute: null },
          '1-5': { unlocked: false, cleared: false, bestSeconds: null, retries: 0, hits: 0, collectibles: [], lastEntryRoute: 'default', lastExitRoute: null }
        }
      }
    }
  };
}

function normalizeWorldMapSave(raw) {
  const base = makeDefaultWorldMapSave();
  if (!raw || typeof raw !== 'object') return base;
  base.storyClearConfirmed = Boolean(raw.storyClearConfirmed);
  base.storyClearedAt = raw.storyClearedAt || null;
  base.storyClearKind = raw.storyClearKind || null;
  const w1 = raw.worlds && raw.worlds.world1_beastforest;
  if (w1 && typeof w1 === 'object') {
    base.worlds.world1_beastforest.regionCleared = Boolean(w1.regionCleared);
    if (w1.stages && typeof w1.stages === 'object') {
      for (const k of ['1-1', '1-2', '1-3', '1-4', '1-5']) {
        const st = w1.stages[k];
        if (st && typeof st === 'object') {
          const defRoute = (k === '1-3' || k === '1-4') ? 'lower' : 'default';
          base.worlds.world1_beastforest.stages[k] = {
            unlocked: k === '1-1' ? true : Boolean(st.unlocked),
            cleared: Boolean(st.cleared),
            bestSeconds: (typeof st.bestSeconds === 'number' && Number.isFinite(st.bestSeconds)) ? st.bestSeconds : null,
            retries: Math.max(0, parseInt(st.retries || 0, 10) || 0),
            hits: Math.max(0, parseInt(st.hits || 0, 10) || 0),
            collectibles: Array.isArray(st.collectibles) ? Array.from(new Set(st.collectibles)) : [],
            lastEntryRoute: ['upper', 'lower', 'default'].includes(st.lastEntryRoute) ? st.lastEntryRoute : defRoute,
            lastExitRoute: ['upper', 'lower', 'default'].includes(st.lastExitRoute) ? st.lastExitRoute : null
          };
        }
      }
    }
  }
  return base;
}

function loadWorldMapSave() {
  if (_memoryWorldMapSave) return _memoryWorldMapSave;
  try {
    const rawStr = window.localStorage.getItem(WORLDMAP_STORAGE_KEY);
    worldMapStorageAvailable = true;
    if (!rawStr) {
      _memoryWorldMapSave = makeDefaultWorldMapSave();
      return _memoryWorldMapSave;
    }
    _memoryWorldMapSave = normalizeWorldMapSave(JSON.parse(rawStr));
    return _memoryWorldMapSave;
  } catch (err) {
    worldMapStorageAvailable = false;
    if (!_memoryWorldMapSave) _memoryWorldMapSave = makeDefaultWorldMapSave();
    return _memoryWorldMapSave;
  }
}

function saveWorldMapData(data) {
  _memoryWorldMapSave = normalizeWorldMapSave(data);
  try {
    window.localStorage.setItem(WORLDMAP_STORAGE_KEY, JSON.stringify(_memoryWorldMapSave));
    worldMapStorageAvailable = true;
    return true;
  } catch (err) {
    worldMapStorageAvailable = false;
    if (typeof notify === 'function') {
      notify('브라우저 저장소 제한으로 현재 세션 동안만 월드맵 기록이 임시 유지됩니다.');
    }
    return false;
  }
}

function confirmStoryGoalClearForWorldMap(clearKind = 'success') {
  if (!['success', 'candy', 'special'].includes(clearKind)) return false;
  const save = loadWorldMapSave();
  save.storyClearConfirmed = true;
  save.storyClearedAt = new Date().toISOString();
  save.storyClearKind = clearKind;
  save.worlds.world1_beastforest.stages['1-1'].unlocked = true;
  saveWorldMapData(save);
  syncWorldMapEntryButtons();
  return true;
}
window.confirmStoryGoalClearForWorldMap = confirmStoryGoalClearForWorldMap;

function isWorldMapUnlocked() {
  return Boolean(loadWorldMapSave().storyClearConfirmed);
}
window.isWorldMapUnlocked = isWorldMapUnlocked;

// ============================================================================
// Tentacle Hazard System (v6 Section D: Visual & Hitbox Aligned)
// ============================================================================
const TENTACLE_META = {
  frames: 41,
  fps: 30,
  cols: 8,
  cellSize: 256,
  anchorX: 128,
  footY: 242,
  displaySize: 116,
  halfWidth: 15,
  height: 68
};
window.__TENTACLE_META = TENTACLE_META;

let world1Tentacles = [];
let world1Collectibles = [];
let world1NpcSlots = [];
window.__world1Tentacles = () => world1Tentacles;
window.__world1Collectibles = () => world1Collectibles;
window.__world1NpcSlots = () => world1NpcSlots;

function syncWorld1Tentacles(dt) {
  hazardClock += dt;
  for (let i = 0; i < world1Tentacles.length; i++) {
    const t = world1Tentacles[i];
    t.anim += dt;
    if (t.parentPlatform) {
      const pl = t.parentPlatform;
      t.x = pl.x + t.offsetX;
      t.y = pl.y + t.offsetY;
      t.active = (pl.collidable !== false && pl.blinkState !== 'off' && !pl.hidden);
    } else {
      t.x = t.baseX;
      t.y = t.baseY;
      t.active = true;
    }

    if (!t.active) continue;
    if (p.invulnerable > 0) continue;

    const pLeft = p.x - 16, pRight = p.x + 16;
    const pTop = p.y - 56, pBot = p.y - 2;
    const tLeft = t.x - t.halfW, tRight = t.x + t.halfW;
    const tTop = t.y - t.hitH, tBot = t.y - 4;

    if (pRight >= tLeft && pLeft <= tRight && pBot >= tTop && pTop <= tBot) {
      applyStunHit(t.x, 'world1_tentacle', '앗! 가시 촉수에 찔렸어요! (체력 -1)');
    }
  }
}

function updateWorld1Collectibles() {
  if (gameMode !== 'world' || !world1Collectibles.length) return;
  const save = loadWorldMapSave();
  const stg = world1Stages[activeWorldStageIndex];
  const stgRec = save.worlds.world1_beastforest.stages[stg.stageCode];
  for (const col of world1Collectibles) {
    if (col.state === 'collected') continue;
    if (Math.abs(p.x - col.x) < 32 && Math.abs((p.y - 30) - col.y) < 40) {
      col.state = 'collected';
      if (stgRec && !stgRec.collectibles.includes(col.id)) {
        stgRec.collectibles.push(col.id);
        saveWorldMapData(save);
      }
      if (typeof burst === 'function') burst(col.x, col.y, '#ffd43b', 14);
      if (typeof tone === 'function') tone(880, 0.12, 'triangle', 0.05);
      if (typeof playDuduVoice === 'function') playDuduVoice('special_coin');
      if (typeof updateHud === 'function') updateHud();
    }
  }
}

// TEST31.4: Only the SIX newly supplied World 1-5 NPCs receive individual size corrections.
// Existing Diana / Butter / Kommy use their unmodified story NPC display size.
// Sizes refer to the full 256x256 sprite-frame dimension; transparent margins differ by character.
const WORLD1_NEW_NPC_DISPLAY_SIZE = Object.freeze({
  rufo: 126,
  tig_hero: 132,
  beni: 124,
  momo: 126,
  bana: 128,
  ran: 130
});
function getWorld1NpcDisplaySize(npc, meta) {
  const configured = WORLD1_NEW_NPC_DISPLAY_SIZE[npc.kind];
  return configured !== undefined ? configured : (meta.display || 150);
}

// World 1-5 independent friendly NPC behavior. Story NPCs remain untouched.
function updateWorld1Friends(dt) {
  if (typeof gameMode === 'undefined' || gameMode !== 'world' || world1Stages[activeWorldStageIndex]?.stageCode !== '1-5') return;
  for (const f of world1NpcSlots) {
    const isClose = Math.abs(p.x - f.x) <= (f.interactionRadius || 165) &&
                    Math.abs(p.y - f.feetY) <= (f.heightTolerance || 116);
    if (isClose !== !!f.near) {
      f.near = isClose;
      f.anim = 0;
      f.clip = isClose ? f.happyClip : f.idleClip;
    } else {
      f.anim = (f.anim || 0) + dt;
    }
    if (isClose && Math.abs(p.x-f.x)>12) f.face = p.x<f.x ? -1 : 1;
    else if (!isClose) f.face = f.facing || -1;
  }
}
window.updateWorld1Friends = updateWorld1Friends;

function drawWorld1Friends() {
  if (typeof gameMode === 'undefined' || gameMode !== 'world' || world1Stages[activeWorldStageIndex]?.stageCode !== '1-5') return;
  const viewW = W / ((typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1);
  let nearest = null;
  let nearestDistance = Infinity;
  for (const f of world1NpcSlots) {
    if (f.x < rCam-180 || f.x > rCam+viewW+180) continue;
    const clip = f.clip || f.idleClip;
    const key = `${f.kind}_${clip}`;
    const m = npcMeta[key], im = npcImages[key];
    if (m && im && im.complete && im.naturalWidth > 0) {
      const frameIndex = Math.floor((f.anim || 0) * m.fps) % m.frames;
      const sourceX = (frameIndex % m.cols) * 256;
      const sourceY = Math.floor(frameIndex / m.cols) * 256;
      const size = getWorld1NpcDisplaySize(f, m);
      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.feetY));
      ctx.scale(-(f.face || -1), 1);
      ctx.drawImage(im, sourceX, sourceY, 256, 256,
                    -Math.round((m.anchor / 256) * size),
                    -Math.round((m.foot / 256) * size), size, size);
      ctx.restore();
    }
    if (f.near && f.dialogue) {
      const d = Math.abs(p.x - f.x);
      if (d < nearestDistance) { nearest = f; nearestDistance = d; }
    }
  }
  if (nearest && typeof drawFriendlySpeechBubble === 'function') {
    const m = npcMeta[`${nearest.kind}_${nearest.clip || nearest.idleClip}`] || {};
    const size = getWorld1NpcDisplaySize(nearest, m);
    drawFriendlySpeechBubble(nearest.dialogue, nearest.x,
      nearest.feetY - size * 0.94, '#fff8e7', nearest.name);
  }
}
window.drawWorld1Friends = drawWorld1Friends;

function drawWorld1TentaclesAndSlots() {
  if (typeof gameMode === 'undefined' || gameMode !== 'world') return;
  const zoom = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
  const viewW = W / zoom;
  const viewH = H / zoom;
  const tentIm = npcImages['tentacle_idle'];

  // 1. Draw Thorny Tentacles (clean natural root shadow + sprite, zero artificial rings)
  for (let i = 0; i < world1Tentacles.length; i++) {
    const t = world1Tentacles[i];
    if (!t.active) continue;
    if (t.x < rCam - 120 || t.x > rCam + viewW + 120 || t.y - rCamY > viewH + 140 || t.y - rCamY < -140) continue;

    ctx.save();
    ctx.fillStyle = 'rgba(28, 20, 16, 0.34)';
    ctx.beginPath();
    ctx.ellipse(Math.round(t.x), Math.round(t.y + 1), t.halfW + 5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (tentIm && tentIm.complete && tentIm.naturalWidth > 0) {
      const f = Math.floor((t.anim * TENTACLE_META.fps + i * 5) % TENTACLE_META.frames);
      const sx = (f % TENTACLE_META.cols) * 256;
      const sy = Math.floor(f / TENTACLE_META.cols) * 256;
      const sz = TENTACLE_META.displaySize;
      const dx = Math.round(t.x - (TENTACLE_META.anchorX / 256) * sz);
      const dy = Math.round(t.y - (TENTACLE_META.footY / 256) * sz);
      ctx.drawImage(tentIm, sx, sy, 256, 256, dx, dy, sz, sz);
    } else {
      ctx.fillStyle = '#671b7a';
      ctx.beginPath();
      ctx.moveTo(t.x - 12, t.y);
      ctx.quadraticCurveTo(t.x - 18, t.y - t.hitH * 0.6, t.x + 4, t.y - t.hitH);
      ctx.quadraticCurveTo(t.x + 16, t.y - t.hitH * 0.5, t.x + 12, t.y);
      ctx.closePath();
      ctx.fill();
    }

    if (window.__showArtQaOverlay || (typeof debugMetrics !== 'undefined' && debugMetrics.enabled)) {
      ctx.strokeStyle = '#ff2b5e';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(t.x - t.halfW), Math.round(t.y - t.hitH), t.halfW * 2, t.hitH - 4);
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t.id, Math.round(t.x), Math.round(t.y - t.hitH - 6));
    }
    ctx.restore();
  }

  // 2. World1 golden crayons — official sprite, independent of story's 12.
  const crayonImg = (typeof collectibleImages !== 'undefined') ? collectibleImages['golden_crayon'] : null;
  for (let i = 0; i < world1Collectibles.length; i++) {
    const col = world1Collectibles[i];
    if (col.state === 'collected' || col.x < rCam - 90 || col.x > rCam + viewW + 90) continue;
    const bob = Math.sin(time * 4.0 + i) * 4;
    ctx.save();
    ctx.translate(Math.round(col.x), Math.round(col.y + bob));
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    grad.addColorStop(0, 'rgba(255, 229, 115, .65)');
    grad.addColorStop(1, 'rgba(255, 215, 70, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();
    if (crayonImg && crayonImg.complete && crayonImg.naturalWidth > 0) {
      ctx.drawImage(crayonImg, -18, -18, 36, 36);
    } else {
      ctx.fillStyle = '#e6b83f'; ctx.fillRect(-6, -17, 12, 34);
    }
    ctx.restore();
  }

  // 3. Draw the 1-5 friendly NPC sprites and nearest dialogue (no tutorial overlays).
  drawWorld1Friends();

  // 4. NPC placement metadata only in developer QA overlay
  if ((window.__showArtQaOverlay || (typeof debugMetrics !== 'undefined' && debugMetrics.enabled)) && world1NpcSlots.length) {
    for (const slot of world1NpcSlots) {
      if (slot.x < rCam - 160 || slot.x > rCam + viewW + 160) continue;
      ctx.save();
      ctx.strokeStyle = '#70e000';
      ctx.fillStyle = 'rgba(112, 224, 0, 0.16)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(Math.round(slot.x - 24), Math.round(slot.feetY - 96), 48, 96);
      ctx.fillRect(Math.round(slot.x - 24), Math.round(slot.feetY - 96), 48, 96);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(Math.round(slot.x), Math.round(slot.feetY), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 32, 24, 0.88)';
      ctx.beginPath();
      ctx.roundRect(Math.round(slot.x - 74), Math.round(slot.feetY - 134), 148, 32, 6);
      ctx.fill();
      ctx.fillStyle = '#b5f562';
      ctx.font = 'bold 11px "Malgun Gothic", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${slot.name} [${slot.id}]`, Math.round(slot.x), Math.round(slot.feetY - 120));
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(`(${slot.x}, ${slot.feetY}) idle/happy`, Math.round(slot.x), Math.round(slot.feetY - 107));
      ctx.restore();
    }
  }
}
window.drawWorld1TentaclesAndSlots = drawWorld1TentaclesAndSlots;

// ============================================================================
// Stage Builder Helpers & World 1 (1-1 ~ 1-5) Definitions
// ============================================================================
function makeWorldStage(spec) {
  return {
    id: spec.id,
    stageCode: spec.stageCode,
    name: spec.name,
    subtitle: spec.subtitle,
    worldWidth: spec.worldWidth,
    killY: spec.killY || 920,
    minCamY: spec.minCamY ?? -1100,
    maxCamY: spec.maxCamY ?? 220,
    cameraProfile: spec.cameraProfile || 'world1_standard',
    segments: spec.segments,
    backgroundRanges: spec.backgroundRanges,
    entrySpawns: spec.entrySpawns || { default: { route: 'default', platformId: null, x: 180, feetY: 520 } },
    platforms: [],
    tentacleDefs: [],
    collectibleDefs: [],
    npcSlots: [],
    sections: [],
    villageProps: spec.villageProps || [],
    decorFootprints: spec.decorFootprints || [],
    goal: spec.goal,
    alternateGoals: spec.alternateGoals || []
  };
}

function wSurface(stg, x, y, w, skin = 'grass', extra = {}) {
  const obj = {
    x, y, w, h: 20, thin: true, skin,
    visual: { material: skin, seed: Math.abs((x * 31 + y * 17) | 0) + 101 },
    ...extra
  };
  stg.platforms.push(obj);
  return obj;
}

function wFloor(stg, x, w, skin = 'grass', y = 580, extra = {}) {
  const obj = {
    x, y, w, h: 260, thin: false, groundTile: true, skin,
    visual: { material: skin, seed: Math.abs((x * 23 + y * 13) | 0) + 307 },
    ...extra
  };
  stg.platforms.push(obj);
  return obj;
}

function wWall(stg, x, y, w, h, skin = 'wood', extra = {}) {
  const obj = {
    x, y, w, h, thin: false, wall: true, skin,
    noTopLand: extra.noTopLand ?? Boolean(extra.ceiling),
    visual: { material: skin, seed: Math.abs((x * 19 + y * 29) | 0) + 503 },
    ...extra
  };
  stg.platforms.push(obj);
  return obj;
}

function wTentacle(stg, id, x, y, parentPlatformId = null, sourceSketchRef = '', notes = '') {
  stg.tentacleDefs.push({
    id, x, y, parentPlatformId,
    sourceSketchRef: sourceSketchRef || `${stg.stageCode} 가시 촉수`,
    notes: notes || '고정형 가시 촉수 (1회 접촉 체력 -1)'
  });
}

function wCheckpoint(stg, title, x, y, hint = '') {
  stg.sections.push({ title, x, y, hint, flagX: x });
}

function buildWorld1Stages() {
  const stages = [];

  // --------------------------------------------------------------------------
  // STAGE 1-1: 밝은 숲의 첫 시험 (`02_원본손그림_5장/W1_1-1_손그림.png` — 6,800px wide)
  // - [v7 Photo 01]: W1-S1-GND-START right cliff rendered with continuous full-height cliff edge (zero rectangular cutout).
  // - [v7 Photo 02]: W1-S1-WALL-DIAG1~6 completely deleted (both visual diagonalBeam and all 6 colliders removed).
  // - [v7 Photo 03]: W1-S1-B05 (`y=290`) & W1-S1-GND-MID (`y=500`) + world1_standard camera deadzone `[210, 350]`
  //   so standing on B05 or P05-MID shows GND-MID clearly in the same screen without pressing ArrowDown.
  // - [v7 Photo 04]: W1-S1-GND-STEP1~4 (`stepChainId: 'W1-S1-FINAL-STEPS'`) rendered as a single connected stepped earth silhouette.
  // --------------------------------------------------------------------------
  const s1 = makeWorldStage({
    id: 'world1_1',
    stageCode: '1-1',
    name: '1-1 밝은 숲의 첫 시험',
    subtitle: '초원 출발 → 스위치백 상승 → 수직 이동 3연속 → 점멸 계단 & 복귀 루트 → 4단 연결 계단 및 거목 입구',
    worldWidth: 6800,
    killY: 920,
    minCamY: -650,
    maxCamY: 180,
    entrySpawns: {
      default: { route: 'default', platformId: 'W1-S1-GND-START', x: 180, feetY: 580 }
    },
    segments: [
      { start: 0, end: 2700, bg: 'w1-meadow-bg' },
      { start: 2700, end: 6800, bg: 'w1-forest-bg' }
    ],
    backgroundRanges: {
      'w1-meadow-bg': [0, 3200, 0.00, 1.00],
      'w1-forest-bg': [2200, 6800, 0.00, 1.00]
    },
    goal: { id: 's1-goal', exitRoute: 'default', x: 6680, y: 260, w: 96, h: 136, label: '' }
  });

  wFloor(s1, 0, 640, 'grass', 580, { id: 'W1-S1-GND-START', sourceSketchRef: '1-1 좌측 시작 지면(0..151)', pathGroup: 'main', requiredMovement: 'walk', notes: '출발 안전 지면 (외부 절벽 하단 자연 마감)' });
  wCheckpoint(s1, '1-1 초원 출발', 180, 580, '');

  wSurface(s1, 800, 470, 130, 'grass', { id: 'W1-S1-P01', useSmallVisual: true, sourceSketchRef: '1-1 초반 1번째 작은 검은 고정 발판(186,499)', pathGroup: 'main', requiredMovement: '1-jump' });
  wSurface(s1, 1130, 360, 130, 'grass', { id: 'W1-S1-P02', useSmallVisual: true, sourceSketchRef: '1-1 초반 2번째 우측 작은 검은 고정 발판(273,459)', pathGroup: 'main', requiredMovement: '1-jump' });
  wSurface(s1, 870, 220, 185, 'grass', {
    id: 'W1-S1-B01', behavior: 'blink',
    blink: { on: 2.45, warning: 0.55, off: 0.80, phase: 0.00 },
    sourceSketchRef: '1-1 초반 P01 위쪽 회색 점멸 발판(207,396)', pathGroup: 'main', requiredMovement: '2-jump-switchback'
  });
  wSurface(s1, 1320, 120, 480, 'grass', { id: 'W1-S1-P03', sourceSketchRef: '1-1 상단 긴 고정 발판(324..435,354)', pathGroup: 'main', requiredMovement: '2-jump' });
  wTentacle(s1, 'W1-S1-THORN-01A', 1525, 120, 'W1-S1-P03', '1-1 상단 긴 고정 발판 중앙 촉수 군집 좌(cx=374)', '좌측 205px 안전 착지 공간');
  wTentacle(s1, 'W1-S1-THORN-01B', 1585, 120, 'W1-S1-P03', '1-1 상단 긴 고정 발판 중앙 촉수 군집 우(cx=386)', '우측 215px 안전 도움닫기 공간');

  // 3 Vertical Moving Platforms
  wSurface(s1, 2000, 175, 180, 'grass', {
    id: 'W1-S1-V01', behavior: 'moving',
    motion: { axis: 'y', range: 180, period: 3.50, phase: 0.00 },
    trackY1: -5, trackY2: 355,
    sourceSketchRef: '1-1 중앙 수직 이동 플랫폼 1번(x=468..517)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });
  wSurface(s1, 2340, 210, 190, 'grass', {
    id: 'W1-S1-V02', behavior: 'moving',
    motion: { axis: 'y', range: 190, period: 3.60, phase: 1.60 },
    trackY1: 20, trackY2: 400,
    sourceSketchRef: '1-1 중앙 수직 이동 플랫폼 2번(x=534..586, 중앙 촉수 포함)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });
  wTentacle(s1, 'W1-S1-THORN-02', 2435, 210, 'W1-S1-V02', '1-1 중앙 2번째 수직 이동 발판 위 빨간 촉수(cx=559)', '수직 이동 플랫폼 dy 동기화·좌우 각 95px 안전');

  wSurface(s1, 2690, 165, 180, 'grass', {
    id: 'W1-S1-V03', behavior: 'moving',
    motion: { axis: 'y', range: 185, period: 3.50, phase: 3.10 },
    trackY1: -20, trackY2: 350,
    sourceSketchRef: '1-1 중앙 수직 이동 플랫폼 3번(x=608..660)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });

  // Blinking Staircase (`W1-S1-WALL-DIAG1~6` completely deleted per v7 §2.1 & §3.1)
  wSurface(s1, 3020, 125, 170, 'grass', {
    id: 'W1-S1-B02', behavior: 'blink',
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 0.20 },
    sourceSketchRef: '1-1 수직발판 우측 1번째 회색 점멸 발판(687,355)', pathGroup: 'upper_climb', requiredMovement: '1-jump'
  });
  wSurface(s1, 3330, 20, 165, 'grass', {
    id: 'W1-S1-B03', behavior: 'blink',
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 0.80 },
    sourceSketchRef: '1-1 2번째 회색 점멸 발판(764,306)', pathGroup: 'upper_climb', requiredMovement: '2-jump'
  });
  wSurface(s1, 3640, -70, 165, 'grass', {
    id: 'W1-S1-B04', behavior: 'blink',
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 1.40 },
    sourceSketchRef: '1-1 상단 3번째 회색 점멸 발판(827,266)', pathGroup: 'upper_climb', requiredMovement: '2-jump'
  });

  // Upper Long Fixed Platform + Horizontal Under-Barrier (`x = 3940 .. 4460, y = -135`)
  wSurface(s1, 3940, -135, 520, 'grass', { id: 'W1-S1-P04-UPPER', dropThroughDisabled: true, sourceSketchRef: '1-1 우상단 긴 검은 고정 발판(889..1034,234)', pathGroup: 'upper_climb', requiredMovement: 'walk' });
  wWall(s1, 3940, -115, 520, 34, 'wood', { id: 'W1-S1-WALL-UPPER-UNDER', ceiling: true, noTopLand: true, sourceSketchRef: '1-1 우상단 고정 발판 하부 막이층', pathGroup: 'barrier', requiredMovement: 'block' });
  wCheckpoint(s1, '1-1 숲속 상부 고지대', 4060, -135, '');

  // Lower-Middle Return Route (`P05-MID -> B05 -> GND-MID`, calibrated so GND-MID is visible in 1 screen from B05 without ArrowDown!)
  wSurface(s1, 3530, 285, 170, 'grass', {
    id: 'W1-S1-B05', behavior: 'blink',
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 0.60 },
    sourceSketchRef: '1-1 복귀 구간 좌측 하단 회색 점멸 발판(806,450)', pathGroup: 'lower_recovery', requiredMovement: '1-jump'
  });
  wSurface(s1, 3940, 155, 520, 'grass', { id: 'W1-S1-P05-MID', dropThroughDisabled: true, sourceSketchRef: '1-1 중단 긴 검은 고정 발판(900..1040,408)', pathGroup: 'lower_recovery', requiredMovement: '1-jump' });
  wWall(s1, 3940, 175, 520, 34, 'wood', { id: 'W1-S1-WALL-MID-UNDER', ceiling: true, noTopLand: true, sourceSketchRef: '1-1 중단 고정 발판 하부 막이층(900..1040,417)', pathGroup: 'barrier', requiredMovement: 'block' });
  wFloor(s1, 3880, 860, 'grass', 500, { id: 'W1-S1-GND-MID', sourceSketchRef: '1-1 중앙 하단 사각 안전 지면(878..1042,532)', pathGroup: 'lower_recovery', requiredMovement: 'walk' });

  // 4th Vertical Lift (`W1-S1-V04`) + Tall Vertical Control Wall (`W1-S1-WALL-TALL`)
  wSurface(s1, 4620, 20, 210, 'grass', {
    id: 'W1-S1-V04', behavior: 'moving',
    motion: { axis: 'y', range: 200, period: 3.60, phase: 0.80 },
    trackY1: -180, trackY2: 220,
    sourceSketchRef: '1-1 우측 수직 이동 플랫폼 4번(1064..1141,281)', pathGroup: 'main', requiredMovement: 'switchback-descent'
  });
  wWall(s1, 4910, -900, 52, 1145, 'wood', {
    id: 'W1-S1-WALL-TALL', noTopLand: true,
    sourceSketchRef: '1-1 우측 상공~중하단 수직 갈색 통제벽(1154..1168, 0..475)',
    pathGroup: 'barrier', requiredMovement: 'pass-underneath-from-gnd-mid',
    notes: 'V04 우측 지름길 차단(y=-900..245) 및 하단 안전 지면(GND-MID, y=500) 경유 통과'
  });

  // Final 4-Step Connected Staircase (`W1-S1-GND-STEP1~4`, `stepChainId: 'W1-S1-FINAL-STEPS'`)
  wFloor(s1, 5080, 560, 'grass', 500, { id: 'W1-S1-GND-STEP1', stepChainId: 'W1-S1-FINAL-STEPS', sourceSketchRef: '1-1 우측 계단형 지면 1단(1201..1373,532 · 촉수 1)', pathGroup: 'main', requiredMovement: '2-jump-or-dash' });
  wCheckpoint(s1, '1-1 거목 입구 계단', 5180, 500, '');
  wTentacle(s1, 'W1-S1-THORN-03', 5380, 500, 'W1-S1-GND-STEP1', '1-1 우측 계단 1단 빨간 촉수(cx=1252)', '좌측 300px · 우측 260px 안전 구간 확보');

  wFloor(s1, 5640, 440, 'grass', 420, { id: 'W1-S1-GND-STEP2', stepChainId: 'W1-S1-FINAL-STEPS', sourceSketchRef: '1-1 우측 계단형 지면 2단(1382..1435,489 · 촉수 2)', pathGroup: 'main', requiredMovement: '1-jump' });
  wTentacle(s1, 'W1-S1-THORN-04', 5860, 420, 'W1-S1-GND-STEP2', '1-1 우측 계단 2단 빨간 촉수(cx=1404)', '좌우 각 220px 안전 착지·도움닫기 폭 확보');

  wFloor(s1, 6080, 320, 'grass', 340, { id: 'W1-S1-GND-STEP3', stepChainId: 'W1-S1-FINAL-STEPS', sourceSketchRef: '1-1 우측 계단형 지면 3단(1444..1487,443 · 안전 단차)', pathGroup: 'main', requiredMovement: '1-jump' });
  wFloor(s1, 6400, 400, 'grass', 260, { id: 'W1-S1-GND-STEP4', stepChainId: 'W1-S1-FINAL-STEPS', sourceSketchRef: '1-1 우측 계단형 지면 4단(1494..1558,399 · 촉수 3 및 고목 출구)', pathGroup: 'main', requiredMovement: '1-jump' });
  wTentacle(s1, 'W1-S1-THORN-05', 6540, 260, 'W1-S1-GND-STEP4', '1-1 우측 계단 4단 빨간 촉수(cx=1528)', '좌측 140px 안전 착지 후 점프해 6680 골 도달');

  s1.collectibleDefs.push({
    id: 'W1-S1-SPEC-01', stageCode: '1-1', label: '황금 크레파스 (1-1 상단)',
    x: 4160, y: -180, parentPlatformId: 'W1-S1-P04-UPPER',
    sourceSketchRef: '1-1 상부 고지대 보상', notes: '상단 경로 진입 보상'
  });
  stages.push(s1);

  // --------------------------------------------------------------------------
  // STAGE 1-2: 거목의 갈림길 (`02_원본손그림_5장/W1_1-2_손그림.png` — Redesigned across 6,600px, 7 Spatial Blocks A~G)
  // - [v7 Photo 05 & 06, §2.5 & §4]:
  //   * Block A (좌측 진입): GND-START + unified L-structure (`WALL-ENTRY` + `L1-VERT` + `L1-HORIZ`) + 3 non-overlapping stepping stones (`STEP-1..3`: 76px, 84px, 96px).
  //   * Block B (상단 전반): `UP-P01` (340px) -> 3 gray blink platforms (`UP-B01..03`: 130px) -> `UP-P02` (280px) in clean horizontal aerial flow.
  //   * Block C (상단 후반): 7 precision fixed perches (`UP-S01..03`: 64px, `UP-S04`: 165px, `UP-S05..07`: 64px) at `y = -410..-430`.
  //   * Block D (하단 전반): Unified column+shelf (`WALL-LOW-L` + `LOW-P01`), 2 blink platforms (`LOW-B01..02`), recovery perch (`LOW-P02`), and unified inverted-L (`LOW-L2-HORIZ` + `LOW-L2-VERT`).
  //   * Block E (하단 중반): Middle shelf + barrier wall (`LOW-P03` + `WALL-MID`), bottom floor (`LOW-BOTTOM`), 3 small recovery steps (`LOW-STEP1..3`: 68px), and safe platform (`LOW-P04`).
  //   * Block F (하단 후반): 3 vertical moving platforms (`LOW-V01..03`) with generous 390px spacing.
  //   * Block G (상·하 출구): `LOW-P05` + 3 descending blink platforms (`LOW-B03..05`) -> `GND-EXIT` (`lower-exit` at 6380,460) and `UP-EXIT` (`upper-exit` at 5540,-430).
  // --------------------------------------------------------------------------
  const s2 = makeWorldStage({
    id: 'world1_2',
    stageCode: '1-2',
    name: '1-2 거목의 갈림길',
    subtitle: '오래된 거목 내부 — 상단 정밀 7발판 수평 루트(상단 출구→1-3 상단) vs 하단 미로·리프트 루트(하단 출구→1-3 하단)',
    worldWidth: 6600,
    killY: 980,
    minCamY: -860,
    maxCamY: 260,
    entrySpawns: {
      default: { route: 'default', platformId: 'W1-S2-GND-START', x: 160, feetY: 480 }
    },
    segments: [
      { start: 0, end: 6600, bg: 'w1-tree-interior-placeholder', indoor: true }
    ],
    backgroundRanges: {
      'w1-tree-interior-placeholder': [0, 6600, 0.00, 1.00]
    },
    goal: { id: 'lower-exit', exitRoute: 'lower', x: 6380, y: 460, w: 96, h: 136, label: '' },
    alternateGoals: [
      { id: 'upper-exit', exitRoute: 'upper', x: 5540, y: -430, w: 96, h: 136, label: '' }
    ]
  });

  // [Block A] 좌측 진입 (`x = 0 .. 1086`)
  wFloor(s2, 0, 440, 'grass', 480, { id: 'W1-S2-GND-START', sourceSketchRef: '1-2 블록A: 좌측 입구 시작 지면(0..128,487)', pathGroup: 'entry', requiredMovement: 'walk' });
  wCheckpoint(s2, '1-2 거목 내부 입구', 160, 480, '');

  wWall(s2, 440, -540, 72, 480, 'wood', { id: 'W1-S2-WALL-ENTRY', noTopLand: true, joinBottomWall: true, sourceSketchRef: '1-2 블록A: 좌측 상단 갈색 수직 통제벽(111,114..281)', pathGroup: 'barrier', requiredMovement: 'block' });
  wWall(s2, 440, -60, 72, 180, 'grass', { id: 'W1-S2-L1-VERT', noTopLand: false, sourceSketchRef: '1-2 블록A: 좌측 ㄴ자 구조 수직 기둥(111..139,267..353)', pathGroup: 'entry', requiredMovement: '2-jump' });
  wSurface(s2, 440, 120, 290, 'grass', { id: 'W1-S2-L1-HORIZ', dropThroughDisabled: true, sourceSketchRef: '1-2 블록A: 좌측 ㄴ자 구조 수평 발판(116..184,326)', pathGroup: 'entry', requiredMovement: '1-jump' });

  wSurface(s2, 580, 385, 76, 'grass', { id: 'W1-S2-STEP-1', sourceSketchRef: '1-2 블록A: 도입부 좌하단 소형 발판 1(105,430)', pathGroup: 'entry', requiredMovement: '1-jump' });
  wSurface(s2, 780, 285, 84, 'grass', { id: 'W1-S2-STEP-2', sourceSketchRef: '1-2 블록A: 도입부 중단 발판 2(164,410)', pathGroup: 'entry', requiredMovement: '1-jump' });
  wSurface(s2, 990, 185, 96, 'grass', { id: 'W1-S2-STEP-3', sourceSketchRef: '1-2 블록A: 도입부 상·하 분기 발판 3(224,367)', pathGroup: 'entry', requiredMovement: '1-jump' });

  // [Block B] 상단 전반: 장형 고정 발판 → 회색 점멸 3개 → 상단 안정 발판 (`x = 720 .. 2320, y = -190 .. -330`)
  wSurface(s2, 720, -80, 340, 'grass', { id: 'W1-S2-UP-P01', sourceSketchRef: '1-2 블록B: 좌상단 큰 고정 발판(172..265,209)', pathGroup: 'upper', requiredMovement: '2-jump' });
  wSurface(s2, 1200, -255, 130, 'grass', {
    id: 'W1-S2-UP-B01', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.40, warning: 0.55, off: 0.80, phase: 0.00 },
    sourceSketchRef: '1-2 블록B: 상단 루트 회색 점멸 1번(286,183)', pathGroup: 'upper', requiredMovement: '1-jump'
  });
  wSurface(s2, 1480, -280, 130, 'grass', {
    id: 'W1-S2-UP-B02', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.40, warning: 0.55, off: 0.80, phase: 0.55 },
    sourceSketchRef: '1-2 블록B: 상단 루트 회색 점멸 2번(354,181)', pathGroup: 'upper', requiredMovement: '1-jump'
  });
  wSurface(s2, 1760, -305, 130, 'grass', {
    id: 'W1-S2-UP-B03', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.40, warning: 0.55, off: 0.80, phase: 1.10 },
    sourceSketchRef: '1-2 블록B: 상단 루트 회색 점멸 3번(425,181)', pathGroup: 'upper', requiredMovement: '1-jump'
  });
  wSurface(s2, 2040, -330, 280, 'grass', { id: 'W1-S2-UP-P02', sourceSketchRef: '1-2 블록B: 중앙 상단 점멸 직후 안정 발판(490..556,194)', pathGroup: 'upper', requiredMovement: '1-jump' });

  // [Block C] 상단 후반: 짧은 정밀 고정 발판 7개 수평 연속 구간 (`3 small 64px + 1 medium 165px + 3 small 64px`, `x = 2500 .. 5700, y = -410 .. -430`)
  const s2UpperSmall = [
    { id: 'W1-S2-UP-S01', x: 2500, y: -410, w: 64,  ref: '1-2 블록C: 우상단 소형 정밀 발판 1번(587,132)' },
    { id: 'W1-S2-UP-S02', x: 2810, y: -420, w: 64,  ref: '1-2 블록C: 우상단 소형 정밀 발판 2번(686,130)' },
    { id: 'W1-S2-UP-S03', x: 3120, y: -425, w: 64,  ref: '1-2 블록C: 우상단 소형 정밀 발판 3번(782,127)' },
    { id: 'W1-S2-UP-S04', x: 3430, y: -425, w: 165, ref: '1-2 블록C: 우상단 중형 쉼터 발판 4번(936..984,125)' },
    { id: 'W1-S2-UP-S05', x: 3840, y: -425, w: 64,  ref: '1-2 블록C: 우상단 소형 정밀 발판 5번(1072,128)' },
    { id: 'W1-S2-UP-S06', x: 4150, y: -430, w: 64,  ref: '1-2 블록C: 우상단 소형 정밀 발판 6번(1167,126)' },
    { id: 'W1-S2-UP-S07', x: 4460, y: -430, w: 64,  ref: '1-2 블록C: 우상단 소형 정밀 발판 7번(1270,123)' }
  ];
  for (const sp of s2UpperSmall) {
    wSurface(s2, sp.x, sp.y, sp.w, 'grass', {
      id: sp.id, useSmallVisual: sp.w >= 117 && sp.w <= 184,
      sourceSketchRef: sp.ref, pathGroup: 'upper', requiredMovement: 'precision-jump'
    });
  }
  wSurface(s2, 4780, -430, 920, 'grass', { id: 'W1-S2-UP-EXIT', sourceSketchRef: '1-2 블록G: 우상단 긴 고정 출구 발판(1430..1558,119)', pathGroup: 'upper', requiredMovement: '2-jump' });

  // [Block D] 하단 전반: 점멸·짧은 플랫폼·ㄴ자/역ㄱ자 지형 (`x = 1212 .. 2010`)
  wWall(s2, 1220, 345, 64, 560, 'wood', { id: 'W1-S2-WALL-LOW-L', noTopLand: true, underShelfCap: true, sourceSketchRef: '1-2 블록D: 좌하단 수직 갈색 막이 기둥(299,434..579)', pathGroup: 'barrier', requiredMovement: 'block' });
  wSurface(s2, 1212, 340, 260, 'grass', { id: 'W1-S2-LOW-P01', dropThroughDisabled: true, sourceSketchRef: '1-2 블록D: 좌하단 갈색 기둥 상단 일체형 발판(305..380,433)', pathGroup: 'lower', requiredMovement: '1-jump' });

  wSurface(s2, 1560, 220, 125, 'grass', {
    id: 'W1-S2-LOW-B01', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.30 },
    sourceSketchRef: '1-2 블록D: 좌하단 회색 점멸 1번(389,373)', pathGroup: 'lower', requiredMovement: '1-jump'
  });
  wSurface(s2, 1820, 135, 125, 'grass', {
    id: 'W1-S2-LOW-B02', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.90 },
    sourceSketchRef: '1-2 블록D: 좌하단 회색 점멸 2번(458,338)', pathGroup: 'lower', requiredMovement: '1-jump'
  });

  wSurface(s2, 1520, 585, 125, 'grass', { id: 'W1-S2-LOW-P02', useSmallVisual: true, sourceSketchRef: '1-2 블록D: 하단 저층 복귀 보조 발판(384,557)', pathGroup: 'lower_recovery', requiredMovement: 'walk' });
  wWall(s2, 1934, 305, 76, 160, 'grass', { id: 'W1-S2-LOW-L2-VERT', noTopLand: false, sourceSketchRef: '1-2 블록D: 중앙 하단 역ㄱ자(ㅢ) 구조 수직부(484..511,434..518)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wSurface(s2, 1720, 465, 290, 'grass', { id: 'W1-S2-LOW-L2-HORIZ', dropThroughDisabled: true, sourceSketchRef: '1-2 블록D: 중앙 하단 역ㄱ자(ㅢ) 구조 수평부(438..507,499)', pathGroup: 'lower', requiredMovement: '1-jump' });

  // [Block E] 하단 중반: 막이 벽과 복귀 계단, 중간 안전지대 (`x = 2120 .. 3440`)
  wWall(s2, 2410, -110, 60, 290, 'wood', { id: 'W1-S2-WALL-MID', noTopLand: true, joinBottomPlat: true, sourceSketchRef: '1-2 블록E: 중앙 상·하 경로 분리 갈색 수직벽(613,259..389)', pathGroup: 'barrier', requiredMovement: 'block' });
  wSurface(s2, 2140, 175, 330, 'grass', { id: 'W1-S2-LOW-P03', dropThroughDisabled: true, sourceSketchRef: '1-2 블록E: 중앙 갈색 벽 좌측 일체형 고정 발판(533..619,367)', pathGroup: 'lower', requiredMovement: '1-jump' });

  wSurface(s2, 2120, 670, 520, 'grass', { id: 'W1-S2-LOW-BOTTOM', sourceSketchRef: '1-2 블록E: 최하단 긴 복구 고정 발판(497..629,592)', pathGroup: 'lower_recovery', requiredMovement: 'fall-recovery' });
  wSurface(s2, 2720, 555, 68, 'grass', { id: 'W1-S2-LOW-STEP1', sourceSketchRef: '1-2 블록E: 하단 복귀 소형 계단 1번(618,543)', pathGroup: 'lower_recovery', requiredMovement: '1-jump' });
  wSurface(s2, 2860, 440, 68, 'grass', { id: 'W1-S2-LOW-STEP2', sourceSketchRef: '1-2 블록E: 하단 복귀 소형 계단 2번(640,482)', pathGroup: 'lower_recovery', requiredMovement: '1-jump' });
  wSurface(s2, 3000, 325, 68, 'grass', { id: 'W1-S2-LOW-STEP3', sourceSketchRef: '1-2 블록E: 하단 복귀 소형 계단 3번(659,422)', pathGroup: 'lower_recovery', requiredMovement: '1-jump' });

  wSurface(s2, 3140, 225, 300, 'grass', { id: 'W1-S2-LOW-P04', sourceSketchRef: '1-2 블록E: 중간 안전지대 고정 발판(708..791,378)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wCheckpoint(s2, '1-2 거목 중앙 통로', 3260, 225, '');

  // [Block F] 하단 후반: 수직 이동 플랫폼군 3기 (`x = 3620 .. 4565`)
  wSurface(s2, 3620, 130, 165, 'grass', {
    id: 'W1-S2-LOW-V01', behavior: 'moving', useSmallVisual: true,
    motion: { axis: 'y', range: 165, period: 3.40, phase: 0.00 },
    trackY1: -35, trackY2: 295,
    sourceSketchRef: '1-2 블록F: 우중앙 수직 이동 플랫폼 1번(807..860)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });
  wSurface(s2, 4010, 245, 165, 'grass', {
    id: 'W1-S2-LOW-V02', behavior: 'moving', useSmallVisual: true,
    motion: { axis: 'y', range: 165, period: 3.40, phase: 1.70 },
    trackY1: 80, trackY2: 410,
    sourceSketchRef: '1-2 블록F: 우중앙 수직 이동 플랫폼 2번(891..944)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });
  wSurface(s2, 4400, 130, 165, 'grass', {
    id: 'W1-S2-LOW-V03', behavior: 'moving', useSmallVisual: true,
    motion: { axis: 'y', range: 165, period: 3.40, phase: 3.40 },
    trackY1: -35, trackY2: 295,
    sourceSketchRef: '1-2 블록F: 우중앙 수직 이동 플랫폼 3번(967..1017)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });

  // [Block G] 우측 하단 점멸 하강 3개 및 상·하 독립 출구 (`x = 4740 .. 6600`)
  wSurface(s2, 4740, 205, 250, 'grass', { id: 'W1-S2-LOW-P05', sourceSketchRef: '1-2 블록G: 수직 이동 직후 고정 발판(1051..1124,381)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wSurface(s2, 5140, 135, 145, 'grass', {
    id: 'W1-S2-LOW-B03', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 0.20 },
    sourceSketchRef: '1-2 블록G: 우측 하단 회색 점멸 1번(1159..1226,342)', pathGroup: 'lower', requiredMovement: '1-jump'
  });
  wSurface(s2, 5440, 235, 145, 'grass', {
    id: 'W1-S2-LOW-B04', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 0.80 },
    sourceSketchRef: '1-2 블록G: 우측 하단 회색 점멸 2번(1258..1316,379)', pathGroup: 'lower', requiredMovement: '1-jump'
  });
  wSurface(s2, 5740, 345, 145, 'grass', {
    id: 'W1-S2-LOW-B05', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.30, warning: 0.55, off: 0.85, phase: 1.40 },
    sourceSketchRef: '1-2 블록G: 우측 하단 회색 점멸 3번(1354..1411,429)', pathGroup: 'lower', requiredMovement: '1-jump'
  });

  wFloor(s2, 6040, 560, 'grass', 460, { id: 'W1-S2-GND-EXIT', sourceSketchRef: '1-2 블록G: 우측 하단 출구 지면(1443..1558,485)', pathGroup: 'lower_exit', requiredMovement: 'walk' });
  wCheckpoint(s2, '1-2 거목 출구 앞', 6120, 460, '');

  s2.collectibleDefs.push({
    id: 'W1-S2-SPEC-01', stageCode: '1-2', label: '황금 크레파스 (1-2 상단)',
    x: 5330, y: -475, parentPlatformId: 'W1-S2-UP-EXIT',
    sourceSketchRef: '1-2 상단 갈림길 보상', notes: '상부 루트 이용 보상'
  });
  stages.push(s2);

  // --------------------------------------------------------------------------
  // STAGE 1-3: 깊은 숲의 갈림길 (`02_원본손그림_5장/W1_1-3_손그림.png` — 7,000px wide)
  // - [v7 §5.1]: Upper precision perches resized from uniform 95~100px to Challenge-1-caliber 48~60px on small dots
  //   and 135~145px on medium rest bars, with 1:1 physical-to-visual width matching and zero sprite distortion.
  // --------------------------------------------------------------------------
  const s3 = makeWorldStage({
    id: 'world1_3',
    stageCode: '1-3',
    name: '1-3 깊은 숲의 갈림길',
    subtitle: '상층 정밀 협폭 발판(48~60px · 특수 수집물 · 상단 출구→1-4 상단) vs 하층 점멸·촉수·리프트 루트(하단 출구→1-4 하단)',
    worldWidth: 7000,
    killY: 920,
    minCamY: -960,
    maxCamY: 220,
    entrySpawns: {
      default: { route: 'lower', platformId: 'W1-S3-GND-START', x: 160, feetY: 480 },
      lower:   { route: 'lower', platformId: 'W1-S3-GND-START', x: 160, feetY: 480 },
      upper:   { route: 'upper', platformId: 'W1-S3-UP-START',  x: 140, feetY: -430 }
    },
    segments: [
      { start: 0, end: 7000, bg: 'w1-deep-forest-bg' }
    ],
    backgroundRanges: {
      'w1-deep-forest-bg': [0, 7000, 0.00, 1.00]
    },
    goal: { id: 'lower-exit', exitRoute: 'lower', x: 6820, y: 520, w: 96, h: 136, label: '' },
    alternateGoals: [
      { id: 'upper-exit', exitRoute: 'upper', x: 6560, y: -490, w: 96, h: 136, label: '' }
    ]
  });

  wFloor(s3, 0, 480, 'grass', 480, { id: 'W1-S3-GND-START', sourceSketchRef: '1-3 좌측 하단 시작 지면(0..79,491)', pathGroup: 'entry', requiredMovement: 'walk' });
  wCheckpoint(s3, '1-3 깊은 숲 갈림길', 160, 480, '');

  // Left switchback climb steps up to Upper Precision Route launch ledge (y = -430)
  wSurface(s3, 330, 330, 110, 'grass', { id: 'W1-S3-ENTRY-S1', sourceSketchRef: '1-3 좌측 상층 진입 발판 1', pathGroup: 'entry_climb', requiredMovement: '2-jump' });
  wSurface(s3, 120, 180, 110, 'grass', { id: 'W1-S3-ENTRY-S2', sourceSketchRef: '1-3 좌측 상층 진입 발판 2', pathGroup: 'entry_climb', requiredMovement: '2-jump' });
  wSurface(s3, 330, 25, 110, 'grass', { id: 'W1-S3-ENTRY-S3', sourceSketchRef: '1-3 좌측 상층 진입 발판 3', pathGroup: 'entry_climb', requiredMovement: '2-jump' });
  wSurface(s3, 120, -130, 110, 'grass', { id: 'W1-S3-ENTRY-S4', sourceSketchRef: '1-3 좌측 상층 진입 발판 4', pathGroup: 'entry_climb', requiredMovement: '2-jump' });
  wSurface(s3, 330, -285, 110, 'grass', { id: 'W1-S3-ENTRY-S5', sourceSketchRef: '1-3 좌측 상층 진입 발판 5', pathGroup: 'entry_climb', requiredMovement: '2-jump' });
  wSurface(s3, 0, -430, 260, 'grass', { id: 'W1-S3-UP-START', sourceSketchRef: '1-3 좌상단 상층 루트 출발 플랫폼(0..76,117)', pathGroup: 'upper', requiredMovement: '2-jump' });

  // [v7 §5.1]: Upper Precision Route (`48~60px` on small dots, `135~145px` on medium bars from `W1_1-3_손그림.png`)
  const s3UpperPerches = [
    { id: 'W1-S3-UP-P01',  x: 420,  y: -470, w: 58,  ref: '1-3 상단 정밀 소형 발판 1번(141,95 · 100→58px)' },
    { id: 'W1-S3-UP-P02',  x: 690,  y: -410, w: 58,  ref: '1-3 상단 정밀 소형 발판 2번(257,139 · 100→58px)' },
    { id: 'W1-S3-UP-P03',  x: 950,  y: -505, w: 54,  ref: '1-3 상단 정밀 소형 발판 3번(348,48 · 100→54px)' },
    { id: 'W1-S3-UP-P04',  x: 1220, y: -460, w: 56,  ref: '1-3 상단 정밀 소형 발판 4번(396,93 · 100→56px)' },
    { id: 'W1-S3-UP-P05',  x: 1500, y: -535, w: 135, ref: '1-3 상단 중형 쉼터 발판 5번(465..505,60 · 180→135px)' },
    { id: 'W1-S3-UP-P06',  x: 1860, y: -550, w: 48,  ref: '1-3 상단 정밀 초협폭 발판 6번(570,60 · 95→48px)' },
    { id: 'W1-S3-UP-P06B', x: 2130, y: -525, w: 52,  ref: '1-3 상단 정밀 소형 발판 6B(95→52px)' },
    { id: 'W1-S3-UP-P07',  x: 2410, y: -500, w: 135, ref: '1-3 상단 중형 쉼터 발판 7번(731..777,81 · 180→135px)' },
    { id: 'W1-S3-UP-P08',  x: 2770, y: -580, w: 48,  ref: '1-3 상단 정밀 초협폭 발판 8번(838,42 · 95→48px)' },
    { id: 'W1-S3-UP-P09',  x: 3050, y: -495, w: 52,  ref: '1-3 상단 정밀 소형 발판 9번(910,86 · 95→52px)' },
    { id: 'W1-S3-UP-P10',  x: 3330, y: -415, w: 54,  ref: '1-3 상단 정밀 소형 발판 10번(982,127 · 100→54px)' },
    { id: 'W1-S3-UP-P10B', x: 3610, y: -465, w: 56,  ref: '1-3 상단 정밀 소형 발판 10B(100→56px)' },
    { id: 'W1-S3-UP-P11',  x: 3900, y: -515, w: 140, ref: '1-3 상단 천장 진입 중형 발판 11번(1040..1094,79 · 200→140px)' },
    { id: 'W1-S3-UP-P12',  x: 4270, y: -595, w: 145, ref: '1-3 상단 갈색 천장 아래 중형 발판 12번(1132..1182,39 · 195→145px)' },
    { id: 'W1-S3-UP-P13',  x: 4650, y: -595, w: 145, ref: '1-3 상단 갈색 천장 아래 중형 발판 13번(1227..1273,39 · 195→145px)' },
    { id: 'W1-S3-UP-P14',  x: 5030, y: -595, w: 145, ref: '1-3 상단 갈색 천장 아래 중형 발판 14번(1314..1364,40 · 특수자원 · 200→145px)' },
    { id: 'W1-S3-UP-P15',  x: 5410, y: -545, w: 58,  ref: '1-3 상단 출구 연결 소형 발판 15번(105→58px)' },
    { id: 'W1-S3-UP-P16',  x: 5700, y: -515, w: 58,  ref: '1-3 상단 출구 연결 소형 발판 16번(105→58px)' }
  ];
  for (const sp of s3UpperPerches) {
    wSurface(s3, sp.x, sp.y, sp.w, 'grass', {
      id: sp.id, useSmallVisual: sp.w >= 117 && sp.w <= 184,
      sourceSketchRef: sp.ref, pathGroup: 'upper', requiredMovement: 'precision-jump'
    });
  }
  wWall(s3, 3900, -820, 1320, 44, 'wood', {
    id: 'W1-S3-WALL-CEIL', ceiling: true, noTopLand: true,
    sourceSketchRef: '1-3 우상단 갈색 천장 막이 벽(1022..1375, 0..11)', pathGroup: 'barrier', requiredMovement: 'block'
  });
  wSurface(s3, 6000, -490, 740, 'grass', { id: 'W1-S3-UP-EXIT', sourceSketchRef: '1-3 우상단 출구 연결 긴 고정 발판(1421..1558,87)', pathGroup: 'upper', requiredMovement: '1-jump' });

  // World 1 Special Collectible #1 on W1-S3-UP-P14
  s3.collectibleDefs.push({
    id: 'W1-S3-SPEC-01',
    stageCode: '1-3',
    label: '황금 크레파스 (1-3 상단)',
    x: 5102,
    y: -635,
    parentPlatformId: 'W1-S3-UP-P14',
    sourceSketchRef: '1-3 상단 정밀 루트 후반 보상 지점',
    notes: '상단 정밀 루트 완주 보상 (추락 시 하층 루트로 진행하며 기회비용 발생)'
  });

  // --- Stage 1-3 LOWER ROUTE ---
  wSurface(s3, 580, 465, 210, 'grass', {
    id: 'W1-S3-LOW-B01', behavior: 'blink',
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.00 },
    sourceSketchRef: '1-3 하단 도입부 회색 점멸 1번(134..190,485)', pathGroup: 'lower', requiredMovement: '1-jump'
  });
  wSurface(s3, 980, 430, 210, 'grass', {
    id: 'W1-S3-LOW-B02', behavior: 'blink',
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.60 },
    sourceSketchRef: '1-3 하단 도입부 회색 점멸 2번(237..293,470)', pathGroup: 'lower', requiredMovement: '1-jump'
  });
  wSurface(s3, 1380, 390, 210, 'grass', {
    id: 'W1-S3-LOW-B03', behavior: 'blink',
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 1.20 },
    sourceSketchRef: '1-3 하단 도입부 회색 점멸 3번(345..394,453)', pathGroup: 'lower', requiredMovement: '1-jump'
  });

  wSurface(s3, 1780, 395, 520, 'grass', { id: 'W1-S3-LOW-P01', sourceSketchRef: '1-3 하단 양끝 촉수 2개 고정 발판(435..543,455)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wTentacle(s3, 'W1-S3-THORN-01', 1835, 395, 'W1-S3-LOW-P01', '1-3 하단 P01 좌측 끝 빨간 촉수(cx=447)', '중앙 안전 착지 공간 410px');
  wTentacle(s3, 'W1-S3-THORN-02', 2245, 395, 'W1-S3-LOW-P01', '1-3 하단 P01 우측 끝 빨간 촉수(cx=532)', '중앙 안전 착지 공간 410px');

  wSurface(s3, 2500, 450, 440, 'grass', { id: 'W1-S3-LOW-P02', sourceSketchRef: '1-3 하단 중앙 촉수 1개 고정 발판(615..699,479)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wTentacle(s3, 'W1-S3-THORN-03', 2720, 450, 'W1-S3-LOW-P02', '1-3 하단 P02 중앙 빨간 촉수(cx=657)', '좌우 각 220px 안전 착지');

  wSurface(s3, 3140, 520, 560, 'grass', { id: 'W1-S3-LOW-P03', sourceSketchRef: '1-3 하단 양끝 촉수 2개 긴 고정 발판(747..878,507)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wCheckpoint(s3, '1-3 깊은 숲 하단 중반', 3420, 520, '');
  wTentacle(s3, 'W1-S3-THORN-04', 3195, 520, 'W1-S3-LOW-P03', '1-3 하단 P03 좌측 끝 빨간 촉수(cx=765)', '중앙 안전 구역 450px');
  wTentacle(s3, 'W1-S3-THORN-05', 3645, 520, 'W1-S3-LOW-P03', '1-3 하단 P03 우측 끝 빨간 촉수(cx=868)', '중앙 안전 구역 450px');

  wSurface(s3, 3920, 345, 380, 'grass', { id: 'W1-S3-LOW-P04', sourceSketchRef: '1-3 하단 수직구간 직전 중앙 촉수 고정 발판(907..985,435)', pathGroup: 'lower', requiredMovement: '2-jump' });
  wTentacle(s3, 'W1-S3-THORN-06', 4110, 345, 'W1-S3-LOW-P04', '1-3 하단 P04 중앙 빨간 촉수(cx=944)', '좌우 각 190px 안전 착지');

  wSurface(s3, 4500, 260, 210, 'grass', {
    id: 'W1-S3-LOW-V01', behavior: 'moving',
    motion: { axis: 'y', range: 195, period: 3.30, phase: 0.00 },
    trackY1: 65, trackY2: 455,
    sourceSketchRef: '1-3 하단 후반 수직 이동 플랫폼 1번(1020..1082)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });
  wSurface(s3, 4910, 380, 220, 'grass', {
    id: 'W1-S3-LOW-V02', behavior: 'moving',
    motion: { axis: 'y', range: 190, period: 3.30, phase: 1.30 },
    trackY1: 190, trackY2: 570,
    sourceSketchRef: '1-3 하단 후반 수직 이동 플랫폼 2번(1101..1160 · 중앙 촉수)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });
  wTentacle(s3, 'W1-S3-THORN-07', 5020, 380, 'W1-S3-LOW-V02', '1-3 하단 수직 이동 2번 위 빨간 촉수(cx=1130)', '수직 이동 동기화·좌우 각 110px 안전');

  wSurface(s3, 5330, 250, 210, 'grass', {
    id: 'W1-S3-LOW-V03', behavior: 'moving',
    motion: { axis: 'y', range: 195, period: 3.30, phase: 2.60 },
    trackY1: 55, trackY2: 445,
    sourceSketchRef: '1-3 하단 후반 수직 이동 플랫폼 3번(1186..1239)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });
  wSurface(s3, 5740, 380, 220, 'grass', {
    id: 'W1-S3-LOW-V04', behavior: 'moving',
    motion: { axis: 'y', range: 190, period: 3.30, phase: 3.90 },
    trackY1: 190, trackY2: 570,
    sourceSketchRef: '1-3 하단 후반 수직 이동 플랫폼 4번(1280..1335 · 중앙 촉수)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });
  wTentacle(s3, 'W1-S3-THORN-08', 5850, 380, 'W1-S3-LOW-V04', '1-3 하단 수직 이동 4번 위 빨간 촉수(cx=1307)', '수직 이동 동기화·좌우 각 110px 안전');

  wSurface(s3, 6150, 240, 210, 'grass', {
    id: 'W1-S3-LOW-V05', behavior: 'moving',
    motion: { axis: 'y', range: 195, period: 3.30, phase: 5.20 },
    trackY1: 45, trackY2: 435,
    sourceSketchRef: '1-3 하단 후반 수직 이동 플랫폼 5번(1345..1401)', pathGroup: 'lower', requiredMovement: 'timing-jump'
  });

  wFloor(s3, 6480, 520, 'grass', 520, { id: 'W1-S3-GND-EXIT', sourceSketchRef: '1-3 우측 하단 출구 지면(1453..1558,506)', pathGroup: 'lower_exit', requiredMovement: 'walk' });

  stages.push(s3);

  // --------------------------------------------------------------------------
  // STAGE 1-4: 숲의 끝자락 (`02_원본손그림_5장/W1_1-4_손그림.png` — 7,200px wide)
  // - [v7 §5.1]: Upper small platforms resized to 58~84px (`45~85px` target).
  // - [v7 §5.2 & Photo 07]: Final jump redesigned so 2-jump alone CANNOT reach:
  //   * `W1-S4-FINAL-LAUNCH`: `x=5880, y=45, w=68` (right edge `x=5948`)
  //   * `W1-S4-FINAL-LAND`: `x=6515, y=5, w=64` (edge-to-edge gap = `567px`, climb `dy = -40px`, width = `64px`)
  //   * `W1-S4-FINAL-EXIT`: `x=6710, y=5, w=490` (goal at `x=7040, y=5`)
  // --------------------------------------------------------------------------
  const s4 = makeWorldStage({
    id: 'world1_4',
    stageCode: '1-4',
    name: '1-4 숲의 끝자락',
    subtitle: '상·하단 진입 합류 · 어두운 숲→밝은 초지 단일 전환 · 최종 2단 점프 + 공중 대시 필수 도약(567px · 폭 64px)',
    worldWidth: 7200,
    killY: 920,
    minCamY: -760,
    maxCamY: 200,
    entrySpawns: {
      default: { route: 'lower', platformId: 'W1-S4-GND-START', x: 160, feetY: 520 },
      lower:   { route: 'lower', platformId: 'W1-S4-GND-START', x: 160, feetY: 520 },
      upper:   { route: 'upper', platformId: 'W1-S4-UP-START',  x: 180, feetY: -360 }
    },
    segments: [
      { start: 0, end: 7200, bg: 'w1-forest-exit-bg' }
    ],
    backgroundRanges: {
      'w1-forest-exit-bg': [0, 7200, 0.00, 1.00]
    },
    goal: { id: 's4-goal', exitRoute: 'default', x: 7040, y: 5, w: 96, h: 136, label: '' }
  });

  wFloor(s4, 0, 520, 'grass', 520, { id: 'W1-S4-GND-START', sourceSketchRef: '1-4 좌측 하단 출발 지면(0..123,490)', pathGroup: 'entry_lower', requiredMovement: 'walk' });
  wCheckpoint(s4, '1-4 숲의 끝자락 출발', 160, 520, '');

  // Left Dual-Branch Converging Steps (`y = -360 -> 60` and `y = 520 -> 60`)
  wSurface(s4, 0, -360, 420, 'grass', { id: 'W1-S4-UP-START', sourceSketchRef: '1-4 좌상단 상부 출발 발판(0..112,115)', pathGroup: 'entry_upper', requiredMovement: 'walk' });
  wSurface(s4, 600, -260, 135, 'grass', { id: 'W1-S4-UP-S1', useSmallVisual: true, sourceSketchRef: '1-4 좌상단 하강 계단 1번(142..194,150)', pathGroup: 'entry_upper', requiredMovement: '1-jump' });
  wSurface(s4, 920, -160, 135, 'grass', { id: 'W1-S4-UP-S2', useSmallVisual: true, sourceSketchRef: '1-4 좌상단 하강 계단 2번(208..260,189)', pathGroup: 'entry_upper', requiredMovement: '1-jump' });
  wSurface(s4, 1240, -60, 140, 'grass', { id: 'W1-S4-UP-S3', useSmallVisual: true, sourceSketchRef: '1-4 좌상단 하강 계단 3번(278..332,229)', pathGroup: 'entry_upper', requiredMovement: '1-jump' });

  wSurface(s4, 590, 415, 145, 'grass', { id: 'W1-S4-LOW-S1', useSmallVisual: true, sourceSketchRef: '1-4 좌하단 상승 계단 1번(127..200,451)', pathGroup: 'entry_lower', requiredMovement: '1-jump' });
  wSurface(s4, 920, 320, 140, 'grass', { id: 'W1-S4-LOW-S2', useSmallVisual: true, sourceSketchRef: '1-4 좌하단 상승 계단 2번(209..263,420)', pathGroup: 'entry_lower', requiredMovement: '1-jump' });
  wSurface(s4, 1240, 225, 140, 'grass', { id: 'W1-S4-LOW-S3', useSmallVisual: true, sourceSketchRef: '1-4 좌하단 상승 계단 3번(276..337,386)', pathGroup: 'entry_lower', requiredMovement: '1-jump' });

  wSurface(s4, 1560, 60, 360, 'grass', { id: 'W1-S4-HUB-P01', sourceSketchRef: '1-4 좌측 2갈래 합류 중앙 고정 발판(340..437,304)', pathGroup: 'main', requiredMovement: '2-jump' });

  wSurface(s4, 2100, -70, 155, 'grass', {
    id: 'W1-S4-V01', behavior: 'moving', useSmallVisual: true,
    motion: { axis: 'y', range: 175, period: 3.20, phase: 0.00 },
    trackY1: -245, trackY2: 105,
    sourceSketchRef: '1-4 전반 수직 이동 플랫폼 1번(462..497)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });
  wSurface(s4, 2380, 10, 155, 'grass', {
    id: 'W1-S4-V02', behavior: 'moving', useSmallVisual: true,
    motion: { axis: 'y', range: 175, period: 3.20, phase: 1.20 },
    trackY1: -165, trackY2: 185,
    sourceSketchRef: '1-4 전반 수직 이동 플랫폼 2번(517..556)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });
  wSurface(s4, 2660, 95, 155, 'grass', {
    id: 'W1-S4-V03', behavior: 'moving', useSmallVisual: true,
    motion: { axis: 'y', range: 175, period: 3.20, phase: 2.40 },
    trackY1: -80, trackY2: 270,
    sourceSketchRef: '1-4 전반 수직 이동 플랫폼 3번(578..618)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });

  wSurface(s4, 2980, 50, 360, 'grass', { id: 'W1-S4-MID-P01', sourceSketchRef: '1-4 중앙 양끝 촉수 2개 고정 발판(643..729,287)', pathGroup: 'main', requiredMovement: '1-jump' });
  wCheckpoint(s4, '1-4 중앙 촉수·점멸 갈림길', 3160, 50, '');
  wTentacle(s4, 'W1-S4-THORN-01', 3030, 50, 'W1-S4-MID-P01', '1-4 중앙 P01 좌측 끝 빨간 촉수(cx=652)', '중앙 안전 구역 260px');
  wTentacle(s4, 'W1-S4-THORN-02', 3290, 50, 'W1-S4-MID-P01', '1-4 중앙 P01 우측 끝 빨간 촉수(cx=719)', '중앙 안전 구역 260px');

  wSurface(s4, 3500, 155, 240, 'grass', { id: 'W1-S4-LOW-P02', sourceSketchRef: '1-4 중앙 하단 촉수 고정 발판 2번(751..811,333)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wTentacle(s4, 'W1-S4-THORN-03', 3620, 155, 'W1-S4-LOW-P02', '1-4 하단 P02 중앙 빨간 촉수(cx=781)', '좌우 각 120px 착지 가능');

  wSurface(s4, 3880, 245, 280, 'grass', { id: 'W1-S4-LOW-P03', sourceSketchRef: '1-4 중앙 하단 촉수 고정 발판 3번(814..886,389)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wTentacle(s4, 'W1-S4-THORN-04', 4020, 245, 'W1-S4-LOW-P03', '1-4 하단 P03 중앙 빨간 촉수(cx=851)', '좌우 각 140px 착지 가능');

  wSurface(s4, 4300, 190, 240, 'grass', { id: 'W1-S4-LOW-P04', sourceSketchRef: '1-4 중앙 하단 좌측 끝 촉수 고정 발판 4번(916..973,358)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wTentacle(s4, 'W1-S4-THORN-05', 4345, 190, 'W1-S4-LOW-P04', '1-4 하단 P04 좌측 끝 빨간 촉수(cx=925)', '우측 195px 안전 착지');

  wSurface(s4, 4660, 175, 260, 'grass', { id: 'W1-S4-LOW-P05', sourceSketchRef: '1-4 중앙 하단 촉수 고정 발판 5번(1006..1085,383)', pathGroup: 'lower', requiredMovement: '1-jump' });
  wTentacle(s4, 'W1-S4-THORN-06', 4790, 175, 'W1-S4-LOW-P05', '1-4 하단 P05 중앙 빨간 촉수(cx=1037)', '좌우 각 130px 착지 가능');

  // [v7 §5.1]: Upper Small Precision Platforms (`58~84px` per table in §5.1)
  wSurface(s4, 3520, -105, 82, 'grass', { id: 'W1-S4-UP-P01', sourceSketchRef: '1-4 중앙 상단 진입 소형 발판(757..806,233 · 200→82px)', pathGroup: 'upper', requiredMovement: '2-jump' });
  wSurface(s4, 3840, -215, 68, 'grass', {
    id: 'W1-S4-UP-B01', behavior: 'blink',
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.00 },
    sourceSketchRef: '1-4 중앙 상단 소형 회색 점멸 1번(818..858,183 · 165→68px)', pathGroup: 'upper', requiredMovement: '1-jump'
  });
  wSurface(s4, 4140, -265, 58, 'grass', {
    id: 'W1-S4-UP-B02', behavior: 'blink',
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.60 },
    sourceSketchRef: '1-4 중앙 상단 소형 회색 점멸 2번(898..931,162 · 155→58px)', pathGroup: 'upper', requiredMovement: '1-jump'
  });
  wSurface(s4, 4430, -220, 68, 'grass', {
    id: 'W1-S4-UP-B03', behavior: 'blink',
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 1.20 },
    sourceSketchRef: '1-4 중앙 상단 소형 회색 점멸 3번(966..1009,181 · 165→68px)', pathGroup: 'upper', requiredMovement: '1-jump'
  });
  wSurface(s4, 4720, -165, 84, 'grass', { id: 'W1-S4-UP-P02', sourceSketchRef: '1-4 중앙 상단 복귀 소형 고정 발판(1042..1094,200 · 200→84px)', pathGroup: 'upper', requiredMovement: '1-jump' });

  wSurface(s4, 5020, 10, 260, 'grass', {
    id: 'W1-S4-V04', behavior: 'moving',
    motion: { axis: 'y', range: 210, period: 3.50, phase: 0.40 },
    trackY1: -200, trackY2: 220,
    sourceSketchRef: '1-4 후반 양끝 촉수 수직 이동 플랫폼 4번(1112..1168)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });
  wTentacle(s4, 'W1-S4-THORN-07', 5065, 10, 'W1-S4-V04', '1-4 후반 V04 좌측 끝 빨간 촉수(cx=1122)', '수직 이동 동기화·중앙 170px 안전');
  wTentacle(s4, 'W1-S4-THORN-08', 5235, 10, 'W1-S4-V04', '1-4 후반 V04 우측 끝 빨간 촉수(cx=1163)', '수직 이동 동기화·중앙 170px 안전');

  wSurface(s4, 5440, 95, 260, 'grass', {
    id: 'W1-S4-V05', behavior: 'moving',
    motion: { axis: 'y', range: 200, period: 3.40, phase: 2.10 },
    trackY1: -105, trackY2: 295,
    sourceSketchRef: '1-4 후반 중앙 촉수 수직 이동 플랫폼 5번(1202..1259)', pathGroup: 'main', requiredMovement: 'timing-jump'
  });
  wTentacle(s4, 'W1-S4-THORN-09', 5570, 95, 'W1-S4-V05', '1-4 후반 V05 중앙 빨간 촉수(cx=1230)', '수직 이동 동기화·좌우 각 130px 안전');

  // [v7 §5.2 & Photo 07]: Mandatory 2-Jump + Air-Dash + Brake Final Section
  // - Launch perch `W1-S4-FINAL-LAUNCH`: x=5880..5948 (w=68px, y=45)
  // - Landing perch `W1-S4-FINAL-LAND`: x=6515..6579 (w=64px, y=5, gap=567px, dy=-40px)
  // - Exit platform `W1-S4-FINAL-EXIT`: x=6710..7200 (w=490px, y=5)
  wSurface(s4, 5880, 45, 68, 'grass', {
    id: 'W1-S4-FINAL-LAUNCH',
    sourceSketchRef: '1-4 우측 최종 도약 출발 소형 발판(1307..1323,280 · 220→68px)',
    pathGroup: 'final_test', requiredMovement: 'checkpoint-launch',
    notes: '최종 도약 출발 소형 발판 (폭 68px, 우측 끝 x=5948, y=45)'
  });
  wCheckpoint(s4, '1-4 최종 도약 시험', 5914, 45, '');

  wSurface(s4, 6515, 5, 64, 'grass', {
    id: 'W1-S4-FINAL-LAND',
    sourceSketchRef: '1-4 우측 567px 간격·40px 상향 최종 착지 정밀 소형 발판(1479..1497,277 · 110→64px)',
    pathGroup: 'final_test', requiredMovement: '2-jump-plus-air-dash-brake',
    notes: '폭 64px 정밀 착지 발판 — 수평 간격 567px + 상향 고도차 -40px(y=45→5)로 코요테 2단점프만으로는 물리적 도달 불가, 공중 대시+제동 필수'
  });
  wSurface(s4, 6710, 5, 490, 'grass', {
    id: 'W1-S4-FINAL-EXIT',
    sourceSketchRef: '1-4 우측 최종 출구 고정 발판(1524..1558,276)',
    pathGroup: 'final_test', requiredMovement: '1-jump'
  });

  s4.collectibleDefs.push({
    id: 'W1-S4-SPEC-01', stageCode: '1-4', label: '황금 크레파스 (1-4 최종 착지)',
    x: 6550, y: -40, parentPlatformId: 'W1-S4-FINAL-LAND',
    sourceSketchRef: '1-4 최종 좁은 착지 발판 보상', notes: '공중 대시 정밀 착지 보상'
  });
  stages.push(s4);

  // --------------------------------------------------------------------------
  // STAGE 1-5: 수인마을 귀환 (`02_원본손그림_5장/W1_1-5_손그림.png` — 6,400px wide)
  // - [v7 Photo 08 & 09, §6]:
  //   * Original `assets/world/village-bg.webp` preserved.
  //   * TEST31.4: story village prop display sizes returned to TEST31.2 (no blanket downscaling).
  //   * TEST31.3: village camera anchor 555px, ground Y 580..595 and Ran path +150px lower.
  //     with full-height continuous `ground_cliff_left/right` and natural ravine depth shading across pit gaps (`1340..1520`, `3120..3280`, `4280..4440`).
  // --------------------------------------------------------------------------
  const s5 = makeWorldStage({
    id: 'world1_5',
    stageCode: '1-5',
    name: '1-5 수인마을 귀환',
    cameraProfile: 'world1_village',
    subtitle: '평화로운 수인마을 귀환 (우호 NPC 9명 슬롯 & 상공 란 특수 루트)',
    worldWidth: 6400,
    killY: 920,
    minCamY: -780,
    maxCamY: 210,
    entrySpawns: {
      default: { route: 'default', platformId: 'W1-S5-P-ENTRY', x: 160, feetY: 540 }
    },
    segments: [
      { start: 0, end: 6400, bg: 'village-bg' }
    ],
    backgroundRanges: {
      'village-bg': [0, 6400, 0.00, 1.00]
    },
    villageProps: [
      { id: 'W1-S5-PROP-HOUSE-A1', assetType: 'BACKGROUND_PROP', layer: 'background', key: 'village/decoration_house_a', x: 860, anchorBottom: 585, walkOffset: 228, groundAnchorPx: 228, scale: 0.64, rawW: 419, rawH: 246, pad: 26, x1: 700, x2: 1020, y1: 439, y2: 585 },
      { id: 'W1-S5-DEC-LAMP-01', assetType: 'DECORATION', layer: 'midground', key: 'village/decoration_lamp', x: 1180, anchorBottom: 585, walkOffset: 175, groundAnchorPx: 175, scale: 0.56, rawW: 140, rawH: 190, pad: 12, x1: 1110, x2: 1250, y1: 487, y2: 585 },
      { id: 'W1-S5-PROP-STALL-01', assetType: 'BACKGROUND_PROP', layer: 'background', key: 'village/decoration_stall', x: 1750, anchorBottom: 595, walkOffset: 173, groundAnchorPx: 173, scale: 0.60, rawW: 311, rawH: 188, pad: 22, x1: 1630, x2: 1870, y1: 491, y2: 595 },
      { id: 'W1-S5-PROP-HOUSE-B1', assetType: 'BACKGROUND_PROP', layer: 'background', key: 'village/decoration_house_b', x: 2330, anchorBottom: 595, walkOffset: 274, groundAnchorPx: 274, scale: 0.62, rawW: 455, rawH: 292, pad: 28, x1: 2170, x2: 2490, y1: 425, y2: 595 },
      { id: 'W1-S5-DEC-BUSH-01', assetType: 'DECORATION', layer: 'midground', key: 'village/decoration_bush_flower', x: 2800, anchorBottom: 595, walkOffset: 86, groundAnchorPx: 86, scale: 0.52, rawW: 207, rawH: 102, pad: 10, x1: 2740, x2: 2860, y1: 550, y2: 595 },
      { id: 'W1-S5-PROP-HOUSE-C1', assetType: 'BACKGROUND_PROP', layer: 'background', key: 'village/decoration_house_c', x: 3740, anchorBottom: 590, walkOffset: 270, groundAnchorPx: 270, scale: 0.62, rawW: 451, rawH: 290, pad: 28, x1: 3580, x2: 3900, y1: 423, y2: 590 },
      { id: 'W1-S5-DEC-FENCE-01', assetType: 'DECORATION', layer: 'midground', key: 'village/decoration_fence_long', x: 4180, anchorBottom: 590, walkOffset: 89, groundAnchorPx: 89, scale: 0.52, rawW: 344, rawH: 103, pad: 10, x1: 4070, x2: 4290, y1: 544, y2: 590 },
      { id: 'W1-S5-PROP-STALL-02', assetType: 'BACKGROUND_PROP', layer: 'background', key: 'village/decoration_stall', x: 4700, anchorBottom: 585, walkOffset: 173, groundAnchorPx: 173, scale: 0.60, rawW: 311, rawH: 188, pad: 22, x1: 4580, x2: 4820, y1: 481, y2: 585 },
      { id: 'W1-S5-PROP-HOUSE-A2', assetType: 'BACKGROUND_PROP', layer: 'background', key: 'village/decoration_house_a', x: 5400, anchorBottom: 585, walkOffset: 228, groundAnchorPx: 228, scale: 0.64, rawW: 419, rawH: 246, pad: 26, x1: 5240, x2: 5560, y1: 439, y2: 585 },
      { id: 'W1-S5-DEC-SIGN-01', assetType: 'DECORATION', layer: 'midground', key: 'village/decoration_signpost', x: 5880, anchorBottom: 585, walkOffset: 153, groundAnchorPx: 153, scale: 0.52, rawW: 183, rawH: 169, pad: 10, x1: 5810, x2: 5950, y1: 505, y2: 585 }
    ],
    goal: { id: 's5-goal', exitRoute: 'default', x: 6120, y: 580, w: 104, h: 142, label: '' }
  });

  wSurface(s5, 0, 540, 420, 'village', { id: 'W1-S5-P-ENTRY', sourceSketchRef: '1-5 좌측 도입부 시작 발판(0..114,372)', pathGroup: 'main', requiredMovement: 'walk' });
  wCheckpoint(s5, '1-5 수인마을 입구', 160, 540, '');

  wFloor(s5, 600, 740, 'village', 580, { id: 'W1-S5-GND-1', h: 160, sourceSketchRef: '1-5 첫 번째 좌측 높은 지면(147..325,416 · 디아나 슬롯)', pathGroup: 'main', requiredMovement: '1-jump' });
  wFloor(s5, 1520, 1600, 'village', 595, { id: 'W1-S5-GND-2', h: 170, sourceSketchRef: '1-5 두 번째 긴 하단 지면(385..773,492 · 사료스탕스 3인·모모 슬롯)', pathGroup: 'main', requiredMovement: '1-jump' });
  wCheckpoint(s5, '1-5 마을 중앙 광장', 1620, 595, '');

  wFloor(s5, 3280, 1000, 'village', 590, { id: 'W1-S5-GND-3', h: 165, sourceSketchRef: '1-5 세 번째 지면(811..1051,464 · 코미·버터 슬롯)', pathGroup: 'main', requiredMovement: '1-jump' });
  wFloor(s5, 4440, 1960, 'village', 580, { id: 'W1-S5-GND-4', h: 160, sourceSketchRef: '1-5 네 번째 우측 넓은 지면(1084..1558,409 · 바나 슬롯 및 완주 골)', pathGroup: 'main', requiredMovement: '1-jump' });

  wSurface(s5, 1380, 380, 165, 'village', {
    id: 'W1-S5-UP-B01', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.00 },
    sourceSketchRef: '1-5 상단 특수 루트 진입 회색 점멸 1번(330..403,318)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 1790, 245, 150, 'village', {
    id: 'W1-S5-UP-B02', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 0.50 },
    sourceSketchRef: '1-5 상단 특수 루트 상승 회색 점멸 2번(445..492,275)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 2130, 105, 145, 'village', {
    id: 'W1-S5-UP-B03', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 1.00 },
    sourceSketchRef: '1-5 상단 특수 루트 상승 회색 점멸 3번(527..568,227)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 2450, -30, 145, 'village', {
    id: 'W1-S5-UP-B04', behavior: 'blink', useSmallVisual: true,
    blink: { on: 2.35, warning: 0.55, off: 0.80, phase: 1.50 },
    sourceSketchRef: '1-5 상단 특수 루트 상승 회색 점멸 4번(604..648,184)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 2760, -155, 210, 'village', {
    id: 'W1-S5-UP-P01',
    sourceSketchRef: '1-5 상단 특수 루트 중간 검은 고정 발판(667..732,145)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 3240, -255, 115, 'village', {
    id: 'W1-S5-UP-B05', behavior: 'blink',
    blink: { on: 2.45, warning: 0.55, off: 0.75, phase: 0.30 },
    sourceSketchRef: '1-5 상단 특수 루트 수평 회색 점멸 5번(806..836,113)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 3660, -260, 115, 'village', {
    id: 'W1-S5-UP-B06', behavior: 'blink',
    blink: { on: 2.45, warning: 0.55, off: 0.75, phase: 0.90 },
    sourceSketchRef: '1-5 상단 특수 루트 수평 회색 점멸 6번(922..954,112)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 4080, -265, 115, 'village', {
    id: 'W1-S5-UP-B07', behavior: 'blink',
    blink: { on: 2.45, warning: 0.55, off: 0.75, phase: 1.50 },
    sourceSketchRef: '1-5 상단 특수 루트 수평 회색 점멸 7번(1035..1069,111)', pathGroup: 'upper_ran', requiredMovement: '2-jump'
  });
  wSurface(s5, 4560, -275, 540, 'village', {
    id: 'W1-S5-UP-RAN-PLAT',
    sourceSketchRef: '1-5 우상단 란 배치 긴 고정 플랫폼(1108..1298,107)', pathGroup: 'upper_ran', requiredMovement: '1-jump'
  });

  s5.collectibleDefs.push({
    id: 'W1-S5-SPEC-01',
    stageCode: '1-5',
    label: '황금 크레파스 (1-5 란 상단 루트)',
    x: 4980,
    y: -315,
    parentPlatformId: 'W1-S5-UP-RAN-PLAT',
    sourceSketchRef: '1-5 우상단 란 플랫폼 특수자원 슬롯',
    notes: '상단 점멸 루트 완주 보상'
  });

  // WORLD 1-5 NPCs: order follows the original sketch. Assets are fully assigned.
  s5.npcSlots = [
    { id: 'W1-S5-NPC-DIANA', name: "디아나", kind: 'diana', x: 820, feetY: 580, platformId: 'W1-S5-GND-1', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "두두구나~ 마을엔 어쩐일이니?", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 1' },
    { id: 'W1-S5-NPC-RUFO', name: "루포", kind: 'rufo', x: 1800, feetY: 595, platformId: 'W1-S5-GND-2', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "그 길을 통과하다니 제법인거시다!", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 2' },
    { id: 'W1-S5-NPC-TIG-HERO', name: "티그(영웅)", kind: 'tig_hero', x: 1960, feetY: 595, platformId: 'W1-S5-GND-2', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "너도 꽤나 깡다구가 있는걸? 하하!", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 3' },
    { id: 'W1-S5-NPC-BENI', name: "베니", kind: 'beni', x: 2120, feetY: 595, platformId: 'W1-S5-GND-2', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "난 베니야", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 4' },
    { id: 'W1-S5-NPC-MOMO', name: "모모", kind: 'momo', x: 2840, feetY: 595, platformId: 'W1-S5-GND-2', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "닌닌! 이단점프라닛! 닌자의 자질이 있는 것입니닷!", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 5' },
    { id: 'W1-S5-NPC-BUTTER', name: "버터", kind: 'butter', x: 3560, feetY: 590, platformId: 'W1-S5-GND-3', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "반가워 두두! 버터랑 같이 산책하자!", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 6' },
    { id: 'W1-S5-NPC-KOMMY', name: "코미", kind: 'kommy', x: 3740, feetY: 590, platformId: 'W1-S5-GND-3', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'melong', happyClip: 'happy', dialogue: "하암~ 마을에는 왠일이야? 편히 쉬다가~", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 7' },
    { id: 'W1-S5-NPC-BANA', name: "바나", kind: 'bana', x: 4720, feetY: 580, platformId: 'W1-S5-GND-4', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "개조할거 있으면 언제든 말만 하라구!", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 8' },
    { id: 'W1-S5-NPC-RAN', name: "란", kind: 'ran', x: 4760, feetY: -275, platformId: 'W1-S5-UP-RAN-PLAT', facing: -1, interactionRadius: 165, heightTolerance: 116, idleClip: 'idle', happyClip: 'happy', dialogue: "귀여운 꼬마구나. 홍삼 캔디 하나 줄까?", pendingAsset: false, sourceSketchRef: '1-5 손그림 NPC 9' },
  ];

  stages.push(s5);
  // World 1 only: deterministic left-to-right blink activation sequence.
  // waveDelay is measured from stage entry; different independent routes have separate waves.
  const waveChains = {
    '1-1': [['W1-S1-B01'], ['W1-S1-B02','W1-S1-B03','W1-S1-B04'], ['W1-S1-B05']],
    '1-2': [['W1-S2-UP-B01','W1-S2-UP-B02','W1-S2-UP-B03'],
            ['W1-S2-LOW-B01','W1-S2-LOW-B02'],
            ['W1-S2-LOW-B03','W1-S2-LOW-B04','W1-S2-LOW-B05']],
    '1-3': [['W1-S3-LOW-B01','W1-S3-LOW-B02','W1-S3-LOW-B03']],
    '1-4': [['W1-S4-UP-B01','W1-S4-UP-B02','W1-S4-UP-B03']],
    '1-5': [['W1-S5-UP-B01','W1-S5-UP-B02','W1-S5-UP-B03','W1-S5-UP-B04'],
            ['W1-S5-UP-B05','W1-S5-UP-B06','W1-S5-UP-B07']]
  };
  for (const stage of stages) {
    const map = new Map(stage.platforms.filter(a => a.blink).map(a => [a.id, a]));
    for (const chain of waveChains[stage.stageCode] || []) {
      const ordered = chain.map(id => map.get(id)).filter(Boolean).sort((a,b) => a.x-b.x);
      ordered.forEach((platform, index) => {
        platform.blink.phase = 0;
        platform.blink.waveDelay = index * 0.48;
      });
    }
  }
  return stages;
}

const world1Stages = buildWorld1Stages();
window.world1Stages = world1Stages;

// Export complete stage_geometry table
window.__exportStageGeometryData = function() {
  const rows = [];
  for (const stg of world1Stages) {
    for (const pl of stg.platforms) {
      rows.push({
        stageId: stg.stageCode,
        objectId: pl.id,
        kind: pl.wall ? (pl.ceiling ? 'ceiling_wall' : 'barrier_wall') : (pl.groundTile ? 'ground' : 'platform'),
        sourceSketchRef: pl.sourceSketchRef || '',
        x: pl.x,
        y: pl.y,
        width: pl.w,
        height: pl.h,
        skin: pl.skin || 'grass',
        behavior: pl.behavior || 'fixed',
        motionAxis: pl.motion ? pl.motion.axis : '',
        motionRange: pl.motion ? pl.motion.range : '',
        motionPeriod: pl.motion ? pl.motion.period : '',
        blinkOn: pl.blink ? pl.blink.on : '',
        blinkWarning: pl.blink ? pl.blink.warning : '',
        blinkOff: pl.blink ? pl.blink.off : '',
        hazardParentPlatformId: '',
        pathGroup: pl.pathGroup || 'main',
        requiredMovement: pl.requiredMovement || 'walk',
        notes: pl.notes || ''
      });
    }
    for (const td of stg.tentacleDefs) {
      const parentPlat = td.parentPlatformId ? stg.platforms.find(p => p.id === td.parentPlatformId) : null;
      const safeLeft = parentPlat ? (td.x - TENTACLE_META.halfWidth - parentPlat.x) : '';
      const safeRight = parentPlat ? ((parentPlat.x + parentPlat.w) - (td.x + TENTACLE_META.halfWidth)) : '';
      rows.push({
        stageId: stg.stageCode,
        objectId: td.id,
        kind: 'tentacle_hazard',
        sourceSketchRef: td.sourceSketchRef,
        x: td.x,
        y: td.y,
        width: TENTACLE_META.halfWidth * 2,
        height: TENTACLE_META.height,
        skin: 'tentacle_idle',
        behavior: 'static_hazard',
        motionAxis: '',
        motionRange: '',
        motionPeriod: '',
        blinkOn: '',
        blinkWarning: '',
        blinkOff: '',
        hazardParentPlatformId: td.parentPlatformId || '',
        pathGroup: 'hazard',
        requiredMovement: 'avoid',
        notes: `${td.notes} (safeLeft=${safeLeft}px, safeRight=${safeRight}px)`
      });
    }
    for (const col of stg.collectibleDefs) {
      rows.push({
        stageId: stg.stageCode,
        objectId: col.id,
        kind: 'world_collectible',
        sourceSketchRef: col.sourceSketchRef,
        x: col.x,
        y: col.y,
        width: 32,
        height: 32,
        skin: 'golden_crayon',
        behavior: 'collectible',
        motionAxis: '',
        motionRange: '',
        motionPeriod: '',
        blinkOn: '',
        blinkWarning: '',
        blinkOff: '',
        hazardParentPlatformId: col.parentPlatformId || '',
        pathGroup: 'upper_special',
        requiredMovement: 'precision-climb',
        notes: col.notes
      });
    }
    for (const npc of stg.npcSlots) {
      rows.push({
        stageId: stg.stageCode,
        objectId: npc.id,
        kind: npc.pendingAsset ? 'npc_placeholder_slot' : 'npc_friendly',
        sourceSketchRef: npc.sourceSketchRef,
        x: npc.x,
        y: npc.feetY,
        width: 48,
        height: 96,
        skin: npc.pendingAsset ? 'NPC_PLACEHOLDER' : npc.kind,
        behavior: 'pendingAsset',
        motionAxis: '',
        motionRange: '',
        motionPeriod: '',
        blinkOn: '',
        blinkWarning: '',
        blinkOff: '',
        hazardParentPlatformId: npc.platformId || '',
        pathGroup: npc.id === 'W1-S5-NPC-RAN' ? 'upper_ran' : 'main',
        requiredMovement: 'none',
        notes: `${npc.name} · idle/happy=${npc.idleClip}/${npc.happyClip} · ${npc.dialogue || '(no line provided)'}`
      });
    }
    const allGoals = [stg.goal, ...(stg.alternateGoals || [])].filter(Boolean);
    for (const g of allGoals) {
      rows.push({
        stageId: stg.stageCode,
        objectId: `W1-S${stg.stageCode.split('-')[1]}-GOAL-${(g.id || 'MAIN').toUpperCase()}`,
        kind: 'goal',
        sourceSketchRef: `${stg.stageCode} 출구 포털 (${g.id || 'main'})`,
        x: g.x,
        y: g.y,
        width: g.w || 96,
        height: g.h || 136,
        skin: 'portal_arch',
        behavior: 'goal',
        motionAxis: '',
        motionRange: '',
        motionPeriod: '',
        blinkOn: '',
        blinkWarning: '',
        blinkOff: '',
        hazardParentPlatformId: '',
        pathGroup: g.exitRoute || 'default',
        requiredMovement: 'enter_portal',
        notes: `exitRoute=${g.exitRoute || 'default'}`
      });
    }
  }
  return rows;
};

// ============================================================================
// World 1 Loader, Entry-Exit Route Graph & Stage Transitions (v6 B3 & B4)
// ============================================================================
function resolveStageEntrySpawn(stg, entryRoute) {
  const spawns = stg.entrySpawns || {};
  if (entryRoute && spawns[entryRoute]) return spawns[entryRoute];
  if (spawns.default) return spawns.default;
  const firstSec = stg.sections && stg.sections[0];
  return { route: 'default', platformId: null, x: firstSec ? firstSec.x : 160, feetY: firstSec ? firstSec.y : 520 };
}

function loadWorld1Stage(stageIdx, opts = {}) {
  const idx = Math.max(0, Math.min(world1Stages.length - 1, stageIdx));
  activeWorldStageIndex = idx;
  const stg = world1Stages[idx];
  const save = loadWorldMapSave();
  const stgRec = save.worlds.world1_beastforest.stages[stg.stageCode];

  const requestedRoute = opts.entryRoute || (stgRec && stgRec.lastEntryRoute) || 'default';
  const resolvedSpawn = resolveStageEntrySpawn(stg, requestedRoute);
  activeWorldEntryRoute = resolvedSpawn.route || requestedRoute;
  if (stgRec) {
    stgRec.lastEntryRoute = activeWorldEntryRoute;
    saveWorldMapData(save);
  }

  gameMode = 'world';
  eventMode = false;
  journeyResult = null;
  scenePaused = false;
  if (typeof hideAllCutsceneLayers === 'function') hideAllCutsceneLayers();
  closeWorldMapOverlayUI();

  END = stg.worldWidth;
  platforms.length = 0;
  flags.length = 0;
  sections.length = 0;
  coins.length = 0;
  if (typeof specialCoins !== 'undefined') specialCoins.length = 0;
  actors.length = 0;
  if (typeof villageFriends !== 'undefined') villageFriends.length = 0;
  if (typeof templeFriends !== 'undefined') templeFriends.length = 0;
  bombs.length = 0;
  windDarts.length = 0;
  arena = null;
  bukgyeongEvent = null;

  for (const pl of stg.platforms) {
    add(pl.x, pl.y, pl.w, pl.h, pl.thin, pl);
  }
  for (let i = 0; i < stg.sections.length; i++) {
    const s = stg.sections[i];
    sections.push({ ...s });
    if (i > 0) flags.push({ x: s.flagX ?? s.x, y: s.y });
  }

  world1Tentacles = stg.tentacleDefs.map(td => {
    const parentPlat = td.parentPlatformId ? platforms.find(pl => pl.id === td.parentPlatformId) : null;
    return {
      id: td.id,
      baseX: td.x,
      baseY: td.y,
      x: td.x,
      y: td.y,
      parentPlatformId: td.parentPlatformId,
      parentPlatform: parentPlat || null,
      offsetX: parentPlat ? (td.x - parentPlat.x) : 0,
      offsetY: parentPlat ? (td.y - parentPlat.y) : 0,
      halfW: TENTACLE_META.halfWidth,
      hitH: TENTACLE_META.height,
      anim: 0,
      active: true
    };
  });

  const savedCols = new Set((stgRec && stgRec.collectibles) || []);
  world1Collectibles = stg.collectibleDefs.map(cd => ({
    ...cd,
    state: savedCols.has(cd.id) ? 'collected' : 'available'
  }));

  world1NpcSlots = stg.npcSlots.map(ns => ({ ...ns, near: false, anim: 0, face: ns.facing || -1, clip: ns.idleClip || 'idle' }));

  checkpoint = (typeof opts.section === 'number') ? opts.section : 0;
  levelClock = 0;
  if (!opts.keepTimer) {
    worldStageElapsed = 0;
    worldStageHitsThisRun = 0;
  }

  resetWorld1PlayerToCheckpoint();
  _routePlayLog.push({
    event: 'stage_enter',
    stageCode: stg.stageCode,
    entryRoute: activeWorldEntryRoute,
    spawnPlatformId: p.on ? p.on.id : resolvedSpawn.platformId,
    spawnX: p.x,
    spawnY: p.y
  });

  if (typeof playTrack === 'function') playTrack(0, false);
  state = 'playing';
  last = performance.now();
  acc = 0;
  updateWorld1Hud();
  canvas.focus();
}
window.loadWorld1Stage = loadWorld1Stage;

function resetWorld1PlayerToCheckpoint() {
  if (typeof resetPlatforms === 'function') resetPlatforms();
  const stg = world1Stages[activeWorldStageIndex] || world1Stages[0];
  let destX = 160, destY = 520, targetPlatId = null;

  if (checkpoint > 0 && sections[checkpoint]) {
    destX = sections[checkpoint].x;
    destY = sections[checkpoint].y;
  } else {
    const sp = resolveStageEntrySpawn(stg, activeWorldEntryRoute);
    destX = sp.x;
    destY = sp.feetY;
    targetPlatId = sp.platformId;
  }

  Object.assign(p, {
    x: destX, y: destY, prevX: destX, prevY: destY,
    vx: 0, vy: 0, ground: true,
    jumps: 0, coyote: 0.1, buffer: 0, drop: null,
    hold: 0, jumpHeld: false, jumpCut: false,
    dash: 0, dashCooldown: 0, airDashUsed: false,
    jumpHeight: 0, jumpOrigin: destY,
    knock: 0, knockVX: 0, guardStun: 0, guardKnock: 0, invulnerable: 0,
    hp: 5, maxHp: 5
  });
  p.on = (targetPlatId && platforms.find(a => a.id === targetPlatId)) ||
         platforms.find(a => a.collidable !== false && !a.ceiling && !a.wall && destX >= a.x && destX <= a.x + a.w && Math.abs(a.y - destY) < 8) || null;
  lookDownHold = 0;
  lookDownOffset = 0;
  const initCam = computeInitialCameraForPoint(destX, destY);
  cam = initCam.cam;
  camY = initCam.camY;
  syncRenderCoords();
  spin = 0;
  particles = [];
  trail = [];
  if (typeof releaseAllInputs === 'function') releaseAllInputs();
  else keys.clear();
  dashRequest = false;
  cancelRest();
  shadow.y = p.y + 3;
  shadow.alpha = 0.13;
  shadow.width = 25;
  visual.reset = true;
  updateWorld1Hud();
}
window.resetWorld1PlayerToCheckpoint = resetWorld1PlayerToCheckpoint;
window.__getActiveWorldEntryRoute = () => activeWorldEntryRoute;

function retryWorld1StageCheckpoint() {
  if (gameMode !== 'world') return;
  const stg = world1Stages[activeWorldStageIndex];
  const save = loadWorldMapSave();
  const rec = save.worlds.world1_beastforest.stages[stg.stageCode];
  if (rec) {
    rec.retries = (rec.retries || 0) + 1;
    saveWorldMapData(save);
  }
  resetWorld1PlayerToCheckpoint();
  if (state !== 'playing') {
    state = 'playing';
    $('overlay').hidden = true;
    closeWorldMapOverlayUI();
    canvas.focus();
  }
}
window.retryWorld1StageCheckpoint = retryWorld1StageCheckpoint;

function checkWorld1Journey() {
  if (state !== 'playing' || gameMode !== 'world') return;
  const stg = world1Stages[activeWorldStageIndex];
  if (!stg || !stg.goal) return;
  const targets = [stg.goal, ...(stg.alternateGoals || [])].filter(Boolean);
  for (const g of targets) {
    const gCenterX = g.x + (g.w ? g.w * 0.5 : 0);
    if ((Math.abs(p.x - g.x) < 58 || Math.abs(p.x - gCenterX) < 58) && Math.abs(p.y - g.y) < 76) {
      window.__lastClearedGoalId = g.id || 'main-goal';
      completeWorld1Stage(g);
      return;
    }
  }
}
window.checkWorld1Journey = checkWorld1Journey;

function completeWorld1Stage(clearedGoal = null) {
  const stg = world1Stages[activeWorldStageIndex];
  const save = loadWorldMapSave();
  const w1 = save.worlds.world1_beastforest;
  const rec = w1.stages[stg.stageCode];
  const exitRoute = (clearedGoal && clearedGoal.exitRoute) ||
                    (clearedGoal && clearedGoal.id === 'upper-exit' ? 'upper' : (clearedGoal && clearedGoal.id === 'lower-exit' ? 'lower' : 'default'));

  if (rec) {
    rec.cleared = true;
    rec.lastExitRoute = exitRoute;
    const elapsed = Number(worldStageElapsed.toFixed(2));
    if (rec.bestSeconds === null || elapsed < rec.bestSeconds) {
      rec.bestSeconds = elapsed;
    }
    for (const col of world1Collectibles) {
      if (col.state === 'collected' && !rec.collectibles.includes(col.id)) {
        rec.collectibles.push(col.id);
      }
    }
  }
  const codes = ['1-1', '1-2', '1-3', '1-4', '1-5'];
  const nextCode = codes[activeWorldStageIndex + 1];
  let nextEntryRoute = 'default';
  if (nextCode && w1.stages[nextCode]) {
    w1.stages[nextCode].unlocked = true;
    if (nextCode === '1-3' || nextCode === '1-4') {
      nextEntryRoute = (exitRoute === 'upper' || exitRoute === 'lower') ? exitRoute : 'lower';
      w1.stages[nextCode].lastEntryRoute = nextEntryRoute;
    } else {
      w1.stages[nextCode].lastEntryRoute = 'default';
    }
  }
  if (stg.stageCode === '1-5') {
    w1.regionCleared = true;
  }
  saveWorldMapData(save);

  _routePlayLog.push({
    event: 'stage_clear',
    stageCode: stg.stageCode,
    clearedGoalId: clearedGoal ? clearedGoal.id : 'main-goal',
    exitRoute,
    nextStageCode: nextCode || null,
    nextEntryRoute,
    clearX: Math.round(p.x),
    clearY: Math.round(p.y)
  });

  if (typeof tone === 'function') tone(960, 0.22, 'triangle', 0.06);
  if (typeof releaseAllInputs === 'function') releaseAllInputs();
  else keys.clear();

  state = 'paused';
  worldMapScreen = 'world1ClearModal';
  renderWorld1ClearModal(stg, rec, Boolean(nextCode), exitRoute, nextEntryRoute);
}
window.completeWorld1Stage = completeWorld1Stage;

function updateWorld1Hud() {
  if (typeof updateHud === 'function') updateHud();
  if (gameMode !== 'world') return;
  const stg = world1Stages[activeWorldStageIndex];
  if (!stg) return;
  $('zoneTitle').textContent = stg.name;
  $('routeLabel').textContent = `WORLD 1 · ${activeWorldStageIndex + 1} / ${world1Stages.length}`;
}
window.updateWorld1Hud = updateWorld1Hud;

// ============================================================================
// World Map 7-Card UI & Stage Select Overlay Rendering
// ============================================================================
function closeWorldMapOverlayUI() {
  worldMapScreen = 'none';
  const el = $('worldmapOverlay');
  if (el) el.hidden = true;
}
window.closeWorldMapOverlayUI = closeWorldMapOverlayUI;

function openWorldMapMenu(opts = {}) {
  const save = loadWorldMapSave();
  if (!save.storyClearConfirmed && ((window.DUDU_RELEASE && window.DUDU_RELEASE.releaseMode === true) || !opts.forceDevOpen)) {
    if (typeof notify === 'function') {
      notify('스토리 모드(25분 산책)에서 엄마의 방에 도착해 완주하면 월드맵이 영구 해금됩니다!');
    }
    return false;
  }
  if (typeof leaveEvent === 'function') leaveEvent();
  if (typeof releaseAllInputs === 'function') releaseAllInputs();
  else keys.clear();
  gameMode = 'story';
  state = 'ready';
  $('overlay').hidden = true;
  worldMapScreen = 'worldmapMenu';
  renderWorldMap7CardsUI();
  return true;
}
window.openWorldMapMenu = openWorldMapMenu;

function backFromWorldMapToMainMenu() {
  closeWorldMapOverlayUI();
  gameMode = 'story';
  state = 'ready';
  loadLevel(0, { section: 0 });
  $('modalTag').textContent = '해가 지기 전에 집으로';
  $('modalTitle').textContent = '준비됐나요, 두두?';
  $('modalText').innerHTML = '25분 동안 두두와 산책하고 집으로 돌아가요.<br>일반 경로의 왕사탕을 따라가면 누구나 완주할 수 있고, 황금 크레파스 12개는 숙련자 도전이에요!<br>← → 이동 · SPACE 점프 · ↓+SPACE 발판 내려가기 · ↓ 아래보기 · L SHIFT 대시';
  $('start').textContent = '이벤트 시작하기  →';
  $('start').disabled = false;
  $('overlay').hidden = false;
  syncWorldMapEntryButtons();
}
window.backFromWorldMapToMainMenu = backFromWorldMapToMainMenu;

function startStoryReplayFromWorldMap() {
  closeWorldMapOverlayUI();
  gameMode = 'story';
  if (typeof beginEvent === 'function') {
    beginEvent();
  }
}
window.startStoryReplayFromWorldMap = startStoryReplayFromWorldMap;

function handleWorldMapCardAction(cardId) {
  const card = WORLDMAP_CARDS.find(c => c.id === cardId);
  if (!card) return;
  if (card.implementationStatus === 'coming_soon' || card.action === 'showComingSoon') {
    const banner = $('worldmapNoticeBanner');
    const msg = `🔒 「${card.title}」은(는) 현재 준비 중인 지역입니다. (로더 호출 차단됨)`;
    if (banner) {
      banner.textContent = msg;
      banner.hidden = false;
    }
    if (typeof notify === 'function') notify(msg);
    if (typeof tone === 'function') tone(320, 0.08, 'sine', 0.03);
    return;
  }
  if (card.action === 'openStoryReplay') {
    startStoryReplayFromWorldMap();
    return;
  }
  if (card.action === 'openWorld1StageSelect') {
    openWorld1StageSelect();
    return;
  }
}
window.handleWorldMapCardAction = handleWorldMapCardAction;

function renderWorldMap7CardsUI() {
  const wrap = $('worldmapOverlay');
  if (!wrap) return;
  const save = loadWorldMapSave();
  const w1 = save.worlds.world1_beastforest;
  const clearedCount = Object.values(w1.stages).filter(s => s.cleared).length;
  const totalCols = Object.values(w1.stages).reduce((acc, s) => acc + (s.collectibles ? s.collectibles.length : 0), 0);

  const storageNotice = !worldMapStorageAvailable
    ? `<div class="wmStorageWarn" id="wmStorageWarn">⚠️ 브라우저 저장소(localStorage)가 차단되어 현재 세션 동안만 해금 및 진행 기록이 임시 유지됩니다.</div>`
    : '';

  const cardsHtml = WORLDMAP_CARDS.map(card => {
    const isComingSoon = card.implementationStatus === 'coming_soon';
    const extraProgress = card.id === 'world1_beastforest'
      ? `<div class="wmCardMeta">진행: ${clearedCount}/5 클리어 · 특수자원 ${totalCols}/2 ${w1.regionCleared ? '· ★완주' : ''}</div>`
      : (card.id === 'story_replay'
        ? `<div class="wmCardMeta">기존 6개 맵 · 왕사탕 135 · 황금 크레파스 12</div>`
        : `<div class="wmCardMeta">${card.isPlaceholderArt ? '임시 플레이스홀더 썸네일' : '준비 중'}</div>`);
    return `
      <button type="button"
              class="wmCard ${isComingSoon ? 'comingSoon' : 'playable'}"
              id="wmCard-${card.id}"
              data-card-id="${card.id}"
              data-status="${card.implementationStatus}"
              aria-disabled="${isComingSoon ? 'true' : 'false'}"
              onclick="handleWorldMapCardAction('${card.id}')">
        <div class="wmCardThumbWrap">
          <img class="wmCardThumb" src="${card.thumbnail}" alt="${card.title}" onerror="this.onerror=null;this.src='${card.fallbackThumb}';">
          <span class="wmCardBadge ${isComingSoon ? 'badgeSoon' : 'badgePlay'}">${card.statusBadge}</span>
        </div>
        <div class="wmCardBody">
          <strong class="wmCardTitle">${card.title}</strong>
          <p class="wmCardSub">${card.subtitle}</p>
          ${extraProgress}
        </div>
      </button>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="wmPanel" role="dialog" aria-modal="true" aria-labelledby="wmHeaderTitle">
      <div class="wmHeader">
        <div>
          <span class="wmEyebrow">DUDU WORLD MAP · 7 REGIONS</span>
          <h2 id="wmHeaderTitle">🗺️ 두두의 세계지도 (월드맵 선택)</h2>
        </div>
        <div class="wmHeaderActions">
          <button type="button" class="wmCarouselBtn" onclick="scrollWorldMapCards(-1)" aria-label="이전 카드 보기">◀</button>
          <button type="button" class="wmCarouselBtn" onclick="scrollWorldMapCards(1)" aria-label="다음 카드 보기">▶</button>
          <button type="button" class="wmBackBtn" id="wmBackToMainBtn" onclick="backFromWorldMapToMainMenu()">← 메인 메뉴로</button>
        </div>
      </div>
      ${storageNotice}
      <div id="worldmapNoticeBanner" class="wmNoticeBanner" hidden></div>
      <div class="wmCardGrid" id="wmCardGrid">
        ${cardsHtml}
      </div>
    </div>
  `;
  wrap.hidden = false;
}

function scrollWorldMapCards(dir) {
  const grid = $('wmCardGrid');
  if (!grid) return;
  grid.scrollBy({ left: dir * 340, behavior: 'smooth' });
}
window.scrollWorldMapCards = scrollWorldMapCards;

function openWorld1StageSelect() {
  worldMapScreen = 'world1StageSelect';
  const wrap = $('worldmapOverlay');
  if (!wrap) return;
  const save = loadWorldMapSave();
  const w1 = save.worlds.world1_beastforest;
  const isDevBuild = !(window.DUDU_RELEASE && window.DUDU_RELEASE.releaseMode === true);

  const stageCardsHtml = world1Stages.map((stg, idx) => {
    const rec = w1.stages[stg.stageCode] || { unlocked: idx === 0, cleared: false, bestSeconds: null, retries: 0, hits: 0, collectibles: [], lastEntryRoute: 'default' };
    const unlocked = Boolean(rec.unlocked);
    const cleared = Boolean(rec.cleared);
    const bestTxt = rec.bestSeconds !== null ? `${rec.bestSeconds.toFixed(1)}초` : '기록 없음';
    const hasSpecSlot = stg.collectibleDefs.length > 0;
    const specTxt = hasSpecSlot
      ? `특수자원: ${rec.collectibles.length}/${stg.collectibleDefs.length}`
      : '특수자원 없음';
    const hasDualEntry = Boolean(stg.entrySpawns && stg.entrySpawns.upper && stg.entrySpawns.lower);
    const savedRoute = rec.lastEntryRoute || (hasDualEntry ? 'lower' : 'default');
    const savedRouteLabel = savedRoute === 'upper' ? '상단 입구' : (savedRoute === 'lower' ? '하단 입구' : '기본 입구');

    return `
      <div class="wmStageCard ${unlocked ? 'unlocked' : 'locked'} ${cleared ? 'cleared' : ''}" id="wmStageCard-${stg.stageCode}" data-stage-code="${stg.stageCode}" data-unlocked="${unlocked}">
        <div class="wmStageTop">
          <span class="wmStageCode">STAGE ${stg.stageCode}</span>
          <span class="wmStageStatus">${cleared ? '✓ 클리어' : (unlocked ? '● 진입 가능' : '🔒 이전 단계 클리어 필요')}</span>
        </div>
        <strong class="wmStageName">${stg.name}</strong>
        <p class="wmStageDesc">${stg.subtitle}</p>
        <div class="wmStageStats">
          <span>최고 기록: <b>${bestTxt}</b></span>
          <span>재시도: <b>${rec.retries}</b> · 피격: <b>${rec.hits}</b></span>
          <span>${specTxt}${hasDualEntry ? ` · 최근 진입: <b>${savedRouteLabel}</b>` : ''}</span>
        </div>
        <div class="wmStageBtnRow">
          <button type="button"
                  class="wmStagePlayBtn"
                  id="wmStageBtn-${stg.stageCode}"
                  ${unlocked ? '' : 'disabled'}
                  onclick="startWorld1StageFromMenu(${idx}, false, '${savedRoute}')">
            ${unlocked ? (hasDualEntry ? `스테이지 시작 (${savedRouteLabel}) →` : '스테이지 시작 →') : '잠김 (순차 해금)'}
          </button>
          ${(unlocked && hasDualEntry) ? `
            <div style="display:flex;gap:4px;">
              <button type="button" class="wmStageDevBtn" style="flex:1;" onclick="startWorld1StageFromMenu(${idx}, false, 'upper')">상단 입구 진입</button>
              <button type="button" class="wmStageDevBtn" style="flex:1;" onclick="startWorld1StageFromMenu(${idx}, false, 'lower')">하단 입구 진입</button>
            </div>
          ` : ''}
          ${(!unlocked && isDevBuild) ? `<button type="button" class="wmStageDevBtn" onclick="startWorld1StageFromMenu(${idx}, true, '${savedRoute}')">[DEV 즉시 진입]</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="wmPanel" role="dialog" aria-modal="true" aria-labelledby="wmStageHeaderTitle">
      <div class="wmHeader">
        <div>
          <span class="wmEyebrow">WORLD 1 · SUIN FOREST OUTING</span>
          <h2 id="wmStageHeaderTitle">🌳 수인숲 나들이 — 스테이지 선택 (1-1 ~ 1-5)</h2>
        </div>
        <div class="wmHeaderActions">
          <button type="button" class="wmBackBtn" id="wmBackToWorldMapBtn" onclick="openWorldMapMenu({forceDevOpen:true})">← 월드맵(7카드)으로</button>
        </div>
      </div>
      <div class="wmStageGrid" id="wmStageGrid">
        ${stageCardsHtml}
      </div>
    </div>
  `;
  wrap.hidden = false;
}
window.openWorld1StageSelect = openWorld1StageSelect;

function startWorld1StageFromMenu(stageIdx, forceDev = false, entryRoute = null) {
  const stg = world1Stages[stageIdx];
  if (!stg) return;
  const save = loadWorldMapSave();
  const rec = save.worlds.world1_beastforest.stages[stg.stageCode];
  if ((!forceDev || (window.DUDU_RELEASE && window.DUDU_RELEASE.releaseMode === true)) && (!rec || !rec.unlocked)) {
    if (typeof notify === 'function') notify('이전 스테이지를 먼저 클리어해야 해금됩니다!');
    return;
  }
  const routeToUse = entryRoute || (rec && rec.lastEntryRoute) || 'default';
  loadWorld1Stage(stageIdx, { section: 0, entryRoute: routeToUse });
}
window.startWorld1StageFromMenu = startWorld1StageFromMenu;

function renderWorld1ClearModal(stg, rec, hasNextStage, exitRoute = 'default', nextEntryRoute = 'default') {
  const wrap = $('worldmapOverlay');
  if (!wrap) return;
  const nextIdx = activeWorldStageIndex + 1;
  const isFinalStage = stg.stageCode === '1-5';
  const elapsedTxt = worldStageElapsed.toFixed(1) + '초';
  const colTxt = stg.collectibleDefs.length
    ? `${(rec && rec.collectibles) ? rec.collectibles.length : 0} / ${stg.collectibleDefs.length}`
    : '해당 없음';
  const routeBadge = exitRoute === 'upper'
    ? ' · 통과 출구: <b>상단 출구 (다음 스테이지 상단 루트 진입)</b>'
    : (exitRoute === 'lower' ? ' · 통과 출구: <b>하단 출구 (다음 스테이지 하단 루트 진입)</b>' : '');

  wrap.innerHTML = `
    <div class="wmPanel wmClearPanel" role="dialog" aria-modal="true">
      <div class="wmHeader">
        <div>
          <span class="wmEyebrow">${isFinalStage ? 'WORLD 1 COMPLETE!' : 'STAGE CLEAR!'}</span>
          <h2>${isFinalStage ? '🎉 수인숲 나들이 전체 완주 완료!' : `✨ ${stg.name} 클리어!`}</h2>
        </div>
      </div>
      <p class="wmClearSummary">
        소요 시간 <b>${elapsedTxt}</b> · 이번 주행 피격 <b>${worldStageHitsThisRun}회</b> · 특수 수집물 <b>${colTxt}</b>${routeBadge}<br>
        ${isFinalStage ? '수인숲 나들이 1-1 ~ 1-5를 모두 완주했습니다! (기존 25분 스토리 엔딩과 독립된 월드맵 전용 클리어)' : `다음 스테이지(1-${nextIdx + 1})가 해금되어 저장되었습니다.`}
      </p>
      <div class="wmClearBtnRow">
        ${hasNextStage ? `<button type="button" class="primary" id="wmNextStageBtn" onclick="startWorld1StageFromMenu(${nextIdx}, true, '${nextEntryRoute}')">다음 스테이지 (1-${nextIdx + 1}${nextEntryRoute === 'upper' ? ' · 상단 루트' : (nextEntryRoute === 'lower' ? ' · 하단 루트' : '')}) 시작 →</button>` : ''}
        <button type="button" class="secondary" id="wmReturnStageSelectBtn" onclick="openWorld1StageSelect()">스테이지 선택 화면으로</button>
        <button type="button" class="secondary" id="wmReturnWorldMapBtn" onclick="openWorldMapMenu({forceDevOpen:true})">🗺️ 월드맵으로 복귀</button>
        <button type="button" class="secondary" id="wmReplayCurrentStageBtn" onclick="loadWorld1Stage(${activeWorldStageIndex}, {section:0, entryRoute:'${activeWorldEntryRoute}'})">↻ 다시 플레이</button>
      </div>
    </div>
  `;
  wrap.hidden = false;
}

function syncWorldMapEntryButtons() {
  const unlocked = isWorldMapUnlocked();
  const btn = $('openWorldMapBtn');
  if (btn) {
    btn.textContent = unlocked ? '🗺️ 월드맵 열기 (수인숲 나들이)' : '🔒 월드맵 (스토리 완주 시 해금)';
    btn.classList.toggle('unlocked', unlocked);
  }
}
window.syncWorldMapEntryButtons = syncWorldMapEntryButtons;

function devPracticeWorld1(stageIdx, customX = null, customY = null, entryRoute = null) {
  if (window.DUDU_RELEASE && window.DUDU_RELEASE.releaseMode === true) return false;
  loadWorld1Stage(stageIdx, { section: 0, entryRoute: entryRoute || 'default' });
  if (typeof customX === 'number') p.x = customX;
  if (typeof customY === 'number') {
    p.y = customY;
    p.on = platforms.find(a => a.collidable !== false && !a.ceiling && !a.wall && p.x >= a.x && p.x <= a.x + a.w && Math.abs(a.y - p.y) < 10) || null;
    p.ground = Boolean(p.on);
  }
  const initCam = computeInitialCameraForPoint(p.x, p.y);
  cam = initCam.cam;
  camY = initCam.camY;
  syncRenderCoords();
}
window.devPracticeWorld1 = devPracticeWorld1;

window.addEventListener('DOMContentLoaded', () => {
  loadWorldMapSave();
  syncWorldMapEntryButtons();
});
