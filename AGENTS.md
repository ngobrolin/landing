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
  - `src/lib/episodes.ts` acts as the data access layer, handling sorting and retrieval by ID/slug. Slugs come from `src/lib/slug.ts` — see the slug rule under "Episode pipeline" below.
  - `scripts/fetch-playlist.ts` is a utility script to fetch fresh data from the YouTube API.
  - Transcripts live in `src/data/transcripts/<videoId>.json` and are rendered by `src/components/Transcript.astro`. A `source` field records provenance; it is absent on transcripts generated before the field existed, so treat it as optional everywhere.
- **Components:** UI components in `src/components/` (e.g., `EpisodeCard.astro`, `YouTubeEmbed.astro`).
- **Testing:**
  - **Unit Tests:** Vitest, colocated with what they cover (see Coding Conventions).
  - **E2E Tests:** Playwright for browser-based testing (`e2e/` folder).

## Development Workflow

### Prerequisites

- Node.js (LTS recommended)
- pnpm, pinned by the `packageManager` field in `package.json`

pnpm is the only package manager here: every GitHub Actions workflow installs with
`pnpm install --frozen-lockfile`, and `package-lock.json` is gitignored so a stray
`npm install` cannot reintroduce a second lockfile. `pnpm/action-setup` reads the
version from `packageManager`, so bumping that one field moves CI, Cloudflare and
local machines together.

Two traps around this:

- Do **not** add `package-lock=false` to `.npmrc` to stop npm writing a lockfile.
  pnpm reads `package-lock` as an alias of its own `lockfile` setting, and
  `pnpm install --frozen-lockfile` then fails with `ERR_PNPM_NO_LOCKFILE`.
- `pnpm-workspace.yaml` must match the pinned major: the allowed-build-scripts
  setting was renamed between pnpm 10 and 11 and each version silently ignores the
  other's key. See the comments in that file.

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

### Transcription

Three generators write the same transcript shape — pick by cost, not by preference:

| Script | Method | Cost / requirements |
| :--- | :--- | :--- |
| `pnpm run transcribe:youtube` | YouTube auto-captions via `yt-dlp` | Free; no API key, no cookies, no media download. **Default for new episodes.** |
| `pnpm run transcribe` | Local `whisper-cli` | Free but slow; needs a whisper model and browser cookies. Path is hardcoded to a local nix profile. |
| `pnpm run transcribe:openai` | OpenAI Whisper API | Needs `OPENAI_API_KEY`, `ffmpeg`. |

Do not regenerate existing transcripts with `transcribe:youtube` — whisper output is
cleaner than deduplicated rolling captions, so overwriting is a downgrade. The script
requires `--force` to overwrite for this reason.

`scripts/lib/vtt.ts` holds the non-obvious part: YouTube auto-captions are *rolling*
captions that repeat each spoken line across several cues. See the module comment there
for the reconstruction rule and why it is exact rather than fuzzy.

### Episode summaries

`src/data/summaries/<videoId>.json` holds one summary per episode; `SUMMARIZE.md` is the
authoritative contract for the shape and for writing them in Bahasa Indonesia.
`src/components/Summary.astro` globs the directory and resolves the file **by filename**,
never reading the `videoId` field, and validates nothing — so a malformed file ships a
broken "Ringkasan Episode" block instead of failing the build. `src/data/summaries.test.ts`
is the guard for that shape.

That test is deliberately **not** a completeness gate — the worked example of the data-guard
rule under Coding Conventions. The weekly playlist sync opens a PR adding episodes before
anyone has summarised them, so a coverage assertion would turn that PR red for a pipeline
that behaved correctly. Two enumerated sets in the test freeze pre-existing deviations (files
with 8-12 key points, and one missing `videoId`) and assert those sets cannot grow, so the
5-7 rule stays strict for everything new. `src/data/episodes-audio.test.ts` follows the same
rule from the other side: it skips episodes whose optional `duration` is absent — a field the
YouTube videos API can legitimately omit — and only checks the ones that are there.

Whisper repetition loops corrupt roughly a dozen transcripts — a line repeats for hundreds
of wrapped lines, sometimes to the end of the file. Ground a summary only on the intact
portions and never guess at what a loop replaced.

### Data Fetching

See "Fetch YouTube Playlist Data" in `README.md` for how to run
`scripts/fetch-playlist.ts` against the playlist.

