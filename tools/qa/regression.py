"""Regression suite. Run before every commit that touches game code.

    python tools/qa/regression.py            # all checks
    python tools/qa/regression.py dash look  # only checks whose name contains one of the words

Prints PASS/FAIL per check and exits non-zero if anything failed.
Each check reproduces a bug that actually shipped or a behaviour a player asked for (see docs/HANDOFF.md).
"""
import asyncio, glob, os, subprocess, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import ROOT, serve, async_playwright, open_desktop, open_mobile, play, touch

RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, bool(ok), detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


def syntax():
    bad = []
    for f in sorted(glob.glob(os.path.join(ROOT, '*.js'))):
        r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
        if r.returncode:
            bad.append(os.path.basename(f) + ': ' + r.stderr.strip().splitlines()[-1])
    check('syntax: node --check on every js file', not bad, '; '.join(bad))


async def desktop_checks(pw, want):
    b, pg, errs = await open_desktop(pw)
    def on(n): return not want or any(w in n for w in want)

    if on('load'):
        check('load: no page errors after boot', not errs, '; '.join(errs[:3]))

    if on('collectibles'):
        r = await pg.evaluate("()=>levels.map(L=>[L.regularDefs.length,L.specialDefs.length])")
        c, s = sum(x[0] for x in r), sum(x[1] for x in r)
        check('collectibles: 135 candies and 12 golden crayons', c == 135 and s == 12, f'{c} / {s}')

    if on('look'):
        for name, lvl, x, y in [('forest ground', 0, 300, 580), ('monatium A', 2, 700, 400)]:
            await play(pg, lvl, x, y); await pg.wait_for_timeout(1300)
            c0 = await pg.evaluate("()=>camY")
            await pg.evaluate("()=>pressInput('ArrowDown','kb_t')"); await pg.wait_for_timeout(1200)
            c1 = await pg.evaluate("()=>camY"); await pg.evaluate("()=>releaseInput('ArrowDown','kb_t')")
            check(f'look-down: camera lowers on {name}', c1 - c0 >= 150, f'{round(c0)} -> {round(c1)}')

    if on('hud'):
        # v1.4 left light text on a cream pill. Contrast is text colour against the first ancestor with a solid fill.
        await play(pg, 0, 300, 580); await pg.wait_for_timeout(900)
        r = await pg.evaluate("""()=>{const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number);
          const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
          const out={};for(const id of ['zoneTitle','playerHealthCount','dashStatus']){const e=document.getElementById(id);if(!e||!e.offsetParent){out[id]='hidden';continue}
            let a=e,bg=null;while(a&&a!==document.body){const c=rgb(getComputedStyle(a).backgroundColor);if(c.length>=3&&(c.length<4||c[3]>=.5)){bg=c;break}a=a.parentElement}
            if(!bg){out[id]='no fill';continue}const L1=lum(rgb(getComputedStyle(e).color)),L2=lum(bg);out[id]=Math.round((Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)*10)/10}
          return out}""")
        nums = [v for v in r.values() if isinstance(v, (int, float))]
        check('hud: stage name, health count and dash status are readable (contrast >= 4.5)', len(nums) == 3 and min(nums) >= 4.5, json.dumps(r))

    if on('dash'):
        await play(pg, 0, 300, 580); await pg.wait_for_timeout(700)
        ok, trace = True, []
        for _ in range(3):
            await pg.keyboard.down('ShiftLeft'); await pg.wait_for_timeout(70); await pg.keyboard.up('ShiftLeft')
            await pg.wait_for_timeout(1200)
            cd = await pg.evaluate("()=>p.dashCooldown||0")
            trace.append(round(cd, 2)); ok = ok and cd == 0
        check('dash: cooldown recharges after every use (v1.2.1 bug)', ok, f'cooldown after each: {trace}')
        await play(pg, 0, 300, 580); await pg.wait_for_timeout(500)
        tap = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));
          pressInput('ArrowRight','kb_ArrowRight');await w(70);releaseInput('ArrowRight','kb_ArrowRight');await w(80);
          pressInput('ArrowRight','kb_ArrowRight');await w(40);const d=p.dash>0;releaseInput('ArrowRight','kb_ArrowRight');return d}""")
        check('dash: keyboard double-tap dashes', tap)
        await pg.wait_for_timeout(900)
        walk = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));
          pressInput('ArrowRight','kb_ArrowRight');await w(400);releaseInput('ArrowRight','kb_ArrowRight');await w(80);
          pressInput('ArrowRight','kb_ArrowRight');await w(40);const d=p.dash>0;releaseInput('ArrowRight','kb_ArrowRight');return d}""")
        check('dash: walking then pressing again does not dash', not walk)

    if on('key'):
        r = await pg.evaluate("()=>{const res=setPcKeybind('JUMP','ShiftLeft');const o={ok:res.ok,J:pcKeybinds.JUMP,D:pcKeybinds.DASH};resetPcKeybindsToDefault();return o}")
        check('keys: binding a used key swaps the two actions', r['ok'] and r['J'] == 'ShiftLeft' and r['D'] == 'Space', json.dumps(r))
        r = await pg.evaluate("()=>[resolvePhysicalKeyToLogicalCode('ArrowUp'),duduKeyText('{JUMP}/{DASH}')]")
        check('keys: ArrowUp jumps, hint tokens show real key names', r[0] == 'Space' and r[1] == 'SPACE/L SHIFT', json.dumps(r, ensure_ascii=False))

    if on('safety'):
        await play(pg, 1, 1590, 300); await pg.wait_for_timeout(2000)
        r = await pg.evaluate("()=>({on:p.on&&p.on.id,deaths})")
        check('level: village stream is a shallow dip, not a death pit', r['on'] == 'V-DIP-01' and r['deaths'] == 0, json.dumps(r))
        await play(pg, 0, 5400, 560); await pg.wait_for_timeout(2000)
        r = await pg.evaluate("()=>({on:p.on&&p.on.id,deaths})")
        check('level: forest first-dash gap has a safety meadow', r['on'] == 'F-DASH-NET' and r['deaths'] == 0, json.dumps(r))

    if on('mayo'):
        await play(pg, 5, 1600, 580); await pg.wait_for_timeout(500)
        r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));p.invulnerable=99;
          const m=actors.find(a=>a.kind==='mayo');if(!m)return {missing:true};m.x=p.x-260;m.y=580;m.inAir=false;
          const vis=x=>x+80>rCam&&x-80<rCam+1280;let spikes=0,py=m.y,px=m.x,pd=deaths;const iv=setInterval(()=>{if(deaths===pd&&vis(px)&&vis(m.x)&&Math.abs(m.y-py)>45)spikes++;py=m.y;px=m.x;pd=deaths},16);
          pressInput('ArrowRight','kb_r');
          for(let k=0;k<6;k++){pressInput('Space','kb_s');await w(240);releaseInput('Space','kb_s');await w(60);pressInput('Space','kb_s');await w(200);releaseInput('Space','kb_s');await w(700);}
          releaseInput('ArrowRight','kb_r');clearInterval(iv);return {spikes}}""")
        check('mayo: no on-screen vertical teleports while chasing (old bug jumped 60-179px)', r.get('spikes') == 0, json.dumps(r))

    if on('boss'):
        await play(pg, 5, 10300, 520); await pg.wait_for_timeout(300)
        r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const e=STAGE_ANCHORS.erpien_b;p.x=e.marieStart+20;p.y=520;
          const cs=[];for(let i=0;i<40;i++){await w(40);cs.push([cam,camY,camZoom])}let moving=0;
          for(let i=2;i<cs.length;i++)if(Math.abs(cs[i][0]-cs[i-1][0])>2||Math.abs(cs[i][1]-cs[i-1][1])>2||Math.abs(cs[i][2]-cs[i-1][2])>0.002)moving++;
          return {moving,phase:arena&&arena.phase}}""")
        check('boss: Marie arena entry camera holds still', r['moving'] == 0, json.dumps(r))

    if on('transition'):
        await play(pg, 0, 300, 580); await pg.evaluate("()=>{p.x=END*0.5}"); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));p.x=END-200;p.y=500;await w(50);beginRegionTransition(1);let at=null;const t0=performance.now();
          while(performance.now()-t0<5000){await w(15);if(transition&&transition.phase==='opening'&&!at)at=levels[1].segments.every(s=>!s.bg||!!worldImages[s.bg]);if(state==='playing'&&at!==null)break;}
          return at}""")
        check('transition: next map art is ready when the clouds open', r is True)

    if on('modes'):
        bad = []
        for name, js in [('challenge', "startChallengeMode(0)"), ('world1', "startWorld1StageFromMenu(0,true)"),
                         ('worldmap', "openWorldMapMenu({forceDevOpen:true})"), ('night', "startNightStage()")]:
            n0 = len(errs)
            try:
                await pg.evaluate(f"()=>{{{js};}}")
            except Exception as e:
                errs.append(str(e)[:120])
            await pg.wait_for_timeout(2500)
            if len(errs) > n0: bad.append(name + ': ' + errs[n0])
        check('modes: challenge, world 1, world map and night map open without errors', not bad, '; '.join(bad))

    if on('world1'):
        await pg.evaluate("()=>startWorld1StageFromMenu(0,true)"); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{if(state!=='playing'){state='playing';last=performance.now();}}")
        ys = []
        await pg.evaluate("()=>pressInput('ArrowRight','kb_ArrowRight')")
        for _ in range(8):
            await pg.evaluate("()=>pressInput('Space','kb_Space')"); await pg.wait_for_timeout(240); await pg.evaluate("()=>releaseInput('Space','kb_Space')")
            await pg.wait_for_timeout(650)
            g = await pg.evaluate("()=>p.ground?Math.round(p.y-camY):null")
            if g is not None: ys.append(g)
        await pg.evaluate("()=>releaseInput('ArrowRight','kb_ArrowRight')")
        check('camera: world 1 keeps Dudu near screen middle when grounded', ys and all(250 <= y <= 470 for y in ys), f'screen y: {ys}')

    if on('night'):
        # v1.5 World 2 night map. Full checks: tools/qa/night_checks.py, night_hops.py, night_run.py
        r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');_memoryWorldMapSave=null;
          const open=openWorldMapMenu();document.getElementById('overlay').hidden=true;startNightStage();pressInput('ArrowRight','kb_ArrowRight');
          const t0=levelClock;let movedAt=null;for(let i=0;i<70;i++){await w(50);if(movedAt===null&&p.x>131)movedAt=levelClock-t0;}
          releaseInput('ArrowRight','kb_ArrowRight');
          const lines=world1Stages[NIGHT_STAGE_INDEX].nightNpcs.map(n=>n.name+':'+n.dialogue).join('|');
          devPracticeNight(13000,300);await w(300);const hallEarly=__nightBgDebug.hall;
          return {open,movedAt,lines,hallEarly,drones:__night.drones.length}}""")
        want_lines = ('리온:시저가 또 난리를 치다니... 빨리 붙잡아 다행이에요!|시저:히끅... 빌... 빌런은 반드시 다시 돌아온다!|'
                      '엘레나:바빠 죽겠는데 뭔 빌런이야 어휴!|아멜리아:언젠가 외래종 교도소를 한번 손 봐야겠군요|'
                      '칸나:역시 스핑크스! 이번에도 협조해 주셔서 감사합니다!')
        ok = r['open'] and r['movedAt'] is not None and 1.98 <= r['movedAt'] <= 2.2 and r['lines'] == want_lines and not r['hallEarly'] and r['drones'] == 18
        check('night: world map open from start, 2s start hold, 5 plaza lines exact, city hall hidden early', ok, r)
    await b.close()


