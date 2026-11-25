"""World 5 NPC motions from the user's packages:
5-1 Jade and Opal (DUDU_WORLD5_STAGE51_JADE_OPAL_MOTION_REV3_*, folder 03_NPC_MOTIONS) and
5-2 Rude (DUDU_WORLD5_STAGE52_RUDE_PINBALL_MOTION_REV2_*, folder assets/npc/rude) and
5-3 Kidian (DUDU_WORLD5_STAGE53_KIDIAN_CLAUDE_MASTER_REV2_*, folder 02_NPC_GIF) and
5-4 Ritz (DUDU_WORLD5_STAGE54_RITZ_TRAINING_CLAUDE_*, folder 02_RITZ_ANIMATIONS, files Leets_*).

    python tools/dragon_cave_motions.py <5-1 package> <5-2 package> <5-3 package> <5-4 package>

Reads the GIFs (1024x1024 each) and writes
  assets/npc/dragoncave/<key>.webp   one packed sheet per motion (every frame cropped to its own bounds)
  assets/npc/dragoncave/atlas.js     window.DC_ATLAS: frame rectangles, offsets from the feet and frame times
                                     (a script, not JSON, so it also loads when index.html is opened as a file)
Frame format is the same as World 4's atlas: [sheet x, sheet y, w, h, offset x from feet, offset y from feet, ms].

Sizes: the GIFs are not all framed alike. Jade's Move and Angry_2 share one zoom (her glasses are the same width in
both). Opal's Move is framed almost like her Happy and Sad close-ups (her head about 0.96 as wide, checked by drawing
all seven side by side in the game). Each character gets one game scale, Opal's Move that scale divided by 0.96.
Feet: Move has a floor shadow (its centre is the feet point); the close-ups have none, so their feet point is the
lowest opaque row and the middle of what is opaque in the last 25 rows of the first frame.
The Move shadow is erased (near-black pixels from 30px above its centre row down): the game draws one soft shadow
under every motion, so the shadow does not pop in and out when she stops.
Rude: Idle_1 and Happy_3 share one zoom; Happy_5 is framed a little wider (her head about 0.88 as wide), so it gets
the scale divided by 0.88.
Kidian's jump (user, v1.10.8): her 'skill 4' GIF (docs/world5/source/Kidian_Skill_4.gif, 800x800, 11 frames, a
whole leap with her moving about 600px inside the frame). Frames 0-1 are a black silhouette (an effect) and are not
used; 6-9 (landing crouch) are kidian_land. (2-5, the somersault, were kidian_jump until the user asked for the
flying pose instead, v1.10.9.) Her flight between take-off and landing is kidian_fly: the user's fly GIF
(docs/world5/source/Kidian_Fly.gif, 800x800, 3 frames, a level dive), pinned by the body's centre like the others. She stands about 406px tall in it, so
the scale is 115 / 406. The GIF's own rise and fall is taken out: every frame is pinned at its body (near-black
pixels are left out of the body and the floor shadow is erased): kidian_jump by the body's centre, kidian_land by
the bottom of the body, so in the game the jump follows the path Kidian is on.
Kidian: scales per motion in KIDIAN_SCALE (matched by eye in one lineup with Idle_2, see there). Move has a floor shadow.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageSequence

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPER = 1.5       # sheet pixels per game px (sharp on high-DPI screens)
MAX_W = 2048
JADE = 0.118      # game px per GIF px: Jade with horns about 120px tall (Mayo is drawn 129px)
OPAL = 0.119      # Opal's close-ups: about 120px tall with her umbrella
OPAL_MOVE_ZOOM = 0.96
RUDE = 0.132      # Rude with horns about 133px tall (she is the tallest of the three)
RUDE_HAPPY5_ZOOM = 0.88
KIDIAN = 0.113    # Kidian about 115px tall (as tall as Jade)
# v1.10.9 (user: Kidian changed size between standing, dancing, running, landing and flying, flying worst): each of
# her motions was drawn next to Idle_2 in one lineup and scaled until head and height read the same (the art draws
# her head smaller when she runs and her hair wider when she dances, so neither alone was enough). Game px per GIF px:
KIDIAN_SCALE = {'move': 0.120, 'dance': 0.107, 'fly': 0.160, 'land': 0.270}
# Ritz: Idle is framed much closer than the two attacks (her body is about 715 GIF px tall there, about 500 in
# Attack2_1 and about 420 in Attack1_1), so each gets its own scale for about 125px; checked side by side.
RITZ_SCALE = {'idle': 0.175, 'attack1': 0.30, 'attack2': 0.25}
S51, S52, S53, S54 = '03_NPC_MOTIONS', os.path.join('assets', 'npc', 'rude'), '02_NPC_GIF', '02_RITZ_ANIMATIONS'
# key: (package index, folder, gif, game px per GIF px)
MOTIONS = {
    'jade_move':   (0, S51, 'Jade_Move', JADE),
    'jade_angry':  (0, S51, 'Jade_Angry_2', JADE),
    'opal_move':   (0, S51, 'Opal_Move', OPAL / OPAL_MOVE_ZOOM),
    'opal_happy7': (0, S51, 'Opal_Happy_7', OPAL),
    'opal_happy8': (0, S51, 'Opal_Happy_8', OPAL),
    'opal_sad6':   (0, S51, 'Opal_Sad_6', OPAL),
    'opal_sad10':  (0, S51, 'Opal_Sad_10', OPAL),
    'rude_idle':   (1, S52, 'Rude_Idle_1', RUDE),
    'rude_happy3': (1, S52, 'Rude_Happy_3', RUDE),
    'rude_happy5': (1, S52, 'Rude_Happy_5', RUDE / RUDE_HAPPY5_ZOOM),
    'kidian_idle':   (2, S53, 'Kidian_Idle_2', KIDIAN),
    'kidian_move':   (2, S53, 'Kidian_Move', KIDIAN_SCALE['move']),
    'kidian_dance1': (2, S53, 'Kidian_Dance_1', KIDIAN_SCALE['dance']),
    'kidian_dance2': (2, S53, 'Kidian_Dance_2', KIDIAN_SCALE['dance']),
    'ritz_idle':     (3, S54, 'Leets_Idle', RITZ_SCALE['idle']),
    'ritz_attack1':  (3, S54, 'Leets_Attack1_1', RITZ_SCALE['attack1']),
    'ritz_attack2':  (3, S54, 'Leets_Attack2_1', RITZ_SCALE['attack2']),
}
# key: (repo file, frames used, scale, pin: 'centre' or 'bottom')
SINGLE = {
    'kidian_fly': ('docs/world5/source/Kidian_Fly.gif', [0, 1, 2], KIDIAN_SCALE['fly'], 'centre'),
    'kidian_land': ('docs/world5/source/Kidian_Skill_4.gif', [6, 7, 8, 9], KIDIAN_SCALE['land'], 'bottom'),
}
STAND_SRC = 406   # her standing height in that GIF, source px


def frames_of(path):
    return [(fr.convert('RGBA').copy(), int(fr.info.get('duration', 33) or 33)) for fr in ImageSequence.Iterator(Image.open(path))]


def shadow_of(img):
    """(centre x, row) of the floor shadow: a wide near-black run low in the frame, or None."""
    a = np.array(img)
    dark = (a[:, :, 3] > 60) & (a[:, :, :3].max(2) < 50)
    best = None
    for y in range(a.shape[0] - 1, a.shape[0] // 2, -1):
        xs = np.nonzero(dark[y])[0]
        if len(xs) > 150 and (best is None or len(xs) > best[0]):
            best = (len(xs), (int(xs.min()) + int(xs.max())) / 2, y)
    return None if best is None else best[1:]


def feet_of(frs):
    sh = shadow_of(frs[0][0])
    if sh:
        return sh
    lows = []
    for img, _ in frs:
        rows = np.nonzero((np.array(img)[:, :, 3] > 60).any(1))[0]
        lows.append(int(rows.max()))
    fy = max(lows)
    a = np.array(frs[0][0])[:, :, 3] > 60
    ys, xs = np.nonzero(a[fy - 25:fy + 1])
    return ((int(xs.min()) + int(xs.max())) / 2, fy)


def pinned_frames(path, use, pin):
    """Frames of a GIF with a feet point per frame, pinned to the body (see the module notes)."""
    frs = frames_of(os.path.join(ROOT, path))
    frs = [frs[i] for i in use]
    feet = []
    for img, _ in frs:
        a = np.array(img)
        op = a[:, :, 3] > 60
        body = op & (a[:, :, :3].max(2) >= 40)
        ys, xs = np.nonzero(body)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        below = a[y1 + 3:]
        below[(below[:, :, 3] > 0) & (below[:, :, :3].max(2) < 50)] = 0   # the floor shadow
        a[y1 + 3:] = below
        img.paste(Image.fromarray(a))
        cx = (x0 + x1) / 2
        feet.append((cx, (y0 + y1) / 2 + STAND_SRC / 2) if pin == 'centre' else (cx, y1))
    return frs, feet


def main(pkgs):
    out = os.path.join(ROOT, 'assets', 'npc', 'dragoncave')
    os.makedirs(out, exist_ok=True)
    atlas = {'superSample': SUPER, 'motions': {}}
    jobs = [(k, *v) for k, v in MOTIONS.items()] + [(k, None, None, path, scale, (use, pin)) for k, (path, use, scale, pin) in SINGLE.items()]
    for key, pi, folder, gif, scale, *single in jobs:
        if pi is None:
            frs, feet = pinned_frames(gif, *single[0])
            fx, fy = feet[0]
        else:
            frs = frames_of(os.path.join(pkgs[pi], folder, gif + '.gif'))
            fx, fy = feet_of(frs)
            if shadow_of(frs[0][0]):
                for img, _ in frs:
                    a = np.array(img)
                    low = a[int(fy) - 30:]
                    dark = (low[:, :, 3] > 0) & (low[:, :, :3].max(2) < 50)
                    low[dark] = 0
                    a[int(fy) - 30:] = low
                    img.paste(Image.fromarray(a))
            feet = [(fx, fy)] * len(frs)
        s = scale * SUPER
        crops = []
        for img, dur in frs:
            sz = max(1, round(img.width * s))
            im = img.resize((sz, sz), Image.LANCZOS)
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            crops.append((im.crop(bb), bb, dur) if bb else (None, (0, 0, 0, 0), dur))
        x = y = rowh = 0
        rects = []
        for c, bb, dur in crops:
            if c is None:
                rects.append(None); continue
            if x + c.width > MAX_W:
                x = 0; y += rowh + 2; rowh = 0
            rects.append((x, y)); x += c.width + 2; rowh = max(rowh, c.height)
        sheet = Image.new('RGBA', (MAX_W if y else max(1, x), y + rowh), (0, 0, 0, 0))
        frames = []
        for (c, bb, dur), r, (fx, fy) in zip(crops, rects, feet):
            if c is None:
                frames.append([0, 0, 0, 0, 0, 0, dur]); continue
            sheet.paste(c, r)
            frames.append([r[0], r[1], c.width, c.height, round((bb[0] - fx * s) / SUPER, 2), round((bb[1] - fy * s) / SUPER, 2), dur])
        sheet = sheet.crop((0, 0, max(f[0] + f[2] for f in frames), sheet.height))
        sheet.save(os.path.join(out, key + '.webp'), quality=88, method=6)
        atlas['motions'][key] = {'src': os.path.basename(gif) if pi is None else gif + '.gif', 'frames': frames, 'duration': sum(f[6] for f in frames), 'nativeFace': -1}
        h = max(-f[5] for f in frames if f[2])
        print(f'{key:12s} {len(frames):3d} frames {sum(f[6] for f in frames):5d}ms  feet ({fx:.0f},{fy:.0f})  height {h:.0f}px  sheet {sheet.size}')
    with open(os.path.join(out, 'atlas.js'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('// generated by tools/dragon_cave_motions.py\nwindow.DC_ATLAS = ' + json.dumps(atlas, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    if len(sys.argv) < 5:
        sys.exit(__doc__)
    main(sys.argv[1:5])
