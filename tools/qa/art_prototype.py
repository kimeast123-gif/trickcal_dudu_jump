"""Art prototype QA (branch art-prototype-v1): contact line, scale, seams and before/after screenshots.

    python tools/qa/art_prototype.py            # everything; images and art_prototype.json go to tools/qa/out/art/

How it works: the game loop is frozen (requestAnimationFrame is held), then draw() is called by hand with the
prototype flag off and on, so "before" and "after" are the same frame, same camera, same pose.
Measurements use extra draws with the platform or Dudu hidden; the difference between two draws is exactly
that object's pixels.
"""
import asyncio, os, sys, json, base64, io
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, open_mobile, play
import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), 'out', 'art')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAND = {
    'forest': np.asarray(Image.open(os.path.join(ROOT, 'assets/art_prototype/forest_standard_candidate_A.png')).convert('RGBA')).astype(int),
    'cave': np.asarray(Image.open(os.path.join(ROOT, 'assets/art_prototype/cave_standard_candidate_A.png')).convert('RGBA')).astype(int),
}
CONTACT = {'forest': 21, 'cave': 16}

SETUP_JS = r"""()=>{
  window.__qaFreeze=()=>new Promise(r=>{if(window.__rafOrig)return r();window.__rafOrig=window.requestAnimationFrame;window.__rafHeld=[];
    window.requestAnimationFrame=f=>{window.__rafHeld.push(f);return 0};setTimeout(r,150);});
  window.__qaThaw=()=>{if(!window.__rafOrig)return;window.requestAnimationFrame=window.__rafOrig;delete window.__rafOrig;
    const h=window.__rafHeld;window.__rafHeld=[];last=performance.now();acc=0;h.forEach(f=>requestAnimationFrame(f));};
  window.__qaDraw=(o)=>{const prevFlag=window.__DUDU_ART_PROTOTYPE_TEST;const rc=renderCharacter;const sm=window.__sm;const m0=sm?sm.mask:0;
    window.__DUDU_ART_PROTOTYPE_TEST=!!o.art;
    const hid=(o.hide||[]).map(id=>platforms.find(a=>a.id===id)).filter(Boolean);hid.forEach(a=>a.hidden=true);
    if(o.noChar)renderCharacter=()=>{};
    if(o.noMask&&sm){sm.mask=0;}
    draw();const url=canvas.toDataURL('image/png');
    hid.forEach(a=>a.hidden=false);renderCharacter=rc;if(sm)sm.mask=m0;window.__DUDU_ART_PROTOTYPE_TEST=prevFlag;
    return url;};
  window.__qaCam=()=>({rCam:Math.round(rCam),rCamY:Math.round(rCamY),zoom:(typeof rCamZoom==='number'&&rCamZoom>0)?rCamZoom:1});
}"""


