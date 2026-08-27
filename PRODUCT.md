# Product

<!-- impeccable:product-schema 1 -->

> **Provenance note.** This record was written without a live interview. The
> operating brief for this work forbids interactive question tools; product
> decisions route through a supervisor channel instead. Every fact below is
> either read out of the repository (marked *[repo]*) or taken verbatim from the
> commissioning brief (marked *[brief]*). Facts that are neither — reasonable
> inferences awaiting confirmation — are marked *[inferred]* and must not be
> treated as settled.

## Platform

web

## Users

*[repo, brief]* Indonesian-speaking web developers. Three situations produce
almost all arrivals, and they want different things:

1. **Returning listeners** who already know the show and came for the newest
   episode or to catch up. They arrive at the homepage or from YouTube.
2. **Search arrivals** *[inferred]* — developers who searched a specific
   technical question in Indonesian ("apa itu HTMX", "Bun vs Node") and landed
   on one episode page from a search engine. They have no loyalty to the show
   yet and no idea the rest of the archive exists. This is the audience the
   archive structure is built to serve.
3. **Prospective partners** *[repo]* — `partners.astro` sells reach to
   sponsors and is a distinct commercial job with its own funnel.

The panel itself (Riza Fahmi, Eka, Ivan — all Google Developer Experts *[repo:
`about.astro`]*) is a fourth, editorial audience: they use the site as the
archive of their own back catalogue.

## Product Purpose

*[repo: `about.astro`]* Ngobrolin WEB is a weekly Indonesian-language video
podcast about web development, broadcast Tuesdays at 20:00 WIB. The site is its
archive and front door.

Its stated vision is to be the leading discussion platform connecting Indonesian
web developers to the fast-moving web platform, and explicitly to *close the
knowledge gap for those who feel left behind* by the pace of web technology.

*[brief]* The measure of success the commissioner named for this work is
**"clarity and focus on how to get more traffic."** Traffic here means organic
discovery of the archive, not just retention of existing listeners.

## Positioning

*[repo, inferred]* What no neighbouring product can truthfully copy: **an
archive of Indonesian-language web-development discussion with a full
machine-readable transcript for every single episode.** Not a sample — every
one. The live count is derived at build time, never written down here; see
`src/lib/archive.ts`.

That corpus is the whole asset. Indonesian technical content is thin on the open
web; long-form Indonesian speech about Bun, HTMX, Astro, Deno, accessibility and
career is thinner still. The site is currently the only place that corpus is
readable as text rather than locked inside video.

## Operating Context

*[repo]* Publishing is a pipeline, not hand-authoring, and this constrains
design more than usual:

- One YouTube playlist (`PLTY2nW4jwtG8Sx2Bw6QShC271PzX31CtT`) is the source of
  truth for every episode. `scripts/fetch-playlist.ts` pulls it into
  `src/data/episodes.json`. See `AGENTS.md` for the drift-detection story.
- Transcripts live in `src/data/transcripts/<videoId>.json` — one per episode,
  no gaps. `getArchiveStats()` derives that claim rather than asserting it.
- Summaries live in `src/data/summaries/<videoId>.json`. The backfill that was
  in flight when this was written has landed, so coverage is complete *for the
  episodes synced so far* — the weekly playlist sync adds episodes before
  anyone has summarised them, so a summary-less episode is a normal state, not
  a defect. `SUMMARIZE.md` owns the contract.
- `src/data/tags.json` is **derived** from summaries by
  `scripts/extract-tags.ts`, which replaces the file rather than merging into
  it, so it can only cover episodes that already have a summary.
- The site is statically built (Astro) and deployed to static hosting.

The practical consequence: **any surface must render correctly for an episode
that has a transcript but no summary and no tags.** Every newly synced episode
is in exactly that state until a human summarises it, so this is a permanent
condition of the pipeline, not a backlog that eventually clears.

## Capabilities and Constraints

*[repo]* What exists and works today:

- One page per episode at `/episodes/<videoId>-<slugified-title>` — **indexed,
  and these URLs must not move** *[brief]*. The slug is stored data, not
  derived from the title; `AGENTS.md` owns that rule.
- `/episodes` (the whole archive, with client-side search over the cards
  already in the DOM), `/episodes/<year>`, `/tags` and `/tags/<tag>`,
  `/about`, `/partners`, `/subscribe`, `/404`.
- Machine surfaces that must keep working *[brief]*: `/rss.xml`,
  `/podcast-rss.xml` (web feed and podcast feed carry different item sets — see
  the podcast-audio section of `AGENTS.md`), `sitemap-index.xml`, `/llms.txt`,
  `/llms-full.txt`, `/search-index.json` and `/episodes/<slug>.md`. Item counts
  are compared before and after a change rather than written down here.
- Astro view transitions (`ClientRouter`) are on site-wide, and every script has
  to survive client-side navigation. The mechanism differs for inline versus
  bundled-module scripts; `AGENTS.md` ("Scripts and view transitions") owns the
  rule and `e2e/view-transitions.spec.ts` guards it.
- A service worker, offline indicator, Umami analytics (optional, env-gated),
  and speculation-rules prefetch.

Hard constraints on the current work *[brief]*:

- *[repo]* `src/styles/global.css` is the single place a colour is decided, and
  its `@theme` tokens are sampled from `public/podcast-cover.jpg`. `DESIGN.md`
  owns the palette and the rule behind each token; `src/styles/contrast.test.ts`
  and `src/styles/palette-literals.test.ts` guard it. The site is dark.
