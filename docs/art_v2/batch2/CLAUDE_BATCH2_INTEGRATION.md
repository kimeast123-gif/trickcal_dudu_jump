# Claude Code — ART V2 Batch 2 apply / QA

**Scope:** 30 PNGs, `forest_story` (20), `forest_w1 + forest_story cliff extensions` (4), `spirit_out` (6). References are approved W1 rev2 and rev1 and user brief. **Do not change any approved prior assets.**

1. Work on `art-unification-phase2` only. Do not change deployed `main`.
2. Read manifest / crop tables and ensure every file has correct SHA, size, contactY, RGBA.
3. Integrate display-only sprites in renderer, no level coordinates/physics/collision changes, no extra labels/decoration/UI.
4. New cliff extension after original 159px end; exact top/bottom seam must match at both left/right. Mask exterior by alpha silhouette, never show a rectangular cut on the outside.
5. Retain `?artv2=0` / `?arttest=0` A/B comparison. Run full frame before/after screenshots plus Windows file:// loading.
6. Validate 100% replacement coverage for story forest, spirit_out; no older skins visible in either screen.
7. Ground tops join bodies without visible dark seam in arbitrary-width arrangement; validate 2×3 body repeat for visible grid.
8. Lakeside rock wall is a seamlessly tiled *painted face*, not a climbable platform cap. Visually check 1,384px high repeats and continuity with wall edges.
9. Report every defect with before/after game captures; no GitHub push until reviewed.

ContactY story long=21, compact=18, ground top/cliff=25, wall top=6; lakeside long=6. Ext/body/rock wall have no contactY.

**Potential discrepancy:** The original approved forest candidate has first 90%-opaque top row at y22, whereas metadata asks for y21. This batch adjusted the story copies' contact row to y21, but exact gameplay screenshots remain necessary.
