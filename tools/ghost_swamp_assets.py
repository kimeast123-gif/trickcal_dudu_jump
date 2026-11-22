"""World 4 (Ghost Swamp) asset converter.

    python tools/ghost_swamp_assets.py PACKAGE_DIR

PACKAGE_DIR is the unpacked DUDU_WORLD4_GHOST_SWAMP package (02_OFFICIAL_BACKGROUNDS, 03_NPC_MOTION_RAW).
Writes
  assets/world/ghostswamp/bg1..bg5.webp     the five official backgrounds (1280x820, unchanged size)
  assets/npc/ghostswamp/<key>.webp          one packed atlas per motion (every frame cropped to its own bounds)
  assets/npc/ghostswamp/atlas.js            frame rectangles, offsets from the feet and frame times, as a script
                                            (window.GS_ATLAS) so it also loads when index.html is opened as a file

Every GIF in the package is framed differently on its 1024x1024 canvas (the character is zoomed to fill it), so the
raw frames cannot be shown at one size. The black floor shadow under the feet is drawn at the same size relative to
the character in every motion, so its width gives each GIF's zoom: all frames are scaled so that the shadow is
SHADOW_GAME px wide in the game, and the centre of the shadow is the feet anchor. ShadyTwisted_Joke_2 is a close-up
with the feet cut off and no shadow; its zoom (head width compared with Idle) and feet point were measured by hand.
Atlases are stored at SUPER x the game size so they stay sharp on high-DPI screens.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageSequence

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHADOW_GAME = 52      # game px: width of the floor shadow (Rim then stands about 117px tall, Shady about 104px)
SUPER = 1.5           # atlas pixels per game px
MAX_W = 2048

# key: (gif name, None = measure the shadow, or (shadow width, feet x, feet y) measured by hand)
MOTIONS = {
    'rim_attack1': ('RimChaos_Attack1_1', None),
    'rim_attack2': ('RimChaos_Attack2_1', None),
    'rim_die':     ('RimChaos_Die', None),
    'rim_exp1':    ('RimChaos_Experience_1', (83, 786, 671)),   # the widest low run also catches the scythe
    'rim_move':    ('RimChaos_Move', None),
    'shady_exp1':  ('ShadyTwisted_Experience_1', None),
    'shady_idle':  ('ShadyTwisted_Idle', None),
    'shady_joke':  ('ShadyTwisted_Joke_2', (430, 706, 975)),
    'shady_move':  ('ShadyTwisted_Move', None),
}
# RimChaos_Experience_2 (88 frames, 6.2s) is not used by the World 4 spec, so it is not converted.


def frames_of(path):
    out = []
    for fr in ImageSequence.Iterator(Image.open(path)):
        out.append((fr.convert('RGBA').copy(), int(fr.info.get('duration', 66) or 66)))
    return out


def shadow_of(img):
    """(width, centre x, row) of the floor shadow: the widest run in the lowest 40 opaque rows of the first frame."""
    a = np.array(img)[:, :, 3] > 60
    rows = np.nonzero(a.any(1))[0]
    bot = int(rows.max())
    best = None
    for y in range(bot, bot - 40, -1):
        xs = np.nonzero(a[y])[0]
        if not len(xs):
            continue
        segs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
        s = max(segs, key=len)
        if best is None or len(s) > best[0]:
            best = (len(s), (int(s.min()) + int(s.max())) / 2, y)
    return best


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pkg = sys.argv[1]
    bg_src = os.path.join(pkg, '02_OFFICIAL_BACKGROUNDS')
    bg_out = os.path.join(ROOT, 'assets', 'world', 'ghostswamp'); os.makedirs(bg_out, exist_ok=True)
    names = sorted(f for f in os.listdir(bg_src) if f.lower().endswith('.png'))
    for f in names:
        n = f.split('_')[1]   # bg_1_swamp_mist.png -> 1
        Image.open(os.path.join(bg_src, f)).convert('RGB').save(os.path.join(bg_out, f'bg{n}.webp'), quality=86, method=6)
        print('bg', n, f)

    npc_out = os.path.join(ROOT, 'assets', 'npc', 'ghostswamp'); os.makedirs(npc_out, exist_ok=True)
    atlas = {'superSample': SUPER, 'shadowGame': SHADOW_GAME, 'motions': {}}
    for key, (gif, manual) in MOTIONS.items():
        frs = frames_of(os.path.join(pkg, '03_NPC_MOTION_RAW', gif + '.gif'))
        sw, fx, fy = manual or shadow_of(frs[0][0])
        s = SHADOW_GAME * SUPER / sw
        crops = []
        for img, dur in frs:
            sz = max(1, round(img.width * s))
            im = img.resize((sz, sz), Image.LANCZOS)
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb is None:
                crops.append((None, (0, 0, 0, 0), dur)); continue
            crops.append((im.crop(bb), bb, dur))
        # shelf packing
        x = y = rowh = 0; rects = []
        for c, bb, dur in crops:
            if c is None:
                rects.append(None); continue
            if x + c.width > MAX_W:
                x = 0; y += rowh + 2; rowh = 0
            rects.append((x, y)); x += c.width + 2; rowh = max(rowh, c.height)
        sheet = Image.new('RGBA', (MAX_W if y else max(1, x), y + rowh), (0, 0, 0, 0))
        frames = []
        for (c, bb, dur), r in zip(crops, rects):
            if c is None:
                frames.append([0, 0, 0, 0, 0, 0, dur]); continue
            sheet.paste(c, r)
            # offset of the crop's top-left from the feet, in game px
            ox = round((bb[0] - fx * s) / SUPER, 2); oy = round((bb[1] - fy * s) / SUPER, 2)
            frames.append([r[0], r[1], c.width, c.height, ox, oy, dur])
        sheet = sheet.crop((0, 0, max(fr[0] + fr[2] for fr in frames), sheet.height))
        sheet.save(os.path.join(npc_out, key + '.webp'), quality=88, method=6)
        atlas['motions'][key] = {'src': gif + '.gif', 'frames': frames, 'duration': sum(f[6] for f in frames), 'nativeFace': -1}
        print(f'{key:12s} {len(frames):3d} frames  shadow {sw:.0f}px  scale {s / SUPER:.3f}  sheet {sheet.size}')
    with open(os.path.join(npc_out, 'atlas.js'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('// generated by tools/ghost_swamp_assets.py\nwindow.GS_ATLAS = ' + json.dumps(atlas, separators=(',', ':')) + ';\n')


main()
