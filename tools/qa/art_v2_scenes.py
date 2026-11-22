"""Art phase 2 (P2-D): the visual checks of directive 6.1 that need their own frames, release art vs V2 art.

    python tools/qa/art_v2_scenes.py

1. proportion: every drawImage of a V2 / prototype image while drawing each V2 target is logged; the x and y
   scale (destination size / source size) must be equal (no stretching in one direction).
2. checkpoints: the flag at story forest 1340 and 2580 and the five Spirit Mountain flags, same game coordinates.
3. Ifrit's lava hall: the open strip above the hall (must stay open, no ceiling drawn) and the outer walls
   MW3, MW4 and pillar B6, plus a 2x close-up.
4. wind: a snow ledge (SM-V22) with the gust forced on vs calm, and six frames across one gust.
5. screen sizes: 1280x720 windowed, 1920x1080 full screen and 915x412 phone landscape, whole page with HUD.

Output: tools/qa/out/art_v2_scenes/*.png and proportion.json. Left half of each sheet = release, right = V2.
"""
import asyncio, base64, io, json, os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import harness
from harness import serve, async_playwright

OUT = os.path.join(os.path.dirname(__file__), 'out', 'art_v2_scenes')
os.makedirs(OUT, exist_ok=True)
MODES = (('release', '?oldart=1'), ('v2', ''))
STORY = "()=>{gameMode='story';loadLevel(0);levelIndex=0;state='paused';document.getElementById('overlay').hidden=true;const st=document.getElementById('story');if(st)st.hidden=true;}"
SPIRIT = "()=>{devPracticeSpirit(2000,-1301);state='paused';}"
W1 = "(i)=>{loadWorld1Stage(i,{section:0,entryRoute:'default'});state='paused';document.getElementById('overlay').hidden=true;}"
# camera on a game point, Dudu at (dx, dy) or off screen; mask 0/1; returns the canvas
AT = """([x,y,dx,dy,mask])=>{cam=prevCam=rCam=x-640; camY=prevCamY=rCamY=y-430; camZoom=rCamZoom=1;
  if(dx===null){p.x=p.prevX=rPx=-99999;} else {p.x=p.prevX=rPx=dx;p.y=p.prevY=rPy=dy;}
  for(const q of platforms) if(q.blink){q.blinkState='on';q.blinkAlpha=1;}
  if(window.__sm){__sm.mask=mask;__sm.maskKey=null;}
  if(typeof spiritBgZone==='function'&&typeof smBgWeights!=='undefined'&&dx!==null){const z=spiritBgZone();smBgWeights.fill(0);smBgWeights[z]=1;}
  draw(); return canvas.toDataURL('image/png');}"""
HOOK = """()=>{if(window.__dimLog)return; window.__dimLog={}; const o=ctx.drawImage.bind(ctx);
  ctx.drawImage=function(im,...a){const s=(im&&im.src)||''; if(['/terrain/forest_w1/','/terrain/forest_story/','/terrain/spirit_'].some(k=>s.includes(k))){
    let sx=1,sy=1; if(a.length===8){sx=a[6]/a[2];sy=a[7]/a[3];} else if(a.length===4){sx=a[2]/(im.naturalWidth||im.width);sy=a[3]/(im.naturalHeight||im.height);}
    const k=s.split('/').slice(-2).join('/').split('?')[0]; const r=window.__dimLog[k]||(window.__dimLog[k]={n:0,worst:0});
    r.n++; const d=Math.abs(sx/sy-1); if(d>r.worst){r.worst=d;r.ex=[sx,sy];}}
    return o(im,...a);};}"""
TARGETS = """()=>platforms.filter(a=>!a.hidden&&(window.__terrainArt&&window.__terrainArt.applies(a))).map(a=>[a.x+Math.min(a.w,1100)/2,a.y])"""


def img(url):
    return Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')


def label(im, t):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 9 * len(t) + 8, 18), fill=(0, 0, 0)); d.text((4, 3), t, fill=(255, 255, 0)); return im


def sheet(rows, name, w=640, h=360):
    s = Image.new('RGB', (2 * w, h * len(rows)))
    for i, (a, b, t) in enumerate(rows):
        s.paste(label(a.resize((w, h)), f'{t} release'), (0, i * h)); s.paste(label(b.resize((w, h)), f'{t} V2'), (w, i * h))
    s.save(os.path.join(OUT, name))


