# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indonesian-speaking web developers, tech learners, and community members. Five distinct situations produce arrivals:

1. **Returning listeners** who already know the show and arrive for the newest episode, livestream follow-up, or to catch up. They arrive at the homepage, podcast apps, or YouTube.
2. **Search arrivals** — developers who searched a specific technical question in Indonesian ("apa itu HTMX", "Bun vs Node", "Astro v5", "CSS container queries") and landed directly on an episode page from a search engine. They have no prior connection to the show; the episode structure is built to serve them directly as a standalone reference.
3. **Community contributors & discussion participants** — developers and listeners seeking to participate in technical discussions, ask questions, suggest topics/guests, join Q&A, and contribute corrections (e.g. transcript corrections via "Bantu Koreksi" or GitHub discussions).
4. **Prospective partners & sponsors** — companies and dev-tool creators evaluating reach and audience profile on `/partners` and the media kit to sponsor episodes or collaborate.
5. **The panel & editorial team** (Riza Fahmi, Eka, Ivan — all Google Developer Experts) — using the site as the authoritative archive and index of their back catalogue.

## Product Purpose

Ngobrolin WEB is a weekly Indonesian-language video podcast about web development, broadcast Tuesdays at 20:00 WIB. The site is its permanent archive, front door, and community hub.

Its stated vision is to be the leading discussion platform connecting Indonesian web developers to the fast-moving web platform, and explicitly to *close the knowledge gap for those who feel left behind* by the pace of web technology.

Measures of success:

1. **Organic archive discovery and search traffic:** Making the deep back catalogue easily discoverable for Indonesian developers searching technical topics.
2. **Community interaction and discussion engagement:** Driving active participation in discussions, listener Q&As, and community feedback.
3. **Partner sponsorships and media kit visibility:** Providing verified, transparent audience metrics to attract and expand commercial sponsorships.

## Positioning

What no neighbouring product can truthfully copy: **an archive of Indonesian-language web-development discussions with a full machine-readable transcript and summary for every single episode**, combined with an open community discussion space. The live count is derived at build time (`src/lib/archive.ts`).

Indonesian technical content is thin on the open web; long-form Indonesian speech about web platform standards, frameworks, tooling, and developer careers is thinner still. The site makes this audio/video corpus fully readable, searchable, indexable, and accessible as structured text.

## Operating Context

Publishing is a pipeline, not hand-authoring:

- One YouTube playlist (`PLTY2nW4jwtG8Sx2Bw6QShC271PzX31CtT`) is the source of truth for every episode. `scripts/fetch-playlist.ts` pulls it into `src/data/episodes.json`.
- Transcripts live in `src/data/transcripts/<videoId>.json` — one per episode, no gaps.
- Summaries live in `src/data/summaries/<videoId>.json`. Coverage is maintained as new episodes are summarised; a summary-less episode is a temporary normal state during weekly sync, not a defect. `SUMMARIZE.md` owns the contract.
- `src/data/tags.json` is derived from summaries by `scripts/extract-tags.ts`, replacing rather than merging.
- Partner metrics in `src/data/partners.json`, `src/data/media-kit.json`, and `src/data/channel-subscribers.json` are maintained via automated sync and dated snapshots.
- Statically built with Astro (v5) and Tailwind CSS (v4), deployed to static hosting.
- Consequence: Any surface must render gracefully for an episode that has a transcript but no summary or tags yet.

## Capabilities and Constraints

Current functional surfaces:

- One page per episode at `/episodes/<videoId>-<slugified-title>` with embedded video, audio player (where available), topics, summary, key takeaways, and interactive transcript with timecode deep links. Indexed URLs that must not change.
- Whole archive at `/episodes` with instant client-side search over title, description, brief, and key points.
- Topic/tag indexing at `/tags` and `/tags/<tag>`, and chronological browsing at `/episodes/<year>`.
- About page (`/about`), partnership & media kit portal (`/partners`), subscription hub (`/subscribe`), custom 404 (`/404`).
- Community touchpoints: GitHub discussions integration, "Bantu Koreksi" transcript editing links, Q&A / topic suggestions.
- Machine surfaces: `/rss.xml`, `/podcast-rss.xml`, `/sitemap-index.xml`, `/llms.txt`, `/llms-full.txt`, `/search-index.json`, `/episodes/<slug>.md`.
- Astro view transitions (`ClientRouter`) are site-wide.

Hard constraints:

- Palette tokens in `src/styles/global.css` are sampled directly from `public/podcast-cover.jpg`. Dark ground (`#0e1122`), card step (`#191d3a`), Cover Blue (`#4c6fff`), Cover Purple (`#9048e0`), Platform Red (`#ff0033`).
- Indonesian-only user interface copy (`<html lang="id">`).
- Slugs are stored in `episodes.json` and never re-derived dynamically from titles.
- Sync pipeline guards prevent silent episode drops or shrunken record counts.

## Brand Commitments

- Name: **Ngobrolin WEB**.
- Language: Bahasa Indonesia (`<html lang="id">`, `id-ID` locale in structured data).
- Tone & Voice: Santai namun informatif (relaxed, authentic, approachable, yet technically rigorous and informative).
- Official channels: YouTube `@RizaFahmi`, Spotify show `1o2d75xrADb9x0AahDO0Ai`, GitHub discussions `ngobrolin`, X `#ngobrolinweb`.
- Visual identity: Anchored in the official podcast cover art (`public/podcast-cover.jpg`).

## Evidence on Hand

Real in-repo data:

- `src/data/episodes.json`: metadata, titles, descriptions, durations, audio enclosures, publish dates.
- `src/data/transcripts/*.json`: full transcripts with timestamps and text segments.
- `src/data/summaries/*.json`: structured episode summaries and key takeaways.
- `src/data/tags.json`: verified tag index.
- `src/data/partners.json` & `src/data/testimonials.json`: actual partner and testimonial records.
- `src/data/channel-subscribers.json`: YouTube channel subscriber count with `checkedAt`/`fetchedAt`.
- `src/data/media-kit.json`: YouTube Studio analytics data with `capturedAt`.
- Panel assets: `public/images/{riza,eka,ivan}.jpg`.

Absent and not to be fabricated: private download figures or unaudited traffic numbers beyond what is derived/dated in stores.

## Product Principles

1. **The archive is the product.** The back catalogue, fully transcribed, is the durable asset; the newest episode is only the most perishable slice of it. Structure should make the depth visible rather than hiding it behind one link.
2. **Every episode is a front door.** Most organic arrivals land on a single episode from search. An episode page must orient a newcomer, deliver the answer immediately, and introduce the show and community.
3. **Foster two-way community participation.** The podcast is a dialogue, not a monologue; surfaces should invite listener Q&A, topic discussions, and collaborative transcript improvements.
4. **Transparent and credible partner value.** Partner stats and media kit metrics are strictly derived or dated snapshots, providing reliable data for prospective sponsors.
5. **Design for the incomplete record.** The human summary/tagging process lags the automated playlist sync. Surfaces must render cleanly when summaries or tags are absent.
6. **Never trade an indexed URL for a tidier structure.** Slugs and URLs are permanent.
7. **Machine surfaces are first-class.** RSS, podcast RSS, sitemap, search index, and llms.txt are essential distribution channels verified on every release.

## Accessibility & Inclusion

Bahasa Indonesia throughout with plain language over unnecessary jargon. Strict WCAG AA contrast floors tested via automated suites. Full keyboard navigation, visible focus rings (`:focus-visible`), skip links, semantic heading hierarchy, and `aria-current` indicators.
