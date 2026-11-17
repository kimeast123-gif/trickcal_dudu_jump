"""Check every hop of the night map (World 2, 「모나티엄의 야경」) with the game's real physics.

    python tools/qa/night_hops.py            # whole table, exit code 1 if any line fails
    python tools/qa/night_hops.py NM-W        # only lines whose label contains the word

Each line starts Dudu standing on FROM at TAKEOFF_X, plays an input pattern and reports where she lands.
EXPECT is the platform she must land on, 'fall' when the pattern must NOT reach the next platform, or 'stay'
when she must end up still on the near side of the closest brown shutter. Drones, the riot squad and the electric field are switched off; moving
platforms are frozen at the x given in the line, so only geometry and timing are tested.

Patterns: walk, single (jump held 260ms), tap (40ms), double, dash (dash from a standstill at the edge),
dashrun (run, then dash 120ms later), dashjump (dash, jump pressed during it and held), dashdouble,
walkairjump (walk off the edge and use the air jump once under/past the wall). Add 'left' to go left.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop

# label, from, to(expect), takeoff x, pattern, {platform_id: frozen_x}
TABLE = [
    ('start roofs',        'NM-B0', 'NM-B1', 280, 'single', {}),
    ('to P1',              'NM-B1', 'NM-P1', 690, 'single', {}),
    ('to P2',              'NM-P1', 'NM-P2', 900, 'single', {}),
    ('to B2 (double)',     'NM-P2', 'NM-B2', 1130, 'double', {}),
    ('to Q1',              'NM-B2', 'NM-Q1', 1470, 'single', {}),
    ('to Q2 (double)',     'NM-Q1', 'NM-Q2', 1710, 'double', {}),
    ('back to Q3',         'NM-Q2', 'NM-Q3', 1810, 'doubleleft', {}),
    ('to Q4',              'NM-Q3', 'NM-Q4', 1710, 'double', {}),
    ('Q4 to peak: jump',   'NM-Q4', 'fall',  1925, 'double', {}),
    ('Q4 to peak: run jump', 'NM-Q4', 'fall', 1810, 'double', {}),
    ('Q4 to peak: dash+jump', 'NM-Q4', 'NM-B3', 1850, 'dashdouble', {}),
    ('drop to R1',         'NM-B3', 'NM-R1', 2470, 'walk', {}),
    ('to B4',              'NM-R1', 'NM-B4', 2985, 'single', {}),
    ('to dot 1',           'NM-B4', 'NM-DOT1', 3475, 'single', {}),
    ('dot 1 to 2',         'NM-DOT1', 'NM-DOT2', 3688, 'single', {}),
    ('dot 5 to 6',         'NM-DOT5', 'NM-DOT6', 4408, 'single', {}),
    ('dot 6 to B5',        'NM-DOT6', 'NM-B5', 4588, 'single', {}),
    ('to B6 (double)',     'NM-B5', 'NM-B6', 4935, 'double', {}),
    ('to S1',              'NM-B6', 'NM-S1', 5275, 'single', {}),
    ('to S2',              'NM-S1', 'NM-S2', 5455, 'single', {}),
    ('to tower sill',      'NM-S2', 'NM-T-SILL', 5675, 'single', {}),
    ('sill to M1',         'NM-T-SILL', 'NM-T-M1', 6030, 'walk', {'NM-T-M1': 6000}),
    ('M1 to M2',           'NM-T-M1', 'NM-T-M2', 6100, 'walk', {'NM-T-M1': 5960, 'NM-T-M2': 6080}),
    ('M2 to M3',           'NM-T-M2', 'NM-T-M3', 6080, 'walkleft', {'NM-T-M2': 6080, 'NM-T-M3': 5950}),
    ('M3 to M4',           'NM-T-M3', 'NM-T-M4', 6095, 'walk', {'NM-T-M3': 5950, 'NM-T-M4': 6080}),
    ('M4 off to G1',       'NM-T-M4', 'NM-G1', 7150, 'single', {'NM-T-M4': 7000}),
    ('G1 to G2',           'NM-G1', 'NM-G2', 7295, 'single', {}),
    ('G2 to G3',           'NM-G2', 'NM-G3', 7365, 'singleleft', {}),
    ('G3 to G4',           'NM-G3', 'NM-G4', 7295, 'single', {}),
    ('G4 to B7',           'NM-G4', 'NM-B7', 7455, 'single', {}),
    ('to deck 1',          'NM-B7', 'NM-TD1', 7835, 'single', {}),
    ('deck 1 down to 2',   'NM-TD1', 'NM-TD2', 8700, 'walk', {}),
    ('deck 2 up to 3',     'NM-TD2', 'NM-TD3', 9420, 'double', {}),
    ('deck 3 to B8',       'NM-TD3', 'NM-B8', 10495, 'single', {}),
    ('to P71',             'NM-B8', 'NM-P71', 10945, 'single', {}),
    ('W1: walk into shutter', 'NM-P71', 'stay', 11280, 'walk', {}),
    ('W1: jump',           'NM-P71', 'stay', 11375, 'single', {}),
    ('W1: double',         'NM-P71', 'stay', 11375, 'double', {}),
    ('W1: run + double',   'NM-P71', 'stay', 11200, 'double', {}),
    ('W1: dash at shutter', 'NM-P71', 'NM-P72', 11380, 'dash', {}),
    ('W1: dash 80px back', 'NM-P71', 'NM-P72', 11300, 'dash', {}),
    ('W1: dash too early', 'NM-P71', 'stay', 11210, 'dash', {}),
    ('W2: walk into shutter', 'NM-P72', 'stay', 11656, 'walk', {}),
    ('W2: jump',           'NM-P72', 'stay', 11751, 'single', {}),
    ('W2: double',         'NM-P72', 'stay', 11751, 'double', {}),
    ('W2: run + double',   'NM-P72', 'stay', 11576, 'double', {}),
    ('W2: dashjump at shutter', 'NM-P72', 'NM-P73', 11756, 'dashjump', {}),
    ('W2: dashjump 80px back', 'NM-P72', 'NM-P73', 11676, 'dashjump', {}),
    ('W2: dash too early', 'NM-P72', 'stay', 11586, 'dash', {}),
    ('W3: walk into shutter', 'NM-P73', 'stay', 11992, 'walk', {}),
    ('W3: jump',           'NM-P73', 'stay', 12087, 'single', {}),
    ('W3: double',         'NM-P73', 'stay', 12087, 'double', {}),
    ('W3: run + double',   'NM-P73', 'stay', 11912, 'double', {}),
    ('W3: dash at shutter', 'NM-P73', 'NM-P74', 12092, 'dash', {}),
    ('W3: dash 80px back', 'NM-P73', 'NM-P74', 12012, 'dash', {}),
    ('W3: dash too early', 'NM-P73', 'stay', 11922, 'dash', {}),
    ('W4: walk into shutter', 'NM-P74', 'stay', 12368, 'walk', {}),
    ('W4: jump',           'NM-P74', 'stay', 12463, 'single', {}),
    ('W4: double',         'NM-P74', 'stay', 12463, 'double', {}),
    ('W4: run + double',   'NM-P74', 'stay', 12288, 'double', {}),
    ('W4: dash at shutter', 'NM-P74', 'NM-P75', 12468, 'dash', {}),
    ('W4: dash 80px back', 'NM-P74', 'NM-P75', 12388, 'dash', {}),
    ('W4: dash too early', 'NM-P74', 'stay', 12298, 'dash', {}),
    ('W5: walk into shutter', 'NM-P75', 'stay', 12744, 'walk', {}),
    ('W5: jump',           'NM-P75', 'stay', 12839, 'single', {}),
    ('W5: double',         'NM-P75', 'stay', 12839, 'double', {}),
    ('W5: run + double',   'NM-P75', 'stay', 12664, 'double', {}),
    ('W5: dashjump at shutter', 'NM-P75', 'NM-P76', 12844, 'dashjump', {}),
    ('W5: dashjump 80px back', 'NM-P75', 'NM-P76', 12764, 'dashjump', {}),
    ('W5: dash too early', 'NM-P75', 'stay', 12674, 'dash', {}),
    ('to B9 (double)',     'NM-P76', 'NM-B9', 13315, 'double', {}),
    ('X: B9 to mover M5',  'NM-B9', 'NM-X-M5', 13735, 'single', {'NM-X-M5': 13840}),
    ('X: M5 to M6',        'NM-X-M5', 'NM-X-M6', 14300, 'single', {'NM-X-M5': 14160, 'NM-X-M6': 14270}),
    ('X: M6 to M7',        'NM-X-M6', 'NM-X-M7', 14770, 'single', {'NM-X-M6': 14630, 'NM-X-M7': 14730}),
    ('X: M7 to B10',       'NM-X-M7', 'NM-B10', 15210, 'single', {'NM-X-M7': 15070}),
    ('X: B10 to deck 4',   'NM-B10', 'NM-TD4', 15545, 'single', {}),
    ('X: deck 4 to dot 7', 'NM-TD4', 'NM-DOT7', 16595, 'single', {}),
    ('X: dot 7 to 8',      'NM-DOT7', 'NM-DOT8', 16808, 'single', {}),
    ('X: dot 10 to B11',   'NM-DOT10', 'NM-B11', 17318, 'single', {}),
    ('X: B11 to P81',      'NM-B11', 'NM-P81', 17695, 'single', {}),
    ('W6: walk into shutter', 'NM-P81', 'stay', 18020, 'walk', {}),
    ('W6: double',         'NM-P81', 'stay', 18115, 'double', {}),
    ('W6: run + double',   'NM-P81', 'stay', 17940, 'double', {}),
    ('W6: dashjump at shutter', 'NM-P81', 'NM-P82', 18120, 'dashjump', {}),
    ('W7: walk into shutter', 'NM-P82', 'stay', 18396, 'walk', {}),
    ('W7: double',         'NM-P82', 'stay', 18491, 'double', {}),
    ('W7: run + double',   'NM-P82', 'stay', 18316, 'double', {}),
    ('W7: dash at shutter', 'NM-P82', 'NM-P83', 18496, 'dash', {}),
    ('X: P83 to mover M8', 'NM-P83', 'NM-X-M8', 18850, 'walk', {'NM-X-M8': 18870}),
    ('X: M8 to P84',       'NM-X-M8', 'NM-P84', 19310, 'single', {'NM-X-M8': 19170}),
    ('W8: walk into shutter', 'NM-P84', 'stay', 19540, 'walk', {}),
    ('W8: double',         'NM-P84', 'stay', 19635, 'double', {}),
    ('W8: run + double',   'NM-P84', 'stay', 19460, 'double', {}),
    ('W8: dash at shutter', 'NM-P84', 'NM-P85', 19640, 'dash', {}),
    ('X: P85 to B12',      'NM-P85', 'NM-B12', 20030, 'double', {}),
    ('X: B12 to Q5',       'NM-B12', 'NM-Q5', 20475, 'double', {}),
    ('X: Q5 to Q6',        'NM-Q5', 'NM-Q6', 20775, 'double', {}),
    ('X: Q6 to B13',       'NM-Q6', 'NM-B13', 21015, 'single', {}),
    ('stairs 1',           'NM-B13', 'NM-E1', 21935, 'single', {}),
    ('stairs 2',           'NM-E1', 'NM-E2', 22145, 'single', {}),
    ('stairs 4 to 5',      'NM-E4', 'NM-E5', 22865, 'single', {}),
    ('stairs 5 to plaza',  'NM-E5', 'NM-PLAZA', 23105, 'single', {}),
]

JS = """async([A,B,sx,mode,frozen])=>{const w=m=>new Promise(r=>setTimeout(r,m));
 const a=platforms.find(q=>q.id===A);if(!a)return 'missing '+A;
 for(const [id,x] of Object.entries(frozen)){const q=platforms.find(z=>z.id===id);if(q){q.motion=null;q.baseX=q.x=q.prevX=x;q.dx=0;}}
 __night.drones.forEach(d=>d.state='gone');actors=[];__night.runners.length=0;window.__duduIntroLock=0;
 releaseAllInputs();p.x=sx;p.y=a.y;p.vx=0;p.vy=0;p.prevX=p.x;p.prevY=p.y;p.ground=true;p.on=a;p.jumps=0;p.airDashUsed=false;
 p.dash=0;p.dashCooldown=0;p.invulnerable=99;p.guardStun=0;p.drop=null;state='playing';last=performance.now();acc=0;await w(120);
 const left=mode.endsWith('left');mode=mode.replace(/left$/,'');const k=left?'ArrowLeft':'ArrowRight';
 const jump=async(ms)=>{pressInput('Space','kb_s');await w(ms);releaseInput('Space','kb_s');};
 const dash=()=>{pressInput('ShiftLeft','kb_d');setTimeout(()=>releaseInput('ShiftLeft','kb_d'),30);};
 pressInput(k,'kb_t');
 if(mode==='single')await jump(260);
 else if(mode==='tap')await jump(40);
 else if(mode==='double'){await jump(260);await w(30);await jump(220);}
 else if(mode==='dash'){await w(20);dash();}
 else if(mode==='dashrun'){await w(120);dash();}
 else if(mode==='dashjump'){await w(20);dash();await w(60);await jump(450);}
 else if(mode==='walkairjump'){await w(420);await jump(260);}
 else if(mode==='dashdouble'){await w(20);dash();await w(60);await jump(260);await w(30);await jump(220);}
 let land=null;const y0=p.y;const tr=[];
 const b=platforms.find(q=>q.id===B);const mid=b?b.x+b.w/2:(left?-1e9:1e9);
 for(let i=0;i<120;i++){await w(25);tr.push(Math.round(p.x)+','+Math.round(p.y));
  if((!left&&p.x>mid)||(left&&p.x<mid))releaseInput(k,'kb_t');
  if(p.y>800||(p.on&&p.on.id==='NM-B0'&&A!=='NM-B0')){land='fall';break;}
  if(p.ground&&i>8&&p.on&&p.on!==a&&p.on.nightDraw!=='grate'){land=p.on.id;break;}
  if(p.ground&&i>40&&(p.on===a||(p.on&&p.on.nightDraw==='grate'))&&Math.abs(p.vx)<5){land='stayed';break;}}
 if(B==='stay'){const sh=platforms.filter(q=>q.dashUnder&&q.x>sx).sort((u,v)=>u.x-v.x)[0];
  land=(sh&&p.x+19<=sh.x+2&&p.y<800)?'stayed':'passed x'+Math.round(p.x);}
 releaseAllInputs();return (land||'air')+(window.__hopTrace?' '+tr.join(' '):'')}"""


async def main():
    want = [w for w in sys.argv[1:]]
    srv = serve()
    bad = 0
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        for label, A, B, sx, mode, frozen in TABLE:
            if want and not any(w in label or w in A or w in B for w in want):
                continue
            await pg.evaluate("()=>{document.getElementById('overlay').hidden=true;startNightStage();}")
            await pg.wait_for_timeout(150)
            if os.environ.get('HOP_TRACE'):
                await pg.evaluate("()=>{window.__hopTrace=true}")
            r = await pg.evaluate(JS, [A, B, sx, mode, frozen])
            r_land = r.split(' ')[0]
            ok = (r_land == B) or (B == 'stay' and r_land == 'stayed') or (B == 'fall' and r_land in ('fall', 'stayed'))
            bad += 0 if ok else 1
            print(('OK  ' if ok else 'MISS'), f'{label:24s}', A, '->', B, f'[{mode}]', 'got', r)
        if errs:
            print('\n'.join(errs[:5]))
        await b.close()
    sys.exit(1 if bad else 0)

asyncio.run(main())
