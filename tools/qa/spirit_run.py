"""Climb the whole spirit mountain (World 3) from the start floor to the summit in one go, with real inputs only.

    python tools/qa/spirit_run.py            # Dudu invulnerable; wisps, lava and the real wind cycle all running
    python tools/qa/spirit_run.py --hazards  # no invulnerability

Proves the vertical stage is one continuous world: no teleports, no scene loads. Steers toward each landing like a
player, which is how the leftward wind is countered. Prints each leg, the wind log, and exits 1 if it does not clear.
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop

ROUTE = [
    ('SM-M2', 1640, 'double'),
    ('SM-M3', 1650, 'singleleft'),
    ('SM-M6', 1500, 'singleleft'),
    ('SM-M9', 1440, 'double'),
    ('SM-M12', 1440, 'singleleft'),
    ('SM-E1', 1245, 'doubleleft'),
    ('SM-E2', 865, 'singleleft'),
    ('SM-E3', 535, 'singleleft'),
    ('SM-E2', 425, 'walk'),
    ('SM-E1', 770, 'walk'),
    ('SM-M12', 1120, 'walk'),
    ('SM-M6', 1290, 'down'),
    ('SM-FLOOR', 1300, 'down'),
    ('SM-M1', 2160, 'double'),
    ('SM-M5', 2150, 'singleleft'),
    ('SM-M7', 2055, 'singleleft'),
    ('SM-M8', 2015, 'double'),
    ('SM-M10', 2125, 'single'),
    ('SM-M14', 2215, 'double'),
    ('SM-M16', 2215, 'double'),
    ('SM-M19', 2160, 'doubleleft'),
    ('SM-M23', 2105, 'double'),
    ('SM-M24', 2205, 'doubleleft'),
    ('SM-M25', 1990, 'double'),
    ('SM-L0', 1990, 'single'),
    ('SM-L1', 1500, 'double'),
    ('SM-L2', 1635, 'double'),
    ('SM-L4', 1800, 'doubleleft'),
    ('SM-L5', 1640, 'double'),
    ('SM-L9', 1592, 'singleleft'),
    ('SM-I0', 1030, 'walkleft'),
    ('SM-I1', 810, 'singleleft'),
    ('SM-O1', 510, 'doubleleft'),
    ('SM-O2', 300, 'doubleleft'),
    ('SM-O3', 240, 'double'),
    ('SM-O4', 415, 'double'),
    ('SM-O5', 600, 'double'),
    ('SM-O6', 820, 'single'),
    ('SM-O7', 985, 'single'),
    ('SM-O8', 1125, 'single'),
    ('SM-O9', 1280, 'single'),
    ('SM-O10', 1436, 'single'),
    ('SM-O11', 1592, 'single'),
    ('SM-O12', 1710, 'single'),
    ('SM-O13', 1960, 'double'),
    ('SM-O14', 1990, 'single'),
    ('SM-O15', 1990, 'single'),
    ('SM-O16', 1980, 'double'),
    ('SM-O17', 1980, 'double'),
    ('SM-U1', 1686, 'doubleleft'),
    ('SM-U2', 1450, 'singleleft'),
    ('SM-U3', 1240, 'doubleleft'),
    ('SM-U6', 1046, 'doubleleft'),
    ('SM-U10', 938, 'double'),
    ('SM-V4', 1044, 'doubleleft'),
    ('SM-V7', 915, 'doubleleft'),
    ('SM-V10', 805, 'double'),
    ('SM-V13', 1004, 'double'),
    ('SM-V17', 1117, 'double'),
    ('SM-V19', 1208, 'doubleleft'),
    ('SM-V22', 1024, 'double'),
    ('SM-V24', 1165, 'double'),
    ('SM-V25', 1290, 'double'),
    ('SM-S0', 1290, 'double'),
    ('CLEAR', None, 'walk_end'),
]

JS = r"""async([route,god])=>{
 const w=m=>new Promise(r=>setTimeout(r,m));const P=id=>platforms.find(q=>q.id===id);
 const jump=async(ms)=>{pressInput('Space','kb_s');await w(ms);releaseInput('Space','kb_s');};
 const dash=()=>{pressInput('ShiftLeft','kb_d');setTimeout(()=>releaseInput('ShiftLeft','kb_d'),30);};
 /* movement uses a non-keyboard source id so the keyboard double-tap dash never fires by accident */
 const hold=(k)=>pressInput(k,'bot_'+k), up=(k)=>releaseInput(k,'bot_'+k);
 const log=[];document.getElementById('overlay').hidden=true;
 localStorage.removeItem('DUDU_WORLDMAP_SAVE_V1');_memoryWorldMapSave=null;startSpiritStage();
 const t0=levelClock;if(god)p.invulnerable=1e9;
 window.__respawns=[];const _rw=window.resetWorld1PlayerToCheckpoint;window.resetWorld1PlayerToCheckpoint=function(){__respawns.push({x:Math.round(p.x),y:Math.round(p.y),vy:Math.round(p.vy),on:p.on?p.on.id:'-',st:new Error().stack.split(String.fromCharCode(10)).slice(2,5).join(' | ')});const r=_rw.apply(this,arguments);if(god)p.invulnerable=1e9;return r;};
 const walkTo=async(tx)=>{for(let i=0;i<400;i++){const d=tx-p.x;if(Math.abs(d)<5&&Math.abs(p.vx)<40)break;
   const k=d>0?'ArrowRight':'ArrowLeft',o=d>0?'ArrowLeft':'ArrowRight';up(o);if(Math.abs(d)>=5)hold(k);else{up(k);}await w(16);}
   up('ArrowLeft');up('ArrowRight');await w(60);};
 const landOn=async(id,maxMs=4000)=>{const b=P(id);let steer=false;const mid=b?b.x+b.w/2:0;window.__tr=[Math.round(p.x)+','+Math.round(p.y)];for(let i=0;i<maxMs/20;i++){await w(20);window.__tr.push(Math.round(p.x)+','+Math.round(p.y));
   if(b&&!p.ground){const d=(b.x+b.w/2)-p.x;const over=Math.abs(d)<b.w/2+20;
     if(over||steer){steer=true;if(d>14){up('ArrowLeft');hold('ArrowRight');}else if(d<-14){up('ArrowRight');hold('ArrowLeft');}else{up('ArrowLeft');up('ArrowRight');}}}
   else if(p.ground&&steer){up('ArrowLeft');up('ArrowRight');}
   if(p.ground&&p.on&&p.on.id===id)return true; if(p.ground&&p.on&&ahead(id).includes(p.on.id))return true; if(p.y>b.y+700&&!p.ground)return false;}return false;};
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
   ok=!!document.getElementById('wmSpiritReplayBtn');
  }else{
   await walkTo(tx);
   const left=mode.endsWith('left'),m=mode.replace(/left$/,''),k=left?'ArrowLeft':'ArrowRight';
   /* steer during the jump too, the way a player lines up a landing (and leans against the wind) */
   const tgtP=P(id);let st2=false;const iv=setInterval(()=>{if(!tgtP)return;const d=(tgtP.x+tgtP.w/2)-p.x;
     if(!p.ground&&(st2||Math.abs(d)<tgtP.w/2+20)){st2=true;if(d>14){up('ArrowLeft');hold('ArrowRight');}else if(d<-14){up('ArrowRight');hold('ArrowLeft');}else{up('ArrowLeft');up('ArrowRight');}}
     else if(p.ground&&st2){up('ArrowLeft');up('ArrowRight');}},8);
   hold(k);
   if(m==='single')await jump(260);
   else if(m==='double'){await jump(260);await w(30);await jump(220);}
   else if(m==='down'){hold('ArrowDown');await w(40);await jump(60);up('ArrowDown');}
   else if(m==='dash'){await w(20);dash();}
   else if(m==='dashrun'){await w(120);dash();}
   else if(m==='dashjump'){await w(20);dash();await w(60);await jump(450);}
   else if(m==='dashdouble'){await w(20);dash();await w(60);await jump(260);await w(30);await jump(220);}
   ok=await landOn(id);clearInterval(iv);
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
            print(('ok  ' if e.get('ok') else 'FAIL'), json.dumps({k: v for k, v in e.items() if k not in ('tr', 'drop')}, ensure_ascii=False))
        print('trace:', (log[-1].get('tr') or [])[:60]);print('respawns:', len(respawns), json.dumps(respawns[:3], ensure_ascii=False))
        print('wind log:', json.dumps(await pg.evaluate("()=>__sm.windLog"), ensure_ascii=False))
        done = bool(log) and log[-1].get('leg', '').endswith('CLEAR') and log[-1].get('ok')
        print(chr(10) + ('CLEARED' if done else 'DID NOT CLEAR'), f"in {log[-1].get('t')}s game time" if done else '')
        if errs:
            print(chr(10).join(errs[:5]))
        await b.close()
    sys.exit(0 if done else 1)

asyncio.run(main())
