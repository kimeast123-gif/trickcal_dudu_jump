"""Draw a top-down layout map of one stretch of a story level: platforms, candies, crayons, guards, checkpoints.

    python tools/qa/layout_map.py LEVEL X1 X2 [Y1 Y2] [out.png]
    python tools/qa/layout_map.py monatium_a 17300 20300

Colours: brown ground, dark grey thin platform, orange blinking, blue moving, yellow crayon route,
red hanging baffle (noTopLand wall), purple ceiling, red dots candies, gold squares crayons,
blue triangles NPCs with their patrol line, green CP flags.
"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, LEVELS
from PIL import Image, ImageDraw

name = sys.argv[1]; li = LEVELS.index(name) if name in LEVELS else int(name)
x1, x2 = int(sys.argv[2]), int(sys.argv[3])
y1 = int(sys.argv[4]) if len(sys.argv) > 5 else -200
y2 = int(sys.argv[5]) if len(sys.argv) > 5 else 720
out = sys.argv[6] if len(sys.argv) > 6 else os.path.join(os.path.dirname(__file__), 'out', f'map_{LEVELS[li]}_{x1}_{x2}.png')


async def main():
    os.makedirs(os.path.dirname(out), exist_ok=True)
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        d = await pg.evaluate(f"""()=>{{loadLevel({li});levelIndex={li};
          return {{ps:platforms.map(a=>({{id:a.id,x:a.x,y:a.y,w:a.w,h:a.h,thin:a.thin,wall:!!a.wall,ceil:!!a.ceiling,blink:!!a.blink,
            mov:!!a.motion,sp:a.challenge==='special',ntl:!!a.noTopLand,g:!!a.groundTile}})),
            coins:coins.map(c=>[c.x,c.y]),sp:specialCoins.map(c=>[c.x,c.y]),
            act:actors.map(a=>({{x:a.x,y:a.y,pat:a.patrol||0}})),flags:sections.map(s=>[s.x,s.y])}}}}""")
        await b.close()
    S = 0.5; W = int((x2 - x1) * S); H = int((y2 - y1) * S)
    im = Image.new('RGB', (W, H), (250, 250, 246)); dr = ImageDraw.Draw(im)
    T = lambda x, y: ((x - x1) * S, (y - y1) * S)
    for gx in range((x1 // 200) * 200, x2, 200):
        X, _ = T(gx, 0); dr.line([(X, 0), (X, H)], fill=(232, 232, 226)); dr.text((X + 2, 2), str(gx), fill=(160, 160, 160))
    for p in d['ps']:
        if p['x'] + p['w'] < x1 or p['x'] > x2: continue
        col = (120, 90, 60) if p['g'] else (70, 70, 80)
        if p['wall']: col = (200, 60, 60) if p['ntl'] else (60, 60, 60)
        if p['ceil']: col = (150, 60, 150)
        if p['blink']: col = (240, 160, 0)
        if p['mov']: col = (0, 150, 220)
        if p['sp']: col = (255, 100, 200) if p['blink'] else (220, 180, 0)
        dr.rectangle([T(p['x'], p['y']), T(p['x'] + p['w'], p['y'] + (16 if p['thin'] else p['h']))], fill=col)
        dr.text(T(p['x'], p['y'] - 22), p['id'][-14:], fill=(40, 40, 40))
    for c in d['coins']:
        X, Y = T(*c); dr.ellipse([X - 4, Y - 4, X + 4, Y + 4], fill=(230, 40, 70))
    for c in d['sp']:
        X, Y = T(*c); dr.rectangle([X - 6, Y - 6, X + 6, Y + 6], outline=(200, 140, 0), width=3)
    for a in d['act']:
        X, Y = T(a['x'], a['y']); dr.polygon([(X, Y - 26), (X - 8, Y), (X + 8, Y)], fill=(30, 30, 200))
        if a['pat']: dr.line([T(a['x'] - a['pat'], a['y'] + 4), T(a['x'] + a['pat'], a['y'] + 4)], fill=(30, 30, 200), width=2)
    for f in d['flags']:
        X, Y = T(*f); dr.line([(X, Y), (X, Y - 40)], fill=(0, 140, 0), width=3); dr.text((X + 3, Y - 40), 'CP', fill=(0, 120, 0))
    im.save(out); print('saved', out)

asyncio.run(main())
