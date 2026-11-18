"""Static audit of every story candy against the level geometry. Nothing is played: each level is loaded and every
candy is compared with the platforms around it.

    python tools/qa/candy_audit.py

A candy is reported when it
  - sits inside a solid body or inside a ledge's art (sunk),
  - hangs past the end of the ledge it should rest on,
  - floats more than 50px above the top it rests on, or has nothing below it,
  - has a solid body between it and the surface it would be jumped to from,
  - has less than 62px of room above the spot where Dudu stands to take it.
Candies that ride a moving platform are checked against that platform's current position.
Candies placed on purpose on a jump arc are listed in ARC and only reported if they also hit a body.
Pickup box (game.js): |c.x - p.x| < 26 and feet y in (c.y - 2, c.y + 66). A resting candy sits 38px above its top.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, LEVELS

ARC = {'F-C19', 'EA-C03'}   # forest dash-gap guide, Erpien A first gap
JS = r"""(li)=>{
 loadLevel(li); levelIndex=li;
 const P = platforms.filter(a=>a.collidable!==false || a.blink);
 const solid = P.filter(a=>!a.thin);
 const tops = P.filter(a=>!(a.wall&&a.noTopLand) && !a.ceiling);
 const out = [];
 for (const c of coins) {
  const f = [];
  for (const a of solid) if (c.x > a.x-6 && c.x < a.x+a.w+6 && c.y > a.y-6 && c.y < a.y+a.h+6) f.push('inside '+a.id);
  for (const a of P) if (a.thin && c.x > a.x+4 && c.x < a.x+a.w-4 && c.y > a.y-24 && c.y < a.y+38) f.push('sunk into '+a.id);
  let S=null, dy=1e9;
  for (const a of tops) { if (c.x < a.x-30 || c.x > a.x+a.w+30) continue; const d=a.y-c.y; if (d>=-20 && d<dy){dy=d;S=a;} }
  if (S && (c.x < S.x+4 || c.x > S.x+S.w-4) && dy < 120) f.push('past the end of '+S.id);
  if (!S) f.push('nothing below');
  else if (dy > 50) f.push('floats '+Math.round(dy)+'px above '+S.id);
  if (S && dy>66) for (const a of solid) { if (a===S) continue; if (c.x+14>a.x && c.x-14<a.x+a.w && a.y+a.h > c.y+10 && a.y < S.y-2) f.push('blocked by '+a.id); }
  if (S && dy<=66) for (const a of P) { if (a===S) continue; const bot=a.y+(a.thin?20:a.h); if (c.x+14>a.x && c.x-14<a.x+a.w && bot > S.y-62 && bot <= S.y-2) f.push('low ceiling '+a.id); }
  out.push({ id:c.id, x:Math.round(c.x), y:Math.round(c.y), ride: c.ride ? c.ride.id : null, f });
 }
 return out;
}"""


async def main():
    srv = serve()
    total = 0
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        for li, name in enumerate(LEVELS):
            res = await pg.evaluate(JS, li)
            bad = []
            for c in res:
                f = c['f']
                if c['id'] in ARC:
                    f = [x for x in f if x.startswith('inside') or x.startswith('sunk')]
                if f: bad.append((c, f))
            rides = [c['id'] for c in res if c['ride']]
            print(f'{name}: {len(res)} candies, {len(bad)} reported' + (f', riding {", ".join(rides)}' if rides else ''))
            for c, f in bad:
                print(f"   {c['id']} ({c['x']}, {c['y']}): {'; '.join(f)}")
            total += len(bad)
        await b.close()
    print('PASS' if total == 0 else f'{total} candies to fix')
    sys.exit(0 if total == 0 else 1)

asyncio.run(main())
