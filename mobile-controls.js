'use strict';
// TEST24 Mobile Touch Controls & Responsive Input Router (Gate M0)
// - Provides a unified logical input router: `pressInput(code, sourceId)`, `releaseInput(code, sourceId)`, `releaseAllInputs(reason)`.
// - Supports multi-touch simultaneous input (e.g. Left/Right + Jump + Dash).
// - Calls native game physics handlers (`beginJump`, `beginDash`, `keys.add/delete`) identically to physical keys.
// - Features portrait orientation warning overlay with automatic pause on rotation.

const inputSourceMap = new Map(); // Map<logicalCode, Set<sourceId>>

function pressInput(code, sourceId = 'touch') {
  if (!code) return;
  let sources = inputSourceMap.get(code);
  if (!sources) {
    sources = new Set();
    inputSourceMap.set(code, sources);
  }
  const wasEmpty = sources.size === 0;
  sources.add(sourceId);

  if (wasEmpty) {
    keys.add(code);
    if (typeof p !== 'undefined' && p.guardStun > 0) return;

    if (code === 'Space') {
      if (keys.has('ArrowDown') && p.ground && p.on?.thin && !p.on?.dropThroughDisabled) {
        p.drop = p.on; p.y += 3; p.ground = false; p.on = null; p.coyote = 0; p.jumps = 1; p.vy = 70; p.buffer = 0; p.jumpHeld = false;
        lookDownHold = 0;
      } else {
        p.buffer = 0.12;
      }
    } else if (code === 'ShiftLeft') {
      dashRequest = true;
    } else if (code === 'KeyR') {
      if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
        if (typeof retryChallengeStage === 'function') retryChallengeStage();
      } else {
        if (typeof chooseSection === 'function') chooseSection(checkpoint);
      }
    } else if (code === 'Escape') {
      if (typeof pause === 'function') pause();
    }
  }
}

function releaseInput(code, sourceId = 'touch') {
  if (!code) return;
  const sources = inputSourceMap.get(code);
  if (sources) {
    sources.delete(sourceId);
    if (sources.size === 0) {
      keys.delete(code);
      if (code === 'Space' && typeof p !== 'undefined') {
        if (p.hold < (p.jumps === 2 ? 0.22 : 0.24)) p.jumpCut = true;
        p.jumpHeld = false;
      }
    }
  } else {
    keys.delete(code);
  }
}

function releaseAllInputs(reason = 'reset') {
  inputSourceMap.clear();
  keys.clear();
  if (typeof p !== 'undefined') {
    p.jumpHeld = false;
  }
  dashRequest = false;
  document.querySelectorAll('.vbtn').forEach(btn => btn.classList.remove('active'));
}

window.pressInput = pressInput;
window.releaseInput = releaseInput;
window.releaseAllInputs = releaseAllInputs;

// Setup On-Screen Virtual Touch Buttons
function setupMobileControls() {
  const dpadLeft = $('vbtn-left');
  const dpadRight = $('vbtn-right');
  const dpadDown = $('vbtn-down');
  const btnJump = $('vbtn-jump');
  const btnDash = $('vbtn-dash');
  const btnPause = $('vbtn-pause');
  const btnRetry = $('vbtn-retry');

  const bindings = [
    { el: dpadLeft, code: 'ArrowLeft' },
    { el: dpadRight, code: 'ArrowRight' },
    { el: dpadDown, code: 'ArrowDown' },
    { el: btnJump, code: 'Space' },
    { el: btnDash, code: 'ShiftLeft' },
    { el: btnPause, code: 'Escape' },
    { el: btnRetry, code: 'KeyR' }
  ];

  bindings.forEach(({ el, code }) => {
    if (!el) return;
    const activePointers = new Set();

    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      activePointers.add(e.pointerId);
      el.classList.add('active');
      pressInput(code, `touch_${e.pointerId}`);
    });

    const onPointerEnd = e => {
      if (activePointers.has(e.pointerId)) {
        activePointers.delete(e.pointerId);
        releaseInput(code, `touch_${e.pointerId}`);
      }
      if (activePointers.size === 0) {
        el.classList.remove('active');
      }
    };

    el.addEventListener('pointerup', onPointerEnd);
    el.addEventListener('pointercancel', onPointerEnd);
    el.addEventListener('lostpointercapture', onPointerEnd);
  });

  // Touch on story cutscene to advance
  const storyEl = $('story');
  if (storyEl) {
    storyEl.addEventListener('pointerdown', e => {
      if (typeof storyAdvance === 'function') storyAdvance();
    });
  }

  // Portrait Orientation Detection & Prompt
  function checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 850;
    const rotatePrompt = $('portraitWarning');
    if (rotatePrompt) {
      rotatePrompt.hidden = !isPortrait;
    }
    if (isPortrait && state === 'playing') {
      if (typeof pause === 'function') pause();
    }
  }

  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileControls);
} else {
  setupMobileControls();
}
