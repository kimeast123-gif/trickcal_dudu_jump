"""Art prototype: the build must keep running when opened as a local file (double-clicked index.html, file://).

    python tools/qa/art_file_open.py

Why: the other QA scripts serve the game over http, where reading image pixels back is allowed. Opened as a file the
canvas is "tainted" and getImageData throws. v1 of art-prototype.js read the cave sprite's pixels while drawing, so
the first cave ledge on screen threw and stopped the game loop (the picture froze; going back to the menu and
starting again kept the frozen Spirit Mountain frame). Reported by the user 2026-11-22, fixed the same day.

This opens index.html via file://, then visits story Suin Forest, a World1 stage and the Spirit Mountain cave, and
checks: no page errors, no '[art-prototype] ... disabled' warning (the prototype really drew), and the game clock and
physics keep running (Dudu lands on the ledge below).
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

ROOT = os.environ.get('GAME_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHROME = os.environ.get('CHROME')
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(('PASS  ' if ok else 'FAIL  ') + name + ('  ' + str(detail) if detail else ''))


async def main():
    async with async_playwright() as pw:
        kw = {'args': ['--use-gl=swiftshader']}
        if CHROME:
            kw['executable_path'] = CHROME
        b = await pw.chromium.launch(**kw)
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs, warns = [], []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('console', lambda m: warns.append(m.text[:200]) if m.type == 'warning' and 'art-prototype' in m.text else None)
        await pg.goto('file://' + ROOT + '/index.html')
        await pg.wait_for_timeout(3500)

        async def running(label, setup, expect_on):
            await pg.evaluate(setup)
            await pg.wait_for_timeout(1500)
            t1 = await pg.evaluate('()=>time')
            await pg.wait_for_timeout(500)
            st = await pg.evaluate("()=>({t:time,on:p.on?p.on.id:null,state})")
            ok = st['t'] - t1 > 0.3 and st['state'] == 'playing' and (expect_on is None or st['on'] == expect_on)
            check(f'{label}: game keeps running as a local file', ok, {'clock': round(st['t'] - t1, 2), 'on': st['on']})

        await running('story forest', "()=>{loadLevel(0,true);state='playing';document.getElementById('overlay').hidden=true;"
                      "p.x=p.prevX=900;p.y=p.prevY=440;p.vy=0;}", 'F-STEP-01')
        await running('World1 1-3', "()=>{loadWorld1Stage(2,{section:0,entryRoute:'default'});state='playing';"
                      "document.getElementById('overlay').hidden=true;}", None)
        await running('spirit cave', "()=>{devPracticeSpirit(1900,-46);state='playing';}", 'SM-M6')
        await running('spirit cave, long ledge', "()=>{devPracticeSpirit(2990,-1100);state='playing';}", 'SM-M24')
        check('no page errors', not errs, errs[:3])
        check('prototype stayed on (no fallback warning)', not warns, warns[:3])
        await b.close()
    sys.exit(0 if all(results) else 1)

asyncio.run(main())
