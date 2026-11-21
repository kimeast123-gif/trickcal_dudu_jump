"""Art prototype: proof that the swap does not touch gameplay.

    python tools/qa/art_physics_identity.py
    ART_CONTROL=1 ART_ONLY=W1-S1-V02 python tools/qa/art_physics_identity.py   # control: off vs off, one platform

For every platform the prototype redraws, Dudu is placed on it and the same scripted input (run right, jump,
double jump; then the same to the left) is played step by step: update(STEP) 120 times a second with draw()
after every step, so the new drawing code runs in between. The run is done once with the prototype off and once
with it on, each from a fresh placement, and Dudu's x, y and the platform he stands on are compared frame by frame.
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, play

RUN = r"""(o)=>{
  const held=[];window.__rafHold=window.__rafHold||[];
  if(!window.__rafOrigP){window.__rafOrigP=window.requestAnimationFrame;window.requestAnimationFrame=f=>{window.__rafHold.push(f);return 0};}
  window.__DUDU_ART_PROTOTYPE_TEST=o.art;
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
  window.__DUDU_ART_PROTOTYPE_TEST=true;
  return trace;}"""

THAW = r"""()=>{if(window.__rafOrigP){window.requestAnimationFrame=window.__rafOrigP;delete window.__rafOrigP;
  const h=window.__rafHold;window.__rafHold=[];last=performance.now();acc=0;h.forEach(f=>requestAnimationFrame(f));}}"""


async def place(pg, group, a, x):
    if group == 'story':
        await play(pg, 0, x, a['y'] - 2)
    elif group.startswith('w1_'):
        i = int(group[3:])
        await pg.evaluate(f"""()=>{{loadWorld1Stage({i},{{section:0,entryRoute:'default'}});state='playing';
          document.getElementById('overlay').hidden=true;p.x=p.prevX={x};p.y=p.prevY={a['y']};p.vx=0;p.vy=0;
          p.on=platforms.find(q=>q.id==='{a['id']}')||null;p.ground=!!p.on;
          const c=computeInitialCameraForPoint(p.x,p.y);cam=c.cam;camY=c.camY;window.camBaseY=camY;syncRenderCoords();}}""")
    else:
        await pg.evaluate(f"()=>{{devPracticeSpirit({x},{a['y']});state='playing';}}")
    await pg.evaluate("()=>{p.invulnerable=0;p.hp=5;}")


async def main():
    inv = json.load(open(os.path.join(os.path.dirname(__file__), 'out', 'art_inventory.json')))
    groups = {'story': inv['story_forest']}
    for i in range(4):
        groups[f'w1_{i}'] = inv[f'world1_{i + 1}']
    groups['cave'] = inv['spirit']
    srv = serve()
    total = same = 0
    bad = []
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        for g, plats in groups.items():
            only = os.environ.get('ART_ONLY')
            for a in [q for q in plats if q['applies'] and (not only or q['id'] == only)]:
                for d in (1, -1):
                    x = a['x'] + (a['w'] * 0.25 if d > 0 else a['w'] * 0.75)
                    runs = []
                    for art in ((False, False) if os.environ.get('ART_CONTROL') else (False, True)):
                        await place(pg, g, a, x)
                        runs.append(await pg.evaluate(RUN, {'art': art, 'dir': d}))
                        await pg.evaluate(THAW)
                    total += 1
                    if runs[0] == runs[1]:
                        same += 1
                    else:
                        k = next(i for i in range(240) if runs[0][i] != runs[1][i])
                        bad.append((g, a['id'], d, k, runs[0][k], runs[1][k]))
        await b.close()
        errs = [e for e in errs]
    srv.shutdown()
    print(f'{same}/{total} scripted runs identical frame by frame (art off vs on)')
    for x in bad:
        print('DIFF', x)
    print('page errors:', errs[:5])
    sys.exit(0 if same == total and not errs else 1)

asyncio.run(main())
