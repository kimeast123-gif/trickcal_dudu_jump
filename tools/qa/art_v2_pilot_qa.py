"""Art V2 pilot check (no play-through): coverage, contact line, same-camera before/after, seam strips.

    python tools/qa/art_v2_pilot_qa.py        # -> tools/qa/out/art_v2_pilot/ (pngs + art_v2_pilot_qa.json)

Contact: the same paused frame is drawn twice, with the platform and with it hidden. Changed pixels = the platform.
The visible top is the first row where at least 90% of the platform's columns changed; it is compared with the
platform y (= Dudu's feet). Target: within +-2px.
"""
import asyncio, base64, io, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop
from PIL import Image, ImageChops, ImageDraw
import numpy as np

OUT = os.path.join(os.path.dirname(__file__), 'out', 'art_v2_pilot'); os.makedirs(OUT, exist_ok=True)

ENTER = {
    'w1': "(i)=>{loadWorld1Stage(i,{section:0,entryRoute:'default'});state='paused';document.getElementById('overlay').hidden=true;}",
    'spirit': "()=>{devPracticeSpirit(2000,-1301);state='paused';}",
    'story': "()=>{gameMode='story';loadLevel(0);levelIndex=0;state='paused';document.getElementById('overlay').hidden=true;}",
}


async def enter(g, kind, st):
    if kind == 'w1': await g.evaluate(ENTER['w1'], st)
    else: await g.evaluate(ENTER[kind])

LIST = """()=>platforms.map((a,i)=>({i,id:a.id||'',x:a.x,y:a.y,w:a.w,blink:!!a.blink,sm:a.smDraw||'',
   zone:(a.smDraw&&typeof smZoneOf==='function')?smZoneOf(a):'',wall:!!a.wall,ceiling:!!a.ceiling,ground:!!a.groundTile,noTop:!!a.noTopLand,
   skin:(a.visual&&a.visual.material)||a.skin||'', pilot: !!(window.__artV2Pilot && window.__artV2Pilot.applies(a))}))"""
FRAME = """([i, hide, dudu])=>{const a=platforms[i];
  const cx=a.x+Math.min(a.w,1100)/2-640, cy=a.y-430;
  cam=prevCam=rCam=cx; camY=prevCamY=rCamY=cy; camZoom=rCamZoom=1;
  for(const q of platforms) if(q.blink){q.blinkState='on';q.blinkAlpha=1;}
  if (dudu) { p.x=p.prevX=a.x+Math.min(a.w,1100)/2; p.y=p.prevY=a.y; rPx=p.x; rPy=p.y; } else { p.x=p.prevX=rPx=-99999; }
  const h=a.hidden; if(hide) a.hidden=true; draw(); a.hidden=h;
  return canvas.toDataURL('image/png');}"""


def img(url):
    return Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')


async def frame(pg, i, hide=False, dudu=False):
    return img(await pg.evaluate(FRAME, [i, hide, dudu]))


async def contact(pg, P):
    a = await frame(pg, P['i']); b = await frame(pg, P['i'], hide=True)
    d = np.array(ImageChops.difference(a, b)).max(2) > 18
    x0 = int(max(0, P['x'] + 4 - (P['x'] + min(P['w'], 1100) / 2 - 640))); x1 = int(min(1280, x0 + min(P['w'], 1100) - 8))
    cols = d[:, x0:x1]
    rows = np.where(cols.mean(1) >= 0.9)[0]
    top = int(rows[0]) if len(rows) else None
    return None if top is None else top - 430   # platform y is at screen row 430


