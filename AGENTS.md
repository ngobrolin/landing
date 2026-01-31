# Ngobrolin WEB Project Context

## Project Overview

**Ngobrolin WEB** is a static website for the "Ngobrolin WEB" video podcast. It serves as a portfolio and archive for podcast episodes, likely sourced from YouTube.

*   **Type:** Static Site (SSG)
*   **Framework:** [Astro](https://astro.build) (v5)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com) (v4, via Vite plugin)
*   **Language:** TypeScript
*   **Data Source:** YouTube Data API (fetched and stored locally in JSON)
*   **Deployment:** Static hosting (e.g., Cloudflare Pages, Netlify, Vercel). The site URL is configured as `https://ngobrol.in`.

## Architecture

*   **Pages:** Located in `src/pages/`.
    *   `index.astro`: Home page.
    *   `about.astro`: About page.
    *   `episodes/[slug].astro`: Dynamic route for individual episode pages.
    *   `rss.xml.ts`: RSS feed generation.
*   **Data Management:**
    *   Raw data is stored in `src/data/episodes.json`.
    *   `src/lib/episodes.ts` acts as the data access layer, handling sorting, slug generation, and retrieval by ID/slug.
    *   `scripts/fetch-playlist.ts` is a utility script to fetch fresh data from the YouTube API.
*   **Components:** UI components in `src/components/` (e.g., `EpisodeCard.astro`, `YouTubeEmbed.astro`).
*   **Testing:**
    *   **Unit Tests:** Vitest for logic in `src/lib/`.
    *   **E2E Tests:** Playwright for browser-based testing (`e2e/` folder).

## Development Workflow

### Prerequisites

*   Node.js (LTS recommended)
*   npm

### Key Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Install project dependencies. |
| `npm run dev` | Start the local development server (Astro). |
| `npm run build` | Build the project for production (outputs to `dist/`). |
| `npm run preview` | Preview the production build locally. |
| `npm run test` | Run unit tests using Vitest. |
| `npm run test:unit` | Explicitly run unit tests. |
| `npm run test:e2e` | Run end-to-end tests using Playwright. |
| `npm run test:e2e:ui` | Run Playwright tests with the UI runner. |

### Data Fetching

To update the episode list from YouTube:

1.  Obtain a **YouTube Data API Key**.
2.  Run the fetch script:
    ```bash
    YOUTUBE_API_KEY=your_api_key_here npx tsx scripts/fetch-playlist.ts
    ```
    This updates `src/data/episodes.json`.

## Coding Conventions

*   **TypeScript:** Strict typing is encouraged. Use interfaces for data models (e.g., `Episode` interface in `src/lib/episodes.ts`).
*   **Styling:** Use Tailwind CSS utility classes directly in markup. Configuration is handled via the `@tailwindcss/vite` plugin in `astro.config.mjs`.
*   **Testing:**
    *   Write unit tests for utility functions in `src/lib/` alongside the source file (e.g., `episodes.test.ts`).
    *   Write E2E tests in `e2e/` for page navigation and user flows.
*   **Routing:** Use Astro's file-based routing. Dynamic parameters are handled with square brackets (e.g., `[slug].astro`).
