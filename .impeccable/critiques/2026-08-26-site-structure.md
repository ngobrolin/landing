# Critique — Ngobrolin WEB, whole site (structure pass)

Method: dual-agent (A: design review · B: detector + browser evidence).
Every number below was re-verified in the parent context before being recorded.
Scope: phase 1 of a two-phase redesign — structure only, palette frozen.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 1/4 | Search accepts input and does nothing, forever, with no message |
| 2 | Match system / real world | 2/4 | `lang="id"` site with English breadcrumbs (`Home / Episodes`), `aria-label="Scroll to top"`, English plural `98 episodes` on all 36 tag tiles |
| 3 | User control and freedom | 2/4 | 404 offers one exit. No anchors on a 65,397px page, so back-nav loses your place |
| 4 | Consistency and standards | 2/4 | Tag tile says "98 episodes"; the page it links to says "97 episode" |
| 5 | Error prevention | 1/4 | `/tags` publishes "36 topik dari **723 episode**" against a 178-episode archive |
| 6 | Recognition rather than recall | 1/4 | An episode page renders zero tags for the episode you are reading |
| 7 | Flexibility and efficiency | 1/4 | One search box site-wide, dead; 178 transcripts unindexed |
| 8 | Aesthetic and minimalist | 3/4 | Coherent dark archive language, undercut by two white floating buttons |
| 9 | Error recovery | 1/4 | Search fails silently and permanently; its `no-results` copy is unreachable |
| 10 | Help and documentation | 2/4 | `/about` is good; nothing states that all 178 episodes have a transcript |

**Total: 16/40 — Poor, needs significant rework.** All ten heuristics apply.
The low scores cluster on #1/#5/#6/#7/#9, which are one failure wearing five
masks: *the archive has no working way in.*

## Design specificity

**Weak-generic.** Nothing structural on these pages could only exist because
this product owns 178 full Indonesian transcripts. Swap the JSON for a cooking
channel and not one layout decision breaks. The one genuinely specific
component — the mono-timecode transcript rail — is treated as page furniture
below the fold rather than as the thing the site is for.

## Deterministic scan

`detect.mjs` over `src/pages src/components src/layouts` → exit 2, 6 findings,
all colour rules. **3 true positives** (`#6366f1`/`#8b5cf6` native-share
gradient, `#10b981` offline badge), **2 false positives** (`#25D366` WhatsApp
and `#0A66C2` LinkedIn are brand citations on share buttons), 1 partial. The
detector found nothing structural — its rules do not cover IA.

## The finding that outranks everything else

**Search is dead in production, on every page that has it.**

`src/components/SearchEpisodes.astro:110` assigns `window.Fuse` from a bare
`<script>`, which Astro compiles to a **deferred module**. The consumer at
line 115 is `is:inline` and therefore runs **during** parsing, before the
module executes.

Verified in the built output: module tag at byte 1,244,420; `new window.Fuse`
at byte 1,244,965. Reproduced in a browser against `dist/`:

| Test | Result |
|---|---|
| `/episodes/`, type "astro" | 178 cards before, **178 after** — no filtering |
| console | `TypeError: window.Fuse is not a constructor` |
| `/episodes/?q=astro` deep link | input renders **empty**, 178 cards |
| all 5 year pages | same failure |

The init guard sets `data-search-initialized="true"` at byte 1,244,742 —
*before* the throwing line — so the failure is **permanent**; no re-run retries.
`Layout.astro:61` advertises a schema.org `SearchAction` pointing at
`/episodes/?q={search_term_string}`: the site tells Google to send searchers to
a URL that ignores its own query parameter.

The brief asked for "search being findable". Search does not work. Making a
broken search findable would be worse than leaving it hidden.

## The link graph — why topic pages get no traffic

Crawled all 227 built pages, body links only.

- **0 of 178 episode pages link to any `/tags/*` URL.** `tags.json` is already
  loaded on those pages by `related.ts`; the data is there and simply not rendered.
- **All 36 tag pages have exactly 1 inbound link** — from `/tags/` alone.
  Tag pages carry 0 sibling-tag links. They are one hop from a dead end.
- **0 episode pages link to a year page.** Year pages get 5 inbound each, all
  from the `YearTabs` strip.
- The homepage links **8 of 178 episodes (4.5%)** and **0 specific topics**.
- All 37 tag URLs are in the sitemap, so crawlers can reach them — but with no
  internal links they carry no link equity and no user path.

## Data the interface publishes that is not true

| Surface | Claims | Reality |
|---|---|---|
| `/tags` | "36 topik dari **723 episode**" | 723 is the sum of tag counts; the archive has 178 |
| `/partners:39,123` | "**164+** Episode" (twice) | 178 |
| `/partners:47` | "1K+ Views/Episode" | No audience data exists in the repo |
| `tags.json` | an `"undefined"` key carrying 8 tags | a phantom episode inflating 8 tag counts; only **97** real episodes are tagged |
| `/tags/*` | `BARU` on the first two cards | positional (`isNew={index < 2}`); `/tags/web-components` badges two **May 2024** episodes as new |

## Tag extraction is substring-matched

`scripts/extract-tags.ts:80` uses `text.includes(keyword)` with no word
boundary. Indonesian detonates it.

| tag | now | word-boundary | delta |
|---|---|---|---|
| ai | 98 | 26 | −72 |
| ui | 58 | 25 | −33 |
| typescript | 35 | 9 | −26 |
| bun | 22 | 4 | −18 |
| api | 51 | 34 | −17 |
| dev-tools | 25 | 10 | −15 |

