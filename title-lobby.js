'use strict';
// ============================================================================
// 두두의 폴짝폴짝 대모험 — 타이틀 로비 독립 원본 에셋 / 모션 컨트롤러 v4.0 (title-lobby.js)
// - Strictly implements `두두_타이틀로비_스프라이트_애니메이션_근본수정_통합제작지시서_v3.md`
// - Uses ONLY newly authored intact independent full-body master asset (`hero-dudu-master.png` & `hero-dudu-night-master.png`)
//   with gentle whole-layer CSS transform breathing + identical-alpha glow layer (ZERO multi-frame warping/swapping!).
// - Places `.lobbyHero`, `.lobbyForeground`, `.lobbyLogo`, `.lobbyKwangBadge` outside `.lobbyDemoPanel`
//   so no ancestor `clip-path` ever clips Dudu.
// ============================================================================

(function initDuduTitleLobbyV3() {
  const $id = (id) => document.getElementById(id);

  // Centralized Configuration (§3-3, §3-4, §5, §8)
  const LOBBY_CONFIG = {
    ASSET_VERSION: 'V4_STANDALONE',
    HERO_MASTER_DAY_SRC: 'assets/title/hero-dudu-master.png?v=V4_2_MINIMAL',
    HERO_MASTER_NIGHT_SRC: 'assets/title/hero-dudu-night-master.png?v=V4_2_MINIMAL',
    THEME_PERIOD_MS: 35000,       // v5 §0-5 & §4.4: 35s input-independent Day<->Night cycle
    IDLE_DARK_MS: 35000,          // Legacy alias preserved for compatibility
    SLIDE_HOLD_MS: 4000,          // 4.0s full visibility hold per stage scene (C01)
    SLIDE_DISSOLVE_MS: 850,       // 0.85s cross-dissolve between scenes (C01)
    LEAVE_DURATION_MS: 600,       // 600ms menu exit + center wipe
    LOCK_TOAST_MS: 3200
  };
  window.DUDU_LOBBY_CONFIG = LOBBY_CONFIG;

  // 7 Distinct Real-Map Stage Scenes for Cross-Dissolve Slideshow (C01)
  const DEMO_SCENES = [
    { id: 'scene-01', stageCode: 'STORY-SEC-1', title: '수인숲 초입 · 산책길', webp: 'assets/title/demo/scene-01.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-01.jpg?v=V4_STANDALONE' },
    { id: 'scene-02', stageCode: 'STORY-SEC-2', title: '수인마을 · 마을 광장', webp: 'assets/title/demo/scene-02.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-02.jpg?v=V4_STANDALONE' },
    { id: 'scene-03', stageCode: 'STORY-SEC-3', title: '모나티엄 A · 엘프 첨단 연구지구', webp: 'assets/title/demo/scene-03.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-03.jpg?v=V4_STANDALONE' },
    { id: 'scene-04', stageCode: 'STORY-SEC-4', title: '모나티엄 B · 고가도로와 드론 구역', webp: 'assets/title/demo/scene-04.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-04.jpg?v=V4_STANDALONE' },
    { id: 'scene-05', stageCode: 'STORY-SEC-5', title: '에르피엔 A · 요정 왕국 정원', webp: 'assets/title/demo/scene-05.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-05.jpg?v=V4_STANDALONE' },
    { id: 'scene-06', stageCode: 'WORLD1-1-2',  title: '월드1 수인숲 · 1-2 거목과 다리의 숲', webp: 'assets/title/demo/scene-06.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-06.jpg?v=V4_STANDALONE' },
    { id: 'scene-07', stageCode: 'WORLD1-1-3',  title: '월드1 수인숲 · 1-3 깊은 숲의 갈림길', webp: 'assets/title/demo/scene-07.webp?v=V4_STANDALONE', jpg: 'assets/title/demo/scene-07.jpg?v=V4_STANDALONE' }
  ];

  let _lobbyState = 'titleEntering';
  let _visibleLobbyElapsedMs = 0;
  let _idleElapsedMs = 0;
  let _themeTransitionCount = 0;
  let _lastThemeNight = false;
  let _lastTickAt = performance.now();
  let _slideIdx = 0;
  let _slideAccumMs = 0;
  let _activeSlideBuffer = 'A';
  let _isTransitioning = false;
  let _isReturningToLobby = false;
  let _toastTimer = 0;
  let _preloadedSlideSet = new Set();
  const _slideUseJpgFallback = new Set();
  function getSlideBgCssUrl(sc) {
    if (!sc) return '';
    const src = _slideUseJpgFallback.has(sc.id) ? sc.jpg : sc.webp;
    return `url('${src}')`;
  }

  const ICONS_SVG = {
    play: `<svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M12 8.5 C12 5.8 15 4.2 17.3 5.6 L35.5 17.1 C37.7 18.5 37.7 21.7 35.5 23.1 L17.3 34.6 C15 36.0 12 34.4 12 31.7 Z"
            fill="#8ef832" stroke="#132c1f" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M15.5 11.5 L29.5 20.1" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>
    </svg>`,
    worldmap: `<svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M6 13 L16 9 L28 14 L38 10 L38 33 L28 37 L16 32 L6 36 Z"
            fill="#9cf2b2" stroke="#132c1f" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M16 9 L16 32 M28 14 L28 37" stroke="#132c1f" stroke-width="2.2"/>
      <path d="M25 6 C20.6 6 17 9.5 17 13.8 C17 19.2 25 26.5 25 26.5 C25 26.5 33 19.2 33 13.8 C33 9.5 29.4 6 25 6 Z"
            fill="#ff6b3d" stroke="#132c1f" stroke-width="2.6"/>
      <circle cx="25" cy="13.5" r="3.2" fill="#fffdf2" stroke="#132c1f" stroke-width="1.8"/>
    </svg>`,
    challenge: `<svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M13 10 H31 V19 C31 24.5 27 28.5 22 28.5 C17 28.5 13 24.5 13 19 Z"
            fill="#ffd43b" stroke="#132c1f" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M13 13 H7.5 C7.5 19.5 10 22.5 13.5 23 M31 13 H36.5 C36.5 19.5 34 22.5 30.5 23"
            fill="none" stroke="#132c1f" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 28.5 H26 V34 H18 Z" fill="#f59f00" stroke="#132c1f" stroke-width="2.5"/>
      <rect x="13" y="34" width="18" height="4.5" rx="2" fill="#ffd43b" stroke="#132c1f" stroke-width="2.5"/>
      <polygon points="22,13.5 23.6,16.8 27.2,17.3 24.6,19.8 25.2,23.4 22,21.7 18.8,23.4 19.4,19.8 16.8,17.3 20.4,16.8"
               fill="#ff6b3d"/>
    </svg>`,
    keyhelp: `<svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M10 15 H34 C37.8 15 40.5 18.5 39.8 22.5 L38.2 31.5 C37.6 34.8 34.2 36.5 31.2 34.5 L27.5 31.8 H16.5 L12.8 34.5 C9.8 36.5 6.4 34.8 5.8 31.5 L4.2 22.5 C3.5 18.5 6.2 15 10 15 Z"
            fill="#d4fce0" stroke="#132c1f" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="M14 20.5 V26.5 M11 23.5 H17" stroke="#2b8a3e" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="30" cy="21.5" r="2.1" fill="#ff6b6b"/>
      <circle cx="33.5" cy="24.5" r="2.1" fill="#ffd43b"/>
      <circle cx="26.5" cy="24.5" r="2.1" fill="#4dabf7"/>
    </svg>`,
    options: `<svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M19.5 6.5 H24.5 L25.6 10.5 L29.2 12.0 L32.8 9.8 L36.2 13.2 L34.0 16.8 L35.5 20.4 L39.5 21.5 V26.5 L35.5 27.6 L34.0 31.2 L36.2 34.8 L32.8 38.2 L29.2 36.0 L25.6 37.5 L24.5 41.5 H19.5 L18.4 37.5 L14.8 36.0 L11.2 38.2 L7.8 34.8 L10.0 31.2 L8.5 27.6 L4.5 26.5 V21.5 L8.5 20.4 L10.0 16.8 L7.8 13.2 L11.2 9.8 L14.8 12.0 L18.4 10.5 Z"
            fill="#c3fae8" stroke="#132c1f" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="22" cy="24" r="6.2" fill="#132c1f"/>
      <circle cx="22" cy="24" r="3.4" fill="#e6fcf5"/>
    </svg>`,
    echoArcs: `<svg class="lobbyBtnEchoArcs" viewBox="0 0 26 60" aria-hidden="true">
      <path d="M4 8 C14 18 14 42 4 52" fill="none" stroke="#8ce99a" stroke-width="3.6" stroke-linecap="round" opacity="0.85"/>
      <path d="M13 13 C21 21 21 39 13 47" fill="none" stroke="#51cf66" stroke-width="3.0" stroke-linecap="round" opacity="0.55"/>
    </svg>`,
    starSticker: `<div class="lobbyCelestialSticker" data-celestial="star"><svg viewBox="0 0 48 48" aria-hidden="true">
      <polygon points="24,4 29.8,16.2 43.2,18.0 33.4,27.4 35.8,40.8 24,34.4 12.2,40.8 14.6,27.4 4.8,18.0 18.2,16.2"
               fill="#fff380" stroke="#173b2c" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="24,9 28.2,18.0 38.0,19.4 30.8,26.2 32.5,36.0 24,31.4 15.5,36.0 17.2,26.2 10.0,19.4 19.8,18.0"
               fill="#ffe066"/>
    </svg></div>`,
    moonSticker: `<div class="lobbyCelestialSticker" data-celestial="moon"><svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M29 6 C17 8 11 22 18 33 C25 44 39 41 42 30 C32 34 23 24 29 6 Z"
            fill="#fff380" stroke="#173b2c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="14" cy="14" r="2.8" fill="#d8f5a2"/>
    </svg></div>`
  };

  function buildStickerItemHtml(stickerNum, extraClass = '') {
    const code = String(stickerNum).padStart(2, '0');
    return `
      <div class="lobbyStickerItem ${extraClass}" data-sticker="${code}">
        <img class="stickerImgDay" src="assets/title/sticker-${code}-day.png?v=V4_STANDALONE" alt="" draggable="false">
        <img class="stickerImgNight" src="assets/title/sticker-${code}-night.png?v=V4_STANDALONE" alt="" draggable="false">
      </div>
    `;
  }

  // Four distinct low-density diagonal lanes. No duplicated sequence and no vertical waterfall.
  // Each lane has three objects: Dudu sticker / star / moon, staggered in time.
  function buildDiagonalLaneHtml(seq) {
    return seq.slice(0, 3).map((item, i) => {
      const html = item === 'star' ? ICONS_SVG.starSticker
        : item === 'moon' ? ICONS_SVG.moonSticker
        : buildStickerItemHtml(item, (item % 2) ? 'st-tilt-left' : 'st-tilt-right');
      return `<div class="stickerMotion" style="--slot:${i}; --sticker-delay:-${i * 9}s">${html}</div>`;
    }).join('');
  }

  function mountTitleLobbyDOM() {
    const overlay = $id('overlay');
    if (!overlay || $id('duduTitleLobby')) return;
    if (!overlay.dataset.modalKind) overlay.dataset.modalKind = 'title';

    const lobbyEl = document.createElement('div');
    lobbyEl.className = 'titleLobby';
    lobbyEl.id = 'duduTitleLobby';
    lobbyEl.setAttribute('role', 'region');
    lobbyEl.setAttribute('aria-label', '두두의 폴짝폴짝 대모험 메인 타이틀 로비');

    const trackASeq = [1, 'star'];
    const trackBSeq = ['moon', 2];
    const trackCSeq = [3, 'star', 4];
    const trackDSeq = ['moon', 5];

    // [§4-2 B02] Target Layer Architecture:
    // `.lobbyDemoPanel` and `.lobbyRightField` hold ONLY the diagonal background clips.
    // `.lobbyForeground`, `.lobbyHero` (`.heroGlowLayer` + `.heroBodyLayer`), `.lobbyLogo`, `.lobbyKwangBadge`, `.lobbyMenu`
    // are direct siblings under `#duduTitleLobby` with ZERO ancestor `clip-path`!
    lobbyEl.innerHTML = `
      <!-- 1. Left Background Panel ONLY (Diagonal clip-path applies ONLY to background slideshow!) -->
      <div class="lobbyDemoPanel" id="lobbyDemoPanel">
        <div class="lobbyDemo" id="lobbyDemo" data-scene-count="${DEMO_SCENES.length}">
          <div class="lobbySlideLayer is-visible" id="lobbySlideLayerA"
               style="background-image: ${getSlideBgCssUrl(DEMO_SCENES[0])}"
               data-scene-id="${DEMO_SCENES[0].id}"
               data-stage-code="${DEMO_SCENES[0].stageCode}"></div>
          <div class="lobbySlideLayer" id="lobbySlideLayerB"
               style="background-image: ${getSlideBgCssUrl(DEMO_SCENES[1])}"
               data-scene-id="${DEMO_SCENES[1].id}"
               data-stage-code="${DEMO_SCENES[1].stageCode}"></div>
        </div>
        <div class="lobbySceneShade" id="lobbySceneShade"></div>
        <svg class="lobbyLeftSparkles" viewBox="0 0 1000 940" preserveAspectRatio="none" aria-hidden="true">
          <g class="lobbySparkleNode" style="animation-delay:0.4s">
            <circle cx="88" cy="240" r="4" fill="#fff9db" opacity="0.8"/>
            <path d="M510 210 Q522 195 540 202 Q522 214 528 232 Q512 222 510 210 Z" fill="#fff3bf" opacity="0.88"/>
          </g>
          <g class="lobbySparkleNode" style="animation-delay:2.6s">
            <polygon points="480,175 485,188 498,190 487,198 490,211 480,203 470,211 473,198 462,190 475,188" fill="#ffe066" opacity="0.85"/>
            <circle cx="348" cy="218" r="3.5" fill="#d8f5a2" opacity="0.75"/>
          </g>
        </svg>
      </div>

      <!-- 2. Right Background Panel & Sticker Stage -->
      <div class="lobbyRightHalf" id="lobbyRightHalf">
        <div class="lobbyRightField" id="lobbyRightField">
          <div class="lobbyRightStripes"></div>
          <div class="lobbyStickerStage" id="lobbyStickerStage" aria-hidden="true">
            <div class="stickerTrack stickerTrackA" id="stickerTrackA">
              ${buildDiagonalLaneHtml(trackASeq)}
            </div>
            <div class="stickerTrack stickerTrackB" id="stickerTrackB">
              ${buildDiagonalLaneHtml(trackBSeq)}
            </div>
            <div class="stickerTrack stickerTrackC" id="stickerTrackC">
              ${buildDiagonalLaneHtml(trackCSeq)}
            </div>
            <div class="stickerTrack stickerTrackD" id="stickerTrackD">
              ${buildDiagonalLaneHtml(trackDSeq)}
            </div>
          </div>
          <svg class="lobbySparkles" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true">
            <path d="M1440 0 Q1480 65 1560 52 Q1610 92 1672 78 L1672 0 Z" fill="#2b6e52" opacity="0.65"/>
            <path d="M1080 941 Q1135 882 1215 902 Q1285 848 1385 882 Q1465 820 1565 858 Q1620 795 1672 825 L1672 941 Z"
                  fill="#236449" stroke="#9ef87a" stroke-width="2.5" opacity="0.82"/>
            <g class="lobbySparkleNode" style="animation-delay:0.8s">
              <circle cx="1434" cy="48" r="4.5" fill="#fff9db"/>
              <circle cx="1632" cy="245" r="4" fill="#b2f2bb"/>
            </g>
          </svg>
        </div>
      </div>

      <!-- 3. Diagonal Divider Line -->
      <svg class="lobbyDiagonalDivider" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true">
        <line x1="1084" y1="-10" x2="745" y2="951" stroke="#0d3832" stroke-width="22" opacity="0.72"/>
        <line x1="1076" y1="-10" x2="737" y2="951" stroke="#d8ff72" stroke-width="4.2"/>
        <line x1="1093" y1="-10" x2="754" y2="951" stroke="#b2f2bb" stroke-width="3.2" stroke-dasharray="14 12"/>
      </svg>

      <!-- 4. Foreground Grass Decoration under Dudu's feet (outside clip-path!) -->
      <div class="lobbyForeground" id="lobbyForeground" aria-hidden="true">
        <img class="lobbyFgGrassDay" src="assets/title/fg-grass-day.png?v=V4_STANDALONE" alt="" draggable="false">
        <img class="lobbyFgGrassNight" src="assets/title/fg-grass-night.png?v=V4_STANDALONE" alt="" draggable="false">
      </div>

      <!-- 5. [Gate A & B: B01~B03] Unclipped Single-Master Hero Dudu (.heroGlowLayer + .heroBodyLayer, ZERO ancestor clip-path!) -->
      <div class="lobbyHero" id="lobbyHero">
        <div class="lobbyHeroBreathWrap" id="lobbyHeroBreathWrap">
          <img class="heroGlowLayer" id="lobbyHeroGlowImg"
               src="${LOBBY_CONFIG.HERO_MASTER_NIGHT_SRC}" alt="" draggable="false">
          <img class="heroBodyLayer heroBodyDay" id="lobbyHeroDayImg"
               src="${LOBBY_CONFIG.HERO_MASTER_DAY_SRC}" alt="두두 크왕 포즈" draggable="false">
          <img class="heroBodyLayer heroBodyNight" id="lobbyHeroNightImg"
               src="${LOBBY_CONFIG.HERO_MASTER_NIGHT_SRC}" alt="" draggable="false">
        </div>
      </div>

      <!-- 6. Independent "크왕!" Burst Speech Badge -->
      <div class="lobbyKwangBadge" id="lobbyKwangBadge">
        <img class="lobbyKwangDay" src="assets/title/kwang-day.png?v=V4_STANDALONE" alt="크왕!" draggable="false">
        <img class="lobbyKwangNight" src="assets/title/kwang-night.png?v=V4_STANDALONE" alt="" draggable="false">
      </div>

      <!-- 7. Top Calligraphy / Sticker Title Logo ("두두의 폴짝폴짝 대모험") -->
      <div class="lobbyLogo" id="lobbyLogo" aria-label="두두의 폴짝폴짝 대모험">
        <img class="lobbyLogoDay" src="assets/title/logo-day.png?v=V4_STANDALONE" alt="두두의 폴짝폴짝 대모험" draggable="false">
        <img class="lobbyLogoNight" src="assets/title/logo-night.png?v=V4_STANDALONE" alt="" draggable="false">
      </div>

      <div class="lobbyDemoStageTag" id="lobbyDemoStageTag">🏞️ ${DEMO_SCENES[0].title} (1/${DEMO_SCENES.length})</div>

      <!-- 8. 5 Interactive Capsule Menu Buttons (플레이 / 월드맵 / 챌린지 모드 / 키 설명 / 게임옵션) -->
      <nav class="lobbyMenu" id="lobbyMenu" aria-label="메인 게임 메뉴">
        <div class="lobbyMenuBtnWrap" style="--btn-idx:0">
          <svg class="lobbyPlayBurstRays" viewBox="0 0 64 46" aria-hidden="true">
            <path d="M12 34 L4 10 M28 36 L28 6 M44 40 L56 16" stroke="#fff380" stroke-width="6" stroke-linecap="round"/>
          </svg>
          <button type="button" class="lobbyCapsuleBtn btn-play" id="lobbyBtnPlay" data-lobby-action="play">
            <span class="lobbyBtnIcon">${ICONS_SVG.play}</span>
            <span class="lobbyBtnLabel">플레이</span>
          </button>
          ${ICONS_SVG.echoArcs}
        </div>

        <div class="lobbyMenuBtnWrap" style="--btn-idx:1">
          <button type="button" class="lobbyCapsuleBtn btn-worldmap" id="lobbyBtnWorldMap" data-lobby-action="worldmap" data-wm-locked="true">
            <span class="lobbyBtnIcon">${ICONS_SVG.worldmap}</span>
            <span class="lobbyBtnLabel">월드맵</span>
            <span class="lobbyWmLockBadge" id="lobbyWmLockBadge">🔒 미해금</span>
          </button>
          ${ICONS_SVG.echoArcs}
        </div>

        <div class="lobbyMenuBtnWrap" style="--btn-idx:2">
          <button type="button" class="lobbyCapsuleBtn btn-challenge" id="lobbyBtnChallenge" data-lobby-action="challenge">
            <span class="lobbyBtnIcon">${ICONS_SVG.challenge}</span>
            <span class="lobbyBtnLabel">챌린지 모드</span>
          </button>
          ${ICONS_SVG.echoArcs}
        </div>

        <div class="lobbyMenuBtnWrap" style="--btn-idx:3">
          <button type="button" class="lobbyCapsuleBtn btn-keyhelp" id="lobbyBtnKeyHelp" data-lobby-action="keyhelp">
            <span class="lobbyBtnIcon">${ICONS_SVG.keyhelp}</span>
            <span class="lobbyBtnLabel">키 설명</span>
          </button>
          ${ICONS_SVG.echoArcs}
        </div>

        <div class="lobbyMenuBtnWrap" style="--btn-idx:4">
          <button type="button" class="lobbyCapsuleBtn btn-options" id="lobbyBtnOptions" data-lobby-action="options">
            <span class="lobbyBtnIcon">${ICONS_SVG.options}</span>
            <span class="lobbyBtnLabel">게임옵션</span>
          </button>
          ${ICONS_SVG.echoArcs}
        </div>
      </nav>

      <!-- 9. Non-Blocking Lock Notice Toast & Lightweight Key Help Modal Host -->
      <div class="lobbyToastBanner" id="lobbyLockToast" role="status" aria-live="polite"></div>

      <div class="lobbyPanelHost" id="lobbyPanelHost" hidden>
        <div class="lobbyKeyHelpCard" role="dialog" aria-modal="true" aria-labelledby="lobbyKeyHelpTitle">
          <div class="lobbyKeyHelpHeader">
            <h3 id="lobbyKeyHelpTitle">🎮 두두의 조작키 & 모험 가이드</h3>
            <button type="button" class="lobbyKeyHelpCloseBtn" id="closeLobbyKeyHelpBtn">닫기 (ESC)</button>
          </div>
          <div class="lobbyKeyGrid">
            <div class="lobbyKeySection">
              <h4>⌨️ PC 키보드 조작</h4>
              <div class="lobbyKeyRow"><span>좌우 이동</span><span class="lobbyKeyBadge">← / → 또는 A / D</span></div>
              <div class="lobbyKeyRow"><span>점프 / 2단 점프</span><span class="lobbyKeyBadge">SPACE</span></div>
              <div class="lobbyKeyRow"><span>순간 대시 (쿨타임)</span><span class="lobbyKeyBadge">L SHIFT</span></div>
              <div class="lobbyKeyRow"><span>아래 시야 살피기</span><span class="lobbyKeyBadge">↓ 길게 누르기</span></div>
              <div class="lobbyKeyRow"><span>통과형 발판 내려가기</span><span class="lobbyKeyBadge">↓ + SPACE</span></div>
              <div class="lobbyKeyRow"><span>일시정지 / 메뉴</span><span class="lobbyKeyBadge">P 또는 ESC</span></div>
            </div>
            <div class="lobbyKeySection">
              <h4>📱 모바일 터치 조작</h4>
              <div class="lobbyKeyRow"><span>이동 / 아래보기</span><span class="lobbyKeyBadge">좌측 360° 가상 스틱</span></div>
              <div class="lobbyKeyRow"><span>점프 / 2단 점프</span><span class="lobbyKeyBadge">우측 점프 버튼</span></div>
              <div class="lobbyKeyRow"><span>순간 대시</span><span class="lobbyKeyBadge">우측 대시 버튼</span></div>
              <div class="lobbyKeyRow"><span>발판 내려가기</span><span class="lobbyKeyBadge">스틱 하단 + 점프</span></div>
              <div class="lobbyKeyRow"><span>패드 위치·크기 조절</span><span class="lobbyKeyBadge">게임옵션 → 컨트롤러</span></div>
            </div>
          </div>
          <div class="lobbyKeyFooter">
            <span>💡 스토리 모드를 1회 완주하면 <b>월드맵(수인숲 나들이)</b>이 영구 해금됩니다!</span>
            <button type="button" class="lobbyKeyHelpCloseBtn" id="confirmLobbyKeyHelpBtn">확인</button>
          </div>
        </div>
      </div>
    `;

    overlay.appendChild(lobbyEl);
    mountReturnToLobbyOptionUI();
    bindLobbyEvents(lobbyEl);
    syncLobbyButtonStates();
  }

  // [§5-5 C04] In-Game Options -> `로비로 복귀` Button & Confirmation Dialog preserving ALL localStorage keys
  function mountReturnToLobbyOptionUI() {
    const optModal = $id('mobileSettingsModal');
    const resetBtn = $id('confirmMobileOptBtn') || optModal?.querySelector('.mobileSettingsFooter button');
    const viewport = $id('gameViewport') || document.body;
    if (!optModal || !resetBtn) return;

    if (!$id('returnToLobbyFromOptBtn')) {
      const retBtn = document.createElement('button');
      retBtn.type = 'button';
      retBtn.id = 'returnToLobbyFromOptBtn';
      retBtn.className = 'secondary returnLobbyOptBtn';
      retBtn.textContent = '🏠 로비로 복귀';
      retBtn.hidden = true;
      resetBtn.parentElement.insertBefore(retBtn, resetBtn);

      retBtn.addEventListener('click', () => {
        if (isLobbyCurrentlyActive()) return;
        const confirmModal = $id('returnToLobbyConfirmModal');
        if (confirmModal) {
          confirmModal.hidden = false;
          const cancelBtn = $id('cancelReturnToLobbyBtn');
          if (cancelBtn) cancelBtn.focus();
        }
      });
    }

    if (!$id('returnToLobbyConfirmModal')) {
      const confirmModal = document.createElement('div');
      confirmModal.id = 'returnToLobbyConfirmModal';
      confirmModal.className = 'returnLobbyConfirmModal';
      confirmModal.hidden = true;
      confirmModal.setAttribute('role', 'dialog');
      confirmModal.setAttribute('aria-modal', 'true');
      confirmModal.setAttribute('aria-labelledby', 'returnLobbyConfirmTitle');
      confirmModal.innerHTML = `
        <div class="returnLobbyConfirmCard">
          <h4 id="returnLobbyConfirmTitle">🏠 로비로 돌아갈까요?</h4>
          <p>현재 진행 중인 플레이를 종료하고 로비로 돌아갈까요?<br><small style="color:#5c745e">(이미 달성한 스토리 완주·월드맵 해금·황금 크레파스·사운드/컨트롤 설정은 모두 보존됩니다.)</small></p>
          <div class="returnLobbyConfirmActions">
            <button type="button" class="btnCancelReturnLobby" id="cancelReturnToLobbyBtn">취소</button>
            <button type="button" class="btnConfirmReturnLobby" id="confirmReturnToLobbyBtn">로비로 복귀</button>
          </div>
        </div>
      `;
      viewport.appendChild(confirmModal);

      const cancelBtn = $id('cancelReturnToLobbyBtn');
      const confirmBtn = $id('confirmReturnToLobbyBtn');

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          confirmModal.hidden = true;
          const closeOptBtn = $id('closeMobileOptBtn');
          if (closeOptBtn) closeOptBtn.focus();
        });
      }

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          executeReturnToLobbySafely();
        });
      }
    }
  }

  function syncReturnToLobbyOptionBtnVisibility() {
    const retBtn = $id('returnToLobbyFromOptBtn');
    const confirmModal = $id('returnToLobbyConfirmModal');
    if (!retBtn) return;
    const inLobby = isLobbyCurrentlyActive() || (typeof state !== 'undefined' && (state === 'ready' || state === 'loading'));
    retBtn.hidden = Boolean(inLobby);
    if (inLobby && confirmModal && !confirmModal.hidden) {
      confirmModal.hidden = true;
    }
  }

  function executeReturnToLobbySafely() {
    if (_isReturningToLobby || _isTransitioning) return;
    _isReturningToLobby = true;

    try {
      // Snapshot ALL existing localStorage entries so zero save keys are ever lost (§5-5)
      const allSavedEntries = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) allSavedEntries.push([k, localStorage.getItem(k)]);
        }
      } catch (e) {}

      if (typeof releaseAllInputs === 'function') {
        releaseAllInputs();
      } else if (typeof keys !== 'undefined' && keys && typeof keys.clear === 'function') {
        keys.clear();
      }

      if (typeof leaveEvent === 'function') {
        try { leaveEvent(); } catch (e) {}
      }
      if (typeof stopMusic === 'function') {
        try { stopMusic(); } catch (e) {}
      }
      if (typeof closeWorldMapOverlayUI === 'function') {
        try { closeWorldMapOverlayUI(); } catch (e) {}
      }

      if (typeof gameMode !== 'undefined') gameMode = 'story';
      if (typeof eventMode !== 'undefined') eventMode = false;
      if (typeof journeyResult !== 'undefined') journeyResult = null;
      if (typeof reset === 'function') {
        try { reset(false); } catch (e) {}
      }
      if (typeof state !== 'undefined') state = 'ready';

      // Restore all permanent localStorage entries
      try {
        for (const [k, v] of allSavedEntries) {
          if (v !== null) localStorage.setItem(k, v);
        }
      } catch (e) {}

      const confirmModal = $id('returnToLobbyConfirmModal');
      if (confirmModal) confirmModal.hidden = true;
      const optModal = $id('mobileSettingsModal');
      if (optModal) optModal.hidden = true;
      if (window.__mobileUIState) {
        window.__mobileUIState.settingsOpen = false;
        window.__mobileUIState.pausedByOptions = false;
        window.__mobileUIState.lastPauseReason = null;
      }

      const startBtn = $id('start');
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '이벤트 시작하기  →';
        if (typeof start === 'function') {
          startBtn.onclick = () => start();
        }
      }
      const chHud = $id('challengeHud');
      if (chHud) chHud.hidden = true;
      const chNav = $id('challengeNav');
      if (chNav) chNav.hidden = true;

      const ov = $id('overlay');
      if (ov) {
        ov.dataset.modalKind = 'title';
        ov.hidden = false;
      }

      if (typeof syncWorldMapEntryButtons === 'function') {
        try { syncWorldMapEntryButtons(); } catch (e) {}
      }
      if (typeof updateHud === 'function') {
        try { updateHud(); } catch (e) {}
      }
      if (typeof syncUiModeAttributes === 'function') {
        try { syncUiModeAttributes(); } catch (e) {}
      }
      if (typeof draw === 'function') {
        try { draw(); } catch (e) {}
      }

      replayLobbyEntrance();
    } finally {
      _isReturningToLobby = false;
    }
  }
  window.executeReturnToLobbySafely = executeReturnToLobbySafely;

  function preloadSlideIndex(idx) {
    const sc = DEMO_SCENES[(idx + DEMO_SCENES.length) % DEMO_SCENES.length];
    if (!sc || _preloadedSlideSet.has(sc.id)) return;
    _preloadedSlideSet.add(sc.id);
    const im = new Image();
    im.onerror = () => {
      _slideUseJpgFallback.add(sc.id);
      const fb = new Image();
      fb.src = sc.jpg;
    };
    im.src = sc.webp;
  }

  function advanceDemoSlide(nextIdx) {
    _slideIdx = (nextIdx + DEMO_SCENES.length) % DEMO_SCENES.length;
    const sc = DEMO_SCENES[_slideIdx];
    const layerA = $id('lobbySlideLayerA');
    const layerB = $id('lobbySlideLayerB');
    const tagEl = $id('lobbyDemoStageTag');
    if (!layerA || !layerB || !sc) return;

    const incoming = (_activeSlideBuffer === 'A') ? layerB : layerA;
    const outgoing = (_activeSlideBuffer === 'A') ? layerA : layerB;

    incoming.style.backgroundImage = getSlideBgCssUrl(sc);
    incoming.setAttribute('data-scene-id', sc.id);
    incoming.setAttribute('data-stage-code', sc.stageCode);
    incoming.classList.add('is-visible');
    outgoing.classList.remove('is-visible');
    _activeSlideBuffer = (_activeSlideBuffer === 'A') ? 'B' : 'A';

    if (tagEl) {
      tagEl.textContent = `🏞️ ${sc.title} (${_slideIdx + 1}/${DEMO_SCENES.length})`;
    }
    preloadSlideIndex(_slideIdx + 1);
  }

  function showLobbyToast(msg) {
    const t = $id('lobbyLockToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      t.classList.remove('visible');
    }, LOBBY_CONFIG.LOCK_TOAST_MS);
  }

  function isLobbyCurrentlyActive() {
    const ov = $id('overlay');
    const wmOv = $id('worldmapOverlay');
    if (!ov || ov.hidden) return false;
    if (ov.dataset.modalKind !== 'title') return false;
    if (wmOv && !wmOv.hidden) return false;
    return true;
  }

  function isSubModalOpen() {
    const kh = $id('lobbyPanelHost');
    const opt = $id('mobileSettingsModal');
    const retC = $id('returnToLobbyConfirmModal');
    return Boolean((kh && !kh.hidden) || (opt && !opt.hidden) || (retC && !retC.hidden));
  }

  function syncLobbyButtonStates() {
    const playBtn = $id('lobbyBtnPlay');
    const startBtn = $id('start');
    if (playBtn && startBtn) {
      playBtn.disabled = Boolean(startBtn.disabled || (typeof state !== 'undefined' && state === 'loading'));
    }
    const wmBtn = $id('lobbyBtnWorldMap');
    if (wmBtn) {
      const unlocked = (typeof isWorldMapUnlocked === 'function') ? Boolean(isWorldMapUnlocked()) : false;
      wmBtn.setAttribute('data-wm-locked', unlocked ? 'false' : 'true');
      const badge = $id('lobbyWmLockBadge');
      if (badge) {
        badge.textContent = unlocked ? '' : '🔒 미해금';
      }
    }
    syncReturnToLobbyOptionBtnVisibility();
  }

  function setLobbyNightMode(enableNight) {
    const lobby = $id('duduTitleLobby');
    if (!lobby) return;
    const nextNight = Boolean(enableNight);
    if (nextNight) {
      lobby.classList.add('is-night');
      if (_lobbyState === 'titleReady') _lobbyState = 'titleDark';
    } else {
      lobby.classList.remove('is-night');
      if (_lobbyState === 'titleDark') _lobbyState = 'titleReady';
    }
    if (nextNight !== _lastThemeNight) {
      _lastThemeNight = nextNight;
      _themeTransitionCount += 1;
    }
  }

  window.__setLobbyNightModeForQA = (flag) => {
    _visibleLobbyElapsedMs = flag ? LOBBY_CONFIG.THEME_PERIOD_MS + 100 : 0;
    _idleElapsedMs = _visibleLobbyElapsedMs;
    setLobbyNightMode(Boolean(flag));
  };

  window.__isDuduLobbyCoveringCanvas = () => {
    const lobby = $id('duduTitleLobby');
    if (!lobby || lobby.hidden || lobby.classList.contains('lobby-paused')) return false;
    if (_isTransitioning || lobby.classList.contains('is-leaving') || lobby.classList.contains('is-wiping')) return false;
    return isLobbyCurrentlyActive();
  };

  window.__getLobbyRuntimeState = () => ({
    lobbyState: _lobbyState,
    visibleLobbyElapsedMs: Math.round(_visibleLobbyElapsedMs),
    idleElapsedMs: Math.round(_visibleLobbyElapsedMs),
    themePeriodMs: LOBBY_CONFIG.THEME_PERIOD_MS,
    themeCycleIndex: Math.floor(_visibleLobbyElapsedMs / LOBBY_CONFIG.THEME_PERIOD_MS),
    themeTransitionCount: _themeTransitionCount,
    heroMasterSrc: $id('lobbyHeroDayImg')?.getAttribute('src') || '',
    heroParentId: $id('lobbyHero')?.parentElement?.id || '',
    slideIdx: _slideIdx,
    currentSlideId: DEMO_SCENES[_slideIdx]?.id || '',
    currentSlideStage: DEMO_SCENES[_slideIdx]?.stageCode || '',
    isNight: Boolean($id('duduTitleLobby')?.classList.contains('is-night')),
    isPaused: Boolean($id('duduTitleLobby')?.classList.contains('lobby-paused')),
    isActive: isLobbyCurrentlyActive(),
    nextSlideInMs: Math.max(0, Math.round(LOBBY_CONFIG.SLIDE_HOLD_MS + LOBBY_CONFIG.SLIDE_DISSOLVE_MS - _slideAccumMs)),
    nightInMs: Math.max(0, Math.round(LOBBY_CONFIG.THEME_PERIOD_MS - (_visibleLobbyElapsedMs % LOBBY_CONFIG.THEME_PERIOD_MS))),
    prefersReducedMotion: Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  });

  function resetIdleTimerOnInput() {
    // v5 Master Spec §0-5 & §4.4 (L03~L05):
    // Mouse move, hover, button clicks, keyboard focus, and opening/closing sub-modals
    // MUST NEVER reset or alter the 35-second periodic Day<->Night timer!
  }

  function openLobbyKeyHelp() {
    const host = $id('lobbyPanelHost');
    if (!host) return;
    host.hidden = false;
    _lobbyState = 'titleModal';
    resetIdleTimerOnInput();
    const closeBtn = $id('closeLobbyKeyHelpBtn');
    if (closeBtn) closeBtn.focus();
  }

  function closeLobbyKeyHelp() {
    const host = $id('lobbyPanelHost');
    if (!host || host.hidden) return;
    host.hidden = true;
    _lobbyState = 'titleReady';
    resetIdleTimerOnInput();
    const khBtn = $id('lobbyBtnKeyHelp');
    if (khBtn) khBtn.focus();
  }

  function runLeaveTransitionThen(callback) {
    if (_isTransitioning) return;
    _isTransitioning = true;
    _lobbyState = 'titleLeaving';
    const lobby = $id('duduTitleLobby');
    if (!lobby) {
      _isTransitioning = false;
      callback();
      return;
    }
    lobby.classList.add('is-leaving');
    setTimeout(() => {
      lobby.classList.add('is-wiping');
    }, 120);

    setTimeout(() => {
      try {
        callback();
      } finally {
        _isTransitioning = false;
        setTimeout(() => {
          if (lobby) {
            lobby.classList.remove('is-leaving', 'is-wiping');
          }
        }, 120);
      }
    }, LOBBY_CONFIG.LEAVE_DURATION_MS);
  }

  function replayLobbyEntrance() {
    const lobby = $id('duduTitleLobby');
    if (!lobby) return;
    _isTransitioning = false;
    _visibleLobbyElapsedMs = 0;
    _idleElapsedMs = 0;
    _lastThemeNight = false;
    _lastTickAt = performance.now();
    setLobbyNightMode(false);
    lobby.classList.remove('is-leaving', 'is-wiping', 'lobby-paused');
    _lobbyState = 'titleReady';
    syncLobbyButtonStates();
  }
  window.__replayDuduLobbyEntrance = replayLobbyEntrance;

  function bindLobbyEvents(lobbyEl) {
    // V4.1: Cursor motion alone must NOT prevent the 35-second ambient night transition.
    // Treat deliberate input as activity, but a hovering/moving mouse as night-mode wake only.
    // This preserves the original 'move to wake day mode' behavior without constantly
    // resetting the ambient timer while the user browses the lobby.
    // v5 Master Spec §0-5 & §4.4: Day<->Night toggles strictly every 35,000ms of visible lobby time
    // regardless of pointermove, hover, pointerdown, touchstart, keydown, or wheel events.

    const allBtns = lobbyEl.querySelectorAll('.lobbyCapsuleBtn');
    allBtns.forEach((btn) => {
      const wrap = btn.closest('.lobbyMenuBtnWrap');
      const setHighlight = (on) => {
        if (on) {
          allBtns.forEach((other) => {
            if (other !== btn) {
              other.classList.remove('is-hovered');
              other.closest('.lobbyMenuBtnWrap')?.removeAttribute('data-active-menu');
            }
          });
          btn.classList.add('is-hovered');
          if (wrap) wrap.setAttribute('data-active-menu', 'true');
        } else {
          btn.classList.remove('is-hovered');
          if (wrap) wrap.removeAttribute('data-active-menu');
        }
      };
      btn.addEventListener('pointerenter', () => setHighlight(true));
      btn.addEventListener('pointerleave', () => setHighlight(false));
      btn.addEventListener('focus', () => setHighlight(true));
      btn.addEventListener('blur', () => setHighlight(false));
    });

    const btnPlay = $id('lobbyBtnPlay');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (_isTransitioning) return;
        if (typeof state !== 'undefined' && state === 'loading') return;
        btnPlay.classList.add('is-pressed');
        setTimeout(() => btnPlay.classList.remove('is-pressed'), 160);
        runLeaveTransitionThen(() => {
          const origStartBtn = $id('start');
          if (origStartBtn && typeof origStartBtn.onclick === 'function') {
            origStartBtn.onclick();
          } else if (origStartBtn) {
            origStartBtn.click();
          } else if (typeof start === 'function') {
            start();
          }
        });
      });
    }

    const btnWm = $id('lobbyBtnWorldMap');
    if (btnWm) {
      btnWm.addEventListener('click', () => {
        if (_isTransitioning) return;
        syncLobbyButtonStates();
        const unlocked = (typeof isWorldMapUnlocked === 'function') ? Boolean(isWorldMapUnlocked()) : false;
        if (!unlocked) {
          showLobbyToast('🔒 스토리 모드를 1회 완주하면 월드맵(수인숲 나들이)이 해금됩니다!');
          if (typeof tone === 'function') tone(240, 0.12, 'triangle', 0.035);
          return;
        }
        btnWm.classList.add('is-pressed');
        setTimeout(() => btnWm.classList.remove('is-pressed'), 160);
        runLeaveTransitionThen(() => {
          if (typeof openWorldMapMenu === 'function') {
            openWorldMapMenu();
          }
        });
      });
    }

    const btnCh = $id('lobbyBtnChallenge');
    if (btnCh) {
      btnCh.addEventListener('click', () => {
        if (_isTransitioning) return;
        btnCh.classList.add('is-pressed');
        setTimeout(() => btnCh.classList.remove('is-pressed'), 160);
        runLeaveTransitionThen(() => {
          const origChBtn = $id('startChallengeBtn');
          if (origChBtn) {
            origChBtn.click();
          } else if (typeof startChallengeMode === 'function') {
            startChallengeMode();
          }
        });
      });
    }

    const btnKh = $id('lobbyBtnKeyHelp');
    if (btnKh) {
      btnKh.addEventListener('click', () => {
        if (_isTransitioning) return;
        btnKh.classList.add('is-pressed');
        setTimeout(() => btnKh.classList.remove('is-pressed'), 140);
        openLobbyKeyHelp();
      });
    }

    const closeKh1 = $id('closeLobbyKeyHelpBtn');
    const closeKh2 = $id('confirmLobbyKeyHelpBtn');
    const panelHost = $id('lobbyPanelHost');
    if (closeKh1) closeKh1.addEventListener('click', closeLobbyKeyHelp);
    if (closeKh2) closeKh2.addEventListener('click', closeLobbyKeyHelp);
    if (panelHost) {
      panelHost.addEventListener('click', (e) => {
        if (e.target === panelHost) closeLobbyKeyHelp();
      });
    }

    const btnOpt = $id('lobbyBtnOptions');
    if (btnOpt) {
      btnOpt.addEventListener('click', () => {
        if (_isTransitioning) return;
        btnOpt.classList.add('is-pressed');
        setTimeout(() => btnOpt.classList.remove('is-pressed'), 140);
        resetIdleTimerOnInput();
        _lobbyState = 'titleModal';
        syncReturnToLobbyOptionBtnVisibility();
        const origOptBtn = $id('modalMobileOptBtn') || $id('mobileOptBtn');
        if (origOptBtn) {
          origOptBtn.click();
        }
        syncReturnToLobbyOptionBtnVisibility();
      });
    }

    ['mobileOptBtn', 'modalMobileOptBtn'].forEach((idStr) => {
      const el = $id(idStr);
      if (el) {
        el.addEventListener('click', () => {
          setTimeout(syncReturnToLobbyOptionBtnVisibility, 0);
        });
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const retConfirm = $id('returnToLobbyConfirmModal');
        if (retConfirm && !retConfirm.hidden) {
          e.preventDefault();
          e.stopPropagation();
          retConfirm.hidden = true;
          return;
        }
        if (isLobbyCurrentlyActive()) {
          const host = $id('lobbyPanelHost');
          if (host && !host.hidden) {
            e.preventDefault();
            e.stopPropagation();
            closeLobbyKeyHelp();
          }
        }
      }
    }, true);

    document.addEventListener('visibilitychange', () => {
      const lobby = $id('duduTitleLobby');
      if (document.hidden) {
        if (lobby) lobby.classList.add('lobby-paused');
      } else if (isLobbyCurrentlyActive()) {
        _lastTickAt = performance.now();
        if (lobby) lobby.classList.remove('lobby-paused');
      }
    });

    if (typeof window.backFromWorldMapToMainMenu === 'function') {
      const _origBackWm = window.backFromWorldMapToMainMenu;
      window.backFromWorldMapToMainMenu = function() {
        _origBackWm.apply(this, arguments);
        replayLobbyEntrance();
      };
      try { backFromWorldMapToMainMenu = window.backFromWorldMapToMainMenu; } catch (e) {}
    }
  }

  function preloadInitialAssets() {
    const imD = new Image();
    imD.src = LOBBY_CONFIG.HERO_MASTER_DAY_SRC;
    const imN = new Image();
    imN.src = LOBBY_CONFIG.HERO_MASTER_NIGHT_SRC;
    preloadSlideIndex(0);
    preloadSlideIndex(1);
  }

  function advanceLobbyTimersBy(dt) {
    // 1. Advance 7-Scene Real-Map Cross-Dissolve Slideshow (`4000ms` hold + `850ms` dissolve = `4850ms` step)
    const slideStepMs = LOBBY_CONFIG.SLIDE_HOLD_MS + LOBBY_CONFIG.SLIDE_DISSOLVE_MS;
    _slideAccumMs += dt;
    while (_slideAccumMs >= slideStepMs) {
      _slideAccumMs -= slideStepMs;
      advanceDemoSlide(_slideIdx + 1);
    }

    // 2. Advance 35-second periodic Day <-> Night theme cycle (`THEME_PERIOD_MS = 35000`)
    // Strictly independent of mouse move, hover, button clicks, keyboard focus, or sub-modal open/close!
    _visibleLobbyElapsedMs += dt;
    _idleElapsedMs = _visibleLobbyElapsedMs;
    const shouldBeNight = (Math.floor(_visibleLobbyElapsedMs / LOBBY_CONFIG.THEME_PERIOD_MS) % 2) === 1;
    setLobbyNightMode(shouldBeNight);
  }
  window.__advanceLobbyTimeForQA = advanceLobbyTimersBy;

  let _wasActiveLastFrame = false;
  function lobbyTick(now) {
    const dt = Math.min(250, Math.max(0, now - _lastTickAt));
    _lastTickAt = now;

    const active = isLobbyCurrentlyActive();
    const lobby = $id('duduTitleLobby');

    if (active) {
      if (!_wasActiveLastFrame) {
        replayLobbyEntrance();
      }
      _wasActiveLastFrame = true;
      syncLobbyButtonStates();

      if (lobby && lobby.classList.contains('lobby-paused') && !document.hidden) {
        lobby.classList.remove('lobby-paused');
      }

      const gameSt = (typeof state !== 'undefined') ? state : 'ready';
      if (!document.hidden && !_isTransitioning) {
        if (!isSubModalOpen() && _lobbyState === 'titleModal') {
          _lobbyState = lobby?.classList.contains('is-night') ? 'titleDark' : 'titleReady';
        }
        advanceLobbyTimersBy(dt);
      }
    } else {
      if (_wasActiveLastFrame) {
        _wasActiveLastFrame = false;
        _lobbyState = 'titleHidden';
        _visibleLobbyElapsedMs = 0;
        _idleElapsedMs = 0;
        _lastThemeNight = false;
        if (lobby) {
          lobby.classList.add('lobby-paused');
          lobby.classList.remove('is-leaving', 'is-wiping', 'is-night');
        }
        const host = $id('lobbyPanelHost');
        if (host && !host.hidden) host.hidden = true;
      }
      syncReturnToLobbyOptionBtnVisibility();
    }

    requestAnimationFrame(lobbyTick);
  }

  let _lobbyMounted = false;
  function startLobbyController() {
    const checkMount = () => {
      if (_lobbyMounted) return;
      if ($id('overlay')) {
        _lobbyMounted = true;
        mountTitleLobbyDOM();
        preloadInitialAssets();
        _lastTickAt = performance.now();
        requestAnimationFrame(lobbyTick);
      } else {
        setTimeout(checkMount, 40);
      }
    };
    checkMount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLobbyController);
  } else {
    startLobbyController();
  }
})();
