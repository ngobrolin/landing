# Ngobrolin WEB - Project Plan

## Completed Features

### Core
- **Episode listing** - Fetched from YouTube API, stored in `src/data/episodes.json`
- **Top Episodes page** - Curated list in `src/data/topEpisodes.json`
- **Search** - Client-side search using Fuse.js

### Transcription & Summarization
- **Transcription** - Local Whisper pipeline via `npm run transcribe`
- **Summarization** - AI-assisted via `SUMMARIZE.md` instructions
- **Display** - Summary + collapsible transcript on episode pages

### SEO
- **Structured data** - VideoObject, PodcastEpisode, BreadcrumbList schemas
- **Meta descriptions** - Uses summary brief when available
- **Transcript indexing** - Full text in schema for Google

### Infrastructure
- **Cloudflare Pages** - Git integration, build: `npm run build`, output: `dist`
- **GitHub Actions**:
  - `fetch-playlist.yml` - Weekly YouTube sync (Wed 08:00 WIB)
  - `playlist-drift.yml` - Daily check for episodes published but missing from the playlist
  - `test.yml` - Unit + E2E tests on PR

## Scripts

| Command | Description |
|---------|-------------|
| `npm run transcribe` | Transcribe next episode (local Whisper) |
| `npm run transcribe --missing` | Transcribe all missing |
| `npm run build` | Build for production |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

## Future Ideas

- [ ] Search within transcripts
- [ ] Clickable timestamps (jump to video position)
- [ ] Auto-transcribe pipeline (GitHub Action)
- [ ] Episode chapters from AI
