"""Bump the version everywhere a browser cache or the game reads it, then rebuild MANIFEST_SHA256.txt.

    python tools/release.py v1.4.2          # sets release-config version and every ?v= cache key
    python tools/release.py --manifest-only

Run it once per deploy, after the CHANGELOG entry is written and regression.py passes.
"""
import glob, hashlib, os, re, sys, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SKIP_DIRS = {'.git', 'tools', 'node_modules', '.github'}


def manifest():
    rows = []
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in files:
            p = os.path.join(d, f); r = os.path.relpath(p, ROOT).replace(os.sep, '/')
            if r == 'MANIFEST_SHA256.txt' or r.startswith('docs/') or r == 'CLAUDE.md':
                continue
            rows.append((r, hashlib.sha256(open(p, 'rb').read()).hexdigest()))
    with open(os.path.join(ROOT, 'MANIFEST_SHA256.txt'), 'w', encoding='utf8') as fh:
        fh.write(''.join(f'{h}  {r}\n' for r, h in sorted(rows)))
    print(f'MANIFEST_SHA256.txt: {len(rows)} files')


def bump(version):
    if not re.fullmatch(r'v\d+(\.\d+){1,3}', version):
        sys.exit('version must look like v1.4.2')
    key = version.replace('.', '_') + '_' + datetime.date.today().strftime('%y%m%d')
    changed = 0
    for f in [os.path.join(ROOT, 'index.html')] + glob.glob(os.path.join(ROOT, '*.js')):
        s = open(f, encoding='utf8').read()
        n = re.sub(r'\?v=v\d[\w]*', '?v=' + key, s)
        if os.path.basename(f) == 'release-config.js':
            n = re.sub(r"version: '[^']*'", f"version: '{version}'", n)
        if n != s:
            open(f, 'w', encoding='utf8').write(n); changed += 1
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read()
    keys = set(re.findall(r'\.(?:js|css)\?v=([\w]+)', html))
    print(f'{changed} files updated, cache key {key}; script and style keys in index.html: {sorted(keys)}')
    if len(keys) != 1:
        print('WARNING: scripts or styles in index.html still carry different cache keys; fix them by hand.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] != '--manifest-only':
        bump(sys.argv[1])
    manifest()
