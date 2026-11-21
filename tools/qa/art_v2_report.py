"""Art phase 2, step P2-A: build ART_V2_RENDER_COVERAGE.csv and coverage numbers from the raw capture.

    python tools/qa/art_v2_coverage.py   # capture (browser)
    python tools/qa/art_v2_report.py     # this: docs/art_v2/ART_V2_RENDER_COVERAGE.csv + coverage summary
"""
import collections, csv, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'docs', 'art_v2')
raw = json.load(open(os.path.join(D, 'art_v2_coverage_raw.json'), encoding='utf-8'))
off = {(r['stage'], r['id'], r['x'], r['y']): r for r in raw['proto_off']}

# spirit walls and pillars: the art zone comes from smWallZone (spirit-mountain.js), not from the id prefix
WALL_ZONE = {'SM-MW1': 'out', 'SM-MW2': 'cave', 'SM-MW3': 'lava', 'SM-MW4': 'lava', 'SM-B6': 'lava'}


def family(r):
    if r['stage'] == 'story_forest': return 'forest_story'
    if r['stage'] in ('world1_1', 'world1_2', 'world1_3', 'world1_4'): return 'forest_world1'
    if r['stage'] == 'world1_5': return 'village_world1 (out of scope)'
    if r['id'] in WALL_ZONE: return 'spirit_' + WALL_ZONE[r['id']]
    if r['kind'] in ('sm:pillar',) or r['id'].startswith('SM-B'): return 'spirit_cave'
    if r['kind'] == 'sm:roof': return 'spirit_lava'
    return 'spirit_' + (r['zone'] or 'none')


def kind_of(r):
    k = r['kind']
    if k.startswith('sm:'):
        s = k[3:]
        if s == 'blink': return 'blink'
        if s in ('rock',): return 'outer_wall'
        if s in ('pillar', 'floor', 'roof'): return s
        return 'micro_or_small' if r['w'] < 120 else 'long'
    if k == 'thin':
        if r['blink']: return 'blink'
        w = r['w']
        if w < 117: return 'micro'
        if w <= 184: return 'small'
        if 200 <= w <= 308 and r['stage'].startswith('world1'): return 'medium'
        return 'long'
    return k   # ground / wall / ceiling


def branch(r, imgs):
    names = ' '.join(imgs)
    if r['proto']: return 'art-prototype ' + ('drawForest' if 'forest' in names else 'drawCave')
    c = '+'.join(r['calls']) or 'drawPlatform'
    if 'single_small' in names: c += ' [single_small]'
    elif 'single_medium' in names: c += ' [single_medium]'
    elif 'left.webp' in names and r['kind'] == 'thin': c += ' [module plan]'
    return c


def proposed(fam, kind, r):
    z = fam.replace('spirit_', '').replace('forest_story', 'forest').replace('forest_world1', 'forest')
    if fam.startswith('village'): return '(out of scope)'
    if kind == 'roof': return '(not drawn by design: open drop above the lava hall)'
    m = {'long': f'{z}_long_left|{z}_long_mid|{z}_long_right', 'medium': f'{z}_medium_single', 'small': f'{z}_small_single',
         'micro': f'{z}_micro', 'micro_or_small': f'{z}_tiny', 'blink': f'{z}_glow_on|{z}_glow_warn|{z}_glow_off',
         'ground': f'{z}_ground_top|{z}_ground_body|{z}_ground_cliff_left|{z}_ground_cliff_right',
         'wall': f'{z}_wall' + ('|forest_under_support' if 'UNDER' in r['id'] else ''), 'ceiling': f'{z}_wall (ceiling slab)',
         'outer_wall': f'{z}_outer_wall', 'pillar': f'{z}_pillar', 'floor': f'{z}_floor'}
    return m.get(kind, '?')


rows = []
for r in raw['proto_on']:
    o = off.get((r['stage'], r['id'], r['x'], r['y']), r)
    imgs_on = sorted(set(i['src'] for i in r['imgs']))
    imgs_off = sorted(set(i['src'] for i in o['imgs']))
    fam = family(r); kind = kind_of(r)
    scales = sorted(set((i['sx'], i['sy']) for i in r['imgs']))
    uneven = any(abs(sx - sy) > 0.02 for sx, sy in scales)
    if fam.startswith('village'): status = 'EXPLICITLY_EXEMPT'; why = 'World1 1-5 is the village, not 수인숲 (directive scope 1-1..1-4)'
    elif kind == 'roof': status = 'EXPLICITLY_EXEMPT'; why = 'roof is never drawn (open fall zone, directive 2.2 / 4.4)'
    elif r['proto']: status = 'PROTOTYPE'; why = 'v1.1 candidate (not final family)'
    else: status = 'OLD_ONLY'; why = ''
    procedural = (r['prim'] > 0 and not imgs_on) or 'CANVAS' in ' '.join(imgs_on)
    rows.append({
        'stage_id': r['stage'], 'zone': fam, 'platform_id': r['id'], 'object_kind': kind,
        'world_x': r['x'], 'world_y': r['y'], 'width': r['w'], 'height': r['h'],
        'collidable': int(r['collidable']), 'blink': int(r['blink']), 'moving': int(r['moving']), 'no_top_land': int(r['noTopLand']),
        'renderer_branch': branch(r, imgs_on), 'old_art_key': ' '.join(imgs_off) or ('(canvas-painted)' if o['prim'] else '(none)'),
        'current_art_key': ' '.join(imgs_on) or ('(canvas-painted)' if r['prim'] else '(none)'),
        'proposed_art_key': proposed(fam, kind, r), 'art_family': fam,
        'visual_contact_y': '', 'draw_scale_xy': ' '.join(f'{sx}x{sy}' for sx, sy in scales),
        'uneven_scale': int(uneven), 'procedural': int(procedural),
        'source_status': status, 'qa_status': 'P2-A listed', 'note': why,
    })

with open(os.path.join(D, 'ART_V2_RENDER_COVERAGE.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

# coverage per family and per kind (on-screen objects in scope, roof and village exempt)
cov = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0]))
for r in rows:
    if r['source_status'] == 'EXPLICITLY_EXEMPT': continue
    c = cov[r['art_family']][r['object_kind']]
    c[1] += 1
    if r['source_status'] in ('V2_CANDIDATE', 'V2_APPROVED'): c[0] += 1
summary = {f: {k: v for k, v in ks.items()} for f, ks in cov.items()}
proto = collections.Counter(r['art_family'] for r in rows if r['source_status'] == 'PROTOTYPE')
json.dump({'v2_coverage': summary, 'prototype_counts': proto, 'rows': len(rows),
           'uneven_scale_rows': [r['platform_id'] for r in rows if r['uneven_scale']]},
          open(os.path.join(D, 'art_v2_coverage_summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for f, ks in summary.items():
    tot = sum(v[1] for v in ks.values())
    print(f'{f}: {tot} objects in scope, V2 0/{tot}, prototype {proto.get(f, 0)}  ' + ', '.join(f'{k} {v[1]}' for k, v in sorted(ks.items())))
print('uneven scale:', sum(r['uneven_scale'] for r in rows), 'rows; procedural:', sum(r['procedural'] for r in rows))