## Coding Conventions

- **TypeScript:** Strict typing is encouraged. Use interfaces for data models (e.g., `Episode` interface in `src/lib/episodes.ts`).
- **Styling:** Use Tailwind CSS utility classes directly in markup. Configuration is handled via the `@tailwindcss/vite` plugin in `astro.config.mjs`.
- **Testing:**
  - Write unit tests alongside what they cover: logic next to its source in `src/lib/` or `scripts/lib/` (e.g., `episodes.test.ts`, `playlist-drift.test.ts`), data-shape guards next to their data (e.g., `src/data/summaries.test.ts`).
  - **Writing a data guard:** assert what must always be true, never what merely happens to be true of today's snapshot. A guard that goes red when the system behaved correctly gets deleted by whoever it annoys, and takes the real protection with it. In particular, do not turn an optional field into a completeness gate — see the `src/data/summaries.test.ts` example under "Episode summaries".
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
- A playlist item's `publishedAt` is when the video joined the *playlist*, not when it aired,
  and one video can sit in the playlist twice. Both have shipped as bugs (a back-added episode
  dated today and floated to the top of both feeds; one video emitted as two pages on the same
  slug). `scripts/lib/playlist-episodes.ts` owns both rules — air date from the video's own
  snippet, one episode per `videoId` — and is unit-tested without the network, because
  `YOUTUBE_API_KEY` is a GitHub Actions secret and `fetch-playlist.ts` cannot run locally.
- **An episode's slug is stored data, never derived at build time.** Titles belong to YouTube,
  so deriving a slug from one lets a retitle move an indexed URL with nothing erroring. Every
  record in `src/data/episodes.json` carries a `slug`; `src/lib/slug.ts` resolves it and owns the
  rule (title derivation is the fallback for legacy records only), and
  `scripts/lib/episode-merge.ts` carries it across every sync alongside the audio metadata.
  `src/lib/slugs.golden.txt` lists every address the site has published and `src/lib/slug.test.ts`
  asserts each still resolves — a subset guard, so new episodes may add addresses but dropping one
  takes a deliberate edit to the golden file. Do not re-derive from `title` where a slug is stored.

## Learnings & Best Practices

### ✅ DO's

- ✅ **Add E2E tests before fixing bugs** - Tests caught view transition regressions early
- ✅ **Use guard patterns for script initialization** - `data-menu-initialized` flag prevents duplicate listeners
- ✅ **Add `data-astro-rerun` for view transitions** - but only inline scripts support it; see *Scripts and view transitions* below for scripts with imports
- ✅ **Test view transitions explicitly** - Ensure scripts work after navigation, not just initial load
- ✅ **Use IIFE pattern with `is:inline`** - Prevents scope pollution and ensures re-execution

### ❌ DON'Ts

- ❌ **Don't rely on DOMContentLoaded only** - Only fires once, breaks after view transitions
- ❌ **Don't assume scripts survive navigation** - Client-side routing resets inline scripts
- ❌ **Don't skip initialization guards** - Scripts may run multiple times, prevent duplicate work
- ❌ **Don't test only initial page load** - View transitions create different execution context
- ❌ **Don't refactor without E2E coverage** - ShareButtons refactor needed testing protection

## Scripts and view transitions

`ClientRouter` is site-wide, so every script has to survive client-side
navigation. Which mechanism you need depends on whether the script imports
anything:

- **No imports** → `<script is:inline data-astro-rerun>` plus an
  initialisation guard. This is the pattern most of the codebase uses.
- **Has imports** → Astro bundles it as a module and `data-astro-rerun` does
  not apply. Bind to `astro:after-swap` **and** `astro:page-load`, **and** call
  the initialiser immediately. All three are needed, and this was measured, not
  guessed: navigating `/` → `/episodes` fires `before-preparation`,
  `after-preparation`, `before-swap` and `after-swap` but **not** `page-load`,
  because the module had never loaded on `/` and was still arriving when the
  navigation finished. `src/components/SearchEpisodes.astro` documents this at
  the call site.

Two related traps:

- **Set the "already initialised" guard *after* the risky work, not before.**
  Search shipped broken for an unknown period because the guard was set before
  a line that threw, which turned a transient ordering bug into a permanent
  one that no re-run could clear.
