"""Terrain art (art renewal phase 2): proof that the new art does not touch gameplay, over every platform it redraws.

    python tools/qa/art_v2_physics_identity.py
    ART_FAMILY=spirit python tools/qa/art_v2_physics_identity.py      # story | w1_0..w1_3 | spirit

For every platform that terrain-art.js redraws (story forest, World1 1-1..1-4, Spirit Mountain out/cave/lava/snow),
Dudu is placed on it
and a scripted input (run, jump, double jump; both directions) is played with update(STEP) + draw() each step.
The run is done with the terrain art off and on, and x, y and the platform he stands on are compared
frame by frame. When a pair differs, an off-vs-off control is run at the same spot: if the control also differs
the spot is time-dependent (blink, wind) rather than art-dependent, and is reported separately.
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, play

SET = "(on)=>{window.__DUDU_TERRAIN_ART=on;}"
RUN = r"""(o)=>{
  window.__rafHold=window.__rafHold||[];
  if(!window.__rafOrigP){window.__rafOrigP=window.requestAnimationFrame;window.requestAnimationFrame=f=>{window.__rafHold.push(f);return 0};}
  window.__DUDU_TERRAIN_ART=o.art;
  const trace=[];const dir=o.dir>0?'ArrowRight':'ArrowLeft';
  for(let i=0;i<240;i++){
    if(i===5)pressInput(dir,'qa_script');
    if(i===20)pressInput('Space','qa_script');
    if(i===50)releaseInput('Space','qa_script');
    if(i===62)pressInput('Space','qa_script');
    if(i===90)releaseInput('Space','qa_script');
    if(i===150)releaseInput(dir,'qa_script');
    update(STEP);draw();
    trace.push([+p.x.toFixed(4),+p.y.toFixed(4),p.on?p.on.id||'?':'-']);
  }
  window.__DUDU_TERRAIN_ART=true;
  return trace;}"""
THAW = r"""()=>{if(window.__rafOrigP){window.requestAnimationFrame=window.__rafOrigP;delete window.__rafOrigP;
  const h=window.__rafHold;window.__rafHold=[];last=performance.now();acc=0;h.forEach(f=>requestAnimationFrame(f));}}"""
LIST = r"""()=>platforms.filter(a=>!a.hidden&&(window.__terrainArt&&window.__terrainArt.applies(a)))
  .map(a=>({id:a.id||'',x:a.x,y:a.y,w:a.w,zone:(a.smDraw&&typeof smZoneOf==='function')?smZoneOf(a):''}))"""
ENTER = {'story': "()=>{gameMode='story';loadLevel(0);levelIndex=0;state='paused';document.getElementById('overlay').hidden=true;}",
         'spirit': "()=>{devPracticeSpirit(2000,-1301);state='paused';}"}


def enter_js(g):
    if g.startswith('w1_'):
        return f"()=>{{loadWorld1Stage({int(g[3:])},{{section:0,entryRoute:'default'}});state='paused';document.getElementById('overlay').hidden=true;}}"
    return ENTER[g]


async def place(pg, g, a, x):
    if g == 'story':
        await play(pg, 0, x, a['y'] - 2)
    elif g.startswith('w1_'):
        await pg.evaluate(f"""()=>{{loadWorld1Stage({int(g[3:])},{{section:0,entryRoute:'default'}});state='playing';
          document.getElementById('overlay').hidden=true;p.x=p.prevX={x};p.y=p.prevY={a['y']};p.vx=0;p.vy=0;
          p.on=platforms.find(q=>q.id==='{a['id']}')||null;p.ground=!!p.on;
          const c=computeInitialCameraForPoint(p.x,p.y);cam=c.cam;camY=c.camY;window.camBaseY=camY;syncRenderCoords();}}""")
    else:
        await pg.evaluate(f"()=>{{devPracticeSpirit({x},{a['y']});state='playing';}}")
    await pg.evaluate("()=>{p.invulnerable=0;p.hp=5;}")


async def run(pg, g, a, x, d, art):
    await place(pg, g, a, x)
    t = await pg.evaluate(RUN, {'art': art, 'dir': d})
    await pg.evaluate(THAW)
    return t


async def main():
    fams = ['story', 'w1_0', 'w1_1', 'w1_2', 'w1_3', 'spirit']
    if os.environ.get('ART_FAMILY'):
        fams = [os.environ['ART_FAMILY']]
    srv = serve()
    out = {'families': {}, 'art_diff': [], 'time_dependent': []}
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        for g in fams:
            await pg.evaluate(enter_js(g)); await pg.wait_for_timeout(500)
            plats = await pg.evaluate(LIST)
            n = same = 0
            for a in plats:
                for d in (1, -1):
                    x = a['x'] + (a['w'] * 0.25 if d > 0 else a['w'] * 0.75)
                    off = await run(pg, g, a, x, d, False)
                    on = await run(pg, g, a, x, d, True)
                    n += 1
                    if off == on:
                        same += 1
                        continue
                    ctl = await run(pg, g, a, x, d, False)
                    k = next(i for i in range(240) if off[i] != on[i])
                    rec = (g, a['id'], a['zone'], d, k, off[k], on[k])
                    (out['time_dependent'] if ctl != off else out['art_diff']).append(rec)
            fam = {'platforms': len(plats), 'runs': n, 'identical': same}
            if g == 'spirit':
                fam['by_zone'] = {z: sum(1 for a in plats if a['zone'] == z) for z in sorted({a['zone'] for a in plats})}
            out['families'][g] = fam
            print(g, fam, flush=True)
        await b.close()
    srv.shutdown()
    out['page_errors'] = errs[:5]
    path = os.path.join(os.path.dirname(__file__), 'out', 'art_v2_physics_identity.json')
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    tot = sum(f['runs'] for f in out['families'].values()); ok = sum(f['identical'] for f in out['families'].values())
    print(f'{ok}/{tot} scripted runs identical frame by frame (art off vs on)')
    for r in out['art_diff']: print('ART DIFF', r)
    for r in out['time_dependent']: print('TIME-DEPENDENT (control differs too)', r)
    print('page errors:', errs[:5])
    sys.exit(0 if not out['art_diff'] and not errs else 1)

asyncio.run(main())