- `src/lib/podcast.ts` silently drops any episode missing `audioUrl`,
  `audioDuration` or `audioFileSize`. Feed item counts must be compared before
  and after any change rather than trusting the build to complain.
- `src/data/summaries/`, `scripts/fetch-playlist.ts` and
  `scripts/lib/playlist-episodes.ts` belong to other concurrent work and are
  out of bounds.

Defects found while reading the code, and where they now stand:

- **Tag data was polluted** by a bare-substring matcher (`'ai'` matched
  *sampai, mulai, berbagai*, so every summarised episode was tagged `ai`).
  Fixed: the word-boundary rule lives in `scripts/lib/tag-extraction.ts` with
  tests, and `AGENTS.md` owns the invariant.
- **Episode pages did not link to their own tags.** Fixed: `EpisodeTopics.astro`
  renders them under the H1, so tag pages now have inbound internal links.
- **The homepage tag chips were inert `<span>` elements.** Fixed: they are
  links to `/tags/<tag>`.
- **`partners.astro` hardcoded "164+ Episode".** Fixed: public counts are
  derived at build time (`src/lib/archive.ts`, `getTaggedEpisodeCount()`).
- **Search does not index transcripts.** *Decided, deliberately not built.* The
  search index carries title, description, brief and summary `keyPoints`, and
  is served out of line as `/search-index.json` fetched on first interaction; a
  lazy transcript index was weighed and declined.

## Brand Commitments

*[repo]* Name **Ngobrolin WEB**. All interface copy is Bahasa Indonesia
(`<html lang="id">`, `id-ID` locale in structured data) — this is not
negotiable and applies to every new label. Voice is santai namun informatif
(relaxed but informative), stated in `about.astro`.

Fixed external identities: YouTube `@RizaFahmi`, Spotify show
`1o2d75xrADb9x0AahDO0Ai`, GitHub org discussions at `ngobrolin`, the
`#ngobrolinweb` hashtag on X.

*[repo]* The visual identity is the cover art: the palette is sampled from
`public/podcast-cover.jpg` so the site, the YouTube channel and the podcast
directories read as one property. `DESIGN.md` owns it.

## Evidence on Hand

Real, in-repo, usable:

- `src/data/episodes.json` — every episode with title, slug, description,
  publish date, thumbnail, duration and (where backfilled) audio metadata.
- `src/data/transcripts/*.json` — a full transcript per episode, with
  per-segment timestamps and a `fullText` field. Some carry
  `source: "youtube-auto"`.
- `src/data/summaries/*.json` — a brief plus a `keyPoints` array per summarised
  episode.
- `src/data/tags.json` — a derived videoId-to-tags map over a small controlled
  tag vocabulary.
- `src/data/partners.json`, `src/data/testimonials.json` — real partner and
  testimonial records.
- `src/data/channel-subscribers.json` — the channel subscriber count with the
  date it was last read, refreshed by the weekly playlist sync.
- `src/data/media-kit.json` — the audience and watch-time figures `/partners`
  publishes, hand-copied from YouTube Studio with the date they were captured.
- Panel headshots at `public/images/{riza,eka,ivan}.jpg`.

Absent, and not to be invented: download statistics, or any audience or traffic
figure beyond the dated snapshots in the two stores above. The `media-kit.json`
half is YouTube Analytics data no script here can reach, so it is copied by hand
and nagged about when it ages. The quantitative claims on `partners.astro` are
the site's most load-bearing numbers, which is why every one of them is now
derived or dated rather than typed; `AGENTS.md` ("`/partners` figures") owns
that rule.

## Product Principles

1. **The archive is the product.** The back catalogue, fully transcribed, is
   the durable asset; the newest episode is only the most perishable slice of
   it. Structure should make the depth visible rather than hiding it behind one
   link.
2. **Every episode is a front door.** Most organic arrivals land on a single
   episode page from search, not on the homepage. An episode page must
   therefore do the work of orienting a stranger, not just serving a fan.
3. **Design for the incomplete record.** Summaries and tags are produced by a
   separate human-in-the-loop process that always lags the playlist sync. Any
   surface that assumes summaries or tags exist is broken for the newest
   episodes, which are the ones most likely to be visited.
4. **Never trade an indexed URL for a tidier structure.** Traffic is the goal;
   a URL change that loses rankings defeats the work that motivated it.
5. **Machine surfaces are first-class.** RSS, the podcast feed, the sitemap and
   `llms.txt` are how the archive is consumed off-site. They are verified by
   count, not by the absence of a build error.

## Accessibility & Inclusion

*[repo]* Bahasa Indonesia throughout, `lang="id"` declared. The show's own
stated purpose is closing a knowledge gap for developers who feel left behind,
which argues for plain language over jargon in navigation labels.
`accessibility` is a recurring editorial topic in the archive itself. No formal
conformance target has been established, and `e2e/` still runs no axe audit, but
structure and palette are now guarded explicitly by `e2e/a11y-structure.spec.ts`
(skip link, heading order, `aria-current`, interface language),
`e2e/scroll-buttons-palette.spec.ts` and `src/styles/contrast.test.ts`, which
holds every palette pairing to its measured WCAG AA floor. The site-wide
conformance target stays *undecided* rather than invented.