async def page(pw, q, vw=1280, vh=720, mobile=False):
    b = await harness.launch(pw)
    if mobile:
        ctx = await b.new_context(viewport={'width': vw, 'height': vh}, is_mobile=True, has_touch=True, device_scale_factor=2,
                                  user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36')
    else:
        ctx = await b.new_context(viewport={'width': vw, 'height': vh})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto(harness.URL + q); await pg.wait_for_timeout(6000)
    return b, pg, errs


async def main():
    srv = serve()
    shots, prop, errors = {}, {}, {}
    async with async_playwright() as pw:
        for m, q in MODES:
            b, pg, errs = await page(pw, q); S = shots.setdefault(m, {})
            # 1. proportion
            await pg.evaluate(HOOK)
            for enter, arg in [(STORY, None)] + [(W1, i) for i in range(4)] + [(SPIRIT, None)]:
                await (pg.evaluate(enter, arg) if arg is not None else pg.evaluate(enter)); await pg.wait_for_timeout(400)
                for x, y in await pg.evaluate(TARGETS):
                    await pg.evaluate(AT, [x, y, None, None, 0])
            prop[m] = await pg.evaluate('()=>window.__dimLog')
            # 2. checkpoints
            await pg.evaluate(STORY); await pg.wait_for_timeout(400)
            for x in (1340, 2580):
                S[f'cp story {x}'] = img(await pg.evaluate(AT, [x + 200, 580, x + 60, 580, 0]))
            await pg.evaluate(SPIRIT); await pg.wait_for_timeout(400)
            for n, x, y in (('lake', 376, -449), ('cave end', 3030, -1003), ('Ifrit rest', 905, -2023), ('snow path', 3136, -3781), ('summit', 2423, -6350)):
                S[f'cp {n}'] = img(await pg.evaluate(AT, [x, y, x + 60, y, 0]))
            # 3. Ifrit hall: open top strip, outer walls
            # Dudu stands inside the hall: with him outside, the hall's unvisited-interior cover is drawn instead
            for n, x, y, dx, dy in (('hall top left', 2100, -2330, 2480, -2048), ('hall top right', 3000, -2330, 3060, -2079),
                                    ('MW3 wall', 1700, -1650, 2100, -1510), ('MW4 + door', 1650, -2250, 1700, -2104),
                                    ('B6 under L9', 1900, -1900, 2000, -2104)):
                S[n] = img(await pg.evaluate(AT, [x, y, dx, dy, 0]))
            # 4. wind on the snow ledge V22
            a = await pg.evaluate("()=>{const a=platforms.find(q=>q.id==='SM-V22');return [a.x+a.w/2,a.y]}")
            await pg.evaluate(f"()=>{{devPracticeSpirit({a[0]},{a[1]});state='playing';__sm.forceGust=false;}}"); await pg.wait_for_timeout(1500)
            await pg.evaluate("()=>{state='paused'}")
            S['wind calm'] = img(await pg.evaluate(AT, [a[0], a[1], a[0], a[1], 0]))
            await pg.evaluate("()=>{state='playing';__sm.forceGust=true;}")
            seq = []
            for k in range(6):
                await pg.wait_for_timeout(350)
                seq.append(img(await pg.evaluate("()=>canvas.toDataURL('image/png')")))
            await pg.evaluate("()=>{state='paused'}")
            S['wind gust'] = img(await pg.evaluate(AT, [a[0], a[1], a[0], a[1], 0]))
            await pg.evaluate("()=>{__sm.forceGust=false;}")
            S['wind seq'] = seq
            errors[m] = errs[:]
            await b.close()
            # 5. screen sizes (whole page, HUD included), playing on a cave long ledge and on a World1 ground
            for sz, (vw, vh, mob) in {'1280x720': (1280, 720, False), '1920x1080': (1920, 1080, False), '915x412 phone': (915, 412, True)}.items():
                b, pg, errs = await page(pw, q, vw, vh, mob)
                for n, js in (('cave M24', "()=>{const a=platforms.find(q=>q.id==='SM-M24')||{};}"), ('W1 1-2', None)):
                    if n == 'cave M24':
                        await pg.evaluate("()=>{devPracticeSpirit(2990,-1100);state='playing';}")
                    else:
                        await pg.evaluate("()=>{loadWorld1Stage(1,{section:0,entryRoute:'default'});state='playing';document.getElementById('overlay').hidden=true;}")
                    await pg.wait_for_timeout(1800)
                    S[f'{sz} {n}'] = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
                errors[m] += errs
                await b.close()
    srv.shutdown()
    R, V = shots['release'], shots['v2']
    sheet([(R[k], V[k], k) for k in R if k.startswith('cp ')], 'checkpoints.png')
    sheet([(R[k], V[k], k) for k in ('hall top left', 'hall top right', 'MW3 wall', 'MW4 + door', 'B6 under L9')], 'ifrit_hall.png')
    zoom = [(R[k].crop((320, 180, 960, 540)).resize((1280, 720)), V[k].crop((320, 180, 960, 540)).resize((1280, 720)), k + ' 2x')
            for k in ('MW4 + door', 'B6 under L9')]
    sheet(zoom, 'ifrit_hall_zoom.png')
    sheet([(R['wind calm'], V['wind calm'], 'wind calm'), (R['wind gust'], V['wind gust'], 'wind gust')], 'wind_on_off.png')
    sheet([(R['wind seq'][i], V['wind seq'][i], f'gust +{(i + 1) * 0.35:.2f}s') for i in range(6)], 'wind_sequence.png')
    sheet([(R[k], V[k], k) for k in R if 'x' in k.split()[0] and k[0].isdigit()], 'screen_sizes.png')
    for k in [k for k in R if k[0].isdigit()]:
        R[k].save(os.path.join(OUT, f"size_release_{k.replace(' ', '_')}.png")); V[k].save(os.path.join(OUT, f"size_v2_{k.replace(' ', '_')}.png"))
    json.dump(prop, open(os.path.join(OUT, 'proportion.json'), 'w', encoding='utf-8'), indent=1)
    worst = {m: max([r['worst'] for r in prop[m].values()] or [0]) for m in prop}
    print('proportion: images', {m: len(prop[m]) for m in prop}, 'draw calls', {m: sum(r['n'] for r in prop[m].values()) for m in prop},
          'worst |x/y-1|', worst)
    for m in prop:
        for k, r in prop[m].items():
            if r['worst'] > 0.005: print('  STRETCH', m, k, r)
    print('page errors', {m: e[:3] for m, e in errors.items()})
    print('PASS' if worst['v2'] <= 0.005 and not errors['v2'] else 'FAIL')

asyncio.run(main())
