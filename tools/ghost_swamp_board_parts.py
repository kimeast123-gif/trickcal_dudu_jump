"""World 4 (Ghost Swamp) ledge parts from the user's 「DUDU ART V2 Ghost Swamp Platform Atlas」 board.

    python tools/ghost_swamp_board_parts.py BOARD_IMAGE [OLD_SHEETS_DIR]

BOARD_IMAGE is the transparent 1448x1086 board (five families of left end / middle tile / right end / thin float /
medium float, three blink states, two wall blockers). Writes
  assets/terrain/ghost_swamp/<family>_<part>.webp    one file per part, scaled by SCALE (same factor both ways)
  assets/terrain/ghost_swamp/parts.js                window.GS_PARTS: per family and part [width, height, surface row]
Families: swamp (①), sinking (②), manor (③), rotten (④), void (⑤ Ghostly Dream), blink, blocker, and swamp_night /
sinking_night (① and ② darkened for 유령늪 3 after the rescue).

OLD_SHEETS_DIR (optional): the folder with the earlier sheets (ghost_swamp_swamp_old_REJECTED.png,
ghost_swamp_antique_old_REJECTED.png, ghost_swamp_ruins_old_REJECTED.png). Only their upright wooden posts are taken,
at full size, as post_swamp / post_manor / post_rotten: the user asked for those wall posts back (v1.9) instead of
the board's blocker. Nothing else from those sheets is used.

Each part is cut by its own outline (alpha), cleared of colour in nearly transparent pixels, and scaled with
premultiplied alpha. The middle tiles lose 2 source px on each side so their rounded edge pixels do not show as
seams when they are repeated; the walking surface row is the 60th percentile of each column's first solid row over
the middle 70% (grass blades sticking up are ignored).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'terrain', 'ghost_swamp')
SCALE = 0.5
# family -> part -> a point inside the part on the board (columns: left, middle, right, thin, medium)
COLS = {'left': 400, 'mid': 630, 'right': 868, 'small': 1092, 'medium': 1308}
ROWS = {'swamp': 200, 'sinking': 365, 'manor': 525, 'rotten': 690, 'void': 840}
EXTRA = {('blink', 'on'): (400, 1002), ('blink', 'dim'): (818, 1002), ('blocker', 'stone'): (1237, 1000), ('blocker', 'earth'): (1349, 1000)}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    a = np.array(Image.open(sys.argv[1]).convert('RGBA'))
    a[a[:, :, 3] < 8] = 0
    lab, _ = ndimage.label(ndimage.binary_dilation(a[:, :, 3] > 40, iterations=3))
    objs = ndimage.find_objects(lab)
    os.makedirs(OUT, exist_ok=True)
    table = {}

    def cut(fam, part, px, py, trim=0):
        k = lab[py, px]
        assert k > 0, (fam, part)
        sl = objs[k - 1]
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start + trim, sl[1].stop - trim
        piece = a[y0:y1, x0:x1].copy()
        piece[lab[y0:y1, x0:x1] != k] = 0               # only this part, not a neighbour inside the box
        solid = piece[:, :, 3] > 200
        w = x1 - x0
        rows = [int(np.argmax(solid[:, c])) for c in range(int(w * 0.15), int(w * 0.85)) if solid[:, c].any()]
        surf = int(np.percentile(rows, 60)) if rows else 0
        im = Image.fromarray(piece, 'RGBA')
        size = (max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE)))
        small = im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
        return small, round(surf * SCALE)

    for fam, py in ROWS.items():
        for part, px in COLS.items():
            small, surf = cut(fam, part, px, py, trim=2 if part == 'mid' else 0)
            small.save(os.path.join(OUT, f'{fam}_{part}.webp'), quality=90, method=6)
            table.setdefault(fam, {})[part] = [small.width, small.height, surf]
            if fam in ('swamp', 'sinking'):
                n = np.array(small).astype(float)
                n[:, :, 0] *= 0.60; n[:, :, 1] *= 0.64; n[:, :, 2] = n[:, :, 2] * 0.72 + 10
                Image.fromarray(np.clip(n, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'{fam}_night_{part}.webp'), quality=90, method=6)
                table.setdefault(fam + '_night', {})[part] = [small.width, small.height, surf]
    for (fam, part), (px, py) in EXTRA.items():
        small, surf = cut(fam, part, px, py)
        small.save(os.path.join(OUT, f'{fam}_{part}.webp'), quality=90, method=6)
        table.setdefault(fam, {})[part] = [small.width, small.height, surf]
    if len(sys.argv) > 2:
        posts = {'swamp': ('ghost_swamp_swamp_old_REJECTED.png', 1214, 795), 'manor': ('ghost_swamp_antique_old_REJECTED.png', 1202, 845),
                 'rotten': ('ghost_swamp_ruins_old_REJECTED.png', 1229, 842)}
        for name, (fname, px, py) in posts.items():
            b = np.array(Image.open(os.path.join(sys.argv[2], fname)).convert('RGBA'))
            b[b[:, :, 3] < 8] = 0
            lb, _ = ndimage.label(ndimage.binary_dilation(b[:, :, 3] > 40, iterations=3))
            k = lb[py, px]
            assert k > 0, name
            sl = ndimage.find_objects(lb)[k - 1]
            piece = b[sl[0], sl[1]].copy()
            piece[lb[sl[0], sl[1]] != k] = 0
            Image.fromarray(piece, 'RGBA').save(os.path.join(OUT, f'post_{name}.webp'), quality=90, method=6)
            table.setdefault('post', {})[name] = [piece.shape[1], piece.shape[0], 0]
    with open(os.path.join(OUT, 'parts.js'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('// generated by tools/ghost_swamp_board_parts.py: [width, height, walking surface row]\n')
        fh.write('window.GS_PARTS = ' + json.dumps(table, separators=(',', ':')) + ';\n')
    for fam, parts in table.items():
        print(fam, parts)


main()
