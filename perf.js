// ============================================================================
// v1.4 PERFORMANCE: oversized image tiling
//
// Mobile GPUs cap a single texture at 4096-8192px. A few of this game's images are wider than that
// (Dudu's win sheet is 13824px, the Erpien panoramas 8800-9800px). Drawing them from a GPU canvas forces
// the browser to re-split and upload them on every frame, which shows up as stutter on phones.
//
// This file loads first. Every image (or cached canvas) wider than MAX_SIDE is copied once into
// horizontal tiles no wider than TILE_W, a little at a time while the browser is idle. drawImage is
// wrapped so that, once tiles exist, it draws only the tile pieces the source rectangle touches.
// Callers keep passing the original image; nothing else in the game changes.
// ============================================================================
(function () {
  'use strict';
  const MAX_SIDE = 4096;
  const TILE_W = 2048;
  const PAD = 2; // panorama tiles overlap by a few pixels so smoothing never samples past an edge
  const tiles = new WeakMap(); // source -> { list:[{x0,x1,canvas,pad}], h, frame }
  const pending = new WeakSet();
  const queue = [];

  const proto = CanvasRenderingContext2D.prototype;
  const nativeDrawImage = proto.drawImage;

  function sizeOf(src) {
    const w = src.naturalWidth || src.videoWidth || src.width || 0;
    const h = src.naturalHeight || src.videoHeight || src.height || 0;
    return [w, h];
  }

  // Sprite sheets are a row of square frames (192x192). Tile on frame boundaries so a frame never straddles two tiles.
  function tileWidthFor(w, h) {
    if (h <= 256 && w % h === 0) return Math.max(h, Math.floor(TILE_W / h) * h);
    return TILE_W;
  }

  function buildTileSet(src) {
    const [w, h] = sizeOf(src);
    const tw = tileWidthFor(w, h);
    const sprite = tw !== TILE_W;
    const pad = sprite ? 0 : PAD;
    const set = { list: [], h, w, done: 0, total: Math.ceil(w / tw), tw, pad };
    return set;
  }

  function buildOneTile(src, set) {
    const i = set.done;
    const x0 = i * set.tw;
    const x1 = Math.min(set.w, x0 + set.tw);
    const cx0 = Math.max(0, x0 - set.pad);
    const cx1 = Math.min(set.w, x1 + set.pad);
    const c = document.createElement('canvas');
    c.width = cx1 - cx0;
    c.height = set.h;
    const g = c.getContext('2d');
    nativeDrawImage.call(g, src, cx0, 0, cx1 - cx0, set.h, 0, 0, cx1 - cx0, set.h);
    set.list.push({ x0, x1, cx0, canvas: c });
    set.done++;
  }

  const idle = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 400 })
    : (fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 16);

  function pump(deadline) {
    while (queue.length) {
      const job = queue[0];
      try {
        buildOneTile(job.src, job.set);
      } catch (e) {
        queue.shift();
        pending.delete(job.src);
        continue;
      }
      if (job.set.done >= job.set.total) {
        queue.shift();
        pending.delete(job.src);
        tiles.set(job.src, job.set);
      }
      if (!deadline || deadline.timeRemaining() < 4) break;
    }
    if (queue.length) idle(pump);
  }

  function scheduleTiling(src, immediate) {
    if (!src || tiles.has(src) || pending.has(src)) return;
    const [w, h] = sizeOf(src);
    if (!(w > MAX_SIDE) || h > MAX_SIDE) return;
    const set = buildTileSet(src);
    if (immediate) {
      while (set.done < set.total) buildOneTile(src, set);
      tiles.set(src, set);
      return;
    }
    pending.add(src);
    queue.push({ src, set });
    if (queue.length === 1) idle(pump);
  }
  window.duduTileSource = scheduleTiling;

  // Wrap the Image constructor so every image the game creates is checked once it has loaded.
  const NativeImage = window.Image;
  function TrackedImage(w, h) {
    const im = arguments.length >= 2 ? new NativeImage(w, h) : (arguments.length === 1 ? new NativeImage(w) : new NativeImage());
    im.addEventListener('load', () => {
      const [iw] = sizeOf(im);
      if (iw > MAX_SIDE) scheduleTiling(im, false);
    });
    return im;
  }
  TrackedImage.prototype = NativeImage.prototype;
  window.Image = TrackedImage;

  proto.drawImage = function (src, a, b, c, d, e, f, g, h) {
    const set = src && tiles.get(src);
    if (!set) {
      // Big source without tiles yet (still queued): draw it directly this frame, and make sure it is queued.
      if (src && (src.width > MAX_SIDE || src.naturalWidth > MAX_SIDE) && !pending.has(src)) scheduleTiling(src, false);
      return nativeDrawImage.apply(this, arguments);
    }
    let sx, sy, sw, sh, dx, dy, dw, dh;
    const n = arguments.length;
    if (n >= 9) { sx = a; sy = b; sw = c; sh = d; dx = e; dy = f; dw = g; dh = h; }
    else if (n >= 5) { sx = 0; sy = 0; sw = set.w; sh = set.h; dx = a; dy = b; dw = c; dh = d; }
    else { sx = 0; sy = 0; sw = set.w; sh = set.h; dx = a; dy = b; dw = set.w; dh = set.h; }
    if (sw < 0) { sx += sw; sw = -sw; dx += dw; dw = -dw; }
    if (sw === 0 || sh === 0) return;
    const scale = dw / sw;
    const sEnd = sx + sw;
    for (const t of set.list) {
      if (t.x1 <= sx || t.x0 >= sEnd) continue;
      const px0 = Math.max(sx, t.x0);
      const px1 = Math.min(sEnd, t.x1);
      // Panorama pieces reach half a pixel into the neighbour so adjacent pieces overlap instead of leaving a hairline.
      const ov = set.pad ? 0.5 : 0;
      const qx0 = Math.max(t.cx0, px0 - (px0 > sx ? ov : 0));
      const qx1 = Math.min(t.cx0 + t.canvas.width, px1 + (px1 < sEnd ? ov : 0));
      nativeDrawImage.call(this, t.canvas, qx0 - t.cx0, sy, qx1 - qx0, sh,
        dx + (qx0 - sx) * scale, dy, (qx1 - qx0) * scale, dh);
    }
  };
})();

