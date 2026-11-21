# ART V2 pilot revision 1 — Claude handoff

Status: **UNAPPROVED TEST ASSETS**. Exactly the 8 originally delivered tiles are revised. The other 69 tiles are not made.

## Changes
- `forest_w1_compact_{left,fill_a,fill_b,right}`: rounded cap silhouette, painterly lumpy soil and warmer shadows, colors/textures sampled from the **approved forest_standard_candidate_A** rather than vertical stripes. Contact line **18px**.
- `spirit_lava_long_{left,mid_a,mid_b,right}`: large readable basalt facets sourced from the newly generated artwork, 2-3px warm rim at top, dark undersides and slightly chipped end caps; no luminous cracks. Contact line **6px**.
- Original output dimensions, names, manifest atlas rectangles and 1:1 rendering contract are unchanged.

## Verification
- Eight 1x RGBA PNG files + two 4x atlas sheets. See `04_specs_qa/ART_V2_PILOT_MANIFEST.json`.
- Seam maximum absolute RGBA difference across cap/mid/mid/cap: forest **0**, lava **0**.
- See `04_specs_qa/PILOT_RASTER_QA.json` for first 90%-opaque rows and exact dimensions. Contact placement is 18px/6px.
- Offline crop tables were computed from **revision 1 pixels**: `forest_w1_offline_crop_table.json` and `spirit_lava_offline_crop_table.json`.
- Forest assembled sample widths: 48,64,92,110,140px; lava: 313,548,690,745,1960px. Do not assume all partial crops are visually seam-free before testing exact widths in the renderer.
- Preview files include prior-vs-revised assets and original official game backgrounds with the original Dudu idle animation frame.

## Claude integration
1. Replace only the eight `01_tiles_1x/*.png` files from revision 1, **not** any other assets or gameplay code.
2. Replace the two atlas sheets and the full metadata/offline crop tables, as the pixel content has changed.
3. Apply 1:1 with no nonuniform scaling; preserve physics, original stage geometry, flag and NPC logic.
4. Run `tools/qa/art_inventory.py`, `art_prototype.py`, `art_physics_identity.py`, `art_file_open.py` plus the gameplay baseline comparison where available.
5. Confirm each platform's visible top aligns with Dudu foot within ±2px, especially 48px compact ends and lava long over 1,960px.
6. Open both `file://` and `http://` forms (never browser runtime `getImageData` on local file assets). Fail gracefully without crashing the game loop.
7. Do not merge with public `main` before user reviews the scenes.

The composite previews are still **static**; no in-game Playwright QA was performed by the asset artist.
