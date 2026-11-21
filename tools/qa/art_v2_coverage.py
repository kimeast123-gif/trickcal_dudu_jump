"""Art phase 2, step P2-A: which render path and which image draws every terrain object (no play-through).

    python tools/qa/art_v2_coverage.py            # writes docs/art_v2/ART_V2_RENDER_COVERAGE.csv (+ .json)

For every platform, wall, ceiling, floor and roof object of the target areas, the object is drawn once on its own
(camera moved onto it, game loop stopped) while ctx.drawImage and the terrain render functions are recorded.
That gives the real branch and the real image files, not a guess from file names.

Target areas (directive Phase 2): story 수인숲, World1 1-1..1-4 (1-5 is listed as context), Spirit Mountain
(out / cave / lava / snow). The candidate art (art-prototype.js) is recorded on and off (?arttest).
"""
import asyncio, csv, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, play

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs', 'art_v2')

JS = r"""(stage)=>{
 const FN = ['drawThinPlatformVisual','drawGroundVisual','drawStructuralWall','drawSpiritTile','drawSpiritGlow',
   'drawSpiritRock','drawSpiritOuterWall','drawSpiritFloor','drawSpiritLedge','drawNightPlatform'];
 const calls = [];
 const saved = {};
 for (const n of FN) if (typeof window[n] === 'function') { saved[n] = window[n]; window[n] = function(){ calls.push(n); return saved[n].apply(this, arguments); }; }
 const di = ctx.drawImage; let rec = null;
 ctx.drawImage = function(im){ if (rec) { const a = arguments; const src = (im && (im.currentSrc || im.src)) || (im && im.tagName) || 'canvas';
    let sw, sh, dw, dh, dy;
    if (a.length >= 9) { sw=a[3]; sh=a[4]; dw=a[7]; dh=a[8]; dy=a[6]; } else if (a.length >= 5) { sw=im.width; sh=im.height; dw=a[3]; dh=a[4]; dy=a[2]; } else { sw=im.width; sh=im.height; dw=sw; dh=sh; dy=a[2]; }
    rec.push({ src: String(src).split('?')[0].split('/').slice(-2).join('/'), sx: +(dw/sw).toFixed(3), sy: +(dh/sh).toFixed(3), dy: Math.round(dy) }); }
   return di.apply(this, arguments); };
 const fr = ctx.fillRect, fl = ctx.fill; let prim = 0;
 ctx.fillRect = function(){ if (rec) prim++; return fr.apply(this, arguments); };
 ctx.fill = function(){ if (rec) prim++; return fl.apply(this, arguments); };
 const rows = [];
 const zoneOf = (a) => (a.smDraw && typeof smZoneOf === 'function') ? smZoneOf(a) : '';
 for (const a of platforms) {
   calls.length = 0; rec = []; prim = 0;
   const cx = a.x + Math.min(a.w, 1200) / 2 - 640, cy = a.y - 360;
   rCam = cam = cx; rCamY = camY = cy; rCamZoom = camZoom = 1;
   if (a.blink) { a.blinkState = 'on'; a.blinkAlpha = 1; a.collidable = true; }
   ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.translate(-Math.round(rCam), -Math.round(rCamY));
   let err = '';
   try { drawPlatform(a); } catch (e) { err = String(e).slice(0, 80); }
   ctx.restore();
   const kind = a.smDraw ? ('sm:' + a.smDraw) : a.groundTile ? 'ground' : a.ceiling ? 'ceiling' : a.wall ? 'wall' : a.nonCollidable ? 'noncollidable' : 'thin';
   rows.push({ stage, id: a.id || '', zone: zoneOf(a), kind, x: Math.round(a.x), y: Math.round(a.y), w: Math.round(a.w), h: Math.round(a.h || 0),
     collidable: !(a.nonCollidable || a.collidable === false && !a.blink), blink: !!a.blink, moving: !!a.motion, noTopLand: !!a.noTopLand,
     skin: (a.visual && a.visual.material) || a.skin || '', calls: [...new Set(calls)], imgs: rec, prim, err,
     proto: !!(window.__artProto && window.__DUDU_ART_PROTOTYPE_TEST && window.__artProto.applies(a)) });
 }
 rec = null; ctx.drawImage = di; ctx.fillRect = fr; ctx.fill = fl;
 for (const n of Object.keys(saved)) window[n] = saved[n];
 return rows;
}"""


async def collect(pg):
    out = []
    await play(pg, 0, 200, 580); await pg.wait_for_timeout(400)
    await pg.evaluate("()=>{state='paused';}")
    out += await pg.evaluate(JS, 'story_forest')
    for i in range(5):
        await pg.evaluate(f"()=>{{loadWorld1Stage({i},{{section:0,entryRoute:'default'}});state='paused';document.getElementById('overlay').hidden=true;}}")
        await pg.wait_for_timeout(400)
        out += await pg.evaluate(JS, f'world1_{i + 1}')
    await pg.evaluate("()=>{devPracticeSpirit(376,-449);state='paused';}")
    await pg.wait_for_timeout(1200)
    out += await pg.evaluate(JS, 'spirit')
    return out


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = serve()
    res = {}
    async with async_playwright() as pw:
        for mode, q in (('proto_on', ''), ('proto_off', '?arttest=0')):
            b, pg, errs = await open_desktop(pw, query=q)
            res[mode] = await collect(pg)
            print(mode, len(res[mode]), 'objects; page errors:', errs[:3])
            await b.close()
    srv.shutdown()
    json.dump(res, open(os.path.join(OUT, 'art_v2_coverage_raw.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('raw written')

asyncio.run(main())
