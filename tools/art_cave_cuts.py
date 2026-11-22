"""Seam table of the cave long ledge (CAVE_CUTS in tools/terrain_art_build.py).

    python tools/art_cave_cuts.py          # prints the JS array; paste over CAVE_CUTS in tools/terrain_art_build.py, then rebuild

The cave candidate is 3-sliced: caps [0,44) and [438,482), repeatable middle [44,438) (394px). When a ledge's middle
needs rem = 1..393 px on top of whole copies, the drawer copies [44, cut) then [cut+skip, 438) with skip = 394-rem.
This picks, for every rem, the cut whose two neighbouring columns match best (colour over opaque rows + 3 x the
difference of the bottom outline). Done offline because reading pixels in the browser (getImageData) throws when the
game is opened as a local file (file://), and that exception stopped the game loop (fixed 2026-11-22).
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
C = np.asarray(Image.open(os.path.join(ROOT, 'assets/terrain/spirit_cave/spirit_cave_long.png')).convert('RGBA')).astype(int)
H, W = C.shape[:2]
CAP, M0, M1 = 44, 44, W - 44
P = M1 - M0
bottom = np.zeros(W, dtype=int)
for x in range(W):
    ys = np.where(C[:, x, 3] > 128)[0]
    bottom[x] = ys.max() if len(ys) else 0


def coldiff(i, j):
    a, b = C[:, i], C[:, j]
    m = (a[:, 3] > 200) & (b[:, 3] > 200)
    d = np.abs(a[m, :3] - b[m, :3]).mean() if m.any() else 255.0
    return d + 3 * abs(int(bottom[i]) - int(bottom[j]))


cuts = [0]
for rem in range(1, P):
    skip = P - rem
    best, bd = M0 + 1, float('inf')
    for c in range(M0 + 1, M1 - skip):
        d = coldiff(c - 1, c + skip)
        if d < bd:
            bd, best = d, c
    cuts.append(best)
print('const CAVE_CUTS = [' + ','.join(map(str, cuts)) + '];')
