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
   yet and no idea 178 other episodes exist. This is the audience the archive
   is supposed to serve and currently does not.
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

*[repo, inferred]* What no neighbouring product can truthfully copy: **178
episodes of Indonesian-language web-development discussion with a full
machine-readable transcript for every single one.** Not a sample — all 178.

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
- Transcripts live in `src/data/transcripts/<videoId>.json` — 178 of 178
  present.
- Summaries live in `src/data/summaries/<videoId>.json` — 98 of 178 present at
  the time of writing; a separate process is filling the remaining 80. *[brief]*
- `src/data/tags.json` is **derived** from summaries by
  `scripts/extract-tags.ts`, so it covers the same 98 episodes and no more.
- The site is statically built (Astro) and deployed to static hosting.

The practical consequence: **any surface must render correctly for an episode
that has a transcript but no summary and no tags.** That is currently 80 of 178
episodes, and it is the majority case for everything published before 2025.

## Capabilities and Constraints

*[repo]* What exists and works today:

- 178 episode pages at `/episodes/<videoId>-<slugified-title>` — **indexed, and
  these URLs must not move** *[brief]*.
- `/episodes` (all 178, client-side Fuse.js search), `/episodes/<year>` for
  2021–2025, `/tags` and `/tags/<tag>` for 36 tags, `/about`, `/partners`,
  `/subscribe`, `/404`.
- Machine surfaces that must keep working *[brief]*: `/rss.xml` (178 items),
  `/podcast-rss.xml` (178 items, 178 enclosures), `sitemap-index.xml` (226
  URLs), `/llms.txt`, `/llms-full.txt`, and `/episodes/<slug>.md`.
- Astro view transitions (`ClientRouter`) are on site-wide. Inline scripts need
  `data-astro-rerun` and an initialisation guard or they break after
  client-side navigation. This has bitten the project before; `AGENTS.md`
  documents it and `e2e/view-transitions.spec.ts` guards it.
- A service worker, offline indicator, Umami analytics (optional, env-gated),
  and speculation-rules prefetch.

Hard constraints on the current work *[brief]*:

- `src/styles/global.css` and its `@theme` palette are frozen. Structure only;
  colour and type personality are a separate later phase.
- `src/lib/podcast.ts` silently drops any episode missing `audioUrl`,
  `audioDuration` or `audioFileSize`. Feed item counts must be compared before
  and after any change rather than trusting the build to complain.
- `src/data/summaries/`, `scripts/fetch-playlist.ts` and
  `scripts/lib/playlist-episodes.ts` belong to other concurrent work and are
  out of bounds.

Known defects found while reading the code, not yet decided on:

- **Tag data is polluted.** `scripts/extract-tags.ts` matches bare substrings,
  so `'ai'` matches ordinary Indonesian words (*sampai, mulai, pakai, berbagai,
  detail*). Result: **all 98 tagged episodes carry the `ai` tag**, and `/tags/ai`
  is a 98-episode page that is not about AI. `ts`, `js`, `db` and `ml` have the
  same flaw. Topic entry points cannot be promoted until this is resolved.
- **Episode pages do not link to their own tags.** `tags.json` is read by
  `related.ts` for scoring but never rendered as a link on `[slug].astro`, so
  the tag pages have almost no inbound internal links.
- **Search does not index transcripts.** Fuse.js is configured over `title`,
  `description` and `brief` only — the 178-transcript corpus, the largest asset
  the product has, is not searchable.
- **The homepage tag chips are not links.** `index.astro` renders eight topic
  names as inert `<span>` elements.
- `partners.astro` hardcodes "164+ Episode"; the real count is 178.

## Brand Commitments

*[repo]* Name **Ngobrolin WEB**. All interface copy is Bahasa Indonesia
(`<html lang="id">`, `id-ID` locale in structured data) — this is not
negotiable and applies to every new label. Voice is santai namun informatif
(relaxed but informative), stated in `about.astro`.

Fixed external identities: YouTube `@RizaFahmi`, Spotify show
`1o2d75xrADb9x0AahDO0Ai`, GitHub org discussions at `ngobrolin`, the
`#ngobrolinweb` hashtag on X.

*[brief]* The existing visual identity — the dark palette and its `@theme`
tokens — is a binding constraint for this phase and is being revisited
separately afterwards.

## Evidence on Hand

Real, in-repo, usable:

- `src/data/episodes.json` — 178 episodes with title, description, publish
  date, thumbnail, duration.
- `src/data/transcripts/*.json` — 178 full transcripts with per-segment
  timestamps and a `fullText` field. Some carry `source: "youtube-auto"`.
- `src/data/summaries/*.json` — 98 briefs plus `keyPoints` arrays.
- `src/data/tags.json` — 36 tags over 98 episodes, quality caveat above.
- `src/data/partners.json`, `src/data/testimonials.json` — real partner and
  testimonial records.
- Panel headshots at `public/images/{riza,eka,ivan}.jpg`.

Absent, and not to be invented: listener numbers, download statistics, audience
demographics, or any traffic figure. The "164+ Episode" and any other counts on
`partners.astro` are the only quantitative claims on the site and one of them is
already stale.

## Product Principles

1. **The archive is the product.** 178 episodes with full transcripts is the
   durable asset; the newest episode is only the most perishable slice of it.
   Structure should make the depth visible rather than hiding it behind one
   link.
2. **Every episode is a front door.** Most organic arrivals land on a single
   episode page from search, not on the homepage. An episode page must
   therefore do the work of orienting a stranger, not just serving a fan.
3. **Design for the incomplete record.** 80 of 178 episodes have no summary and
   no tags. Any surface that assumes summaries or tags exist is broken for the
   majority of the back catalogue.
4. **Never trade an indexed URL for a tidier structure.** Traffic is the goal;
   a URL change that loses rankings defeats the work that motivated it.
5. **Machine surfaces are first-class.** RSS, the podcast feed, the sitemap and
   `llms.txt` are how the archive is consumed off-site. They are verified by
   count, not by the absence of a build error.

## Accessibility & Inclusion

*[repo]* Bahasa Indonesia throughout, `lang="id"` declared. The show's own
stated purpose is closing a knowledge gap for developers who feel left behind,
which argues for plain language over jargon in navigation labels.
`accessibility` is a recurring editorial topic (13 episodes). No formal
conformance target has been established; `e2e/` contains no axe or contrast
assertions. Recording this as *undecided* rather than inventing a standard.
