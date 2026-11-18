# Ngobrolin WEB video identity, proposal v1

A video-first extension of the existing navy, blue and orange identity. Visual direction approved by Ivan; video implementation remains pending. Website and original pilot video are unchanged.

## Review

Open `index.html` in Chrome. It runs locally without installation or a server. The safe-area button shows the production text-safe region. See `logo-board.png` and `design-system-board.png` for shareable previews.

## Assets

`assets/` contains outlined SVG logos and transparent PNG equivalents:

- Horizontal wordmark: dark/light and monochrome dark/light.
- Stacked wordmark: dark/light.
- Compact symbol: full-colour and monochrome dark/light.

A dark suffix means intended for a dark background, with light ink. A light suffix means intended for a light background, with navy ink. SVG letters are paths, not font-dependent text. Monochrome symbols use transparent cutouts.

## System

- `DESIGN.md`: tokens and usage rules for logo, colour, typography, captions, safe areas, layouts, and future motion.
- `tokens.json`: video-specific geometry and motion values for a future renderer.
- `tokens.dtcg.json`: W3C DTCG export of the normative DESIGN.md tokens.
- `fonts/`: original Archivo variable WOFF2, static TTF instances, and SIL Open Font License.
- `asset-provenance.json`: origin of the podcast still and authored layout studies.
- `browser-verification.json`: actual desktop/mobile checks.

The layout PNGs are static style studies using a real frame from https://www.youtube.com/watch?v=kyzTP34JNao . The displayed caption copy is illustrative. They are not new cuts or synchronized video previews. The shot's native crop limits remain; this kit does not fabricate missing camera coverage.

## Scope left for the next phase

Animated intro/outro, a production shell renderer, speaker-directed cuts, and a revised horse-analogy pilot. The motion timings in DESIGN.md are specifications, not a claim that animations have been built.

## Verification

DESIGN.md CLI lint: zero errors and zero warnings. Chrome checks: images/fonts loaded, no page errors, no horizontal overflow at 1440 px and 390 px, safe-area toggle works. Final review-board stills inspected by Rei. Mechanical review found undersized mobile swatch labels and a skipped heading; both were corrected. Remaining design-detector advisories concern the HTML review page's presentation typography and control styles, distinct from the 1080×1920 video tokens. No independent agent was used.

`build_brand.py` regenerates the vector logos and static layout studies from the included font and source still. It requires no network access or machine-specific paths. Run it with `uv run --no-project --with fonttools --with brotli --with pillow python build_brand.py`. `verify.mjs` locates this checkout's installed Playwright and uses system Chrome; run `node verify.mjs`. The ready-to-use SVGs, PNGs, fonts, docs and HTML need no build step.

No trademark/similarity clearance has been performed. Approving this direction does not authorize a website deployment or public upload.
