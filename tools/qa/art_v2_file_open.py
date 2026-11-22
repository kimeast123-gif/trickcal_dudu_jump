"""Art phase 2 (P2-D): the V2 art must run the same when opened as a local file and on a phone in landscape.

    python tools/qa/art_v2_file_open.py

Four page setups: desktop 1280x720 and mobile landscape 915x412 (touch, phone user agent), each over http and
as a local file (file://, where the canvas is tainted and any getImageData would throw). In each setup Dudu is put
on one platform of every V2 family, and the script checks that the game clock and physics keep running and that
he stands on that platform. Then a still frame of the same spot is drawn and screenshotted, and the file:// frame
is compared with the http frame of the same viewport: the same picture means every V2 kit loaded and drew.
"""
import asyncio, io, os, sys
from PIL import Image, ImageChops, ImageStat
sys.path.insert(0, os.path.dirname(__file__))
import harness
from harness import serve, async_playwright

ROOT = os.environ.get('GAME_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(os.path.dirname(__file__), 'out', 'art_v2_file_open')
os.makedirs(OUT, exist_ok=True)
CHROME = os.environ.get('CHROME')
# (label, kind, platform id)
SPOTS = [('story forest', 'story', 'F-STEP-01'), ('World1 1-1 ground', 'w1_0', None), ('World1 1-2', 'w1_1', None),
         ('spirit out', 'spirit', 'SM-E3'), ('spirit cave long', 'spirit', 'SM-M24'), ('spirit cave tiny', 'spirit', 'SM-M17'),
         ('spirit Gabia floor', 'spirit', 'SM-FLOOR'), ('spirit lava', 'spirit', 'SM-L1'), ('spirit snow', 'spirit', 'SM-S0'),
         ('spirit snow high', 'spirit', 'SM-V22')]
LOAD = {'story': "()=>{gameMode='story';loadLevel(0);levelIndex=0;state='playing';document.getElementById('overlay').hidden=true;"
                 "const st=document.getElementById('story');if(st)st.hidden=true;}",
        'spirit': "()=>{devPracticeSpirit(2000,-1301);state='playing';}"}
PUT = """(id)=>{const a=id?platforms.find(q=>q.id===id):platforms.find(q=>q.groundTile&&!q.hidden);
  const x=a.x+Math.min(a.w,600)/2; if(typeof devPracticeSpirit==='function'&&a.smDraw){devPracticeSpirit(x,a.y);}
  p.x=p.prevX=x;p.y=p.prevY=a.y-1;p.vx=0;p.vy=0;p.invulnerable=0;p.hp=5;state='playing';
  if(typeof computeInitialCameraForPoint==='function'){const c=computeInitialCameraForPoint(p.x,p.y);cam=c.cam;camY=c.camY;window.camBaseY=camY;}
  if(typeof syncRenderCoords==='function')syncRenderCoords(); last=performance.now();acc=0; return a.id;}"""
STILL = """(id)=>{const a=platforms.find(q=>q.id===id); state='paused';
  const cx=a.x+Math.min(a.w,1100)/2-640, cy=a.y-430; cam=prevCam=rCam=cx; camY=prevCamY=rCamY=cy; camZoom=rCamZoom=1;
  p.x=p.prevX=rPx=-99999; for(const q of platforms) if(q.blink){q.blinkState='on';q.blinkAlpha=1;}
  if(window.__sm){__sm.mask=0;__sm.maskKey=null;}
  time=10; draw(); return true;}"""
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(('PASS  ' if ok else 'FAIL  ') + name + ('  ' + str(detail) if detail else ''), flush=True)


async def open_page(pw, mobile, file):
    kw = {'args': ['--use-gl=swiftshader']}
    if CHROME: kw['executable_path'] = CHROME
    b = await pw.chromium.launch(**kw)
    if mobile:
        ctx = await b.new_context(viewport={'width': 915, 'height': 412}, is_mobile=True, has_touch=True, device_scale_factor=2,
                                  user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36')
    else:
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
    pg = await ctx.new_page()
    errs, warns = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('console', lambda m: warns.append(m.text[:200]) if m.type == 'warning' and 'terrain-art' in m.text else None)
    await pg.goto(('file:///' + ROOT.replace('\\', '/') + '/index.html') if file else harness.URL)
    await pg.wait_for_timeout(5000)
    return b, pg, errs, warns


async def main():
    srv = serve()
    stills = {}
    async with async_playwright() as pw:
        for mobile in (False, True):
            for file in (False, True):
                setup = ('mobile' if mobile else 'desktop') + (' file://' if file else ' http')
                b, pg, errs, warns = await open_page(pw, mobile, file)
                for label, kind, pid in SPOTS:
                    js = LOAD.get(kind) or (f"()=>{{loadWorld1Stage({int(kind[3:])},{{section:0,entryRoute:'default'}});state='playing';"
                                            "document.getElementById('overlay').hidden=true;}")
                    await pg.evaluate(js); await pg.wait_for_timeout(400)
                    pid2 = await pg.evaluate(PUT, pid)
                    await pg.wait_for_timeout(1200)
                    t1 = await pg.evaluate('()=>time'); await pg.wait_for_timeout(500)
                    st = await pg.evaluate("()=>({t:time,on:p.on?p.on.id:null,state})")
                    ok = st['t'] - t1 > 0.3 and st['state'] == 'playing' and st['on'] == pid2
                    check(f'{setup} | {label}: game runs, Dudu on {pid2}', ok, {'clock': round(st['t'] - t1, 2), 'on': st['on']})
                    await pg.evaluate(STILL, pid2); await pg.wait_for_timeout(100)
                    png = await pg.locator('#canvas').screenshot() if await pg.locator('#canvas').count() else await pg.screenshot()
                    im = Image.open(io.BytesIO(png)).convert('RGB')
                    im.save(os.path.join(OUT, f"{('m' if mobile else 'd')}_{('file' if file else 'http')}_{pid2}.png"))
                    stills[(mobile, file, pid2)] = im
                check(f'{setup} | no page errors', not errs, errs[:3])
                check(f'{setup} | art layers stayed on (no fallback warning)', not warns, warns[:3])
                await b.close()
    srv.shutdown()
    for (mobile, file, pid), im in stills.items():
        if not file: continue
        ref = stills.get((mobile, False, pid))
        diff = ImageStat.Stat(ImageChops.difference(im, ref)).mean if ref and ref.size == im.size else None
        m = max(diff) if diff else 999
        check(f"{'mobile' if mobile else 'desktop'} | {pid}: file:// frame matches http frame", m < 1.0, {'mean diff': round(m, 3)})
    sys.exit(0 if all(results) else 1)

asyncio.run(main())