// ============================================================================
// v1.4 FRAME MONITOR
// - Light mode: when the last 2 seconds average slower than 24ms a frame (under ~42fps), decorative overlays
//   (pit shade, soil depth shading, map edge mist) switch off; they come back once frames average under 18.5ms.
// - Add ?fps=1 to the address to show live frame stats on the device: fps, slowest frame in the last
//   2 seconds, and how many frames took longer than 50ms since the page opened.
// ============================================================================
(function () {
  const showFps = /[?&]fps=1\b/.test(location.search);
  window.duduLightMode = false;
  let last = 0, sum = 0, n = 0, worst = 0, windowStart = 0, hitches = 0, el = null;
  function tick(t) {
    if (last) {
      const d = t - last;
      if (d < 1000) { // ignore tab switches and pauses
        sum += d; n++; if (d > worst) worst = d; if (d > 50) hitches++;
      }
    }
    last = t;
    if (!windowStart) windowStart = t;
    if (t - windowStart >= 2000 && n > 0) {
      const avg = sum / n;
      const playing = typeof state !== 'undefined' && state === 'playing';
      if (playing) {
        // a 60Hz screen averages 16.7ms per frame, so 'recovered' must sit above that
        if (!window.duduLightMode && avg > 24) window.duduLightMode = true;
        else if (window.duduLightMode && avg < 18.5) window.duduLightMode = false;
      }
      if (showFps) {
        if (!el) {
          el = document.createElement('div');
          el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;font:12px/1.3 monospace;color:#fff;background:rgba(0,0,0,.6);padding:4px 7px;border-radius:6px;pointer-events:none;white-space:pre';
          document.body.appendChild(el);
        }
        el.textContent = `${(1000 / avg).toFixed(0)} fps  avg ${avg.toFixed(1)}ms\nslowest ${worst.toFixed(0)}ms  >50ms x${hitches}\n${window.duduLightMode ? 'light mode' : 'full effects'}`;
      }
      sum = 0; n = 0; worst = 0; windowStart = t;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
