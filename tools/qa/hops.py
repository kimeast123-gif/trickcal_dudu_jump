"""Check, with the game's real physics, that a jump from one platform lands on another.

    python tools/qa/hops.py LEVEL FROM_ID TO_ID TAKEOFF_X [single|double] [hold_ms]
    python tools/qa/hops.py monatium_a M-GRD-BR3B M-GUARD-02-P1 24560 single 260

Holds the direction toward TO, jumps once (or twice), and reports which platform Dudu lands on.
Blinking platforms are forced on and NPCs removed, so only geometry is tested.
For a walk-off (no jump), pass hold_ms 0. Use it for every gap you add or move.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, LEVELS

name, A, B, sx = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
dbl = len(sys.argv) > 5 and sys.argv[5] == 'double'
hold = int(sys.argv[6]) if len(sys.argv) > 6 else 260
li = LEVELS.index(name) if name in LEVELS else int(name)

JS = """async([A,B,sx,hold,dbl])=>{const w=m=>new Promise(r=>setTimeout(r,m));
 const a=platforms.find(q=>q.id===A),b=platforms.find(q=>q.id===B);if(!a||!b)return 'missing platform';
 for(const q of platforms)if(q.blink){q.blink.on=99;q.blink.off=0.01;q.blink.phase=0;}actors=[];
 keys.clear();inputSourceMap.clear();p.x=sx;p.y=a.y;p.vx=0;p.vy=0;p.prevX=p.x;p.prevY=p.y;p.ground=true;p.on=a;p.jumps=0;p.invulnerable=9;p.drop=null;
 state='playing';last=performance.now();acc=0;await w(150);
 const d=(b.x+b.w/2)>sx?1:-1,k=d>0?'ArrowRight':'ArrowLeft';pressInput(k,'kb_t');await w(40);
 if(hold>0){pressInput('Space','kb_s');await w(hold);releaseInput('Space','kb_s');}
 if(dbl){await w(30);pressInput('Space','kb_s');await w(200);releaseInput('Space','kb_s');}
 const mid=b.x+b.w/2;let land=null;
 for(let i=0;i<90;i++){await w(25);if((d>0&&p.x>mid)||(d<0&&p.x<mid))releaseInput(k,'kb_t');if(p.ground&&i>6){land=p.on?p.on.id:'-';break;}}
 releaseInput(k,'kb_t');return land}"""


async def main():
    srv = serve()
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        await pg.evaluate(f"()=>{{loadLevel({li});levelIndex={li};}}")
        r = await pg.evaluate(JS, [A, B, sx, hold, dbl])
        print(('OK  ' if r == B else 'MISS'), A, '->', B, 'landed on', r)
        await b.close()
    sys.exit(0 if r == B else 1)

asyncio.run(main())
