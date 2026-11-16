"""Frame-cost probe on a phone-sized viewport with CPU slowdown.

    python tools/qa/perf_probe.py [level] [cpu_slowdown]     # e.g. 2 4

Reports average frame time and, per frame: script, layout and style time, DOM writes, and missed jump taps.
The headless browser rasterises in software, so GPU-side costs (big textures, backdrop blur) do not show
here. On a real phone, open the game with ?fps=1 instead.
"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_mobile, play, touch

LI = int(sys.argv[1]) if len(sys.argv) > 1 else 2
RATE = float(sys.argv[2]) if len(sys.argv) > 2 else 4


async def main():
    srv = serve()
    async with async_playwright() as pw:
        b, pg, cdp, errs = await open_mobile(pw)
        await cdp.send('Performance.enable')
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': RATE})
        await play(pg, LI, 600, 560); await pg.evaluate("()=>{p.invulnerable=999}"); await pg.wait_for_timeout(1500)
        await pg.evaluate("""()=>{window.__mut=0;new MutationObserver(ms=>{__mut+=ms.length}).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
          window.__f=[];let lt=performance.now();(function rf(t){__f.push(t-lt);lt=t;requestAnimationFrame(rf)})(lt);}""")
        m0 = {x['name']: x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
        await pg.evaluate("()=>{__f=[];__mut=0;pressInput('ArrowRight','kb_r')}")
        await pg.wait_for_timeout(5000)
        m1 = {x['name']: x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
        r = await pg.evaluate("()=>{releaseInput('ArrowRight','kb_r');const f=__f.slice(2);return {n:f.length,avg:f.reduce((a,b)=>a+b,0)/f.length,over50:f.filter(x=>x>50).length,mut:__mut}}")
        n = r['n']
        j = await pg.evaluate("()=>{const r=document.getElementById('vbtn-jump').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}")
        await pg.evaluate("()=>{window.__j=0;const o=beginJump;beginJump=function(){window.__j++;return o.apply(this,arguments)}}")
        miss = 0
        for _ in range(15):
            await pg.evaluate("()=>{p.x=600;p.y=580;p.vy=0;p.ground=true;p.jumps=0;p.buffer=0;__j=0}"); await pg.wait_for_timeout(180)
            await touch(cdp, 'touchStart', [(1, j)]); await pg.wait_for_timeout(60); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(500)
            if not await pg.evaluate("()=>__j"): miss += 1
        per = lambda k: round((m1[k] - m0[k]) * 1000 / n, 2)
        print(json.dumps({'level': LI, 'cpu_slowdown': RATE, 'avg_frame_ms': round(r['avg'], 1), 'frames_over_50ms': r['over50'],
                          'script_ms': per('ScriptDuration'), 'layout_ms': per('LayoutDuration'), 'style_ms': per('RecalcStyleDuration'),
                          'dom_writes_per_frame': round(r['mut'] / n, 2), 'jump_taps_missed': f'{miss}/15', 'errors': errs[:3]}, ensure_ascii=False))
        await b.close()

asyncio.run(main())
