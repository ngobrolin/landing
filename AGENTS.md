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
  - **Unit Tests:** Vitest for logic in `src/lib/`.
  - **E2E Tests:** Playwright for browser-based testing (`e2e/` folder).

## Development Workflow

### Prerequisites

- Node.js (LTS recommended)
- pnpm

### Key Commands

| Command                | Description                                            |
| :--------------------- | :----------------------------------------------------- |
| `pnpm install`         | Install project dependencies.                          |
| `pnpm run dev`         | Start the local development server (Astro).            |
| `pnpm run build`       | Build the project for production (outputs to `dist/`). |
| `pnpm run preview`     | Preview the production build locally.                  |
| `pnpm run test`        | Run unit tests using Vitest.                           |
| `pnpm run test:unit`   | Explicitly run unit tests.                             |
| `pnpm run test:e2e`    | Run end-to-end tests using Playwright.                 |
| `pnpm run test:e2e:ui` | Run Playwright tests with the UI runner.               |

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
  - Write unit tests for utility functions in `src/lib/` alongside the source file (e.g., `episodes.test.ts`).
  - Write E2E tests in `e2e/` for page navigation and user flows.
- **Routing:** Use Astro's file-based routing. Dynamic parameters are handled with square brackets (e.g., `[slug].astro`).

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

## Package manager (pnpm)

Installs use **pnpm**; `pnpm-workspace.yaml` is the authoritative config. Two things there are
load-bearing and easy to break — both fail only on a **cold** install, never with a warm `node_modules`:

- **Build-script allowance.** The setting was renamed in pnpm 11 (`onlyBuiltDependencies`, a *list*
  -> `allowBuilds`, a *map*), and each version silently ignores the other's key. Cloudflare Pages
  builds with pnpm 10.11.1, so both forms are kept. Wrong key/shape = `Ignored build scripts:` and
  no native binaries.
- **`publicHoistPattern: [sharp]`.** Astro bundles its sharp image service into `dist/`, so the
  `import('sharp')` it emits resolves from the project root, not from astro's own `node_modules`.
  pnpm's strict layout hides transitive deps there; without the hoist the build dies at
  *generating optimized images* with `MissingSharp`.

Validate any change to install/build config the way CI does, never against a warm tree:

```bash
rm -rf node_modules && pnpm install --frozen-lockfile && npm run build
```

Expect no `Ignored build scripts` warning and a build that runs past *generating optimized images*.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
