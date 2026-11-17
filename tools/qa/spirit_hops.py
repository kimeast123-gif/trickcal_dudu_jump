"""Check every hop of the spirit mountain route (World 3, 「정령산의 아침」) with the game's real physics.

    python tools/qa/spirit_hops.py            # whole route, exit code 1 if any hop fails
    python tools/qa/spirit_hops.py gust       # only lines whose label contains the word

Each line puts Dudu on FROM at TAKEOFF_X, plays an input pattern and reports where she lands. Wisps are removed.
Lines marked "in a gust" repeat a wind-zone hop with the gust forced on (Dudu pushed left while airborne).
Patterns as in night_hops.py: walk, single, double, dash, dashjump; add 'left' to go left.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop

TABLE = [
    ('FLOOR to M2', 'SM-FLOOR', 'SM-M2', 1640, 'double', {}),
    ('M2 to M3', 'SM-M2', 'SM-M3', 1650, 'singleleft', {}),
    ('M3 to M6', 'SM-M3', 'SM-M6', 1500, 'singleleft', {}),
    ('M6 to M9', 'SM-M6', 'SM-M9', 1440, 'double', {}),
    ('M9 to M12', 'SM-M9', 'SM-M12', 1440, 'singleleft', {}),
    ('M12 to E1', 'SM-M12', 'SM-E1', 1245, 'doubleleft', {}),
    ('E1 to E2', 'SM-E1', 'SM-E2', 865, 'singleleft', {}),
    ('E2 to E3', 'SM-E2', 'SM-E3', 535, 'singleleft', {}),
    ('E3 to E2', 'SM-E3', 'SM-E2', 425, 'walk', {}),
    ('E2 to E1', 'SM-E2', 'SM-E1', 770, 'walk', {}),
    ('E1 to M12', 'SM-E1', 'SM-M12', 1120, 'walk', {}),
    ('M12 to M6', 'SM-M12', 'SM-M6', 1290, 'down', {}),
    ('M6 to FLOOR', 'SM-M6', 'SM-FLOOR', 1300, 'down', {}),
    ('FLOOR to M1', 'SM-FLOOR', 'SM-M1', 2160, 'double', {}),
    ('M1 to M5', 'SM-M1', 'SM-M5', 2150, 'singleleft', {}),
    ('M5 to M7', 'SM-M5', 'SM-M7', 2055, 'singleleft', {}),
    ('M7 to M8', 'SM-M7', 'SM-M8', 2015, 'double', {}),
    ('M8 to M10', 'SM-M8', 'SM-M10', 2125, 'single', {}),
    ('M10 to M14', 'SM-M10', 'SM-M14', 2215, 'double', {}),
    ('M14 to M16', 'SM-M14', 'SM-M16', 2215, 'double', {}),
    ('M16 to M19', 'SM-M16', 'SM-M19', 2160, 'doubleleft', {}),
    ('M19 to M23', 'SM-M19', 'SM-M23', 2105, 'double', {}),
    ('M23 to M24', 'SM-M23', 'SM-M24', 2205, 'doubleleft', {}),
    ('M24 to M25', 'SM-M24', 'SM-M25', 1990, 'double', {}),
    ('M25 to L0', 'SM-M25', 'SM-L0', 1990, 'single', {}),
    ('L0 to L1', 'SM-L0', 'SM-L1', 1500, 'double', {}),
    ('L1 to L2', 'SM-L1', 'SM-L2', 1635, 'double', {}),
    ('L2 to L4', 'SM-L2', 'SM-L4', 1800, 'doubleleft', {}),
    ('L4 to L5', 'SM-L4', 'SM-L5', 1640, 'double', {}),
    ('L5 to L9', 'SM-L5', 'SM-L9', 1592, 'singleleft', {}),
    ('L9 to I0', 'SM-L9', 'SM-I0', 1030, 'walkleft', {}),
    ('I0 to I1', 'SM-I0', 'SM-I1', 810, 'singleleft', {}),
    ('I1 to O1', 'SM-I1', 'SM-O1', 510, 'doubleleft', {}),
    ('O1 to O2', 'SM-O1', 'SM-O2', 300, 'doubleleft', {}),
    ('O2 to O3', 'SM-O2', 'SM-O3', 240, 'double', {}),
    ('O3 to O4', 'SM-O3', 'SM-O4', 415, 'double', {}),
    ('O4 to O5', 'SM-O4', 'SM-O5', 600, 'double', {}),
    ('O5 to O6', 'SM-O5', 'SM-O6', 820, 'single', {}),
    ('O6 to O7', 'SM-O6', 'SM-O7', 985, 'single', {}),
    ('O7 to O8', 'SM-O7', 'SM-O8', 1125, 'single', {}),
    ('O8 to O9', 'SM-O8', 'SM-O9', 1280, 'single', {}),
    ('O9 to O10', 'SM-O9', 'SM-O10', 1436, 'single', {}),
    ('O10 to O11', 'SM-O10', 'SM-O11', 1592, 'single', {}),
    ('O11 to O12', 'SM-O11', 'SM-O12', 1710, 'single', {}),
    ('O12 to O13', 'SM-O12', 'SM-O13', 1960, 'double', {}),
    ('O13 to O14', 'SM-O13', 'SM-O14', 1990, 'single', {}),
    ('O14 to O15', 'SM-O14', 'SM-O15', 1990, 'single', {}),
    ('O15 to O16', 'SM-O15', 'SM-O16', 1980, 'double', {}),
    ('O16 to O17', 'SM-O16', 'SM-O17', 1980, 'double', {}),
    ('O17 to U1', 'SM-O17', 'SM-U1', 1686, 'doubleleft', {}),
    ('O17 to U1 in a gust', 'SM-O17', 'SM-U1', 1686, 'doubleleft', {'__gust': 1}),
    ('U1 to U2', 'SM-U1', 'SM-U2', 1450, 'singleleft', {}),
    ('U1 to U2 in a gust', 'SM-U1', 'SM-U2', 1450, 'singleleft', {'__gust': 1}),
    ('U2 to U3', 'SM-U2', 'SM-U3', 1240, 'doubleleft', {}),
    ('U2 to U3 in a gust', 'SM-U2', 'SM-U3', 1240, 'doubleleft', {'__gust': 1}),
    ('U3 to U6', 'SM-U3', 'SM-U6', 1046, 'doubleleft', {}),
    ('U3 to U6 in a gust', 'SM-U3', 'SM-U6', 1046, 'doubleleft', {'__gust': 1}),
    ('U6 to U10', 'SM-U6', 'SM-U10', 938, 'double', {}),
    ('U6 to U10 in a gust', 'SM-U6', 'SM-U10', 938, 'double', {'__gust': 1}),
    ('U10 to V4', 'SM-U10', 'SM-V4', 1044, 'doubleleft', {}),
    ('U10 to V4 in a gust', 'SM-U10', 'SM-V4', 1044, 'doubleleft', {'__gust': 1}),
    ('V4 to V7', 'SM-V4', 'SM-V7', 915, 'doubleleft', {}),
    ('V4 to V7 in a gust', 'SM-V4', 'SM-V7', 915, 'doubleleft', {'__gust': 1}),
    ('V7 to V10', 'SM-V7', 'SM-V10', 805, 'double', {}),
    ('V7 to V10 in a gust', 'SM-V7', 'SM-V10', 805, 'double', {'__gust': 1}),
    ('V10 to V13', 'SM-V10', 'SM-V13', 1004, 'double', {}),
    ('V10 to V13 in a gust', 'SM-V10', 'SM-V13', 1004, 'double', {'__gust': 1}),
    ('V13 to V17', 'SM-V13', 'SM-V17', 1117, 'double', {}),
    ('V13 to V17 in a gust', 'SM-V13', 'SM-V17', 1117, 'double', {'__gust': 1}),
    ('V17 to V19', 'SM-V17', 'SM-V19', 1208, 'doubleleft', {}),
    ('V17 to V19 in a gust', 'SM-V17', 'SM-V19', 1208, 'doubleleft', {'__gust': 1}),
    ('V19 to V22', 'SM-V19', 'SM-V22', 1024, 'double', {}),
    ('V19 to V22 in a gust', 'SM-V19', 'SM-V22', 1024, 'double', {'__gust': 1}),
    ('V22 to V24', 'SM-V22', 'SM-V24', 1165, 'double', {}),
    ('V22 to V24 in a gust', 'SM-V22', 'SM-V24', 1165, 'double', {'__gust': 1}),
    ('V24 to V25', 'SM-V24', 'SM-V25', 1290, 'double', {}),
    ('V24 to V25 in a gust', 'SM-V24', 'SM-V25', 1290, 'double', {'__gust': 1}),
    ('V25 to S0', 'SM-V25', 'SM-S0', 1290, 'double', {}),
    ('V25 to S0 in a gust', 'SM-V25', 'SM-S0', 1290, 'double', {'__gust': 1}),
]

JS = """async([A,B,sx,mode,frozen])=>{const w=m=>new Promise(r=>setTimeout(r,m));
 const a=platforms.find(q=>q.id===A);if(!a)return 'missing '+A;
 for(const [id,x] of Object.entries(frozen)){if(id==='__gust')continue;const q=platforms.find(z=>z.id===id);if(q){q.motion=null;q.baseX=q.x=q.prevX=x;q.dx=0;}}
 __sm.wisps.length=0;__sm.fireballs.length=0;__sm.forceGust=!!frozen.__gust;
 releaseAllInputs();p.x=sx;p.y=a.y;p.vx=0;p.vy=0;p.prevX=p.x;p.prevY=p.y;p.ground=true;p.on=a;p.jumps=0;p.airDashUsed=false;
 p.dash=0;p.dashCooldown=0;p.invulnerable=99;p.guardStun=0;p.drop=null;state='playing';last=performance.now();acc=0;await w(120);
 const left=mode.endsWith('left');mode=mode.replace(/left$/,'');const k=left?'ArrowLeft':'ArrowRight';
 const jump=async(ms)=>{pressInput('Space','kb_s');await w(ms);releaseInput('Space','kb_s');};
 const dash=()=>{pressInput('ShiftLeft','kb_d');setTimeout(()=>releaseInput('ShiftLeft','kb_d'),30);};
 const bb=platforms.find(q=>q.id===B);const midB=bb?bb.x+bb.w/2:(left?-1e9:1e9);
 /* stop pushing toward the target once over its middle, like a player would */
 /* steer like a player: once over the target, hold whichever way keeps Dudu above its middle (counters the wind) */
 let over=false;const iv=setInterval(()=>{if(!over&&((!left&&p.x>midB-10)||(left&&p.x<midB+10))){over=true;releaseInput(k,'kb_t');}
  if(over&&!p.ground){const d=midB-p.x;if(d>14){releaseInput('ArrowLeft','kb_st');pressInput('ArrowRight','kb_st');}else if(d<-14){releaseInput('ArrowRight','kb_st');pressInput('ArrowLeft','kb_st');}else{releaseInput('ArrowLeft','kb_st');releaseInput('ArrowRight','kb_st');}}
  else if(over){releaseInput('ArrowLeft','kb_st');releaseInput('ArrowRight','kb_st');}},8);
 pressInput(k,'kb_t');
 if(mode==='single')await jump(260);
 else if(mode==='tap')await jump(40);
 else if(mode==='double'){await jump(260);await w(30);await jump(220);}
 else if(mode==='down'){pressInput('ArrowDown','kb_dn');await w(40);await jump(60);releaseInput('ArrowDown','kb_dn');}
 else if(mode==='dash'){await w(20);dash();}
 else if(mode==='dashrun'){await w(120);dash();}
 else if(mode==='dashjump'){await w(20);dash();await w(60);await jump(450);}
 else if(mode==='walkairjump'){await w(420);await jump(260);}
 else if(mode==='dashdouble'){await w(20);dash();await w(60);await jump(260);await w(30);await jump(220);}
 let land=null;const y0=p.y;const tr=[];
 const b=platforms.find(q=>q.id===B);const mid=b?b.x+b.w/2:(left?-1e9:1e9);
 for(let i=0;i<120;i++){await w(25);tr.push(Math.round(p.x)+','+Math.round(p.y));
  if((!left&&p.x>mid)||(left&&p.x<mid))releaseInput(k,'kb_t');
  if(p.y>a.y+900||(p.on&&p.on.id==='SM-FLOOR'&&A!=='SM-FLOOR'&&B!=='SM-FLOOR')){land='fall';break;}
  if(p.ground&&i>8&&p.on&&p.on!==a&&true){land=p.on.id;break;}
  if(p.ground&&i>40&&(p.on===a||(p.on&&p.on.nightDraw==='grate'))&&Math.abs(p.vx)<5){land='stayed';break;}}
 if(B==='stay'){const sh=platforms.filter(q=>q.dashUnder&&q.x>sx).sort((u,v)=>u.x-v.x)[0];
  land=(sh&&p.x+19<=sh.x+2&&p.y<800)?'stayed':'passed x'+Math.round(p.x);}
 clearInterval(iv);releaseAllInputs();return (land||'air')+(window.__hopTrace?' '+tr.join(' '):'')}"""



async def main():
    want = sys.argv[1:]
    srv = serve()
    bad = 0
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        for label, A, B, sx, mode, frozen in TABLE:
            if want and not any(w in label for w in want):
                continue
            await pg.evaluate("()=>{document.getElementById('overlay').hidden=true;startSpiritStage();}")
            await pg.wait_for_timeout(150)
            if os.environ.get('HOP_TRACE'):
                await pg.evaluate("()=>{window.__hopTrace=true}")
            r = await pg.evaluate(JS, [A, B, sx, mode, frozen])
            land = r.split(' ')[0]
            ok = land == B
            bad += 0 if ok else 1
            print(('OK  ' if ok else 'MISS'), f'{label:28s}', A, '->', B, f'[{mode}]', 'got', r[:300] if not os.environ.get('HOP_TRACE') else r)
        if errs:
            print(chr(10).join(errs[:5]))
        await b.close()
    sys.exit(1 if bad else 0)

asyncio.run(main())
