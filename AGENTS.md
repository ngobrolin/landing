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
- **The sync never deletes an episode record, and refuses to write a shrunken one.** A video
  that goes private, is deleted, or is simply dropped from the playlist stops coming back from
  the sync; rebuilding `episodes.json` from the sync alone used to erase its whole record —
  slug, audio metadata and all — which silently drops it from the podcast feed and frees its
  URL to move if it ever returns. `scripts/lib/episode-merge.ts` retains such records and marks
  them `absentFromPlaylistSince` (optional, like `source` on transcripts — nothing reads it, and
  the site and feed still carry the episode). `scripts/lib/sync-guards.ts` holds the refusals:
  an existing-but-empty `episodes.json` is not a valid baseline, an absent one needs
  `ALLOW_EMPTY_BASELINE=1`, and a shrink past the band exits non-zero without writing unless
  `ALLOW_SYNC_SHRINK=<count>` authorizes at least that many (also a `workflow_dispatch` input,
  `allow_shrink`, on `.github/workflows/fetch-playlist.yml`). A zero-entry sync is refused
  outright and no override reaches it. Both overrides are per-run; nothing persists them.
  Removing an episode for real is a deliberate human edit, not something the sync does.
- **A refusal in an unattended workflow states its own sanctioned override, verbatim and
  copy-pasteable — and that override authorizes one specific magnitude, never everything.** The
  sync floor refuses *before* the merge, so a refused run stamps nothing and the next run measures
  the identical shrink — a guard with no way through deadlocks the weekly cron forever, and the
  escape a maintainer then invents is `rm src/data/episodes.json`, which re-derives every slug
  from its current YouTube title. So the refusal prints the exact command with the observed count
  already in it, and `ALLOW_SYNC_SHRINK=10` means "I know about these ten": a run that then loses
  an API page still refuses rather than stamping 50. A refusal whose own basis is that the state
  cannot occur takes no override at all. `scripts/lib/sync-guards.ts` owns the refusal text, and
  `scripts/lib/sync-guards.test.ts` asserts each message contains its own override command so the
  two cannot drift apart. Same reasoning as the false-red note below: a guard that teaches a
  maintainer to do the wrong thing is worse than no guard.
- **A test over `src/data/*.json` asserts an invariant that survives the data growing, never a
  property of today's snapshot.** Automation rewrites those files, so a snapshot assertion turns
  the automated sync PR red and invites the next maintainer to "fix" it by deleting the new data.
  The two that follow this: the golden slug guard in `src/lib/slug.test.ts` (a subset, not exact
  equality) and the `absentFromPlaylistSince` optionality assertion in
  `src/lib/episode-retention.test.ts` (absent *or* a valid stamp, not absent everywhere).

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
