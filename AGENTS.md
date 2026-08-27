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

Three traps around this:

- Do **not** add `package-lock=false` to `.npmrc` to stop npm writing a lockfile.
  pnpm reads `package-lock` as an alias of its own `lockfile` setting, and
  `pnpm install --frozen-lockfile` then fails with `ERR_PNPM_NO_LOCKFILE`.
- `pnpm-workspace.yaml` must match the pinned major: the allowed-build-scripts
  setting was renamed between pnpm 10 and 11 and each version silently ignores the
  other's key. See the comments in that file.
- **Do not port an `npm run x -- args` line to pnpm by swapping the binary alone.**
  npm strips the first `--`; pnpm forwards it verbatim. `pnpm run preview -- --port
  4321` reaches astro as `astro preview -- --port 4321`, which silently ignores every
  flag after the separator, and a script that reads positional args as video IDs takes
  `--` for one. Drop the separator. `scripts/lib/package-manager.test.ts` guards this
  and the pnpm-only rule; it exempts only `docs/plans/` (dated records of what
  was run at the time, not live instructions).

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

## Browser tests: the port belongs to the worktree, and is never adopted

A green browser-test run means "this branch is green" only because of the
mechanism in `scripts/lib/e2e-port.ts` — `playwright.config.ts` decides nothing
about the port itself, and that module's comment is the authority for why it
works the way it does. Three rules hold:

- **Never hardcode the port.** It is derived from the worktree path and then
  probed, so two lanes get two ports and can run concurrently, one lane keeps its
  port across runs (stable URLs and traces), and a stale server sitting on a
  lane's port is stepped over rather than used.
- **A run never tests against a server it did not start.** `reuseExistingServer`
  is `false` on every path, including under an explicit override, and is typed as
  the literal `false` so re-enabling adoption fails to compile. Adopting a foreign
  server lets the suite pass without ever loading the build under test, which makes
  every green unprovable — that is the property this whole mechanism exists to buy.
- **The port is written once.** `playwright.config.test.ts` guards that it is not
  copied by hand into `baseURL`, `webServer.url` and `webServer.command`.

`E2E_PORT=<port>` pins a port for debugging and is taken at its word: it does not
re-enable adoption, and a busy override is refused rather than reused. Before
changing how the port is chosen, read `pinPortForWorkers()` — its comment explains
why the runner must stamp its decision into the environment for the worker
processes, and why that uses a different variable name from `E2E_PORT`.

Unrelated to ports: `e2e/service-worker.spec.ts` waits on `networkidle` and is sensitive to
CPU load. Two full suites at once on a 10-core machine flake two or three of its tests;
a single run oversubscribed with `--workers=12` flakes the same ones. Diagnose a
service-worker timeout as load before suspecting the harness.

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

Re-run `pnpm exec tsx scripts/extract-tags.ts` whenever summaries change, and
check that no `/tags/<tag>` URL disappears — those pages are indexed.

### `/partners` figures

`/partners` is the page a sponsor is sent to, so its job is to be believed, and
not everything on it is countable from the repo. Three rules hold it together:

- **Every figure it publishes has one source: `src/lib/partner-stats.ts`.** The
  page, its meta description and its share card all read from there and none of
  them states a number. Channel figures are labelled as the channel's — the
  channel carries a second show — and carry a dated attribution. Deriving a
  figure automatically does not change whose it is: the subscriber count is
  still a *channel* figure and stays labelled as one.
  `src/lib/partner-stats.test.ts` fails if a consumer restates a figure — raw or
  rendered — and derives both forms from the stores at test time, because a
  literal there would go red the week the sync moved the count.
