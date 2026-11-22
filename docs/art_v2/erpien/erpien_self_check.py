"""Erpien terrain self-check. Run it BEFORE delivering, and put its full output in the delivery.

    python erpien_self_check.py ORIGINAL_DIR NEW_DIR [MASTER_DIR]

ORIGINAL_DIR  the original assets/terrain/erpien/ files (attached to the brief)
NEW_DIR       your new .webp files, same file names
MASTER_DIR    optional: your 2x master PNGs (same names, .png). Each must downscale by exactly 50% to the delivered file.

Every line must say PASS. Any FAIL means the delivery is not ready. The thresholds are the ones the game review uses.
Needs: pip install numpy pillow
"""
import os, sys
import numpy as np
from PIL import Image

WALK = {}
for p in ('left', 'right', 'middle_a', 'middle_b', 'middle_c', 'inner_strip'): WALK['stone_' + p] = 95
WALK.update({'stone_single_small': 46, 'stone_single_medium': 42, 'stone_ground_cliff_left': 60, 'stone_ground_cliff_right': 60})
for p in ('', '_a', '_b', '_c'): WALK['stone_ground_top' + p] = 60; WALK['home_ground_top' + p] = 69
for p in ('left', 'right', 'middle_a', 'middle_b', 'middle_c'): WALK['home_' + p] = 69
WALK.update({'home_single_small': 12, 'home_ground_cliff_left': 69, 'home_ground_cliff_right': 69})
# pairs that are drawn side by side in the game: right edge of the first meets left edge of the second
SEAMS = [(f'{g}_{a}', f'{g}_{b}') for g in ('stone', 'home') for a, b in (('left', 'middle_a'), ('middle_a', 'middle_b'), ('middle_b', 'middle_c'),
                                                                         ('middle_c', 'right'), ('middle_c', 'middle_a'), ('middle_a', 'middle_a'))]
SEAMS += [('stone_inner_strip', 'stone_middle_a'), ('stone_middle_c', 'stone_inner_strip'), ('stone_ground_top_a', 'stone_ground_top_b'),
          ('stone_ground_top_c', 'stone_ground_top'), ('home_ground_top_a', 'home_ground_top_b'), ('home_ground_top_c', 'home_ground_top')]
TILES = ['stone_ground_body_a', 'stone_ground_body_b', 'home_ground_body_a', 'home_ground_body_b']
BODY_START = {'stone': 118, 'home': 560}
results = []


def check(name, ok, detail):
    results.append(ok)
    print(('PASS  ' if ok else 'FAIL  ') + f'{name:44s} {detail}')


def load(p):
    return np.array(Image.open(p).convert('RGBA')).astype(float)


def lum(a):
    return a[:, :, :3] @ [0.299, 0.587, 0.114] / 2.55


def sharpness(a):  # mean |Laplacian| over fully opaque pixels: fine edge detail
    L = a[:, :, :3] @ [0.299, 0.587, 0.114]; m = a[:, :, 3] > 250
    lap = np.abs(4 * L[1:-1, 1:-1] - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:])
    mm = m[1:-1, 1:-1] & m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:]
    return float(lap[mm].mean()) if mm.any() else 0.0


def shading(a):  # spread of 16x16 block brightness: large light/dark masses
    L = lum(a); m = a[:, :, 3] > 200; h, w = L.shape
    b = [L[y:y + 16, x:x + 16][m[y:y + 16, x:x + 16]].mean() for y in range(0, h - 15, 16) for x in range(0, w - 15, 16) if m[y:y + 16, x:x + 16].mean() > .9]
    return float(np.std(b)) if b else 0.0


def flat(a):  # share of opaque pixels with almost no brightness change
    L = lum(a); m = a[:, :, 3] > 200; gy, gx = np.gradient(L)
    return float(((np.abs(gx) + np.abs(gy)) < 0.6)[m].mean() * 100) if m.any() else 0.0


