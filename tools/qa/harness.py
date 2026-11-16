"""Shared helpers for the browser QA scripts.

The game is a static site, so each script serves the repository over a local HTTP server and drives it
with Playwright (Chromium). Everything runs headless.

Environment variables
  GAME_ROOT   repository root to serve (default: two folders above this file)
  QA_PORT     local port (default 8765)
  CHROME      path to a Chromium binary (default: Playwright's bundled Chromium)
"""
import os, functools, threading, http.server, socketserver, asyncio
from playwright.async_api import async_playwright  # noqa: F401  (re-exported)

ROOT = os.environ.get('GAME_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = int(os.environ.get('QA_PORT', '8765'))
URL = f'http://127.0.0.1:{PORT}/index.html'
MOBILE_UA = ('Mozilla/5.0 (Linux; Android 14; SM-A546N) AppleWebKit/537.36 '
             '(KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36')


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root=None, port=None):
    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(_Quiet, directory=root or ROOT)
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', port or PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def launch(pw):
    args = ['--use-gl=swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc']
    exe = os.environ.get('CHROME')
    return await pw.chromium.launch(executable_path=exe, args=args) if exe else await pw.chromium.launch(args=args)


def _collect(pg, errs):
    pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text)
          if m.type == 'error' and 'preload' not in m.text else None)


async def open_desktop(pw, wait=8000, query=''):
    b = await launch(pw)
    pg = await b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    _collect(pg, errs)
    await pg.goto(URL + query)
    await pg.wait_for_timeout(wait)
    return b, pg, errs


async def open_mobile(pw, wait=8000, query='', width=915, height=412):
    b = await launch(pw)
    ctx = await b.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True,
                              device_scale_factor=2.6, user_agent=MOBILE_UA)
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    errs = []
    _collect(pg, errs)
    await pg.goto(URL + query)
    await pg.wait_for_timeout(wait)
    return b, pg, cdp, errs


async def play(pg, level, x, y):
    """Jump straight into a story level at (x, y) in the playing state, skipping menus and cutscenes."""
    await pg.evaluate(f"""()=>{{loadLevel({level});levelIndex={level};state='playing';
      document.getElementById('overlay').hidden=true;const st=document.getElementById('story');if(st)st.hidden=true;
      p.x={x};p.y={y};p.vx=0;p.vy=0;p.prevX=p.x;p.prevY=p.y;last=performance.now();acc=0;
      if(typeof syncMobileViewMode==='function')syncMobileViewMode();}}""")


async def touch(cdp, kind, points):
    """points: list of (id, (x, y)). kind: touchStart | touchMove | touchEnd."""
    await cdp.send('Input.dispatchTouchEvent',
                   {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in points]})


LEVELS = ['forest', 'village', 'monatium_a', 'monatium_b', 'erpien_a', 'erpien_b']
