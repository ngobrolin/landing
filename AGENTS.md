# Ngobrolin WEB Project Context

## Project Overview

**Ngobrolin WEB** is a static website for the "Ngobrolin WEB" video podcast. It serves as a portfolio and archive for podcast episodes, likely sourced from YouTube.

- **Type:** Static Site (SSG)
- **Framework:** [Astro](https://astro.build) (v5)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) (v4, via Vite plugin)
- **Language:** TypeScript
- **Data Source:** YouTube Data API (fetched and stored locally in JSON)
- **Deployment:** Static hosting (e.g., Cloudflare Pages, Netlify, Vercel). The site URL is configured as `https://ngobrol.in`.

## Architecture

- **Pages:** Located in `src/pages/`.
  - `index.astro`: Home page.
  - `about.astro`: About page.
  - `episodes/[slug].astro`: Dynamic route for individual episode pages.
  - `rss.xml.ts`: RSS feed generation.
- **Data Management:**
  - Raw data is stored in `src/data/episodes.json`.
  - `src/lib/episodes.ts` acts as the data access layer, handling sorting, slug generation, and retrieval by ID/slug.
  - `scripts/fetch-playlist.ts` is a utility script to fetch fresh data from the YouTube API.
- **Components:** UI components in `src/components/` (e.g., `EpisodeCard.astro`, `YouTubeEmbed.astro`).
- **Testing:**
  - **Unit Tests:** Vitest for logic in `src/lib/` and `scripts/lib/`.
  - **E2E Tests:** Playwright for browser-based testing (`e2e/` folder).

## Development Workflow

### Prerequisites

- Node.js (LTS recommended)
- npm

### Key Commands

| Command               | Description                                            |
| :-------------------- | :----------------------------------------------------- |
| `npm install`         | Install project dependencies.                          |
| `npm run dev`         | Start the local development server (Astro).            |
| `npm run build`       | Build the project for production (outputs to `dist/`). |
| `npm run preview`     | Preview the production build locally.                  |
| `npm run test`        | Run unit tests using Vitest.                           |
| `npm run test:unit`   | Explicitly run unit tests.                             |
| `npm run test:e2e`    | Run end-to-end tests using Playwright.                 |
| `npm run test:e2e:ui` | Run Playwright tests with the UI runner.               |

### Data Fetching

To update the episode list from YouTube:

1.  Obtain a **YouTube Data API Key**.
2.  Run the fetch script:
    ```bash
    YOUTUBE_API_KEY=your_api_key_here npx tsx scripts/fetch-playlist.ts
    ```
    This updates `src/data/episodes.json`.

## Coding Conventions

- **TypeScript:** Strict typing is encouraged. Use interfaces for data models (e.g., `Episode` interface in `src/lib/episodes.ts`).
- **Styling:** Use Tailwind CSS utility classes directly in markup. Configuration is handled via the `@tailwindcss/vite` plugin in `astro.config.mjs`.
- **Testing:**
  - Write unit tests for utility functions in `src/lib/` or `scripts/lib/` alongside the source file (e.g., `episodes.test.ts`, `playlist-drift.test.ts`).
  - Write E2E tests in `e2e/` for page navigation and user flows.
- **Routing:** Use Astro's file-based routing. Dynamic parameters are handled with square brackets (e.g., `[slug].astro`).

## Episode pipeline: the playlist is the source of truth

Everything the site shows — pages, RSS, sitemap — derives from one YouTube playlist
(`PLTY2nW4jwtG8Sx2Bw6QShC271PzX31CtT`) via `scripts/fetch-playlist.ts`. A video published to
the channel but never added to that playlist is invisible to the whole pipeline while the site
and feed still look healthy. `scripts/check-playlist-drift.ts` (daily via
`.github/workflows/playlist-drift.yml`) detects that gap and opens a GitHub issue.

Two things worth knowing before touching that path:

- Episode titles do **not** follow one clean convention. Alongside `<topic> - Ngobrolin WEB`
  the playlist holds `... - Ngobrolin WEB ep51`, `... - Ngobrolin WEB & @handle`, a
  `Ngborlin WEB` typo, and 2022–2024 one-offs with no suffix at all. Any title-based rule
  belongs in `EPISODE_TITLE_PATTERN` (`scripts/lib/playlist-drift.ts`) and nowhere else.
- `YOUTUBE_API_KEY` is read-only for playlists. Adding a video needs OAuth the repo does not
  have, so tooling can detect drift but never fix it — that stays a human action in YouTube.

## Learnings & Best Practices

### ✅ DO's

- ✅ **Add E2E tests before fixing bugs** - Tests caught view transition regressions early
- ✅ **Use guard patterns for script initialization** - `data-menu-initialized` flag prevents duplicate listeners
- ✅ **Add `data-astro-rerun` for view transitions** - Scripts must re-run on client-side navigation
- ✅ **Test view transitions explicitly** - Ensure scripts work after navigation, not just initial load
- ✅ **Use IIFE pattern with `is:inline`** - Prevents scope pollution and ensures re-execution

### ❌ DON'Ts

- ❌ **Don't rely on DOMContentLoaded only** - Only fires once, breaks after view transitions
- ❌ **Don't assume scripts survive navigation** - Client-side routing resets inline scripts
- ❌ **Don't skip initialization guards** - Scripts may run multiple times, prevent duplicate work
- ❌ **Don't test only initial page load** - View transitions create different execution context
- ❌ **Don't refactor without E2E coverage** - ShareButtons refactor needed testing protection

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
