"""Behaviour checks for the night map (World 2, 「모나티엄의 야경」), run in a real browser.

    python tools/qa/night_checks.py          # all checks, exit code 1 if any fails
    python tools/qa/night_checks.py drone    # only checks whose name contains the word

Covers what tools/qa/night_hops.py (geometry) cannot: the start hold and lead runners, drones, the electric
field, riding the moving platforms, riot-squad patrols, checkpoints, the city-hall backdrop range, the five
plaza friends and the stage clear. The world map must also open with no story clear on record.
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop

results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(('PASS' if ok else 'FAIL'), name, ('' if ok else f'  {detail}'))


START = "()=>{document.getElementById('overlay').hidden=true;localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');startNightStage();}"
# place Dudu at x,y with hazards in their normal state (no runners, no start hold)
PLACE = """([x,y])=>{devPracticeNight(x,y);p.invulnerable=0;p.hp=5;}"""


async def main():
    want = sys.argv[1:]
    def on(n): return not want or any(w in n for w in want)
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        w = pg.wait_for_timeout

        if on('worldmap'):
            r = await pg.evaluate("""()=>{localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');_memoryWorldMapSave=null;
              const opened=openWorldMapMenu();const card=document.getElementById('wmCard-world2_monatium_night');
              const r={opened,unlocked:isWorldMapUnlocked(),card:!!card,status:card&&card.dataset.status,
                order:__WORLDMAP_CARDS.map(c=>c.id).slice(0,3).join(',')};
              handleWorldMapCardAction('world2_monatium_night');r.panel=!!document.getElementById('wmStageBtn-2-1');return r;}""")
            check('worldmap: opens without a story clear, night map is playable and second', r['opened'] and r['unlocked'] and r['card']
                  and r['status'] == 'playable' and r['panel'] and r['order'] == 'story_replay,world1_beastforest,world2_monatium_night', r)

        if on('intro'):
            await pg.evaluate(START)
            await pg.keyboard.down('ArrowRight')
            log = []
            for _ in range(32):
                await w(100)
                log.append(await pg.evaluate("()=>[levelClock,p.x,__night.runners.map(r=>r.x).join('/')]"))
            await pg.keyboard.up('ArrowRight')
            moved_at = next((t for t, x, _ in log if x > 131), None)
            runner_moved = log[2][2] != log[0][2]
            check('intro: Dudu is held for 2.0s, then moves', moved_at is not None and 1.98 <= moved_at <= 2.15, f'moved at {moved_at}, log {log[:3]}')
            check('intro: Lion and Scizor set off at once', runner_moved, log[:3])
            await w(2500)
            r = await pg.evaluate("()=>({gone:__night.runners.every(r=>r.gone||r.x>rCam+W+100||r.y<rCamY-100),xs:__night.runners.map(r=>[Math.round(r.x),Math.round(r.y),r.gone])})")
            check('intro: runners leave the screen and never block Dudu', r['gone'], r)

        if on('drone'):
            await pg.evaluate(PLACE, [3480, 356])
            r0 = await pg.evaluate("()=>{const d=__night.drones.find(d=>d.id==='NM-D3');return {state:d.state,y:d.y,ty:d.ty,viewBottom:rCamY+H}}")
            await pg.evaluate("()=>{const d1=platforms.find(a=>a.id==='NM-DOT1');p.x=p.prevX=3650;p.y=p.prevY=d1.y;p.on=d1;p.ground=true;p.vx=0;p.vy=0;}")
            seen = []
            for _ in range(30):
                await w(100)
                seen.append(await pg.evaluate("()=>{const d=__night.drones.find(d=>d.id==='NM-D3');return [d.state,Math.round(d.y)]}"))
            states = [s for s, _ in seen]
            ys = [y for _, y in seen]
            check('drone: waits out of sight until Dudu is about two platforms away', r0['state'] == 'wait' and r0['y'] > r0['viewBottom'] - 40, r0)
            check('drone: rises from below and stops at its mark', 'rise' in states and ys[0] > ys[-1] and abs(ys[-1] - r0['ty']) <= 6, seen[:6])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const d1=platforms.find(a=>a.id==='NM-DOT1');
              __night.darts.length=0;p.hp=5;p.invulnerable=0;p.guardStun=0;p.knock=0;p.x=p.prevX=3650;p.y=p.prevY=d1.y;p.on=d1;p.ground=true;p.vx=0;p.vy=0;
              const hp0=p.hp;let fired=false;
              for(let i=0;i<60;i++){await w(50);if(__night.darts.length)fired=true;if(p.hp<hp0)break;}
              return {fired,hp0,hp:p.hp}}""")
            check('drone: fires wind darts at Dudu and a dart costs 1 health', r['fired'] and r['hp'] == r['hp0'] - 1, r)
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const d=__night.drones.find(d=>d.id==='NM-D3');
              __night.darts.length=0;d.cooldown=99;p.invulnerable=0;p.guardStun=0;const hp0=p.hp;
              p.x=p.prevX=d.x-60;p.y=p.prevY=d.y+40;p.vy=0;p.vx=0;p.ground=false;p.on=null;await w(80);
              return {hp0,hp:p.hp}}""")
            check('drone: touching the body is a hit', r['hp'] == r['hp0'] - 1, r)
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const d=__night.drones.find(d=>d.id==='NM-D3');
              p.invulnerable=0;p.guardStun=0;p.knock=0;const hp0=p.hp;
              p.x=p.prevX=d.x;p.y=p.prevY=d.y-34;p.vy=300;p.vx=0;p.ground=false;p.on=null;await w(150);
              return {hp0,hp:p.hp,state:d.state}}""")
            check('drone: landing on top knocks it out (Die motion), no damage', r['state'] in ('dead', 'gone') and r['hp'] == r['hp0'], r)
            r = await pg.evaluate("()=>{retryWorld1StageCheckpoint();return {n:__night.drones.length,ids:new Set(__night.drones.map(d=>d.id)).size,states:__night.drones.map(d=>d.state).join(',')}}")
            check('drone: retry rebuilds the 18 drones without duplicates', r['n'] == 18 and r['ids'] == 18 and set(r['states'].split(',')) == {'wait'}, r)

        if on('drone'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));devPracticeNight(3650,335);p.invulnerable=0;
              const _hit=window.applyStunHit;window.applyStunHit=()=>false; /* darts still fire and hit, Dudu just does not react */
              const shots=[];let speed=0;const t0=levelClock;
              for(let i=0;i<180;i++){await w(25);const n=__night.darts.length;if(n&&(!shots.length||__night.darts[n-1]!==shots[shots.length-1].d)){
                const d=__night.darts[n-1];shots.push({d,t:levelClock-t0});speed=Math.hypot(d.vx,d.vy);}}
              window.applyStunHit=_hit;
              const gaps=[];for(let i=1;i<shots.length;i++)gaps.push(+(shots[i].t-shots[i-1].t).toFixed(2));
              return {gaps,speed:Math.round(speed)}}""")
            g = [x for x in r['gaps'] if x > 0.5]
            check('drone: fires on a steady own rhythm (1.45-2.1s) at 600px/s', bool(g) and max(g) - min(g) < 0.12 and all(1.4 <= x <= 2.1 for x in g) and r['speed'] == 600, r)
            r = await pg.evaluate("()=>{devPracticeNight(3650,335);return __night.drones.map(d=>+(DRONE.attackDur+d.rest).toFixed(2))}")
            check('drone: v1.5.5 neighbouring drones fire at different intervals', all(a != b for a, b in zip(r, r[1:])) and min(r) >= 1.4 and max(r) <= 2.1, r)
            r = await pg.evaluate("()=>{devPracticeNight(3650,335);const s=world1Stages[NIGHT_STAGE_INDEX];return __night.drones.map((d,i)=>s.nightDrones[i].y-d.ty)}")
            check('drone: v1.5.5 hover points are lifted 34px above the sketch marks', all(v == 34 for v in r), r)

        if on('drone'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));devPracticeNight(11900,95);p.invulnerable=99;
              const sh=platforms.find(a=>a.id==='NM-W3');__night.darts.length=0;
              __night.darts.push({x:sh.x-60,y:sh.y+sh.h-80,prevX:sh.x-60,prevY:sh.y+sh.h-80,vx:600,vy:0,age:0,maxAge:3,radius:10,hit:false});
              await w(400);const d=__night.darts[0];return {alive:!!d&&!d.hit,x:d?Math.round(d.x):null,wallRight:sh.x+sh.w}}""")
            check('drone: v1.5.2 darts fly through the brown shutters', r['alive'] and r['x'] > r['wallRight'], r)
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const s=world1Stages[NIGHT_STAGE_INDEX];
              const dash=s.nightDrones.filter(d=>d.x>11000&&d.x<13350).map(d=>d.id);
              const stairs=['NM-E1','NM-E2','NM-E3','NM-E4','NM-E5'].map(id=>platforms.find(a=>a.id===id));
              const stairDrones=s.nightDrones.filter(d=>d.x>22000&&d.x<23190);
              const perPair=[[0,1],[2,3],[4,4]].map(([a,b])=>stairDrones.filter(d=>d.x>=stairs[a].x-120&&d.x<=stairs[b].x+stairs[b].w+120).length);
              devPracticeNight(23300,580);p.invulnerable=0;await w(4000);
              const plaza={darts:__night.darts.length,hp:p.hp,awake:__night.drones.filter(d=>d.tx>22000&&d.state!=='wait').length};
              return {dash,perPair,plaza}}""")
            check('drone: two drones over the shutter run, one per two stairs, none fire into the plaza',
                  len(r['dash']) == 2 and r['perPair'] == [1, 1, 1] and r['plaza']['darts'] == 0 and r['plaza']['hp'] == 5 and r['plaza']['awake'] == 0, r)

        if on('music'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));startNightStage();await w(200);const night=musicSelected;
              const a=tracks[5];a.preload='auto';a.load();for(let i=0;i<60&&!(a.duration>0);i++)await w(100);
              startWorld1StageFromMenu(0,true);await w(200);const w1=musicSelected;
              return {night,w1,src:a.src.split('/').pop(),dur:Math.round(a.duration||0)}}""")
            check('music: night map plays 24. Monatium (track 5), world 1 keeps track 0', r['night'] == 5 and r['w1'] == 0 and r['src'].startswith('monatium.mp3') and r['dur'] > 30, r)

        if on('field'):
            await pg.evaluate(PLACE, [6300, 202])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const m2=platforms.find(a=>a.id==='NM-T-M2');
              m2.motion=null;m2.x=m2.baseX=m2.prevX=6330;p.x=p.prevX=6462;p.y=p.prevY=202;p.on=m2;p.ground=true;p.invulnerable=0;const hp0=p.hp;
              await w(200);const hit=p.hp<hp0;
              p.invulnerable=0;p.guardStun=0;p.knock=0;p.vx=0;p.x=p.prevX=6430;p.y=p.prevY=202;p.on=m2;p.ground=true;const hp1=p.hp;await w(300);
              return {hit,missNear:p.hp===hp1,f:__night.drones.length}}""")
            check('field: touching the red line is a hit; standing just beside its glow is safe', r['hit'] and r['missNear'], r)

        if on('field'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));devPracticeNight(18700,150);
              const m8=platforms.find(a=>a.id==='NM-X-M8');m8.motion=null;m8.x=m8.baseX=m8.prevX=19020;
              p.x=p.prevX=19095;p.y=p.prevY=150;p.on=m8;p.ground=true;p.invulnerable=0;await w(300);const hpStand=p.hp;
              pressInput('Space','kb_s');await w(260);releaseInput('Space','kb_s');await w(300);
              return {hpStand,hpJump:p.hp}}""")
            check('field: v1.5.3 hanging line over the mover is safe to ride under, a jump into it hurts', r['hpStand'] == 5 and r['hpJump'] == 4, r)

        if on('ride'):
            await pg.evaluate(PLACE, [6200, 650])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const m4=platforms.find(a=>a.id==='NM-T-M4');
              p.x=p.prevX=m4.x+80;p.y=p.prevY=m4.y;p.on=m4;p.ground=true;p.invulnerable=99;const x0=p.x;let off=0;
              for(let i=0;i<70;i++){await w(50);if(p.on!==m4)off++;}
              return {off,dx:Math.round(p.x-x0),onId:p.on&&p.on.id}}""")
            check('ride: standing on the exit ferry for 3.5s keeps Dudu on it as it moves', r['off'] == 0 and abs(r['dx']) > 100, r)

        if on('patrol'):
            await pg.evaluate(PLACE, [7700, 250])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));p.invulnerable=99;p.x=p.prevX=8300;p.y=p.prevY=180;
              p.on=platforms.find(a=>a.id==='NM-TD1');for(let i=0;i<180;i++)await w(50);
              return actors.map(a=>({k:a.kind,z:a.nightPatrol,min:Math.round(a.reachedMinX??a.x),max:Math.round(a.reachedMaxX??a.x),x1:a.patrolX1,x2:a.patrolX2,y:a.y}))}""")
            a1 = r[0]
            ok = all(a['k'] in ('guard1', 'guard2') for a in r) and a1['min'] >= a1['x1'] - 1 and a1['max'] <= a1['x2'] + 1 and 150 <= a1['max'] - a1['min'] <= 260
            check('patrol: riot squad rushes about 200px like the story guards and stays inside its line', ok, r)
            kinds = set()
            for _ in range(8):
                kinds |= set(await pg.evaluate("()=>{retryWorld1StageCheckpoint();return actors.map(a=>a.kind+':'+Math.round(a.home))}"))
            check('patrol: members and start points vary between runs within fixed spots', len(kinds) > 3, sorted(kinds))

        if on('checkpoint'):
            await pg.evaluate(START)
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));window.__duduIntroLock=0;
              const b4=platforms.find(a=>a.id==='NM-B4');p.x=p.prevX=3360;p.y=p.prevY=356;p.on=b4;p.ground=true;await w(200);
              const cp=checkpoint;p.y=900;await w(200);return {cp,x:Math.round(p.x),y:Math.round(p.y),flags:flags.length,hidden:flags.filter(f=>f.hidden).length,runners:__night.runners.length,lock:window.__duduIntroLock}}""")
            check('checkpoint: flag saves, a fall returns there without replaying the runners', r['cp'] == 1 and r['x'] == 3360 and r['y'] == 356 and r['runners'] == 0 and r['lock'] == 0, r)
            check('checkpoint: 4 sketch flags, 4 in the v1.5.3 stretch, one quiet one at the tower door', r['flags'] == 9 and r['hidden'] == 1, r)

        if on('backdrop'):
            await pg.evaluate(PLACE, [130, 496])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const out=[];
              for(const x of [2000,6000,9000,12000,14500,18000,21500,21800,22500,23000,23200,23500,24100,24500]){
                const plat=platforms.filter(a=>!a.wall&&a.x<=x&&a.x+a.w>=x).sort((a,b)=>a.y-b.y)[0];
                devPracticeNight(x,plat?plat.y:580);await w(700);out.push([x,Math.round(rCam),__nightBgDebug.hall]);}
              return out}""")
            early = [o for o in r if o[0] < 23200]
            late = [o for o in r if o[0] >= 23500]
            check('backdrop: city hall never shows before the plaza', all(not o[2] for o in early), r)
            check('backdrop: city hall shows on the plaza', all(o[2] for o in late), r)

        if on('npc'):
            await pg.evaluate(PLACE, [23400, 580])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));const out=[];p.invulnerable=99;
              for(const n of __night.npcs){p.x=p.prevX=n.x-90;p.y=p.prevY=580;p.vx=0;await w(250);
                const c=__night.npcs.find(q=>q.id===n.id);out.push({name:c.name,x:c.x,near:c.near,clip:c.clip,line:c.dialogue});}
              p.x=p.prevX=23300;await w(250);const far=__night.npcs.map(n=>n.clip);
              return {out,far}}""")
            names = [o['name'] for o in r['out']]
            want_lines = {
                '리온': ('lion_happy', '시저가 또 난리를 치다니... 빨리 붙잡아 다행이에요!'),
                '시저': ('scizor_sad', '히끅... 빌... 빌런은 반드시 다시 돌아온다!'),
                '엘레나': ('elena_idle', '바빠 죽겠는데 뭔 빌런이야 어휴!'),
                '아멜리아': ('amelia_idle', '언젠가 외래종 교도소를 한번 손 봐야겠군요'),
                '칸나': ('canna_idle', '역시 스핑크스! 이번에도 협조해 주셔서 감사합니다!'),
            }
            xs = [o['x'] for o in r['out']]
            check('npc: order Lion, Scizor, Elena, Amelia, Canna from left to right', names == list(want_lines) and xs == sorted(xs), names)
            ok = all(o['near'] and (o['clip'], o['line']) == want_lines[o['name']] for o in r['out'])
            check('npc: near each friend the set motion and exact line play', ok, r['out'])
            check('npc: walking away returns them to idle', r['far'] == ['lion_idle', 'scizor_idle', 'elena_idle', 'amelia_idle', 'canna_idle'], r['far'])
            r = await pg.evaluate("""()=>{const s=world1Stages[NIGHT_STAGE_INDEX];const z=platforms.filter(a=>a.x+a.w>23200&&a.x<24600);
              return {hazardsInPlaza:__night.drones.filter(d=>d.tx>23150).length+actors.filter(a=>a.x>23150).length+s.nightFields.filter(f=>f.x>23150).length,
                floor:z.map(a=>a.id).join(',')}}""")
            check('npc: plaza is a safe zone (no drones, guards, field or pits)', r['hazardsInPlaza'] == 0 and r['floor'] == 'NM-PLAZA', r)

        if on('clear'):
            await pg.evaluate(PLACE, [24400, 580])
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));p.invulnerable=99;pressInput('ArrowRight','kb_t');
              for(let i=0;i<40;i++){await w(50);if(state!=='playing')break;}releaseInput('ArrowRight','kb_t');
              const rec=loadWorldMapSave().worlds.world2_monatium_night.stages['2-1'];
              return {state,modal:!!document.getElementById('wmNightReplayBtn'),cleared:rec.cleared,best:rec.bestSeconds}}""")
            check('clear: reaching the end of the plaza clears the stage and saves it', r['state'] == 'paused' and r['modal'] and r['cleared'], r)

        if on('world1'):
            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));startNightStage();await w(400);
              startChallengeMode(0);await w(600);const x0=p.x;pressInput('ArrowRight','kb_ArrowRight');await w(500);releaseInput('ArrowRight','kb_ArrowRight');
              return {moved:Math.round(p.x-x0),mode:gameMode}}""")
            check('world1: leaving the night map during the 2s start hold does not freeze Dudu elsewhere (v1.5.4 bug)', r['moved'] > 60, r)

            r = await pg.evaluate("""async()=>{const w=m=>new Promise(r=>setTimeout(r,m));startWorld1StageFromMenu(0,true);await w(300);
              return {idx:activeWorldStageIndex,actors:actors.length,lock:window.__duduIntroLock,route:document.getElementById('routeLabel').textContent,
                pill:document.getElementById('specialPill').hidden}}""")
            check('world1: 1-1 still loads clean after the night map', r['idx'] == 0 and r['actors'] == 0 and r['lock'] == 0 and r['route'].startswith('WORLD 1'), r)

        bad = [e for e in errs if 'night' in e.lower() or 'PAGEERR' in e]
        check('no page errors', not bad, bad[:5])
        await b.close()
    print(f"\n{sum(results)}/{len(results)} passed")
    sys.exit(0 if all(results) else 1)

asyncio.run(main())
