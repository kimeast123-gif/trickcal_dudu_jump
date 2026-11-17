"""Play the whole night map (World 2) from the start flag to the plaza in one go, with real inputs only.

    python tools/qa/night_run.py            # Dudu is made invulnerable, everything else runs as normal
    python tools/qa/night_run.py --hazards  # no invulnerability: drones, guards and the field can knock her off

No teleporting: from the 2-second start hold to the clear panel Dudu only moves through pressInput /
releaseInput, so this proves the stage is one continuous, finishable world. Moving platforms are waited for.
Prints each leg with the platform reached and the game time, and exits 1 if the run does not clear.
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop

# (target platform, takeoff x on the current platform, pattern)
ROUTE = [
    ('NM-B1', 280, 'single'), ('NM-P1', 690, 'single'), ('NM-P2', 900, 'single'), ('NM-B2', 1130, 'double'),
    ('NM-Q1', 1470, 'single'), ('NM-Q2', 1710, 'double'), ('NM-Q3', 1810, 'doubleleft'), ('NM-Q4', 1710, 'double'),
    ('NM-B3', 1850, 'dashdouble'), ('NM-R1', 2560, 'walk'), ('NM-B4', 2985, 'single'),
    ('NM-DOT1', 3475, 'single'), ('NM-DOT2', 3688, 'single'), ('NM-DOT3', 3868, 'single'), ('NM-DOT4', 4048, 'single'),
    ('NM-DOT5', 4228, 'single'), ('NM-DOT6', 4408, 'single'), ('NM-B5', 4588, 'single'), ('NM-B6', 4935, 'double'),
    ('NM-S1', 5275, 'single'), ('NM-S2', 5455, 'single'), ('NM-T-SILL', 5675, 'single'),
    ('NM-T-M1', None, 'drop'), ('NM-T-M2', None, 'drop'), ('NM-T-M3', None, 'drop'), ('NM-T-M4', None, 'drop'),
    ('NM-G1', None, 'ferry'), ('NM-G2', 7295, 'single'), ('NM-G3', 7365, 'singleleft'), ('NM-G4', 7295, 'single'),
    ('NM-B7', 7455, 'single'), ('NM-TD1', 7835, 'single'), ('NM-TD2', 8700, 'walk'), ('NM-TD3', 9420, 'double'),
    ('NM-B8', 10495, 'single'), ('NM-P71', 10945, 'single'), ('NM-P72', 11378, 'dash'), ('NM-P73', 11754, 'dashjump'),
    ('NM-P74', 12090, 'dash'), ('NM-P75', 12466, 'dash'), ('NM-P76', 12842, 'dashjump'), ('NM-B9', 13315, 'double'),
    ('NM-X-M5', None, 'catch'), ('NM-X-M6', None, 'catch'), ('NM-X-M7', None, 'catch'), ('NM-B10', None, 'catch'),
    ('NM-TD4', 15545, 'single'), ('NM-DOT7', 16595, 'single'), ('NM-DOT8', 16808, 'single'), ('NM-DOT9', 16978, 'single'),
    ('NM-DOT10', 17148, 'single'), ('NM-B11', 17318, 'single'), ('NM-P81', 17695, 'single'), ('NM-P82', 18120, 'dashjump'),
    ('NM-P83', 18496, 'dash'), ('NM-X-M8', None, 'catch'), ('NM-P84', None, 'catch'), ('NM-P85', 19640, 'dash'),
    ('NM-B12', 20030, 'double'), ('NM-Q5', 20475, 'double'), ('NM-Q6', 20775, 'double'), ('NM-B13', 21015, 'single'),
    ('NM-E1', 21935, 'single'), ('NM-E2', 22175, 'single'), ('NM-E3', 22395, 'single'), ('NM-E4', 22625, 'single'),
    ('NM-E5', 22865, 'single'), ('NM-PLAZA', 23105, 'single'), ('CLEAR', None, 'walk_end'),
]

JS = r"""async([route,god])=>{
 const w=m=>new Promise(r=>setTimeout(r,m));const P=id=>platforms.find(q=>q.id===id);
 const jump=async(ms)=>{pressInput('Space','kb_s');await w(ms);releaseInput('Space','kb_s');};
 const dash=()=>{pressInput('ShiftLeft','kb_d');setTimeout(()=>releaseInput('ShiftLeft','kb_d'),30);};
 /* movement uses a non-keyboard source id so the keyboard double-tap dash never fires by accident */
 const hold=(k)=>pressInput(k,'bot_'+k), up=(k)=>releaseInput(k,'bot_'+k);
 const log=[];document.getElementById('overlay').hidden=true;
 localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');_memoryWorldMapSave=null;startNightStage();
 const t0=levelClock;if(god)p.invulnerable=1e9;
 window.__respawns=[];const _rw=window.resetWorld1PlayerToCheckpoint;window.resetWorld1PlayerToCheckpoint=function(){__respawns.push({x:Math.round(p.x),y:Math.round(p.y),vy:Math.round(p.vy),on:p.on?p.on.id:'-',st:new Error().stack.split(String.fromCharCode(10)).slice(2,5).join(' | ')});const r=_rw.apply(this,arguments);if(god)p.invulnerable=1e9;return r;};
 // the start hold: pressing right does nothing for 2s
 hold('ArrowRight');await w(1000);const heldX=p.x;up('ArrowRight');
 while(window.__duduIntroLock>0)await w(20);
 log.push({leg:'start hold',heldX:Math.round(heldX),ok:heldX<132});
 const walkTo=async(tx)=>{for(let i=0;i<400;i++){const d=tx-p.x;if(Math.abs(d)<5&&Math.abs(p.vx)<40)break;
   const k=d>0?'ArrowRight':'ArrowLeft',o=d>0?'ArrowLeft':'ArrowRight';up(o);if(Math.abs(d)>=5)hold(k);else{up(k);}await w(16);}
   up('ArrowLeft');up('ArrowRight');await w(60);};
 const landOn=async(id,maxMs=4000)=>{const b=P(id);const mid=b?b.x+b.w/2:0;window.__tr=[Math.round(p.x)+','+Math.round(p.y)];for(let i=0;i<maxMs/20;i++){await w(20);window.__tr.push(Math.round(p.x)+','+Math.round(p.y));
   if(b&&((p.vx>0&&p.x>b.x+b.w/2)||(p.vx<0&&p.x<b.x+b.w/2))){up('ArrowLeft');up('ArrowRight');}
   if(p.ground&&p.on&&p.on.id===id)return true; if(p.ground&&p.on&&ahead(id).includes(p.on.id))return true; if(p.y>820)return false;}return false;};
 const ids=route.map(r=>r[0]);const ahead=(id)=>ids.slice(ids.indexOf(id)+1,ids.indexOf(id)+3);
 for(const [id,tx,mode] of route){
  if(p.on&&ids.indexOf(p.on.id)>=ids.indexOf(id))continue; /* a long jump skipped this one */
  if(state!=='playing'){log.push({leg:id,ok:false,why:'state '+state});break;}
  const startPlat=p.on?p.on.id:'-';let ok=false;
  if(mode==='drop'){
   // stand over the platform below and drop through when it will be underneath on arrival
   const tgt=P(id),cur=p.on;
   for(let i=0;i<600&&!ok;i++){
    const fall=Math.sqrt(2*Math.max(1,tgt.y-p.y)/2500);const vx=tgt.dx*120;
    const c=tgt.x+tgt.w/2+vx*fall;const lo=cur.x+24,hi=cur.x+cur.w-24;const aim=Math.max(lo,Math.min(hi,c));
    const d=aim-p.x;up('ArrowLeft');up('ArrowRight');if(Math.abs(d)>8)hold(d>0?'ArrowRight':'ArrowLeft');
    const fieldSafe=(p.x<6440);
    if(Math.abs(c-p.x)<tgt.w/2-30&&fieldSafe&&p.ground){up('ArrowLeft');up('ArrowRight');
      window.__dropInfo={px:Math.round(p.x),c:Math.round(c),tx:Math.round(tgt.x),dx:tgt.dx};hold('ArrowDown');await w(30);await jump(60);up('ArrowDown');ok=await landOn(id,1500);break;}
    await w(16);}
  }else if(mode==='catch'){
   // moving platforms: wait at the near edge until the target is within a jump, then jump
   const tgt=P(id);
   for(let i=0;i<900&&!ok;i++){
    const cur=p.on;if(!cur||!p.ground){await w(16);continue;}
    const dir=(tgt.x+tgt.w/2)>p.x?1:-1;const lead=0.3*120;
    const edge=dir>0?cur.x+cur.w-24:cur.x+24;
    const tNear=dir>0?tgt.x+tgt.dx*lead:tgt.x+tgt.w+tgt.dx*lead;
    const cEdge=dir>0?cur.x+cur.w+cur.dx*lead:cur.x+cur.dx*lead;
    const gap=dir>0?tNear-cEdge:cEdge-tNear;
    const d=edge-p.x;up('ArrowLeft');up('ArrowRight');if(Math.abs(d)>10)hold(d>0?'ArrowRight':'ArrowLeft');
    if(Math.abs(d)<=30&&gap<90&&gap>-tgt.w+60){up('ArrowLeft');up('ArrowRight');hold(dir>0?'ArrowRight':'ArrowLeft');await jump(260);ok=await landOn(id,2500);break;}
    await w(16);}
  }else if(mode==='ferry'){
   // ride the exit platform out of the tower, then hop to the first step
   const f=p.on;for(let i=0;i<900;i++){await w(16);if(f.x>6985&&f.dx>0)break;}
   await walkTo(f.x+f.w-30+(f.dx*120*0.2));hold('ArrowRight');await jump(260);ok=await landOn(id);
  }else if(mode==='walk_end'){
   hold('ArrowRight');for(let i=0;i<500;i++){await w(20);if(state!=='playing')break;}up('ArrowRight');
   ok=!!document.getElementById('wmNightReplayBtn');
  }else{
   await walkTo(tx);
   const left=mode.endsWith('left'),m=mode.replace(/left$/,''),k=left?'ArrowLeft':'ArrowRight';
   hold(k);
   if(m==='single')await jump(260);
   else if(m==='double'){await jump(260);await w(30);await jump(220);}
   else if(m==='dash'){await w(20);dash();}
   else if(m==='dashrun'){await w(120);dash();}
   else if(m==='dashjump'){await w(20);dash();await w(60);await jump(450);}
   else if(m==='dashdouble'){await w(20);dash();await w(60);await jump(260);await w(30);await jump(220);}
   ok=await landOn(id);
  }
  up('ArrowLeft');up('ArrowRight');
  log.push({leg:startPlat+' > '+id,mode,ok,t:+(levelClock-t0).toFixed(1),hp:p.hp,cp:checkpoint,x:Math.round(p.x),y:Math.round(p.y),on:p.on?p.on.id:'-',tr:ok?undefined:window.__tr,drop:ok?undefined:window.__dropInfo});
  if(!ok)break;
 }
 log.push({respawns:window.__respawns});return log;}"""


async def main():
    god = '--hazards' not in sys.argv
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        log = await pg.evaluate(JS, [ROUTE, god])
        respawns = log.pop()['respawns'] if log and 'respawns' in log[-1] else []
        for e in log:
            print(('ok  ' if e.get('ok') else 'FAIL'), json.dumps(e, ensure_ascii=False))
        print('respawns:', len(respawns), json.dumps(respawns[:3], ensure_ascii=False))
        done = bool(log) and log[-1].get('leg', '').endswith('CLEAR') and log[-1].get('ok')
        print('\nCLEARED' if done else '\nDID NOT CLEAR', f"in {log[-1].get('t')}s game time" if done else '')
        if errs:
            print('\n'.join(errs[:5]))
        await b.close()
    sys.exit(0 if done else 1)

asyncio.run(main())