def topline(a):  # median first opaque row over the middle 60% of the columns
    m = a[:, :, 3] > 128; h, w = m.shape
    t = [int(np.argmax(m[:, x])) for x in range(int(w * .2), int(w * .8)) if m[:, x].any()]
    return int(np.median(t)) if t else -1


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    O, N = sys.argv[1], sys.argv[2]; M = sys.argv[3] if len(sys.argv) > 3 else None
    names = sorted(f[:-5] for f in os.listdir(N) if f.endswith('.webp') and os.path.exists(os.path.join(O, f)))
    for n in names:
        a = load(os.path.join(N, n + '.webp')); o = load(os.path.join(O, n + '.webp'))
        check(f'{n}: size', a.shape == o.shape, f'{a.shape[1]}x{a.shape[0]} (original {o.shape[1]}x{o.shape[0]})')
        if a.shape != o.shape: continue
        so, sn = sharpness(o), sharpness(a)
        check(f'{n}: sharpness >= original', sn >= so * 0.95, f'{sn:.1f} (original {so:.1f})')
        ho, hn = shading(o), shading(a)
        if ho > 0: check(f'{n}: shading >= original', hn >= ho * 0.9, f'{hn:.1f} (original {ho:.1f})')
        fo, fn = flat(o), flat(a)
        check(f'{n}: flat area <= original + 5', fn <= fo + 5, f'{fn:.0f}% (original {fo:.0f}%)')
        mo = a[:, :, 3] > 128; mo2 = o[:, :, 3] > 128
        cn = a[mo][:, :3].mean(0); co = o[mo2][:, :3].mean(0)
        check(f'{n}: mean colour close to original', float(np.abs(cn - co).max()) <= 14,
              '#%02x%02x%02x (original #%02x%02x%02x)' % (*[int(v) for v in cn], *[int(v) for v in co]))
        if n in WALK:
            # the game puts the walk row WALK[n] on the platform top; the original's own top line (often 2-4 rows
            # higher: a lip) is what is known to look right in the game, so the new top line must match it
            w = WALK[n]; t, to = topline(a), topline(o)
            check(f'{n}: top line = original top line', abs(t - to) <= 2, f'row {t} (original {to}, walk row {w})')
            band = (a[max(0, w - 8):w, :, 3] > 128).mean() * 100; above = (a[:max(0, w - 8), :, 3] > 128).mean() * 100
            bo = (o[max(0, w - 8):w, :, 3] > 128).mean() * 100; ao = (o[:max(0, w - 8), :, 3] > 128).mean() * 100
            check(f'{n}: nothing tall above the walk row', band <= max(30, bo + 5) and above <= ao + 1,
                  f'{band:.0f}% in the 8 rows above (original {bo:.0f}%), {above:.1f}% higher up (original {ao:.1f}%)')
        if n.endswith('inner_strip'):
            m = a[:, :, 3] > 128; bot = [int(np.nonzero(c)[0].max()) for c in m.T if c.any()]
            check(f'{n}: flat bottom outline', max(bot) - min(bot) <= 4, f'rows {min(bot)}..{max(bot)}')
        if M:
            mp = os.path.join(M, n + '.png')
            if os.path.exists(mp):
                mi = Image.open(mp).convert('RGBA')
                ok2 = mi.size == (a.shape[1] * 2, a.shape[0] * 2)
                d = np.abs(np.array(mi.resize((a.shape[1], a.shape[0]), Image.LANCZOS)).astype(float) - a)[a[:, :, 3] > 0].mean() if ok2 else 999
                check(f'{n}: 2x master downscales to the file', ok2 and d <= 3, f'master {mi.size[0]}x{mi.size[1]}, difference {d:.1f}')
            else:
                check(f'{n}: 2x master present', False, 'missing ' + mp)
    have = set(names)
    # joins: the new art must be at least as clean as the original (which is known to look right in the game)
    def seam(d, x, y):
        A, B = load(os.path.join(d, x + '.webp')), load(os.path.join(d, y + '.webp'))
        m = (A[:, -1, 3] > 128) & (B[:, 0, 3] > 128)
        return (float(np.abs(A[:, -1, :3] - B[:, 0, :3])[m].mean()) if m.any() else 0.0), int(((A[:, -1, 3] > 128) != (B[:, 0, 3] > 128)).sum())
    for x, y in SEAMS:
        if x in have and y in have:
            d, am = seam(N, x, y); do, amo = seam(O, x, y)
            check(f'seam {x} | {y}', d <= max(1.0, do) and am <= max(2, amo), f'edge difference {d:.1f} (original {do:.1f}), alpha mismatch {am} (original {amo})')
    def tile(d, n):
        A = load(os.path.join(d, n + '.webp')); body = A[:-1] if A[-1, :, 3].mean() < 128 else A   # ignore a transparent last row
        return float(np.abs(body[0, :, :3] - body[-1, :, :3]).mean()), float(np.abs(body[:, 0, :3] - body[:, -1, :3]).mean()), float(body[:, :, 3].min()), A
    for n in TILES:
        if n in have:
            tb, lr, mn, A = tile(N, n); tbo, lro, mno, _ = tile(O, n)
            check(f'{n}: tiles 4 ways, opaque', tb <= max(1.0, tbo) and lr <= max(1.0, lro) and mn >= min(250, mno),
                  f'top/bottom {tb:.1f} (original {tbo:.1f}), left/right {lr:.1f} (original {lro:.1f}), min alpha {mn:.0f}')
            big = Image.new('RGB', (A.shape[1] * 3, A.shape[0] * 3)); im = Image.fromarray(A.astype(np.uint8)).convert('RGB')
            for i in range(3):
                for j in range(3): big.paste(im, (i * A.shape[1], j * A.shape[0]))
            out = os.path.join(N, n + '_3x3_preview.jpg'); big.save(out, quality=88)
            print(f'      wrote {out} (look at it: the repeat must not be readable)')
    for g, start in BODY_START.items():
        top, body = os.path.join(N, f'{g}_ground_top_a.webp'), os.path.join(N, f'{g}_ground_body_a.webp')
        if os.path.exists(top) and os.path.exists(body):
            T, B = load(top), load(body)
            To, Bo = load(os.path.join(O, f'{g}_ground_top_a.webp')), load(os.path.join(O, f'{g}_ground_body_a.webp'))
            join = lambda T_, B_: float(np.abs(T_[start:start + 8, :, :3].reshape(-1, 3).mean(0) - B_[:8, :, :3].reshape(-1, 3).mean(0)).max())
            if T.shape[0] > start + 8:
                d, do = join(T, B), join(To, Bo)
                check(f'{g}: top strip row {start} meets body row 0', d <= max(3.0, do), f'difference {d:.1f} (original {do:.1f})')
            for side in ('left', 'right'):
                c = os.path.join(N, f'{g}_ground_cliff_{side}.webp')
                if os.path.exists(c):
                    def inner(C_, B_):
                        reg = C_[200:500, -30:] if side == 'left' else C_[200:500, :30]; m = reg[:, :, 3] > 128
                        return float(np.abs(reg[m][:, :3].mean(0) - B_[:, :, :3].reshape(-1, 3).mean(0)).max()) if m.any() else 99.0
                    d = inner(load(c), B); do = inner(load(os.path.join(O, f'{g}_ground_cliff_{side}.webp')), Bo)
                    check(f'{g}: cliff {side} inner 30px matches body', d <= max(3.0, do), f'difference {d:.1f} (original {do:.1f})')
    print(f'\n{sum(results)}/{len(results)} PASS' + ('' if all(results) else '  ->  NOT READY, fix every FAIL first'))
    sys.exit(0 if all(results) else 1)


main()
