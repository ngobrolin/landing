---
name: podcast-shorts
description: "Use when preparing branded Ngobrolin podcast shorts."
---

# Podcast shorts

Project-local home for the Ngobrolin WEB short-video assets and emerging production workflow. This is a working skill scaffold, not a finished end-to-end video generator.

## When to use

Use for the show's short-video logo, design system, caption styling, portrait layouts, and future clipping/rendering work. Do not use this as authorization to publish, upload, change the website identity, or overwrite an existing video.

## Current state

Ivan approved the video-first logo and design-system direction. The existing navy, blue and orange palette and Archivo family remain. The symbol uses two overlapping speech bubbles.

The approved kit lives in [assets/brand-kit](assets/brand-kit/README.md):

- [DESIGN.md](assets/brand-kit/DESIGN.md): logo usage, typography, caption rules, portrait safe areas, layout and proposed motion.
- [tokens.json](assets/brand-kit/tokens.json): video geometry and motion values.
- [tokens.dtcg.json](assets/brand-kit/tokens.dtcg.json): portable design-token export.
- [index.html](assets/brand-kit/index.html): local review board with a safe-area toggle.
- [assets/](assets/brand-kit/assets/): outlined SVG logos, transparent PNGs, and static layout studies.
- [fonts/](assets/brand-kit/fonts/): Archivo fonts and their SIL Open Font License.
- [README.md](assets/brand-kit/README.md): asset inventory, verification notes and build prerequisites.

All paths above are relative to this skill folder. The website's root DESIGN.md remains authoritative for the website; the kit's DESIGN.md applies to video only.

## Working rules

1. Read the kit's DESIGN.md and inspect the relevant logo/layout before editing. Preserve approved identity decisions unless Ivan requests a change.
2. Handle video work directly in Rei's current Codex-backed session. Do not delegate to Rex or spawn additional coding agents unless Ivan explicitly asks.
3. Inspect the exact episode's full local transcript before recommending cuts. Treat auto-caption boundaries as candidates; inspect the source audio/video before editing.
4. Preserve original speech and source provenance. Caption corrections must not change meaning. Label static studies as studies, never as synchronized video previews.
5. Keep logo/design approval separate from production execution. Do not deploy the website, upload a short, commit, or push without the applicable request.
6. Keep temporary media and experiments outside the source tree. Preserve only deliberately selected assets in this skill folder, not dependency folders, duplicate archives, credentials, or full episode downloads.

## Verification

The preserved kit includes its authoring and browser-check scripts. Run them through the available terminal tool only when regeneration/checks are requested. From `assets/brand-kit/`:

```sh
uv run --no-project --with fonttools --with brotli --with pillow python build_brand.py
node verify.mjs
```

The builder uses the included source still and fonts. Browser checks use landing's installed Playwright and system Chrome. Inspect the resulting boards visually as well as checking execution success. A board render is not evidence that the proposed motion has been implemented.

## Not implemented yet

- Animated intro and outro.
- A reusable production video-shell renderer.
- Speaker-directed transitions or automatic speaker tracking.
- End-to-end clip extraction, caption alignment and export.
- A revised horse-analogy pilot using the approved kit.

Expand this scaffold as those stages are exercised. Do not document hypothetical commands as working capabilities.
