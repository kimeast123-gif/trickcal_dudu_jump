"""Render every story level from start to end at a fixed camera step and save contact sheets.

    python tools/qa/screens.py [out_dir]          # default tools/qa/out/screens

Use it before and after visual changes and compare the sheets side by side. Blinking platforms are drawn 'on'.
"""
import asyncio, base64, io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, LEVELS
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'out', 'screens')
STEP = 1150

CAM_JS = """([li,x])=>{const L=levels[li];const ps=L.platforms.filter(q=>q.x<x+1280&&q.x+q.w>x);
 const ground=ps.filter(q=>q.assetType==='GROUND_SURFACE').map(q=>q.y);
 const thin=ps.filter(q=>q.thin).map(q=>q.y);
 const ref=ground.length?Math.min(...ground):(thin.length?Math.max(...thin)+60:580);
 let cy=ref-560;if(L.minCamY!=null)cy=Math.max(L.minCamY,cy);if(L.maxCamY!=null)cy=Math.min(L.maxCamY,cy);
 cam=x;prevCam=x;rCam=x;camY=cy;prevCamY=cy;rCamY=cy;camZoom=1;rCamZoom=1;
 for(const q of platforms)if(q.blink){q.blinkState='on';q.blinkAlpha=1;}
 draw();return canvas.toDataURL('image/png')}"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        for li, name in enumerate(LEVELS):
            await pg.evaluate(f"()=>{{loadLevel({li});levelIndex={li};state='paused';}}")
            await pg.wait_for_timeout(1500)
            ww = await pg.evaluate(f"()=>levels[{li}].worldWidth")
            frames, x = [], 0
            while x < ww - 600:
                d = await pg.evaluate(CAM_JS, [li, x])
                im = Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGB').resize((640, 360))
                ImageDraw.Draw(im).rectangle([0, 0, 120, 18], fill='black')
                ImageDraw.Draw(im).text((4, 3), f'{name} x{x}', fill='yellow')
                frames.append(im); x += STEP
            for part in range(0, len(frames), 8):
                chunk = frames[part:part + 8]
                sheet = Image.new('RGB', (1280, 360 * ((len(chunk) + 1) // 2)), 'white')
                for i, im in enumerate(chunk):
                    sheet.paste(im, ((i % 2) * 640, (i // 2) * 360))
                sheet.save(os.path.join(OUT, f'{li}_{name}_{part // 8}.png'))
            print(name, len(frames), 'frames')
        await b.close()
    print('saved to', OUT)

asyncio.run(main())