`ai` matches *mulai, berbagai, sebagai, sesuai, selain, details* — so **every
one of the 98 tagged episodes carries `ai`**, and `/tags/ai` is the largest,
top-left, most-scanned tile on `/tags`. `ts` (a `typescript` alias) matches
*assistants, snippets*: 30 hits, **0** of them real. `ml` likewise 21 → 0.
`bun` matches *membangun, dibangun*.

Correcting to word boundaries causes **zero URL churn**: all 36 tag pages
survive, none gained, none lost — only the contents get accurate.

## Coverage is concentrated, not random

81 of 178 episodes (46%) have no tags and no summary — and the gap is
weighted toward the **newest** episodes, not the old ones.

| year | tagged | total |
|---|---|---|
| 2022 | 0 | 13 |
| 2023 | 2 | 49 |
| 2024 | 47 | 48 |
| 2025 | 43 | 43 |
| 2026 | 5 | 25 |

**All 8 episodes on the homepage today have no summary**, so every homepage
card falls back to raw YouTube description text.

## Card text carries almost no information

**109 of 178 cards render the identical sentence** — "Yuk mari kita diskusi
dan ngobrol ngalor-ngidul tentang dunia web…" (76 with `\r\n`, 33 with `\n`).
111 of 178 show a blurb shared with at least one other episode. On `/episodes`
that is 61% of the grid saying nothing. Every card states its topic three
times — thumbnail, title, description — and the third is noise.

Meanwhile **`duration` is present on 178 of 178 episodes and displayed on
none.** The median episode is 85 minutes; a browser deciding what to commit to
is never told.

## The transcript corpus does no discovery work

178 transcripts, **10.11M characters**, 285,214 segments, avg 56,785 chars.

- Fuse indexes `title`, `description`, `brief` — never `fullText`.
- Transcript text **is** server-rendered and indexable, but **96.3% of it sits
  inside a collapsed `<details>`** (11,706,057 chars hidden vs 448,449 visible).
- The preview is a fixed `slice(0, 30)` (`Transcript.astro:39`), which on a
  podcast reliably lands on the cold open. On the newest episode the entire
  visible transcript is greetings — not one word about Model Context Protocol.
- ~600 timecodes per page render as inert `<span>`s in indigo monospace. They
  look exactly like links and none of them seek the video.

## Page weight

| Page | raw HTML | gzip | DOM nodes | mobile height |
|---|---|---|---|---|
| `/` | 97 KB | 15 KB | 226 | 4,122 px |
| `/episodes/` | **1,231 KB** | 107 KB | **2,603** | **65,397 px (~77 screens)** |
| `/tags/ai/` | 557 KB | 34 KB | 1,446 | 35,719 px |
| `/tags/` | 61 KB | 12 KB | 193 | 2,250 px |

`/episodes` composition: 502 KB of per-card view-transition CSS (39.8%),
216 KB search island (17.1%), 127 KB of **178 byte-identical copies** of the
`OfflineIndicator` IIFE (10.1%). Each copy calls `querySelectorAll` page-wide,
so the work is N²: 15,931 `caches.open()` calls measured at the 3s mark on a
single load, heading for 31,684.

## Accessibility

Mechanically clean where it counts: **0 of 1,624 images missing `alt`**, 0
unlabelled form controls, 0 duplicate ids, 0 pages missing `lang`.

Real gaps: **no skip link on any page**; heading skip `h1 → h3` on every
card-grid page (`EpisodeCard.astro` hard-codes `h3`); 6 unlabelled
`#clear-search` buttons; `aria-current` on year tabs only, never on the main
nav; `:focus-visible` styling applied to exactly 2 elements site-wide, both
scroll buttons. Two contrast failures against `#1a1a1a`: `#6b7280` body text
at **3.60:1** and the signature `#5c5fed` timecode at **3.58:1**, the latter
repeating ~600× per episode page. The show has covered accessibility 13 times.

## Off-system chrome

`ScrollButtons.astro:14,28` renders two 48px **white** buttons
(`bg-white text-gray-700 border-gray-200 shadow-lg`) fixed bottom-right on
every page of a `#0f0f0f` site — violating the frozen palette, the "no shadow
at rest" rule, and the Bahasa-only rule (`aria-label="Scroll to top"`). On
mobile they permanently occlude content in the thumb zone.

## What is working

1. **One card, one grid, five surfaces.** `EpisodeCard.astro` is reused verbatim
   on `/`, `/episodes`, year, tag and related — always `1 → 2 → 4` at `1.5rem`.
   Five pages feel like one product for zero incremental cost, and the whole
   card being a single `<a>` is the correct call.
2. **Machine surfaces are unusually complete.** RSS, podcast RSS with 178
   enclosures, sitemap, `llms.txt`, `llms-full.txt`, per-episode `.md`, three
   JSON-LD graphs per episode. The off-site plumbing is real — which makes the
   on-site discovery gap more conspicuous, not less.
3. **The transcript reading surface is well judged**, and the `otomatis` pill
   honestly discloses `youtube-auto` provenance rather than hiding it. The
   typography is not the problem; the navigation around it is.

## Peak-end

An episode page ends on a usually-empty Utterances comment box, then prev/next.
The last thing a visitor sees is an empty comment box — not the archive, not a
topic, not a reason to stay. The strongest asset, 177 other episodes, is never
the closing note.
