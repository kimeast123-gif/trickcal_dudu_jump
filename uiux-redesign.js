'use strict';
// ============================================================================
// Dudu's Little Adventure — TEST31.5 UI/UX Master Redesign Layer (uiux-redesign.js)
// - Non-invasive UI/UX presentation layer: keeps 100% of game engine, physics,
//   terrain rendering, camera, collectibles, and save keys untouched.
// - Synchronizes genuine ONE Mobile POP webfont with Canvas text rendering.
// - Differentiates HUD by active mode (Story / World 1 / Village 1-5 / Challenge / Cutscene).
// - Separates Title Screen, Pause Card, and Result Card states on #overlay.
// - Upgrades NPC proximity speech bubbles to compact, non-occluding fairy-tale bubbles
//   that avoid top-HUD collisions and fade/compact during jump landing trajectories.
// ============================================================================

(function initDuduUiUxRedesign() {
  const $id = (id) => document.getElementById(id);

  // 1. Genuine ONE Mobile POP Font Loading & Canvas Cache Reset
  let _popFontLoaded = false;
  function ensurePopFontReady() {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    Promise.all([
      document.fonts.load('400 16px "ONE Mobile POP"'),
      document.fonts.load('400 24px "ONE Mobile POP"')
    ]).then(() => {
      _popFontLoaded = true;
      document.documentElement.classList.add('pop-font-ready');
      if (typeof _friendlyBubbleLayoutCache !== 'undefined' && _friendlyBubbleLayoutCache && typeof _friendlyBubbleLayoutCache.clear === 'function') {
        _friendlyBubbleLayoutCache.clear();
      }
      if (typeof draw === 'function' && typeof state !== 'undefined' && state !== 'loading') {
        try { draw(); } catch (e) {}
      }
    }).catch(() => {});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePopFontReady);
  } else {
    ensurePopFontReady();
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      _popFontLoaded = true;
      document.documentElement.classList.add('pop-font-ready');
      if (typeof _friendlyBubbleLayoutCache !== 'undefined' && _friendlyBubbleLayoutCache && typeof _friendlyBubbleLayoutCache.clear === 'function') {
        _friendlyBubbleLayoutCache.clear();
      }
    }).catch(() => {});
  }
  window.__isPopFontReady = () => _popFontLoaded;

  // 2. Sync Body Data Attributes for Mode-Specific HUD Profiles (§4-4)
  let _lastZoneTitle = '';
  let _zoneHighlightTimer = 0;

  // Challenge clear/completion must use the result card, not the title lobby.
  // Keep one state classifier for both the per-frame sync and modal() wrapper.
  function resolveOverlayModalKind(st) {
    if (st === 'paused') return 'pause';
    if (st === 'eventDone' || st === 'won' ||
        st === 'challengeStageClear' || st === 'challengeComplete') return 'result';
    return 'title';
  }

  function syncUiModeAttributes() {
    const body = document.body;
    if (!body) return;
    const mode = (typeof gameMode !== 'undefined') ? gameMode : 'story';
    const st = (typeof state !== 'undefined') ? state : 'ready';
    const wStage = (mode === 'world' && typeof world1Stages !== 'undefined' && typeof activeWorldStageIndex === 'number' && world1Stages[activeWorldStageIndex])
      ? world1Stages[activeWorldStageIndex].stageCode
      : '';

    if (body.dataset.gameMode !== mode) body.dataset.gameMode = mode;
    if (body.dataset.gameState !== st) body.dataset.gameState = st;
    if (body.dataset.worldStage !== wStage) body.dataset.worldStage = wStage;

    const ov = $id('overlay');
    const wmOv = $id('worldmapOverlay');
    if (ov) {
      if (st === 'playing' || st === 'opening' || st === 'ending' || st === 'popup' || (wmOv && !wmOv.hidden)) {
        if (!ov.hidden) ov.hidden = true;
      }
      const kind = resolveOverlayModalKind(st);
      if (ov.dataset.modalKind !== kind) {
        ov.dataset.modalKind = kind;
      }
    }

    // Detect if Dudu is currently conversing with a friendly NPC (for subtle HUD dimming in 1-5 Village)
    let talkingToNpc = false;
    if (mode === 'world' && wStage === '1-5' && typeof world1NpcSlots !== 'undefined') {
      talkingToNpc = world1NpcSlots.some(f => f && f.near && f.dialogue);
    } else if (mode === 'story' && typeof actors !== 'undefined') {
      talkingToNpc = actors.some(a => a && a.friendly && a.near && a.line);
    }
    body.classList.toggle('npc-talking', talkingToNpc);

    // Highlight stage ribbon briefly when stage changes
    const zEl = $id('zoneTitle');
    const curTitle = zEl ? zEl.textContent : '';
    if (curTitle && curTitle !== _lastZoneTitle) {
      _lastZoneTitle = curTitle;
      const pill = document.querySelector('.hudZonePill');
      if (pill) {
        pill.classList.remove('stage-enter-pulse');
        void pill.offsetWidth;
        pill.classList.add('stage-enter-pulse');
        clearTimeout(_zoneHighlightTimer);
        _zoneHighlightTimer = setTimeout(() => pill.classList.remove('stage-enter-pulse'), 1800);
      }
    }
  }
  window.syncUiModeAttributes = syncUiModeAttributes;

  // 3. Wrap `updateHud` & `updateWorld1Hud` so World 1 shows stage-appropriate Golden Crayon progress (0/1 or 0/2) and hides King Candies
  const _origUpdateHud = window.updateHud;
  function enhancedUpdateHud() {
    if (typeof _origUpdateHud === 'function') {
      _origUpdateHud();
    }
    syncUiModeAttributes();
    const mode = (typeof gameMode !== 'undefined') ? gameMode : 'story';
    const candyPill = $id('score')?.closest('.coins');
    const specPill = $id('specialPill');
    const clockEl = $id('eventClock');
    const chHud = $id('challengeHud');

    if (mode === 'challenge') {
      if (candyPill) candyPill.hidden = true;
      if (specPill) specPill.hidden = true;
      if (clockEl) clockEl.hidden = true;
      if (chHud) chHud.hidden = false;
    } else if (mode === 'world') {
      if (candyPill) candyPill.hidden = true;
      if (clockEl) clockEl.hidden = false;
      if (chHud) chHud.hidden = true;
      if (specPill && typeof world1Stages !== 'undefined' && typeof loadWorldMapSave === 'function') {
        const stg = world1Stages[activeWorldStageIndex];
        const save = loadWorldMapSave();
        const stgRec = (stg && save?.worlds?.world1_beastforest?.stages?.[stg.stageCode]) || null;
        if (stg && stg.collectibleDefs && stg.collectibleDefs.length > 0) {
          specPill.hidden = false;
          const got = stgRec && Array.isArray(stgRec.collectibles) ? stgRec.collectibles.length : 0;
          if ($id('specialScore')) $id('specialScore').textContent = String(got);
          if ($id('specialTotal')) $id('specialTotal').textContent = `/ ${stg.collectibleDefs.length}`;
          if ($id('specialPending')) $id('specialPending').textContent = '';
          specPill.title = `${stg.name} 황금 크레파스 (${got}/${stg.collectibleDefs.length})`;
        } else {
          // Stage has no stage-specific collectible: show World 1 total (0/2) compactly
          specPill.hidden = false;
          const stageRecords = save?.worlds?.world1_beastforest?.stages || {};
          const totalGot = Object.values(stageRecords).reduce((acc, r) => acc + (Array.isArray(r?.collectibles) ? r.collectibles.length : 0), 0);
          const totalPossible = world1Stages.reduce((acc, s) => acc + (Array.isArray(s.collectibleDefs) ? s.collectibleDefs.length : 0), 0);
          if ($id('specialScore')) $id('specialScore').textContent = String(totalGot);
          if ($id('specialTotal')) $id('specialTotal').textContent = `/ ${totalPossible}`;
          if ($id('specialPending')) $id('specialPending').textContent = '';
          specPill.title = `수인숲 나들이 황금 크레파스 (${totalGot}/${totalPossible})`;
        }
      }
    } else {
      // Story mode
      if (candyPill) candyPill.hidden = false;
      if (specPill) specPill.hidden = false;
      if (clockEl) clockEl.hidden = false;
      if (chHud) chHud.hidden = true;
    }
  }
  window.updateHud = enhancedUpdateHud;
  try { updateHud = enhancedUpdateHud; } catch (e) {}

  // 4. Separate Title Screen (`title`), Pause Screen (`pause`), and Story Result (`result`) on `#overlay` (§6-1, §6-3, §6-4)
  const _origModal = window.modal;
  function enhancedModal(tag, title, text, button) {
    if (typeof _origModal === 'function') {
      _origModal(tag, title, text, button);
    }
    const ov = $id('overlay');
    if (!ov) return;
    const st = (typeof state !== 'undefined') ? state : 'ready';
    const kind = resolveOverlayModalKind(st);
    ov.dataset.modalKind = kind;
    syncUiModeAttributes();
  }
  window.modal = enhancedModal;
  try { modal = enhancedModal; } catch (e) {}

  // Ensure #overlay modalKind and hidden state stay strictly synchronized
  const overlayEl = $id('overlay');
  if (overlayEl) {
    overlayEl.dataset.modalKind = 'title';
  }

  // 5. Smart Non-Occluding NPC Proximity Speech Bubble (§5)
  // - Uses genuine ONE Mobile POP font
  // - Automatically repositions below or to the side if top of screen / HUD would collide
  // - Automatically compacts & semi-transparentizes when player is jumping toward a landing spot near the bubble
  const _uiBubbleCache = new Map();
  function enhancedDrawFriendlySpeechBubble(text, x, y, color = '#fffdf4', speaker = '') {
    if (!text || typeof ctx === 'undefined') return;
    ctx.save();

    const fontReadyFlag = _popFontLoaded ? '1' : '0';
    const cacheKey = `${fontReadyFlag}\0${speaker}\0${text}`;
    let layout = _uiBubbleCache.get(cacheKey);
    const lineH = 20;

    if (!layout) {
      ctx.font = '400 15px "ONE Mobile POP", sans-serif';
      const maxTextW = 286;
      const words = String(text).split(' ');
      const lines = [];
      let curLine = '';
      for (const w of words) {
        const testLine = curLine ? (curLine + ' ' + w) : w;
        if (ctx.measureText(testLine).width > maxTextW && curLine) {
          lines.push(curLine);
          curLine = w;
        } else {
          curLine = testLine;
        }
      }
      if (curLine) lines.push(curLine);

      let textW = 0;
      for (const ln of lines) {
        textW = Math.max(textW, ctx.measureText(ln).width);
      }
      ctx.font = '400 12px "ONE Mobile POP", sans-serif';
      const speakerW = speaker ? Math.ceil(ctx.measureText(speaker).width + 22) : 0;
      const boxW = Math.ceil(Math.max(textW + 26, speakerW + 28, 84));
      const boxH = lines.length * lineH + 16;
      layout = { lines, speakerW, boxW, boxH };
      _uiBubbleCache.set(cacheKey, layout);
    }

    const { lines, speakerW, boxW, boxH } = layout;
    const zoomNow = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
    const viewW = W / zoomNow;
    const viewH = H / zoomNow;

    // Default position: above NPC head
    const minCenterX = rCam + boxW * 0.5 + 16;
    const maxCenterX = rCam + viewW - boxW * 0.5 - 16;
    let clampedX = Math.max(minCenterX, Math.min(maxCenterX, x));
    let boxX = Math.round(clampedX - boxW * 0.5);
    let boxY = Math.round(y - boxH - 6);
    let tailPointsDown = true;

    // [§5 Rule 1]: If bubble collides with top screen edge or Top HUD (`rCamY + 66`), shift to side or below!
    const topHudLimit = rCamY + 66;
    if (boxY < topHudLimit) {
      const sideOffset = (p && p.x < x) ? (boxW * 0.5 + 48) : -(boxW * 0.5 + 48);
      const candidateX = Math.max(minCenterX, Math.min(maxCenterX, x + sideOffset));
      const candidateY = Math.max(topHudLimit + 6, Math.round(y - boxH * 0.35));
      if (candidateY + boxH < rCamY + viewH - 24) {
        clampedX = candidateX;
        boxX = Math.round(clampedX - boxW * 0.5);
        boxY = candidateY;
        tailPointsDown = false;
      } else {
        boxY = topHudLimit + 4;
      }
    }

    // [§5 Rule 2]: If player is airborne (`!p.ground`) and jumping near this bubble's landing area,
    // automatically fade (`alpha = 0.38`) so platform landing visibility is 100% unobstructed!
    let bubbleAlpha = 0.96;
    if (typeof p !== 'undefined' && !p.ground) {
      const predX = p.x + (p.vx || 0) * 0.22;
      const predY = p.y + (p.vy || 0) * 0.15;
      if (predX >= boxX - 42 && predX <= boxX + boxW + 42 && predY >= boxY - 45 && predY <= boxY + boxH + 65) {
        bubbleAlpha = 0.36;
      }
    }
    ctx.globalAlpha = bubbleAlpha;

    // Soft drop shadow
    ctx.fillStyle = 'rgba(20, 34, 24, 0.22)';
    ctx.beginPath();
    ctx.roundRect(boxX + 2, boxY + 4, boxW, boxH, 14);
    ctx.fill();

    // Storybook cream bubble body with warm woodland green border
    ctx.fillStyle = '#fffdf5';
    ctx.strokeStyle = '#6b965e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    // Subtle inner top highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.roundRect(boxX + 3, boxY + 2, boxW - 6, 6, 4);
    ctx.fill();

    // Pointer tail toward NPC
    if (tailPointsDown) {
      const tailX = Math.max(boxX + 18, Math.min(boxX + boxW - 18, x));
      ctx.beginPath();
      ctx.moveTo(tailX - 7, boxY + boxH - 1.5);
      ctx.lineTo(tailX, boxY + boxH + 7);
      ctx.lineTo(tailX + 7, boxY + boxH - 1.5);
      ctx.closePath();
      ctx.fillStyle = '#fffdf5';
      ctx.fill();
      ctx.strokeStyle = '#6b965e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tailX - 7, boxY + boxH - 1);
      ctx.lineTo(tailX, boxY + boxH + 7);
      ctx.lineTo(tailX + 7, boxY + boxH - 1);
      ctx.stroke();
    }

    // Speaker Name Pill Badge on top-left of bubble
    if (speaker) {
      const badgeH = 21;
      const badgeW = speakerW;
      const badgeX = boxX + 10;
      const badgeY = boxY - Math.round(badgeH * 0.62);

      ctx.fillStyle = '#3b6342';
      ctx.strokeStyle = '#fffdf5';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 999);
      ctx.fill();
      ctx.stroke();

      ctx.font = '400 11.5px "ONE Mobile POP", sans-serif';
      ctx.fillStyle = '#fffdf6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(speaker, Math.round(badgeX + badgeW * 0.5), badgeY + 14.5);
    }

    // Verbatim Dialogue Lines in ONE Mobile POP
    ctx.font = '400 15px "ONE Mobile POP", sans-serif';
    ctx.fillStyle = '#263829';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], Math.round(boxX + boxW * 0.5), boxY + 22 + i * lineH);
    }

    ctx.restore();
  }
  window.drawFriendlySpeechBubble = enhancedDrawFriendlySpeechBubble;
  try { drawFriendlySpeechBubble = enhancedDrawFriendlySpeechBubble; } catch (e) {}

  // 6. Enhanced World Map 7-Region Expedition UI (`renderWorldMap7CardsUI`, §6-2)
  // - Preserves all 7 cards, IDs (`wmCard-${card.id}`), `data-card-id`, `data-status`, and `handleWorldMapCardAction`!
  // - Replaces the flat brown/ivory PPT grid with an atmospheric Expedition Map layout where playable regions
  //   stand out as featured adventure destinations and upcoming regions appear as mist-veiled expedition nodes.
  function enhancedRenderWorldMap7CardsUI() {
    const wrap = $id('worldmapOverlay');
    if (!wrap || typeof WORLDMAP_CARDS === 'undefined') return;
    const save = loadWorldMapSave();
    const w1 = save.worlds.world1_beastforest;
    const clearedCount = Object.values(w1.stages).filter(s => s.cleared).length;
    const totalCols = Object.values(w1.stages).reduce((acc, s) => acc + (s.collectibles ? s.collectibles.length : 0), 0);

    const storageNotice = !worldMapStorageAvailable
      ? `<div class="wmStorageWarn" id="wmStorageWarn">⚠️ 브라우저 저장소(localStorage)가 제한되어 현재 세션 동안만 진행 기록이 유지됩니다.</div>`
      : '';

    const cardsHtml = WORLDMAP_CARDS.map((card, idx) => {
      const isComingSoon = card.implementationStatus === 'coming_soon';
      const regionTag = card.id === 'story_replay'
        ? 'STORY MODE · 6 REGIONS'
        : `WORLD ${idx} · ${isComingSoon ? 'COMING SOON' : 'EXPEDITION'}`;
      const extraProgress = card.id === 'world1_beastforest'
        ? `<div class="wmCardMeta"><span class="wmMetaPill">진행 ${clearedCount}/5</span><span class="wmMetaPill wmMetaGold">황금 크레파스 ${totalCols}/2</span>${w1.regionCleared ? '<span class="wmMetaPill wmMetaClear">★완주</span>' : ''}</div>`
        : (card.id === 'story_replay'
          ? `<div class="wmCardMeta"><span class="wmMetaPill">6개 지역</span><span class="wmMetaPill">왕사탕 135</span><span class="wmMetaPill wmMetaGold">크레파스 12</span></div>`
          : `<div class="wmCardMeta"><span class="wmMetaPill wmMetaLocked">${card.isPlaceholderArt ? '미공개 탐험지 · 준비 중' : '준비 중'}</span></div>`);

      return `
        <button type="button"
                class="wmCard ${isComingSoon ? 'comingSoon' : 'playable'} ${idx < 2 ? 'wmCardFeatured' : 'wmCardUpcoming'}"
                id="wmCard-${card.id}"
                data-card-id="${card.id}"
                data-status="${card.implementationStatus}"
                aria-disabled="${isComingSoon ? 'true' : 'false'}"
                onclick="handleWorldMapCardAction('${card.id}')">
          <div class="wmCardThumbWrap">
            <img class="wmCardThumb" src="${card.thumbnail}" alt="${card.title}" onerror="this.onerror=null;this.src='${card.fallbackThumb}';">
            <div class="wmCardThumbScrim"></div>
            <span class="wmRegionIndex">${regionTag}</span>
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
      <div class="wmPanel wmExpeditionModal" role="dialog" aria-modal="true" aria-labelledby="wmHeaderTitle">
        <div class="wmHeader">
          <div class="wmHeaderTitleGroup">
            <span class="wmEyebrow">DUDU’S WORLD EXPEDITION · 7 REGIONS</span>
            <h2 id="wmHeaderTitle">🗺️ 두두의 세계지도 — 어디로 나들이 갈까요?</h2>
          </div>
          <div class="wmHeaderActions">
            <button type="button" class="wmCarouselBtn" onclick="scrollWorldMapCards(-1)" aria-label="이전 지역 보기">◀</button>
            <button type="button" class="wmCarouselBtn" onclick="scrollWorldMapCards(1)" aria-label="다음 지역 보기">▶</button>
            <button type="button" class="wmBackBtn" id="wmBackToMainBtn" onclick="backFromWorldMapToMainMenu()">← 타이틀로</button>
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
    syncUiModeAttributes();
  }
  window.renderWorldMap7CardsUI = enhancedRenderWorldMap7CardsUI;
  try { renderWorldMap7CardsUI = enhancedRenderWorldMap7CardsUI; } catch (e) {}

  // Keep periodic lightweight attribute sync on animation frames
  function uiTickLoop() {
    syncUiModeAttributes();
    requestAnimationFrame(uiTickLoop);
  }
  requestAnimationFrame(uiTickLoop);
})();