async def main():
    srv = serve()
    res = {'areas': {}, 'contact': [], 'shots': []}
    async with async_playwright() as pw:
        pages = {}
        for mode, q in (('v2', ''), ('v11', '?artv2=0'), ('release', '?arttest=0')):
            b, pg, errs = await open_desktop(pw, query=q)
            pages[mode] = (b, pg, errs)
        pg = pages['v2'][1]
        targets = []
        for st in range(4):
            await pg.evaluate(ENTER['w1'], st); await pg.wait_for_timeout(500)
            L = await pg.evaluate(LIST)
            fam = [a for a in L if not a['sm'] and (a['skin'] == 'grass' or (a['skin'] == 'wood' and (a['wall'] or a['ceiling'])))]   # every World1 forest object (whole family)
            res['areas'][f'world1_{st + 1}'] = {'target': len(fam), 'v2': sum(a['pilot'] for a in fam),
                                               'missing': [(a['id'], a['w']) for a in fam if not a['pilot']]}
            # contact is measured where Dudu stands: ledges, ground, and walls you can stand on
            targets += [('w1', st, a) for a in fam if a['pilot'] and not a['ceiling'] and (not a['wall'] or not a['noTop'])]
        await pg.evaluate(ENTER['spirit']); await pg.wait_for_timeout(800)
        L = await pg.evaluate(LIST)
        lw = {'SM-MW3', 'SM-MW4', 'SM-B6'}
        fam = [a for a in L if (a['zone'] == 'lava' and a['sm'] not in ('rock', 'pillar', 'floor', 'roof')) or a['id'] in lw]
        res['areas']['spirit_lava'] = {'target': len(fam), 'v2': sum(a['pilot'] for a in fam),
                                       'missing': [(a['id'], a['w']) for a in fam if not a['pilot']]}
        targets += [('spirit', None, a) for a in fam if a['pilot'] and a['id'] not in lw]
        fam = [a for a in L if (a['zone'] == 'out' and a['sm'] not in ('rock', 'pillar', 'floor', 'roof')) or a['id'] == 'SM-MW1']
        res['areas']['spirit_out'] = {'target': len(fam), 'v2': sum(a['pilot'] for a in fam),
                                      'missing': [(a['id'], a['w']) for a in fam if not a['pilot']]}
        targets += [('spirit', None, a) for a in fam if a['pilot'] and a['id'] != 'SM-MW1']
        await enter(pg, 'story', None); await pg.wait_for_timeout(600)
        L = await pg.evaluate(LIST)
        fam = [a for a in L if not a['sm'] and a['skin'] == 'grass']
        res['areas']['story_forest'] = {'target': len(fam), 'v2': sum(a['pilot'] for a in fam),
                                        'missing': [(a['id'], a['w']) for a in fam if not a['pilot']]}
        targets += [('story', None, a) for a in fam if a['pilot'] and not a['ceiling'] and (not a['wall'] or not a['noTop'])]

        # contact for every pilot platform (v2 page)
        cur = None
        for kind, st, P in targets:
            key = (kind, st)
            if key != cur:
                await enter(pg, kind, st)
                await pg.wait_for_timeout(500); cur = key
            c = await contact(pg, P)
            res['contact'].append({'area': kind if kind != 'w1' else f'world1_{st + 1}', 'id': P['id'], 'w': P['w'], 'blink': P['blink'], 'top_minus_feet': c})

        # same-camera before/after with Dudu on the platform: a few per area, three modes side by side
        picks = {}
        for kind, st, P in targets:
            k = kind if kind != 'w1' else f'world1_{st + 1}'
            picks.setdefault(k, [])
            if len(picks[k]) < {'spirit': 6, 'story': 5}.get(kind, 2): picks[k].append((kind, st, P))
        for k, lst in picks.items():
            for kind, st, P in lst:
                row = []
                for mode in ('release', 'v11', 'v2'):
                    g = pages[mode][1]
                    await enter(g, kind, st)
                    await g.wait_for_timeout(450)
                    im = await frame(g, P['i'], dudu=True)
                    d = ImageDraw.Draw(im); d.rectangle((0, 0, 330, 24), fill=(0, 0, 0)); d.text((6, 6), f"{P['id']} w{int(P['w'])} {mode}", fill=(255, 255, 0))
                    d.line((0, 430, 30, 430), fill=(255, 0, 0), width=2); d.line((1250, 430, 1280, 430), fill=(255, 0, 0), width=2)
                    row.append(im)
                big = Image.new('RGB', (1920, 360))
                for j, im in enumerate(row): big.paste(im.resize((640, 360)), (j * 640, 0))
                fn = f"ba_{k}_{P['id']}.png"; big.save(os.path.join(OUT, fn)); res['shots'].append(fn)
                # contact close-up (2x) around Dudu's feet, v2 only
                cx = 640; crop = row[2].crop((cx - 160, 430 - 70, cx + 160, 430 + 40)).resize((640, 220), Image.NEAREST)
                ImageDraw.Draw(crop).line((0, 140, 640, 140), fill=(255, 0, 0)); crop.save(os.path.join(OUT, f"contact_{k}_{P['id']}.png"))

        # seam strips: every used width on a flat background (v2 page), drawn through the real wrappers
        widths = {'forest': sorted({int(P['w']) for kind, st, P in targets if kind == 'w1'} | {48, 64, 92, 110, 140}),
                  'lava': sorted({int(P['w']) for kind, st, P in targets if kind == 'spirit'} | {313, 480, 851, 1371, 1960})}
        await pg.evaluate(ENTER['w1'], 0); await pg.wait_for_timeout(400)
        url = await pg.evaluate("""(ws)=>{ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#6d7f8c';ctx.fillRect(0,0,1280,720);
            let y=40; for(const w of ws){ const a={x:20,y:y,w:w,h:20,thin:true,skin:'grass',visual:{material:'grass',seed:202}};
              drawThinPlatformVisual(a,20,y); ctx.fillStyle='#fff'; ctx.fillText(w+'px',w+40,y); y+=70; }
            return canvas.toDataURL('image/png');}""", widths['forest'])
        img(url).crop((0, 0, 400, 40 + 70 * len(widths['forest']))).save(os.path.join(OUT, 'strip_forest_compact.png'))
        await pg.evaluate(ENTER['spirit']); await pg.wait_for_timeout(400)
        url = await pg.evaluate("""(ws)=>{ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#6d7f8c';ctx.fillRect(0,0,2100,720);
            let y=40; const out=[]; for(const w of ws){ const a={id:'SM-L0',x:20,y:y,w:w,h:20,thin:true,smDraw:'basalt'};
              drawSpiritPlatform(a,20,y); y+=95; }
            return canvas.toDataURL('image/png');}""", widths['lava'])
        img(url).save(os.path.join(OUT, 'strip_lava_long_view.png'))
        res['strip_widths'] = widths
        for mode in pages: res.setdefault('page_errors', {})[mode] = pages[mode][2][:5]
        for b, _, _ in pages.values(): await b.close()
    srv.shutdown()
    vals = [c['top_minus_feet'] for c in res['contact'] if c['top_minus_feet'] is not None]
    res['contact_summary'] = {'n': len(res['contact']), 'measured': len(vals), 'min': min(vals) if vals else None,
                              'max': max(vals) if vals else None, 'within_2px': sum(abs(v) <= 2 for v in vals)}
    json.dump(res, open(os.path.join(OUT, 'art_v2_pilot_qa.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({'areas': {k: (v['v2'], v['target'], v['missing']) for k, v in res['areas'].items()}, 'contact': res['contact_summary'], 'errors': res.get('page_errors')}, ensure_ascii=False))

asyncio.run(main())