async def mobile_checks(pw, want):
    def on(n): return not want or any(w in n for w in want)
    if not any(on(n) for n in ['touch', 'mobile']):
        return
    b, pg, cdp, errs = await open_mobile(pw)
    await play(pg, 0, 300, 580); await pg.wait_for_timeout(800)
    r = await pg.evaluate("""()=>{const g=id=>{const e=document.getElementById(id);const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};
      return {zone:g('vjoy-zone'),jump:g('vbtn-jump'),R:vjRadius()}}""")
    zx, zy, zw, zh = r['zone']; R = r['R']; j = r['jump']; jx, jy = j[0] + j[2] / 2, j[1] + j[3] / 2
    cx, cy = zx + zw * 0.45, zy + zh * 0.6
    await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    await pg.evaluate("()=>{window.__dash=0;const o=beginDash;beginDash=function(){window.__dash++;return o.apply(this,arguments)};}")

    await touch(cdp, 'touchStart', [(0, (zx + zw * 0.8, zy + zh * 0.3))]); await touch(cdp, 'touchMove', [(0, (zx + zw * 0.8 + R * 0.5, zy + zh * 0.3))])
    await pg.wait_for_timeout(150); k = await pg.evaluate("()=>[...keys]")
    await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(150); k2 = await pg.evaluate("()=>[...keys]")
    check('touch: a touch anywhere in the stick zone moves, lifting releases', k == ['ArrowRight'] and k2 == [], f'{k} -> {k2}')

    await pg.evaluate("()=>{window.__dash=0}")
    await touch(cdp, 'touchStart', [(0, (cx, cy))])
    for i in range(30):
        await touch(cdp, 'touchMove', [(0, (cx + (16 if i % 2 == 0 else 4), cy))]); await pg.wait_for_timeout(50)
    await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(300)
    check('touch: thumb wobble never dashes (v1.1 bug)', await pg.evaluate("()=>window.__dash") == 0)

    await pg.evaluate("()=>{window.__dash=0;p.dashCooldown=0;p.dash=0}")
    await touch(cdp, 'touchStart', [(0, (cx, cy))]); await touch(cdp, 'touchMove', [(0, (cx + R * 0.9, cy))]); await pg.wait_for_timeout(70)
    await touch(cdp, 'touchMove', [(0, (cx + R * 0.1, cy))]); await pg.wait_for_timeout(70); await touch(cdp, 'touchMove', [(0, (cx + R * 0.9, cy))])
    await pg.wait_for_timeout(200); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(500)
    check('touch: deliberate double flick dashes', await pg.evaluate("()=>window.__dash") == 1)

    await play(pg, 0, 900, 440); await pg.wait_for_timeout(900)
    await touch(cdp, 'touchStart', [(0, (cx, cy))]); await touch(cdp, 'touchMove', [(0, (cx + R * 0.35, cy + R * 0.3))]); await pg.wait_for_timeout(120)
    await touch(cdp, 'touchStart', [(0, (cx + R * 0.35, cy + R * 0.3)), (1, (jx, jy))]); await pg.wait_for_timeout(60)
    vy = await pg.evaluate("()=>p.vy"); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(600)
    check('touch: diagonal thumb + jump on a floating platform jumps, not drops', vy < 0, f'vy {round(vy)}')

    await touch(cdp, 'touchStart', [(0, (cx, cy))]); await touch(cdp, 'touchMove', [(0, (cx + R * 0.6, cy))]); await pg.wait_for_timeout(100)
    await pg.evaluate("()=>{VJ.pointerId=99999}")
    await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(200)
    check('touch: lifting every finger clears input even if an event was lost', await pg.evaluate("()=>[...keys]") == [])

    misses = 0
    for _ in range(12):
        await pg.evaluate("()=>{p.x=600;p.y=580;p.vy=0;p.ground=true;p.jumps=0;p.buffer=0;window.__j=0;const o=beginJump;if(!o.__w){const f=function(){window.__j++;return o.apply(this,arguments)};f.__w=true;beginJump=f;}}")
        await pg.wait_for_timeout(180)
        await touch(cdp, 'touchStart', [(1, (jx, jy))]); await pg.wait_for_timeout(60); await touch(cdp, 'touchEnd', [])
        await pg.wait_for_timeout(500)
        if not await pg.evaluate("()=>window.__j"): misses += 1
    check('touch: no swallowed jump taps at 4x CPU slowdown', misses == 0, f'{misses}/12 missed')
    check('touch: no page errors on mobile', not errs, '; '.join(errs[:3]))
    await b.close()


async def main():
    want = [w.lower() for w in sys.argv[1:]]
    if not want or 'syntax' in want:
        syntax()
    srv = serve()
    async with async_playwright() as pw:
        await desktop_checks(pw, want)
        await mobile_checks(pw, want)
    srv.shutdown()
    failed = [r for r in RESULTS if not r[1]]
    print(f'\n{len(RESULTS) - len(failed)}/{len(RESULTS)} passed')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    asyncio.run(main())
