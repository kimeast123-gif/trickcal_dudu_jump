# DUDU ART V2 — Remaining 69 / Batch 1 — Art handoff

**Scope of this package:** 21 NEW one-to-one RGBA PNGs: 14 forest World1 ground / walls / support, and 7 lava glow / walls. Remaining 48 items are NOT made yet because the instruction explicitly requires in-game QA approval between batches.

Sources: approved REV1 pilot tiles, approved Forest A candidate, newly generated painterly soil/basalt art, supplied original World1 forest/lava backgrounds, actual Dudu idle sprite.

**No game code, player, physics or original game assets were modified.** `03_previews/*official_background*` are static composite proposals, not gameplay screenshots. Game QA pending Claude Code.

## Exact named files

- forest_w1_ground_top_a — 130×95, contactY 25
- forest_w1_ground_top_b — 130×95, contactY 25
- forest_w1_ground_top_c — 130×95, contactY 25
- forest_w1_ground_body_a — 151×86, contactY N/A
- forest_w1_ground_body_b — 151×86, contactY N/A
- forest_w1_ground_cliff_left — 81×159, contactY 25
- forest_w1_ground_cliff_right — 81×159, contactY 25
- forest_w1_wall_top — 96×24, contactY 6
- forest_w1_wall_body — 96×128, contactY N/A
- forest_w1_wall_edge_left — 8×128, contactY N/A
- forest_w1_wall_edge_right — 8×128, contactY N/A
- forest_w1_under_support — 128×44, contactY N/A
- forest_w1_under_support_end_left — 24×44, contactY N/A
- forest_w1_under_support_end_right — 24×44, contactY N/A
- spirit_lava_glow_left — 24×34, contactY 2
- spirit_lava_glow_fill_a — 24×34, contactY 2
- spirit_lava_glow_fill_b — 24×34, contactY 2
- spirit_lava_glow_right — 24×34, contactY 2
- spirit_lava_wall_tile — 128×192, contactY N/A
- spirit_lava_wall_edge_left — 10×192, contactY N/A
- spirit_lava_wall_edge_right — 10×192, contactY N/A

## QA files

- `BATCH1_RASTER_QA.json`: pixel dimensions, top contact scan, repeat seam deltas.
- `ART_V2_BATCH1_MANIFEST.json/csv`: image names, size, contactY, repetition behavior, positions in sheets.
- `SHA256_MANIFEST.txt`: exact asset hashes.
- `*_offline_crop_table.json`: assembly widths and last-to-right join measurements; if a nonzero crop mismatch is visible, regenerate a shape-matched cut position offline. **Do NOT call `getImageData()` at runtime**.
- `periodic_tile_crop_rules.json`: repeat and partial-crop rules for large ground/wall texture tiles.

## Additional visual gate checks for Claude

1. Ground-top and cliff edges should be viewed together on representative real-world stage ground widths; bottom body layer may need placement-specific offsets with the current renderer.
2. All wall faces and the support underside must remain visibly non-walkable (no turf cap).
3. The new lava glow sprite is a drawn ON state only. OFF/ghost/warning are existing render behavior; do not introduce a timer/arrow layer.
4. No lava roof tile. Preserve fall-through hazard space above Ifrit's hall.
5. Check pixel seam and tiling for widths 320, 520, 860; 520, 1320; 83,120,188; high vertical walls 128×192 periodic repeat.
6. Validate visuals at 1280×720 and mobile wide-screen; sprite foot should align with drawn top to <=2px.
7. `file://` browser path must work (v1 prototype crashed on runtime pixel reads).
8. Test art-prototype mode vs old with same game coordinate and frame. Do not merge main until approval.

## Next stage

Wait for visual acceptance of this Batch 1 package (21 tiles). Then work on Batch 2: story forest 20 + spirit lake 6. Batch 3: cave 10 + snow 12.
