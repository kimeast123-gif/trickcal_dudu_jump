# Claude Code — ART V2 Batch 3 implementation / QA handoff

This archive contains **31 exact-size RGBA PNGs** in `01_tiles_1x/`. Ten new cave, twelve new snow, nine approved-image retouches. The original approved cave long image is unchanged.

1. Import assets into the test branch only. Replace 9 names exactly; do not regenerate the approved base artwork.
2. Read `04_specs_qa/ART_V2_BATCH3_MANIFEST.json` before any code edits. Respect contactY: cave tiny 2, floor 6; snow long 6, snow tiny 2, snow glow 6; forest ground top 25; lakeside long 6. Approved cave long contactY is 9 (display only).
3. Keep images at 1:1 scale. Preserve level geometry, physics, colliders, NPCs, checkpoint design, camera and UI.
4. Test all specified assembly widths and join tables (`*_offline_crop_table.json`); these crop positions are guides not guarantees of invisible fractional-width seams.
5. Reuse the approved cave long sprite untouched. Cave fog/visibility must still behave exactly as currently implemented.
6. Verify that snow glow slabs are slim and blue/darker than snow terrain and correctly fade in/out under existing gameplay logic.
7. Compare changes with `?artv2=0` and baseline `?arttest=0`, then screenshot the exact same game coordinates before and after in 1280×720 plus mobile landscape.
8. For forest transitions, check the top/body horizontal hairline at ground lengths 320, 520, 860, 1550. For lakeside ensure no solid box bottom is visible at 405 and 492.
9. Do not alter assets already accepted in batches 1 and 2 beyond these nine explicit replacements.
10. Run existing automated game QA and report exact changed filenames. No release/push without user approval.
