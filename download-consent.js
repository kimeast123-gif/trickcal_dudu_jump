// ============================================================================
// v1.8.5: ask before the first big download on a phone or tablet.
//
// A first visit pulls about 39MB of pictures (NPCs, backgrounds, terrain, Dudu's motions). On a phone that may be
// mobile data, so nothing past the page itself (about 1.4MB of code, styles and the font) is fetched until the player
// says yes. Everything that downloads pictures at start-up waits on `window.duduDownloadGate`:
//   game.js boot (Dudu, current region, NPCs, event art, then every region in the background), the title lobby,
//   terrain-art.js. Once allowed, the choice is kept (localStorage) and the browser cache keeps the files, so later
//   visits only fetch what changed.
// Desktop never asks. Automated QA browsers (navigator.webdriver) skip the question unless the address has ?dlgate=1.
// Re-measure FIRST_DOWNLOAD_MB with `python tools/qa/first_load_size.py` when big assets change.
// ============================================================================
(function () {
  'use strict';
  const FIRST_DOWNLOAD_MB = 39;
  const KEY = 'dudu_download_ok_v1';

  let allowed = false;
  try { allowed = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage blocked: ask every visit */ }
  const mobile = typeof isMobileOrTabletViewport === 'function' && isMobileOrTabletViewport();
  const automated = navigator.webdriver && !/[?&]dlgate=1\b/.test(location.search);
  if (allowed || !mobile || automated) {
    window.duduDownloadAllowed = true;
    window.duduDownloadGate = Promise.resolve();
    return;
  }

  window.duduDownloadAllowed = false;
  let release;
  window.duduDownloadGate = new Promise((ok) => { release = ok; });

  function connectionNote() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return '';
    if (c.saveData) return '데이터 절약 모드가 켜져 있어요.';
    if (c.type === 'cellular') return '지금 모바일 데이터로 연결돼 있어요.';
    if (c.type === 'wifi' || c.type === 'ethernet') return '지금 와이파이로 연결돼 있어요.';
    return '';
  }

  function mount() {
    const style = document.createElement('style');
    style.textContent = `
      #duduDownloadAsk { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center;
        padding: 16px; background: radial-gradient(circle at 50% 35%, #fff8e6 0%, #f3e6c8 70%, #e7d4ab 100%);
        font-family: "ONE Mobile POP", system-ui, sans-serif; color: #4b3a1c; }
      #duduDownloadAsk .ddaCard { width: min(440px, 100%); max-height: 100%; overflow: auto; background: #fffdf6;
        border: 3px solid #e2c27a; border-radius: 22px; padding: 18px 20px 16px; box-shadow: 0 6px 0 #c9a55c, 0 16px 34px rgba(80, 55, 15, 0.25); text-align: center; }
      #duduDownloadAsk h2 { margin: 0 0 8px; font-size: 20px; color: #5b8a2a; }
      #duduDownloadAsk .ddaSize { margin: 6px auto 10px; display: inline-block; padding: 6px 14px; border-radius: 999px; background: #fff1c7;
        border: 2px solid #e8b64a; font-size: 18px; color: #8a4f0a; }
      #duduDownloadAsk p { margin: 6px 0; font-size: 14px; line-height: 1.5; color: #4b3a1c; }
      #duduDownloadAsk .ddaNote { color: #8a6420; font-size: 13px; }
      #duduDownloadAsk .ddaBtns { display: flex; gap: 10px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
      #duduDownloadAsk button { font: inherit; font-size: 16px; border-radius: 999px; padding: 10px 20px; cursor: pointer; border: 2px solid transparent; }
      #duduDownloadAsk .ddaYes { background: linear-gradient(180deg, #b6e35c, #79bd34); border-color: #5f9a26; color: #fff; text-shadow: 0 1px 0 rgba(40, 70, 10, 0.5); box-shadow: 0 3px 0 #4f8320; }
      #duduDownloadAsk .ddaLater { background: #f5ecd7; border-color: #d8c49a; color: #6a5530; }
      @media (max-height: 420px) { #duduDownloadAsk .ddaCard { padding: 12px 16px 12px; } #duduDownloadAsk h2 { font-size: 17px; margin-bottom: 4px; } #duduDownloadAsk p { margin: 3px 0; } }
    `;
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'duduDownloadAsk';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'ddaTitle');
    const note = connectionNote();
    box.innerHTML = `
      <div class="ddaCard">
        <h2 id="ddaTitle">두두 데이터 받기</h2>
        <div class="ddaSize">약 ${FIRST_DOWNLOAD_MB}MB</div>
        <p id="ddaText">처음 한 번 게임 그림을 받아야 해요. 모바일 데이터라면 요금이 나올 수 있어서 와이파이에서 받는 걸 추천해요.</p>
        ${note ? `<p class="ddaNote">${note}</p>` : ''}
        <p class="ddaNote">한 번 받으면 다음부터는 바뀐 그림만 조금 받아요.</p>
        <div class="ddaBtns">
          <button type="button" class="ddaYes" id="ddaYes">받고 시작하기</button>
          <button type="button" class="ddaLater" id="ddaLater">나중에 받기</button>
        </div>
      </div>`;
    document.body.appendChild(box);

    document.getElementById('ddaYes').addEventListener('click', () => {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* this visit only */ }
      window.duduDownloadAllowed = true;
      box.remove();
      style.remove();
      release();
    });
    document.getElementById('ddaLater').addEventListener('click', () => {
      document.getElementById('ddaText').textContent = '좋아요, 아직 아무것도 받지 않았어요. 와이파이에 연결한 뒤 아래 버튼을 눌러 주세요.';
      document.getElementById('ddaYes').textContent = '지금 받기';
      document.getElementById('ddaLater').hidden = true;
    });
    document.getElementById('ddaYes').focus();
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