def img(url):
    return np.asarray(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')).astype(int)


def save(arr, name):
    Image.fromarray(arr.astype(np.uint8)).save(os.path.join(OUT, name))


def diffmask(a, b, thr=24):
    return np.abs(a - b).sum(axis=2) > thr


async def place(pg, group, a):
    """Stand Dudu on platform a (left third so the art right of him stays clear), wait for camera to settle.
    group: 'story' (story 수인숲), 'w1_N' (World1 stage N, 0-based), 'cave' (Spirit Mountain)."""
    x = a['x'] + max(30, min(90, a['w'] * 0.3))
    if group == 'story':
        await play(pg, 0, x, a['y'] - 2)
    elif group.startswith('w1_'):
        i = int(group[3:])
        await pg.evaluate(f"""()=>{{if(activeWorldStageIndex!=={i}||gameMode!=='world')loadWorld1Stage({i},{{section:0,entryRoute:'default'}});
          state='playing';document.getElementById('overlay').hidden=true;
          p.x=p.prevX={x};p.y=p.prevY={a['y'] - 2};p.vx=0;p.vy=0;
          const c=computeInitialCameraForPoint(p.x,p.y);cam=c.cam;camY=c.camY;window.camBaseY=camY;syncRenderCoords();last=performance.now();acc=0;}}""")
    else:
        await pg.evaluate(f"()=>{{devPracticeSpirit({x},{a['y'] - 2});state='playing';}}")
    await pg.evaluate("()=>{p.invulnerable=0;p.hp=5;}")
    await pg.wait_for_timeout(1300)


async def measure(pg, area, a):
    st = await pg.evaluate(f"()=>{{const a=platforms.find(q=>q.id==='{a['id']}');return {{on:p.on===a,ground:p.ground,feet:p.y,px:p.x,ay:a.y,ax:a.x,aw:a.w}}}}")
    await pg.evaluate("()=>__qaFreeze()")
    cam = await pg.evaluate("()=>__qaCam()")
    res = {'id': a['id'], 'w': a['w'], 'y': a['y'], 'standing': st['on'] and st['ground'], 'feetY': st['feet'], 'cam': cam}
    for mode, art in (('before', False), ('after', True)):
        shown = img(await pg.evaluate(f"()=>__qaDraw({{art:{str(art).lower()},noChar:true,noMask:true}})"))
        hidden = img(await pg.evaluate(f"()=>__qaDraw({{art:{str(art).lower()},noChar:true,noMask:true,hide:['{a['id']}']}})"))
        withChar = img(await pg.evaluate(f"()=>__qaDraw({{art:{str(art).lower()},noMask:true}})"))
        z, cx, cy = cam['zoom'], cam['rCam'], cam['rCamY']
        sx0, sx1 = int(round((a['x'] - cx) * z)), int(round((a['x'] + a['w'] - cx) * z))
        m = diffmask(shown, hidden)
        cols = [c for c in range(max(0, sx0 + 4), min(1280, sx1 - 4))]
        rows_cov = m[:, cols].mean(axis=1) if cols else np.zeros(720)
        solid = np.where(rows_cov >= 0.9)[0]
        any_ = np.where(m[:, cols].any(axis=1))[0] if cols else []
        to_world = lambda r: r / z + cy
        ys, xs = np.where(m)
        r = {
            'solidTopWorld': round(to_world(solid[0]), 2) if len(solid) else None,
            'artTopWorld': round(to_world(any_[0]), 2) if len(any_) else None,
            'artBottomWorld': round(to_world(ys.max() + 1), 2) if len(ys) else None,
            'artLeftWorld': round(xs.min() / z + cx, 1) if len(xs) else None,
            'artRightWorld': round((xs.max() + 1) / z + cx, 1) if len(xs) else None,
        }
        r['solidTopMinusFeet'] = None if r['solidTopWorld'] is None else round(r['solidTopWorld'] - st['feet'], 2)
        # 4x crop around Dudu's feet, red ticks left and right at the physics foot line (p.y)
        fy = int(round((st['feet'] - cy) * z)); fx = int(round((st['px'] - cx) * z))
        y0, x0 = max(0, fy - 50), max(0, fx - 80)
        crop = Image.fromarray(withChar[y0:fy + 40, x0:fx + 80].astype(np.uint8)).resize((160 * 4, (fy + 40 - y0) * 4), Image.NEAREST)
        dr = ImageDraw.Draw(crop); ty = (fy - y0) * 4
        dr.rectangle([0, ty, 22, ty + 3], fill=(255, 0, 0)); dr.rectangle([crop.width - 23, ty, crop.width - 1, ty + 3], fill=(255, 0, 0))
        os.makedirs(os.path.join(OUT, 'contact'), exist_ok=True)
        crop.save(os.path.join(OUT, 'contact', f"{a['id']}_{mode}.png"))
        cm = diffmask(withChar, shown)
        cys, cxs = np.where(cm)
        r['duduSpriteBottomWorld'] = round(to_world(cys.max() + 1), 2) if len(cys) else None
        if art:
            # 1:1 check: every fully opaque pixel of the left end cap must appear on screen unchanged.
            C = CAND[area]
            capw = 70 if area == 'forest' else 44
            dx0 = (a['x'] if area == 'forest' else a['x'] - 6) - cx
            top = a['y'] - CONTACT[area] - cy
            if abs(z - 1) < 1e-6 and 0 <= dx0 and dx0 + capw <= 1280 and 0 <= top and top + C.shape[0] <= 720:
                region = shown[top:top + C.shape[0], dx0:dx0 + capw]
                src = C[:, :capw]
                opaque = src[..., 3] == 255
                r['leftCapMeanAbsDiff'] = round(float(np.abs(region[opaque] - src[..., :3][opaque]).mean()), 3)
                r['drawTopWorld'] = a['y'] - CONTACT[area]
                r['contactLineWorld'] = a['y'] - CONTACT[area] + CONTACT[area]
            # seams: colour jump between neighbouring columns inside the platform band
            band = slice(max(0, int((a['y'] - cy) * z) - 2), min(720, int((a['y'] - cy) * z) + 40))
            colsAll = list(range(max(1, sx0 + 2), min(1279, sx1 - 2)))
            if colsAll:
                d = [float(np.abs(shown[band, c] - shown[band, c - 1]).mean()) for c in colsAll]
                r['colJumpMedian'] = round(float(np.median(d)), 2)
                r['colJumpMax'] = round(float(max(d)), 2)
                r['colJumpMaxAtX'] = int(colsAll[int(np.argmax(d))] / z + cx - a['x'])
        res[mode] = r
    await pg.evaluate("()=>__qaThaw()")
    return res


async def scene_shots(pg, name, prefix):
    """Same-frame before/after screenshot of the whole page (canvas + HUD + touch UI)."""
    await pg.evaluate("()=>__qaFreeze()")
    paths = []
    for mode, art in (('before', False), ('after', True)):
        await pg.evaluate(f"()=>{{window.__DUDU_ART_PROTOTYPE_TEST={str(art).lower()};draw();}}")
        path = os.path.join(OUT, f'{prefix}_{name}_{mode}.png')
        await pg.screenshot(path=path)
        paths.append(path)
    await pg.evaluate("()=>{window.__DUDU_ART_PROTOTYPE_TEST=true;__qaThaw();}")
    return paths


async def outside_change(pg, replaced_ids):
    """Pixels that differ between the before and after frame outside the replaced platforms' art boxes."""
    await pg.evaluate("()=>__qaFreeze()")
    b = img(await pg.evaluate("()=>__qaDraw({art:false})"))
    a = img(await pg.evaluate("()=>__qaDraw({art:true})"))
    cam = await pg.evaluate("()=>__qaCam()")
    boxes = await pg.evaluate(f"()=>platforms.filter(q=>{json.dumps(replaced_ids)}.includes(q.id)).map(q=>[q.x,q.y,q.w])")
    await pg.evaluate("()=>__qaThaw()")
    m = diffmask(a, b, 0)
    keep = np.ones_like(m)
    z = cam['zoom']
    for x, y, w in boxes:
        x0 = int(((x - 10) - cam['rCam']) * z); x1 = int(((x + w + 10) - cam['rCam']) * z)
        y0 = int(((y - 30) - cam['rCamY']) * z); y1 = int(((y + 72) - cam['rCamY']) * z)
        keep[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = False
    return int((m & keep).sum()), int(m.sum())


STRIP_JS = r"""(o)=>{const out={};
  for(const art of [false,true]){window.__DUDU_ART_PROTOTYPE_TEST=art;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=o.bg;ctx.fillRect(0,0,1280,720);
    ctx.strokeStyle='rgba(255,60,60,.9)';ctx.lineWidth=1;
    o.widths.forEach((w,i)=>{const y=o.y0+i*o.dy,x=60;
      const a=o.kind==='forest'?{id:'QA-F'+i,x,y,w,h:20,thin:true,skin:'grass',visual:{material:'grass',seed:202}}
                               :{id:'SM-M9'+i,x,y,w,h:20,thin:true,skin:'grass',smDraw:'ledge'};
      if(o.kind==='forest')drawThinPlatformVisual(a,x,y);else drawSpiritPlatform(a,x,y);
      ctx.beginPath();ctx.moveTo(x-30,y+0.5);ctx.lineTo(x-4,y+0.5);ctx.moveTo(x+w+4,y+0.5);ctx.lineTo(x+w+30,y+0.5);ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='13px monospace';ctx.fillText(w+'px',x+w+36,y+4);ctx.fillStyle=o.bg;});
    ctx.restore();out[art?'after':'before']=canvas.toDataURL('image/png');}
  window.__DUDU_ART_PROTOTYPE_TEST=true;return out;}"""


async def strips(pg, kind):
    widths = [92, 141, 241, 360, 541, 841, 1141] if kind == 'forest' else [120, 152, 240, 358, 482, 760, 1141]
    await pg.evaluate("()=>__qaFreeze()")
    r = await pg.evaluate(STRIP_JS, {'kind': kind, 'widths': widths, 'y0': 70, 'dy': 92, 'bg': '#3b4a3c' if kind == 'forest' else '#2a2b38'})
    await pg.evaluate("()=>__qaThaw()")
    for k in ('before', 'after'):
        save(img(r[k]), f'strip_{kind}_{k}.png')
    return widths


async def main():
    os.makedirs(OUT, exist_ok=True)
    inv = json.load(open(os.path.join(os.path.dirname(__file__), 'out', 'art_inventory.json')))
    targets = {'story': [a for a in inv['story_forest'] if a['applies']]}
    for i in range(4):
        targets[f'w1_{i}'] = [a for a in inv[f'world1_{i + 1}'] if a['applies']]
    targets['cave'] = [a for a in inv['spirit'] if a['applies']]
    AREA = lambda g: 'cave' if g == 'cave' else 'forest'
    report = {'measure': {g: [] for g in targets}, 'scenes': {}, 'outside': {}, 'errors': []}
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        await pg.evaluate(SETUP_JS)
        report['stripWidths'] = {}
        # story forest first: the dev entry into a story level does not support coming back from world mode
        for g in targets:
            for a in targets[g]:
                await place(pg, g, a)
                await pg.evaluate(SETUP_JS)
                report['measure'][g].append(await measure(pg, AREA(g), a))
                print(g, a['id'], json.dumps(report['measure'][g][-1]['after'].get('solidTopMinusFeet')))
            # long-platform strips (ends, middle repeat, neutral fill) on a flat background
            if g in ('story', 'cave'):
                report['stripWidths'][AREA(g)] = await strips(pg, AREA(g))
        report['errors'] += errs
        await b.close()

        scenes = [('forest_step', 'story', 'F-STEP-01'), ('forest_long', 'story', 'F-DROP-02'),
                  ('forest_narrow', 'story', 'F-BRIDGE-03'),
                  ('w1_forest', 'w1_0', 'W1-S1-P05-MID'), ('w1_deep', 'w1_2', 'W1-S3-LOW-P01'), ('w1_exit', 'w1_3', 'W1-S4-HUB-P01'),
                  ('cave_long', 'cave', 'SM-M24'), ('cave_mid', 'cave', 'SM-M6'), ('cave_stack', 'cave', 'SM-M17')]
        ids = {k: [a['id'] for a in v] for k, v in targets.items()}
        for dev in ('pc', 'mobile'):
            if dev == 'pc':
                b, pg, errs = await open_desktop(pw)
            else:
                b, pg, cdp, errs = await open_mobile(pw)
            await pg.evaluate(SETUP_JS)
            for name, g, pid in scenes:
                a = next(x for x in targets[g] if x['id'] == pid)
                await place(pg, g, a)
                await pg.evaluate(SETUP_JS)
                report['scenes'][f'{dev}_{name}'] = [os.path.basename(p) for p in await scene_shots(pg, name, dev)]
                if dev == 'pc':
                    report['outside'][name] = await outside_change(pg, ids[g])
            report['errors'] += errs
            await b.close()
    srv.shutdown()
    json.dump(report, open(os.path.join(OUT, 'art_prototype.json'), 'w'), ensure_ascii=False, indent=1)
    print('outside-of-platform changed pixels (outside, total):', report['outside'])
    print('errors:', report['errors'][:5])

asyncio.run(main())
