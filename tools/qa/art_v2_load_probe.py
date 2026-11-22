"""Art phase 2 (P2-D): loading, frame time and memory with the V2 art, side by side with the release art.

    python tools/qa/art_v2_load_probe.py

The game is served from a sub-folder (/trickcal_dudu_jump/index.html), the same relative-path layout as GitHub
Pages. For the release art (?oldart=1) and the V2 art, the script visits the six V2 families, lets each run for
2.5 s with Dudu running, and records: responses with status >= 400 and failed requests, V2 images fetched and
fetched more than once, average frame interval and frames over 50 ms, and the JS heap. Then the browser is closed,
opened again on the same address, and checked for page errors and a running game clock.
"""
import asyncio, json, os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
import harness
from harness import serve, async_playwright

REPO = harness.ROOT
SUB = os.path.basename(REPO.rstrip('\\/'))
BASE = f'http://127.0.0.1:{harness.PORT}/{SUB}/index.html'
VISITS = [('story forest', "()=>{gameMode='story';loadLevel(0);levelIndex=0;state='playing';document.getElementById('overlay').hidden=true;"
                           "const st=document.getElementById('story');if(st)st.hidden=true;p.x=p.prevX=600;p.y=p.prevY=440;}")]
VISITS += [(f'World1 1-{i + 1}', f"()=>{{loadWorld1Stage({i},{{section:0,entryRoute:'default'}});state='playing';document.getElementById('overlay').hidden=true;}}")
           for i in range(4)]
VISITS += [(f'spirit {z}', f"()=>{{devPracticeSpirit({x},{y});state='playing';}}")
           for z, x, y in (('out', 376, -449), ('cave', 2990, -1100), ('lava', 1990, -1300), ('snow', 2000, -2600))]
FRAMES = """()=>{window.__f=[];let lt=performance.now();window.__fo=true;(function rf(t){if(!window.__fo)return;__f.push(t-lt);lt=t;requestAnimationFrame(rf)})(lt);}"""
STOP = """()=>{window.__fo=false;const f=__f.slice(3);return {avg:f.reduce((a,b)=>a+b,0)/Math.max(1,f.length),over50:f.filter(x=>x>50).length,n:f.length,
  heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null}}"""


async def launch(pw):
    kw = {'args': ['--use-gl=swiftshader', '--enable-precise-memory-info']}
    if os.environ.get('CHROME'): kw['executable_path'] = os.environ['CHROME']
    return await pw.chromium.launch(**kw)


async def probe(pw, query):
    b = await launch(pw)
    pg = await b.new_page(viewport={'width': 1280, 'height': 720})
    errs, bad, fetched = [], [], {}
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('response', lambda r: (bad.append((r.status, r.url[-90:])) if r.status >= 400 else None,
                                 fetched.__setitem__(r.url.split('?')[0], fetched.get(r.url.split('?')[0], 0) + 1)))
    aborted = []
    # media preloads the browser cancels (net::ERR_ABORTED on .mp3) are not missing files; listed apart
    pg.on('requestfailed', lambda r: (aborted if 'ABORTED' in (r.failure or '') and r.url.split('?')[0].endswith('.mp3') else bad)
          .append(('failed', r.failure, r.url[-90:])))
    await pg.goto(BASE + query); await pg.wait_for_timeout(6000)
    rows = []
    for label, js in VISITS:
        await pg.evaluate(js); await pg.wait_for_timeout(700)
        await pg.evaluate("()=>{p.invulnerable=999;p.hp=5;pressInput('ArrowRight','kb_probe')}")
        await pg.evaluate(FRAMES); await pg.wait_for_timeout(2500)
        r = await pg.evaluate(STOP); await pg.evaluate("()=>releaseInput('ArrowRight','kb_probe')")
        rows.append({'visit': label, 'avg_frame_ms': round(r['avg'], 1), 'over_50ms': r['over50'], 'heap_mb': r['heap']})
    await b.close()
    # reopen
    b = await launch(pw); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs2 = []
    pg.on('pageerror', lambda e: errs2.append(str(e)[:200]))
    await pg.goto(BASE + query); await pg.wait_for_timeout(6000)
    await pg.evaluate(VISITS[-2][1]); await pg.wait_for_timeout(800)
    t1 = await pg.evaluate('()=>time'); await pg.wait_for_timeout(600); t2 = await pg.evaluate('()=>time')
    await b.close()
    v2 = {u: n for u, n in fetched.items() if re.search(r'/assets/terrain/(forest_w1|forest_story|spirit_[a-z]+)/', u)}
    return {'visits': rows, 'bad_responses': bad[:10], 'aborted_media': aborted[:10], 'page_errors': errs[:5],
            'art_v2_images': len(v2), 'art_v2_fetched_twice': [u[-60:] for u, n in v2.items() if n > 1],
            'reopen': {'page_errors': errs2[:5], 'clock_runs': t2 - t1 > 0.3}}


def referenced_v2():
    s = open(os.path.join(REPO, 'terrain-art.js'), encoding='utf-8').read()
    return sorted(set(re.findall(r"assets/terrain/[\w/]+\.png", s)))


async def main():
    srv = serve(root=os.path.dirname(REPO))
    out = {}
    async with async_playwright() as pw:
        for name, q in (('release', '?oldart=1'), ('v2', '')):
            out[name] = await probe(pw, q)
            print(name, json.dumps(out[name], ensure_ascii=False), flush=True)
    srv.shutdown()
    refs = referenced_v2()
    out['v2_referenced'] = len(refs)
    missing = [p for p in refs if not os.path.exists(os.path.join(REPO, p))]
    out['v2_missing_files'] = missing
    json.dump(out, open(os.path.join(os.path.dirname(__file__), 'out', 'art_v2_load_probe.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = (not out['v2']['bad_responses'] and not out['v2']['page_errors'] and not missing and out['v2']['reopen']['clock_runs']
          and not out['v2']['reopen']['page_errors'] and not out['v2']['art_v2_fetched_twice'])
    print('referenced V2 images', len(refs), 'missing files', missing)
    print('RESULT', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)

asyncio.run(main())
