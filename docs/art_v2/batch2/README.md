# Dudu ART V2 — BATCH 2 (30 sprites)

Status: **ARTWORK READY / GAME QA AND USER APPROVAL PENDING**. No production code modified.

- Story Suin Forest: 20 separate PNGs recolored from **approved source images** while preserving the original artist-painted texture and silhouette. Daylight profile only.
- Forest cliff extension: 4 separate PNGs, each matches its approved cliff bottom edge and repeats vertically with no top ledge.
- Spirit mountain lakeside: 6 separate PNGs derived from a newly image-generated painterly stone reference. Contact + seamless boundaries calibrated offline.
- All files are exact 1× pixels with transparent RGBA; 4× sheets are **upscaled viewing/transfer atlases**, not independent 4× vector originals.
- All included preview composites contain original game backgrounds and original dudu sprite; these are static composites, not screenshots of a running game.
- The 4× atlas files should **not** be used in the game. Use `01_tiles_1x/` as masters.
- The `*_offline_crop_table.json` files describe suggested cut positions based on measured column differences, not a claim that all arbitrary-width seams are invisible.

## Mandatory Claude checks
1. Confirm names, exact widths, heights, contactY and hashes from `04_specs_qa/`.
2. Use 1:1 rendering. Preserve platform coordinates/colliders, physics, NPC, checkpoints, all UI.
3. Check the story forest 20 sprites in the same screen, ground top/body seam, cliff ext 159px join, long/narrow platforms. Check 330px, 900px, 1550px full grounds and 480px tall walls.
4. Check lakeside long 405/437/492px and the 138×1,384px rock wall for obvious repetitive patterns.
5. Inspect both 1280×720 official-background composites and real browser screenshots, PC and mobile.
6. Do NOT push before user approves. The cave and snow batch remains unmade.

## QA scope
Raster dimensions, alpha, contact and periodic edge identity checked by script. Visible pattern repetition, color fit, rock/soil seam, grounded character feet and gameplay collisions require live inspection.
