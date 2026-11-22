"""How much a first visit on a phone downloads (for FIRST_DOWNLOAD_MB in download-consent.js).

    python tools/qa/first_load_size.py

Opens the game in a fresh phone-sized browser with the download question shown (?dlgate=1), records what loads
before the answer (should be only the page itself and a few small icons), presses "받고 시작하기" and records the
rest for 15 seconds. Prints both totals and the biggest folders.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import harness
from harness import serve, async_playwright


async def main():
    srv = serve(); rows = []
    async with async_playwright() as pw:
        b = await harness.launch(pw)
        ctx = await b.new_context(viewport={'width': 915, 'height': 412}, is_mobile=True, has_touch=True, device_scale_factor=2,
                                  user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36')
        pg = await ctx.new_page()

        async def on(r):
            try:
                rows.append((len(await r.body()), r.url.split('?')[0]))
            except Exception:
                pass
        pg.on('response', lambda r: asyncio.ensure_future(on(r)))
        await pg.goto(harness.URL + '?dlgate=1'); await pg.wait_for_timeout(8000)
        before = sum(n for n, _ in rows)
        asked = await pg.evaluate("()=>!!document.getElementById('duduDownloadAsk')")
        if asked:
            await pg.click('#ddaYes')
        await pg.wait_for_timeout(15000)
        await b.close()
    srv.shutdown()
    total = sum(n for n, _ in rows)
    print(f'question shown: {asked}')
    print(f'before the answer: {before / 1048576:.1f} MB')
    print(f'after "받고 시작하기": {(total - before) / 1048576:.1f} MB more (put this in FIRST_DOWNLOAD_MB), {total / 1048576:.1f} MB in all')
    by = {}
    for n, u in rows:
        d = u.split('/index.html')[0] if u.endswith('index.html') else u.rsplit('/', 1)[0]
        d = d.split(str(harness.PORT))[-1]
        by[d] = by.get(d, 0) + n
    for d, n in sorted(by.items(), key=lambda x: -x[1])[:10]:
        print(f'{n / 1048576:6.2f} MB  {d}')

asyncio.run(main())
