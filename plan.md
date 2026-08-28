# Ngobrolin WEB - Project Plan

This file records only what nothing else in the repo does: ideas not yet built,
and decisions taken not to build something. Everything else lives elsewhere and
is kept current there, so it is not repeated here.

- **What the site does, how to run it, and every script** (`dev`, `build`, the
  test runners, the three `transcribe*` generators and when to use each) —
  see [`README.md`](README.md).
- **Architecture, pipelines and the rules behind them** (episode sync,
  transcription defaults, summaries, the palette, the podcast feed) — see
  [`AGENTS.md`](AGENTS.md).

If something here contradicts either of those files, this file is the one that
is wrong.

## Future Ideas

- [x] ~~Search within transcripts~~ - weighed and declined; the index is
      already fetched out of line and a transcript index would multiply it.
      `SEARCH_KEYS` in `src/lib/search.ts` is the one place to revisit it.
- [ ] Redraw `public/og-image.png`. It is a hand-made raster with no source
      file, so the cover repaint hue-rotated it onto the brand hues rather
      than redrawing it; `public/og-image.svg` is the one with real tokens.
- [ ] Clickable timestamps (jump to video position)
- [ ] Auto-transcribe pipeline (GitHub Action). Historically blocked because
      `pnpm run transcribe` (local Whisper) hardcodes a machine-specific
      `whisper-cli` path and needs browser cookies.
      `pnpm run transcribe:youtube` — the default generator for new episodes —
      needs neither, so a CI job is now genuinely possible. Not built yet.
- [ ] Episode chapters from AI