- **Every figure is either derived or nagged about; none is merely hoped to be
  current.** Nothing on this page went wrong because updating it was hard. It
  went wrong because nothing ever announced it had gone stale. So each figure
  has a mechanism and a provenance date, and the raw values live in `src/data/`
  beneath the single source:

  | Figure | Store | Kept fresh by |
  | :--- | :--- | :--- |
  | Episode count, start year | `episodes.json` | Derived at build from the episode data |
  | Channel subscribers | `channel-subscribers.json` | **Derived weekly** by `scripts/fetch-playlist.ts`; the same freshness workflow nags at 2 months without a successful read |
  | Age split, returning viewers, geography, watch hours, avg view duration, top interest | `media-kit.json` | **Hand-copied**; `.github/workflows/media-kit-freshness.yml` opens an issue at 4 months |

  Subscriber count is public `channels.list` data, so the read-only
  `YOUTUBE_API_KEY` reaches it and the sync folds it in — no new job, and the
  figure arrives as a reviewable PR diff rather than changing under the
  maintainer. Everything in `media-kit.json` is YouTube **Analytics** data:
  owner-scoped, OAuth only. Automating it was ruled out deliberately — no
  refresh token, no consent flow, no new repository secret. Do not build one;
  raise it instead.
  - The sync **fails soft**. A channel call that 403s, returns a hidden
    subscriber count, or comes back malformed leaves the last known figure in
    place and lets the episode work finish. A transient hiccup must never blank
    a number on this page. `scripts/lib/channel-subscribers.ts` owns that rule.
    It also declines to rewrite the file when the count has not moved: a
    one-line PR every week is how a real `episodes.json` diff gets merged
    unlooked-at.
  - **Failing soft is not the same as failing silently.** A revoked key or an
    exhausted quota makes every run leave the file alone, which is byte-for-byte
    what a healthy unchanged count looks like — so the store carries a third
    date, `checkedAt`, stamped on every *successful* read and on nothing else.
    Writing it every week would put the weekly one-line PR back, so it is only
    persisted once it has stood 30 days (`CHECKED_AT_REFRESH_DAYS`), and the
    alarm is measured in months to clear that. `fetchedAt` still means "has read
    this way since" and is still what the page prints; do not merge the two.
  - Both published dates are stored as ISO (`fetchedAt`, `capturedAt`) and the Indonesian
    prose the page prints is **formatted from them**. A hand-written "Agustus
    2026" beside a machine-readable date is two copies of one fact, and the
    freshness check reads the stored date — never a date parsed out of rendered
    prose, which breaks the first time the wording changes.
  - `MEDIA_KIT_FIGURES` in `src/lib/media-kit.ts` names each manual figure and
    where in YouTube Studio to read it; `src/lib/media-kit.test.ts` asserts it
    covers every key in the JSON, so a figure added to the page cannot go
    un-nagged. Adding a manual figure means adding it to both.
- **The share card at `/partners-og.png` is generated at build time**
  (`src/lib/partner-card.ts` → `src/pages/partners-og.png.ts`) from those same
  figures, for that reason: a hand-made image would be a second copy, and a card
  that disagrees with the page it links to is worse than no card. It rasterises
  SVG through `sharp`, which reaches fonts via fontconfig — use `sans-serif`,
  never `system-ui`, or the glyphs silently vanish on a Linux build agent.
  `src/lib/partner-card.test.ts` measures ink in the rendered PNG rather than
  trusting the SVG string.

The page is Indonesian-only by decision; do not add an English version or a
language switcher.

## The palette comes from the podcast cover

`src/styles/global.css` is the only place a colour is decided. Every token there
is either sampled from `public/podcast-cover.jpg` or a lightness step along a
sampled hue, and `DESIGN.md` explains which is which and what each one is for.
Two guards keep it honest, and both assert rules rather than today's values:
`src/styles/contrast.test.ts` (the WCAG floors each pairing was chosen to clear)
and `src/styles/palette-literals.test.ts` (no source file writes a literal from
the retired pre-cover palette).

Four surfaces cannot read that stylesheet and therefore restate the tokens by
hand — `public/offline.html` (served by the service worker without the Astro
bundle), `public/og-image.svg`, `public/favicon.svg` and `src/lib/partner-card.ts`
(librsvg has no stylesheet). Move a token and you must move it in those too; the
literals test catches only the retired values, not drift in the new ones.

Two traps this repaint hit:

- **The sampled accents are too light to sit under text.** The cover blue
  measures 3.2:1 under white. Filled controls use the darkened `-strong` pair;
  the bare token is for icons, tints and borders, and `-text` is for type. This
  is the split the previous palette got wrong on every primary button.
- **Never select an element by a colour utility class in a test.** Two e2e
  assertions used `p.text-gray-400` to find an episode's date and went red on a
  repaint that had nothing to do with what they were checking. Use a
  `data-testid`.

## Episode titles

Most titles carry a trailing show-name credit, in dozens of distinct shapes
(`- Ngobrolin WEB`, `... ep51`, `... & @handle`, and a real `Ngborlin WEB`
misspelling); a minority carry no suffix at all. `src/lib/episode-title.ts` owns
both directions:

- `getDisplayTitle()` for anything a reader sees — it strips the credit only
  where it *is* a credit (anchored on a dash), so titles that use the show name
  as their subject, like *Ngobrolin WebSocket*, keep it.
- `buildEpisodePageTitle()` for `<title>` and the social tags, which must keep
  the show name. Appending it unconditionally is how most episode pages came to
  ship `X - Ngobrolin WEB - Ngobrolin WEB`.

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
