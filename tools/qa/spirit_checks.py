"""Behaviour checks for the spirit mountain (World 3, 「정령산의 아침」), run in a real browser.

    python tools/qa/spirit_checks.py          # all checks, exit code 1 if any fails
    python tools/qa/spirit_checks.py wind     # only checks whose name contains the word

Geometry is covered by spirit_hops.py; this covers the cave sight, no pits in the maze, lava, wisps, the wind
cycle and its push, checkpoints, the five friends, stars, backdrop order and the clear. The wind log printed at
the end is the "강풍 주기 로그" the directive asks for.
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop

results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(('PASS' if ok else 'FAIL'), name, ('' if ok else f'  {detail}'))


PLACE = "([x,y])=>{devPracticeSpirit(x,y);p.invulnerable=0;p.hp=5;}"


async def main():
    want = sys.argv[1:]
    def on(n): return not want or any(w in n for w in want)
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        w = pg.wait_for_timeout
        await pg.evaluate("()=>{document.getElementById('overlay').hidden=true;}")

        if on('worldmap'):
            r = await pg.evaluate("""()=>{localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');_memoryWorldMapSave=null;openWorldMapMenu();
              const c=__WORLDMAP_CARDS.find(c=>c.id==='world3_spiritmountain');handleWorldMapCardAction('world3_spiritmountain');
              return {status:c.implementationStatus,order:__WORLDMAP_CARDS.map(c=>c.id).slice(0,4).join(','),panel:!!document.getElementById('wmStageBtn-3-1'),
                w1:!!loadWorldMapSave().worlds.world1_beastforest,w2:!!loadWorldMapSave().worlds.world2_monatium_night}}""")
            check('worldmap: spirit mountain card is playable, third world, opens its panel; other records kept',
                  r['status'] == 'playable' and r['panel'] and r['order'].endswith('world3_spiritmountain') and r['w1'] and r['w2'], r)

        if on('cave'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const out={};
              for(const [k,x,y] of [['start',1390,580],['maze',1500,-46],['maze2',1980,-1003],['gabia',300,-449],['lava',1500,-1301]]){
                devPracticeSpirit(x,y);p.invulnerable=99;await w(900);out[k]=+__sm.mask.toFixed(2);}
              return out}""")
            check('cave: darkness is on in the maze and off at the start, Gabia rest and the lava hall',
                  r['maze'] > 0.9 and r['maze2'] > 0.9 and r['start'] < 0.05 and r['gabia'] < 0.05 and r['lava'] < 0.05, r)
            # every maze platform: walking or dropping off either edge never ends in a respawn
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const bad=[];
              const ids=platforms.filter(a=>/^SM-(M|E)\\d/.test(a.id)).map(a=>a.id);
              for(const id of ids){for(const side of [-1,1]){
                const a=platforms.find(q=>q.id===id);devPracticeSpirit(side<0?a.x+10:a.x+a.w-10,a.y);p.invulnerable=99;const d0=deaths;
                const k=side<0?'ArrowLeft':'ArrowRight';pressInput(k,'kb_t');await w(160);releaseInput(k,'kb_t');
                for(let i=0;i<60;i++){await w(30);if(p.ground&&p.on!==a)break;}
                if(deaths!==d0||p.y>600)bad.push(id+(side<0?'<':'>'));}}
              return {n:ids.length,bad}}""")
            check('cave: walking off any maze or Gabia platform edge never kills (no pits)', r['bad'] == [], r)

        if on('lava'):
            await pg.evaluate(PLACE, [1300, -1301])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));__sm.wisps.length=0;const d0=deaths;const hp0=p.hp;
              pressInput('ArrowRight','kb_t');for(let i=0;i<40;i++){await w(25);if(p.hp<hp0)break;}releaseInput('ArrowRight','kb_t');await w(500);
              return {hp0,hp:p.hp,deaths:deaths-d0,x:Math.round(p.x),stun:p.guardStun>0||p.invulnerable>0}}""")
            check('lava: walking into a pool costs 1 health and knocks Dudu out, no reset', r['hp'] == r['hp0'] - 1 and r['deaths'] == 0, r)

        if on('wisp'):
            await pg.evaluate(PLACE, [1250, -1301])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const wp=__sm.wisps.find(q=>q.id==='SM-W1');
              const _h=window.applyStunHit;let hits=0;window.applyStunHit=(...a)=>{hits++;return false};
              let attacked=false,balls=0,minX=1e9,maxX=-1e9;
              for(let i=0;i<160;i++){await w(25);if(wp.state==='attack')attacked=true;balls=Math.max(balls,__sm.fireballs.length);minX=Math.min(minX,wp.x);maxX=Math.max(maxX,wp.x);}
              window.applyStunHit=_h;return {attacked,balls,hits,minX:Math.round(minX),maxX:Math.round(maxX),x1:wp.x1,x2:wp.x2}}""")
            check('wisp: patrols its span, telegraphs, shoots a fireball that reaches Dudu', r['attacked'] and r['balls'] > 0 and r['hits'] > 0 and r['minX'] >= r['x1'] and r['maxX'] <= r['x2'], r)
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const wp=__sm.wisps.find(q=>q.id==='SM-W3');wp.state='patrol';wp.cool=99;
              p.invulnerable=0;p.guardStun=0;p.knock=0;const hp0=p.hp;p.x=p.prevX=wp.x;p.y=p.prevY=wp.hy-40;p.vy=300;p.ground=false;p.on=null;await w(120);
              const st=wp.state;p.invulnerable=0;await w(50);const wp4=__sm.wisps.find(q=>q.id==='SM-W4');wp4.state='patrol';wp4.cool=99;
              p.x=p.prevX=wp4.x-30;p.y=p.prevY=wp4.hy+40;p.vy=0;p.vx=0;const hp1=p.hp;await w(100);
              return {stomp:st,hpStomp:hp0-hp1,hpTouch:hp1-p.hp}}""")
            check('wisp: landing on top stuns it (Groggy) with no damage; touching the body is a hit', r['stomp'] == 'stomped' and r['hpStomp'] == 0 and r['hpTouch'] == 1, r)
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));devPracticeSpirit(874,-1896);p.invulnerable=0;
              await w(3000);return {balls:__sm.fireballs.length,attacking:__sm.wisps.filter(q=>q.state==='attack').length,hp:p.hp}}""")
            check('wisp: none attack once Dudu is out of the lava hall (Ifrit rest)', r['balls'] == 0 and r['attacking'] == 0 and r['hp'] == 5, r)

        if on('wind'):
            # schedule: drive the real state machine with game-time steps (no waiting), Dudu standing in the zone
            r = await pg.evaluate("""()=>{devPracticeSpirit(1250,-5008);resetSpiritRuntime();__sm.windLog.length=0;const st=__sm;const dt=1/120;
              const gx=p.x,gy=p.y;let warnLead=[],prevState='',warnAt=0;
              for(let i=0;i<120*330;i++){st.clock+=dt;p.x=gx;p.y=gy;p.ground=true;updateSpiritWind(dt);
                const s=st.wind.state;if(s==='warning'&&prevState!=='warning')warnAt=st.clock;if(s==='gust'&&prevState==='warning')warnLead.push(+(st.clock-warnAt).toFixed(2));prevState=s;}
              return {log:st.windLog.slice(),warnLead}}""")
            log = r['log']
            gaps = [e['sincePrevStart'] for e in log if e['sincePrevStart'] is not None]
            durs = [e['duration'] for e in log]
            check('wind: start-to-start 20-30s and 4-6s gusts over 10+ cycles', len(log) >= 10 and all(20 <= g <= 30 for g in gaps) and all(4 <= d <= 6 for d in durs), log)
            check('wind: a visible warning starts about 1.2s before every gust', r['warnLead'] and all(1.1 <= x <= 1.3 for x in r['warnLead']), r['warnLead'][:12])
            first = log[0]['start'] if log else None
            check('wind: no gust in the first 20s after entering the zone', first is not None and first >= 20, first)
            print('  wind log:', json.dumps(log[:12]))
            # physics: neutral jump drifts left only in a gust, standing still never slides, no push outside the zone
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const res={};
              async function jump(x,y,gust){devPracticeSpirit(x,y);p.invulnerable=99;__sm.forceGust=gust;await w(400);const x0=p.x;
                pressInput('Space','kb_s');await w(240);releaseInput('Space','kb_s');for(let i=0;i<60;i++){await w(20);if(p.ground&&i>5)break;}return Math.round(p.x-x0);}
              res.calm=await jump(1250,-5069,false);res.gust=await jump(1250,-5069,true);
              devPracticeSpirit(1250,-5069);p.invulnerable=99;__sm.forceGust=true;await w(300);const x0=p.x;await w(1500);res.standSlide=Math.round(p.x-x0);
              res.summit=await jump(1300,-6350,true);__sm.forceGust=false;
              devPracticeSpirit(1250,-5069);__sm.forceGust=true;await w(300);
              pressInput('ArrowRight','kb_r');pressInput('Space','kb_s');await w(240);releaseInput('Space','kb_s');await w(30);pressInput('Space','kb_s');await w(220);releaseInput('Space','kb_s');
              const xa=p.x;await w(300);releaseInput('ArrowRight','kb_r');res.rightMove=Math.round(p.x-xa);__sm.forceGust=false;
              return res}""")
            check('wind: a gust pushes a standing jump left, calm does not', r['gust'] <= -25 and abs(r['calm']) <= 4, r)
            check('wind: standing on a ledge in a gust does not slide', r['standSlide'] == 0, r)
            check('wind: no push at the summit (outside the zone)', abs(r['summit']) <= 4, r)
            check('wind: holding right in a gust still moves right (control kept)', r['rightMove'] > 30, r)
            # pause freezes the cycle
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));devPracticeSpirit(1250,-5008);p.invulnerable=99;await w(500);
              const c0=__sm.clock;pause();await w(1500);const c1=__sm.clock;start();await w(500);return {paused:+(c1-c0).toFixed(3),after:+(__sm.clock-c1).toFixed(2)}}""")
            check('wind: the cycle clock stops while paused', r['paused'] < 0.05 and r['after'] > 0.2, r)

        if on('checkpoint'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));startSpiritStage();await w(200);
              const out={flags:flags.length};
              const s=platforms.find(a=>a.id==='SM-I1');p.x=p.prevX=604;p.y=p.prevY=s.y;p.on=s;p.ground=true;p.invulnerable=99;await w(300);
              out.cp=checkpoint;p.y=p.prevY=s.y+1300;p.vy=900;p.ground=false;p.on=null;await w(300);
              out.back={x:Math.round(p.x),y:Math.round(p.y),cp:checkpoint};return out}""")
            check('checkpoint: 5 flags; past Ifrit a long fall returns Dudu to the last flag', r['flags'] == 5 and r['cp'] == 3 and r['back']['x'] == 604 and r['back']['y'] == -2023, r)

        if on('npc'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const out=[];
              for(const n of world1Stages[SM_INDEX].smNpcs){devPracticeSpirit(n.x+70,n.y);p.invulnerable=99;await w(300);
                const c=__sm.npcs.find(q=>q.id===n.id);out.push({name:c.name,y:c.y,near:c.nearNow,clip:c.clip});}
              return out}""")
            names = [o['name'] for o in r]
            ys = [o['y'] for o in r]
            check('npc: Naia, Gabia, Ifrit, then Sylla and Aya together, from bottom to top', names == ['나이아', '가비아', '이프리트', '실라', '아야'] and ys[0] > ys[1] > ys[2] > ys[3] and ys[3] == ys[4], r)
            clips = {'나이아': 'naia_happy', '가비아': 'gabia_happy', '이프리트': 'ifrit_sorry', '실라': 'sylla_happy', '아야': 'aya_happy'}
            check('npc: each plays the supplied motion when Dudu is near', all(o['near'] and o['clip'] == clips[o['name']] for o in r), r)
            r = await pg.evaluate("()=>Object.keys(SM_SPRITES).map(k=>[k,!!smImages[k]])")
            check('npc: every converted sprite sheet loaded (no 404)', all(v for _, v in r), [k for k, v in r if not v])

        if on('star'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');_memoryWorldMapSave=null;
              const got=[];for(const st of world1Stages[SM_INDEX].smStars){devPracticeSpirit(st.x,st.y+40);p.invulnerable=99;p.ground=false;p.on=null;await w(250);}
              const rec=loadWorldMapSave().worlds.world3_spiritmountain.stages['3-1'];
              return {saved:rec.collectibles.length,pill:document.getElementById('specialPill').hidden,score:document.getElementById('specialScore').textContent,total:document.getElementById('specialTotal').textContent}}""")
            check('star: the three stars collect, save and show in the crayon pill', r['saved'] == 3 and not r['pill'] and r['score'] == '3' and r['total'].strip() == '/ 3', r)

        if on('backdrop'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const out=[];
              for(const [x,y] of [[1390,580],[1500,-46],[1980,-1003],[1500,-1301],[874,-1896],[1900,-3781],[1000,-5008],[1273,-6148],[1300,-6350]]){
                devPracticeSpirit(x,y);p.invulnerable=99;await w(1300);const b=__smBgDebug.bands;out.push([y,b.indexOf(Math.max(...b))+1,b[4]]);}
              return out}""")
            order = [o[1] for o in r]
            check('backdrop: 1 start, 2 cave, 3 lava, 4 outside, 5 summit, in order', order == sorted(order) and order[0] == 1 and order[-1] == 5 and set(order) == {1, 2, 3, 4, 5}, r)
            check('backdrop: the summit painting is not fully shown below the summit', all(o[2] < 0.6 for o in r[:-1]) and r[-1][2] == 1, r)

        if on('clear'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));devPracticeSpirit(1450,-6350);p.invulnerable=99;
              pressInput('ArrowRight','kb_t');for(let i=0;i<60;i++){await w(40);if(state!=='playing')break;}releaseInput('ArrowRight','kb_t');
              const rec=loadWorldMapSave().worlds.world3_spiritmountain.stages['3-1'];
              return {state,modal:!!document.getElementById('wmSpiritReplayBtn'),cleared:rec.cleared,bias:window.__smWindBias}}""")
            check('clear: the summit flag clears World 3 and saves it', r['state'] == 'paused' and r['modal'] and r['cleared'] and not r['bias'], r)

        if on('other'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));startSpiritStage();await w(300);startNightStage();await w(300);
              const n={idx:activeWorldStageIndex,lock:window.__duduIntroLock>0};startWorld1StageFromMenu(0,true);await w(300);
              return {n,w1:activeWorldStageIndex,bias:window.__smWindBias,route:document.getElementById('routeLabel').textContent}}""")
            check('other: night map and world 1 load clean after the spirit mountain', r['w1'] == 0 and not r['bias'] and r['route'].startswith('WORLD 1'), r)

        bad = [e for e in errs if 'PAGEERR' in e or 'spirit' in e.lower() or '404' in e]
        check('no page errors or missing files', not bad, bad[:5])
        await b.close()
    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)

asyncio.run(main())
