# DUDU ART V2 — Batch 3 (Final art batch: 31 PNGs)

**Status:** Artwork prepared for Claude Code game integration and user visual approval. The published game has NOT been changed.

- 10 new cave assets (`spirit_cave_*`): tiny 4, cave floor 3, wall tile and side trims 3.
- 12 new snow assets (`spirit_snow_*`): long 4, tiny 4, glow/blinking ice 4.
- 9 replacement assets: forest ground top 6 (soil transition only), lakeside long 3 (lower contour only).
- Existing long cave candidate A is deliberately not modified; use its display contactY=9 as specified by Claude.
- Game sprites and background are the real source assets for 1280×720 **static mockup** previews. These are not real gameplay captures.

## Deliverable folders
- `01_tiles_1x/` exact RGBA PNG masters, each at final 1:1 pixel resolution.
- `02_atlases_4x/` preview/transfer sheets enlarged 4× by nearest neighbor, NOT independently painted high-res masters.
- `03_previews/` assembled widths, wall stacks, cave darkness mask, snow scene, retouch before/after.
- `04_specs_qa/` manifest, dimensions, contact, seam audit, crop recommendations, SHA-256.

## Integration rules
- 1:1 rendering; preserve all existing stage coordinates/collision, character scale, UI, camera, checkpoints.
- No new cave long; reuse approved cave_standard_candidate_A.png with display contactY=9.
- No glow timer overlay, roof tile, wind FX or extra UI created.
- Verify the white snow backdrop does not erase thin snowy tops; blinking ice must remain darker than white background.
- Open the rendered cave route with its actual radial darkness mask; the included synthetic radius 210px, outside 92% dark composite is a preview only.
- Inspect long platform at 1371px and floor at 1908px for repeats; trim tiles for joins carefully using offline crop guidance.
- Retouch source style is preserved in the six forest and three lakeside approved sprites outside specifically allowed regions.
- Inspect cave floor, cave wall, snow in the actual browser on both PC and mobile.
- Do NOT deploy until all scope areas show 100% V2 coverage and pass visual approval.

**QA limitations:** Exact dimensions, alpha, contact rows and edge identity can be checked mechanically. A 0-RGBA boundary difference cannot guarantee invisible interior repetition or satisfying art direction. Cropped arbitrary widths can still show seams. Real gameplay physics and mobile perf are not checked by this raster package.
