"""Art prototype inventory: which platforms the candidate sprites replace, per area.

    python tools/qa/art_inventory.py
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import serve, async_playwright, open_desktop, play

LIST = """()=>platforms.filter(a=>!a.groundTile).map(a=>({id:a.id||'',x:a.x,y:a.y,w:a.w,wall:!!a.wall,blink:a.behavior==='blink'||!!a.blink,
  sm:a.smDraw||'',zone:(a.smDraw&&typeof smZoneOf==='function'&&a.id)?smZoneOf(a):'',mat:(a.visual&&a.visual.material)||a.skin||'',
  applies:__artProto.applies(a)}))"""


async def main():
    srv = serve()
    out = {}
    async with async_playwright() as pw:
        b, pg, errs = await open_desktop(pw)
        await play(pg, 0, 200, 580)
        await pg.wait_for_timeout(500)
        out['story_forest'] = await pg.evaluate(LIST)
        for i in range(5):
            await pg.evaluate(f"()=>{{loadWorld1Stage({i},{{section:0,entryRoute:'default'}});state='playing';document.getElementById('overlay').hidden=true;}}")
            await pg.wait_for_timeout(400)
            out[f'world1_{i+1}'] = await pg.evaluate(LIST)
        await pg.evaluate("()=>{devPracticeSpirit(1500,-46);}")
        await pg.wait_for_timeout(400)
        out['spirit'] = [a for a in await pg.evaluate(LIST) if a['zone'] == 'cave' or a['applies']]
        await b.close()
        print('errors:', [e for e in errs][:5])
    srv.shutdown()
    json.dump(out, open(os.path.join(os.path.dirname(__file__), 'out', 'art_inventory.json'), 'w'), ensure_ascii=False, indent=1)
    for k, v in out.items():
        ap = [a for a in v if a['applies']]
        thin = [a for a in v if not a['wall'] and (a['mat'] == 'grass' or a['zone'] == 'cave')]
        print(f"{k}: replaced {len(ap)} / {len(thin)} candidates   replaced widths {sorted(a['w'] for a in ap)}")
        kept = [(a['id'], a['w'], a['sm'] or ('blink' if a['blink'] else 'thin')) for a in thin if not a['applies']]
        print('   kept release art:', kept)

os.makedirs(os.path.join(os.path.dirname(__file__), 'out'), exist_ok=True)
asyncio.run(main())
