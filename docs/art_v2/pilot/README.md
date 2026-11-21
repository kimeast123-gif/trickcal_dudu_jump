# Dudu ART V2 — Pilot asset delivery (NOT approved)

Scope: two **pilot** kits only, as required by GPT_ASSET_BRIEF.md §7.

## Files
- `01_tiles_1x/` — 8 individual RGBA PNG parts at exact in-game pixel size.
- `02_atlases_4x/` — 2 transparent packed 4× image sheets derived by integer magnification of the exact 1x tiles. Tile locations in manifest; 64px transparent gaps.
- `03_previews/` — assembly width examples and static 1280×720 composites using the original shipped Dudu sprite + backgrounds. These are *not* screenshots of a playable build.
- `04_specs_qa/` — per-part `contactY` + placement coordinates, automated alpha and edge check results, Claude implementation notes.

## Contact lines / sizes
Forest compact: left 24×64, fills A/B 16×64, right 24×64; contactY=18.
Lava long: left 44×74, mids A/B 394×74, right 44×74; contactY=6.

Important: The supplied lava prototype uses a **new matte basalt material**; it is intentionally not a tinted version of the forest. Its orange is reserved as a very subtle edge warmth, with no glow cracks or symbols.

**Approval status: visual prototype only.** Claude must confirm contact ±2px, arbitrary width seam, code-side crop choices, `file://` behavior, rendering on actual devices, and regression equality before integration. Do NOT merge or deploy until the art direction is accepted.

## Implementation details
1. Extract 1× files directly without scaling (or use the 4× atlas and downsample with NEAREST to preserve pixel identity).
2. Preserve collision `platform.y`, game physics, NPC sizes, checkpoints, UI.
3. For forest widths W=48..140: left cap 24, right cap 24, repeat/crop 16px fills across `W-48`. For very short W=48 the two caps join directly. **No need to use existing `single_small` or `single_medium`.**
4. For lava long widths W=313..1960: left cap 44, right cap 44, repeat/crop mid pieces across `W-88`. If existing renderer provides 6px visual overshoot, apply W to the *actual rendered picture width*, not raw collision width.
5. Source sprite's contactY aligns with the *existing physical feet y*. The top is drawn at `platform.y - contactY` in screen coordinates. Do not move collision Y.
6. If cutting incomplete mid tiles, compute an **offline** cut table using a seam-search method and include it as deterministic data. Never use canvas getImageData or runtime pixel reads: file:// environments fail.
7. Keep `?arttest=0` comparison mechanism until acceptance, and verify *no old tiles in the two pilot target groups*.
8. No art of the lava hall ceiling; it must remain an open falling gap.

## Limitations
Automated seam JSON only compares full module boundary pixels. Arbitrary-width crop seams require the actual renderer (which may crop at varying source columns) and visual inspection; native test bands are included as *reference assembly logic*, not proof of all game widths. The prototype still requires art approval before the other 69 assets are produced.

**Quick Claude handoff:** read `CLAUDE_PILOT_INTEGRATION.md` before importing the tiles.