- **A `<script>` inside a repeated component is emitted once per render.**
  `OfflineIndicator` put its runtime in the card, so `/episodes` shipped 178
  copies and each one queried every badge on the page — N² work. Page-level
  runtimes belong in `Layout.astro`; see `OfflineBadgeRuntime.astro`.

## Derived data, and numbers that go stale

Anything countable must be derived at build time. Hardcoded counts have
produced wrong public claims here more than once: `/partners` advertised
"164+" against a real 178, and `/tags` advertised "723 episode" because it
summed tag counts rather than counting episodes. `src/lib/archive.ts` and
`getTaggedEpisodeCount()` in `src/lib/tags.ts` are the helpers.

`src/data/tags.json` is **fully derived** from `src/data/summaries/` by
`scripts/extract-tags.ts`, which **replaces** the file rather than merging into
it. It used to union old and new tags "to preserve manual edits", which meant a
tag could be added but never removed — so fixing the matcher would have changed
nothing. If hand-tuned tags are ever wanted, they need a separate file to merge
*with*.

The matching rule lives in `scripts/lib/tag-extraction.ts` and is
word-boundary based, with tests. Never make it a bare `includes()`: in
Indonesian, `ai` appears inside *mulai, berbagai, sebagai, sesuai, bagaimana*,
which once tagged **every** summarised episode as `ai`. `ts` matched
*assistants*, `ml` matched *html*, `bun` matched *membangun*.

Re-run `npx tsx scripts/extract-tags.ts` whenever summaries change, and check
that no `/tags/<tag>` URL disappears — those pages are indexed.

## Episode titles

163 of 178 titles carry a trailing show-name credit in 46 different shapes
(`- Ngobrolin WEB`, `... ep51`, `... & @handle`, and a real `Ngborlin WEB`
misspelling). `src/lib/episode-title.ts` owns both directions:

- `getDisplayTitle()` for anything a reader sees — it strips the credit only
  where it *is* a credit (anchored on a dash), so titles that use the show name
  as their subject, like *Ngobrolin WebSocket*, keep it.
- `buildEpisodePageTitle()` for `<title>` and the social tags, which must keep
  the show name. Appending it unconditionally is how 119 pages came to ship
  `X - Ngobrolin WEB - Ngobrolin WEB`.

## Podcast audio pipeline

`/podcast-rss.xml` includes an episode **only** if `audioUrl`, `audioDuration` and
`audioFileSize` are all present and truthy (`getPodcastEpisodes()` in
`src/lib/podcast.ts`). A partially-filled entry is dropped silently — no error,
just a missing episode. `/rss.xml` is the separate web feed and carries no
enclosures by design.

Backfilling audio is two steps: `scripts/extract-audio.ts <videoId>` then
`scripts/upload-s3.ts <videoId>` (bucket `ngobrolinweb-podcast`, key
`audio/<videoId>.mp3`).

- ⚠️ **`upload-s3.ts` writes `src/data/episodes.json` as its last act. Commit that
  edit.** If it is lost, S3 holds the mp3 but the repo has no record, and the
  episode vanishes from the feed with nothing erroring anywhere.
- `upload-s3.ts` defines `checkS3Exists()` but never calls it, so it will
  overwrite. Run `aws s3api head-object` yourself before uploading.
- Encoder output is 128kbps mono = **16000 bytes/sec**. A file-size-to-duration
  ratio outside that band means a truncated or mismatched file;
  `src/lib/podcast.test.ts` asserts this invariant across all episodes.
- That ratio cannot catch a *complete* mp3 belonging to the wrong episode — it
  has a perfectly healthy 16000 bytes/sec. `src/data/episodes-audio.test.ts`
  cross-checks ffprobe's `audioDuration` against the YouTube snippet's
  `duration`; the two come from different systems and across the archive never
  differ by more than a second.
- `extract-audio.ts` is expensive twice over. These episodes are livestream VODs
  served as muxed HLS with **no audio-only format at all** (check with
  `yt-dlp -F`), so `-x`'s `bestaudio/best` falls back to `best` and downloads the
  full video; yt-dlp then writes an *uncompressed WAV* intermediate for ffmpeg to
  re-encode to 128kbps mono. A 110-minute episode measured 784 MB of `.temp.mp4`
  plus 969 MB of `.temp.wav` and ~10 minutes. Run the two steps as background work
  rather than waiting on them.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
