---
name: Ngobrolin WEB
description: Indonesian web-development video podcast and its fully-transcribed episode archive
colors:
  surface: "#0e1122"
  surface-raised: "#191d3a"
  surface-overlay: "#242b4d"
  surface-border: "#333c66"
  surface-border-strong: "#6b76a8"
  ink: "#f2f4fd"
  ink-body: "#c3c9e6"
  ink-muted: "#a8b0d2"
  ink-subtle: "#8a94bd"
  accent: "#6588fe"
  accent-text: "#86a2fe"
  accent-strong: "#2a59f4"
  highlight: "#a76ab7"
  highlight-text: "#c98fd8"
  highlight-strong: "#7e3f8e"
  accent-subscribe: "#dc2626"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  timecode:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
  xl: "3rem"
  section: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.highlight-strong}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  button-subscribe:
    backgroundColor: "{colors.accent-subscribe}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-episode:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  chip-tag:
    backgroundColor: "{colors.surface-border}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  chip-year-active:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  chip-year-idle:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  input-search:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem 0.75rem 3rem"
  badge-episode-number:
    backgroundColor: "rgba(0, 0, 0, 0.7)"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
    typography: "{typography.label}"
---

# Design System: Ngobrolin WEB

## Overview

**Creative North Star: "The Cover, Extended"**

Every colour in this system is sampled from `public/podcast-cover.jpg` — the
artwork already on every podcast directory that carries this show. The cover is
three vertical bands: blue (`#6588fe`) and purple (`#a76ab7`) framing a deep
navy panel (`#191d3a`) with the wordmark in white. So the site is that navy
panel, extended: the ground (`#0e1122`), the card (`#191d3a`, sampled exactly),
the overlay (`#242b4d`) and the hairline (`#333c66`) are one material at four
lightnesses, hue and saturation held at the navy's own `hsl(233, 40%)`. That is
what makes them read as a scale rather than as four unrelated dark greys.

The cover sets the blue and the purple **side by side as hard bands** — it is
not a gradient, whatever it looks like at thumbnail size. The site gives them
two jobs accordingly: blue is interactive (links, focus, filled buttons, the
active tab, transcript timecodes); purple is categorical and decorative (topic
labels, tier eyebrows, the Apple Podcasts citation) and is where an accent fill
goes on hover. The blue-to-purple gradient is reserved for the few places the
cover's own framing is being quoted directly: the favicon, the `/partners` share
card, and `og-image.svg`. The subscribe action stays YouTube red — an
off-system colour used as a platform citation, not as part of the palette.

Typography is entirely system-stack and entirely unstyled in personality
terms: no display face, no letter-spacing tricks, no case transforms.
Hierarchy is carried by weight (700 versus 400) and by a four-rung ink ladder
that runs from `#f2f4fd` headings to `#8a94bd` metadata. The result is quiet and
utilitarian, which suits an archive: the interface is a reading surface for
Indonesian technical speech, and it gets out of the way. The one typographic
signature is the monospace timecode running down the left edge of every
transcript.

**Key Characteristics:**

- One navy material at four lightnesses: ground, card, overlay, hairline
- Hairline borders instead of shadows to separate surfaces at rest
- Two accent hues with fixed jobs, plus one off-system platform red
- System font stack throughout; hierarchy from weight and colour value only
- 16:9 thumbnail as the dominant visual unit, repeated in a 4-up grid
- Monospace timecodes as the sole typographic ornament

## Colors

Every value below is the podcast cover or a lightness step along its own hue.
Nothing here was picked to look nice next to the last thing; if a new colour is
needed, sample the cover for it or derive it from a token already present.

`src/styles/contrast.test.ts` holds the floors these values were chosen to
clear, and `src/styles/palette-literals.test.ts` fails the build if a retired
literal reappears anywhere in source. Ratios below are against the ground.

### Primary

- **Cover Blue** (`#6588fe`): sampled from the cover's outer bands. The
  interactive hue: transcript timecodes, summary bullets, tinted fills
  (`accent/20`), hover borders. 5.8:1 on the ground.
- **Blue Glow** (`#86a2fe`): the same blue lightened. Everything that reads as
  *type* — links, hovered headings, the `/partners` figures, inline emphasis.
  7.7:1 on the ground, 6.7:1 on a card.
- **Blue Deep** (`#2a59f4`): the same blue darkened until it carries ink at AA
  (5.0:1). Filled buttons, the `BARU` badge, the active year tab. The sampled
  blue is far too light to sit under white — 3.2:1 — which is why this exists.

### Secondary

- **Cover Purple** (`#a76ab7`): sampled from the cover's inner bands. The
  categorical hue: decorative glyphs and icon fills. 4.8:1 on the ground, and
  4.2:1 on a card, so it is an icon colour there, not a body-text colour.
- **Purple Glow** (`#c98fd8`): the same purple lightened for type — tier
  eyebrows, the Apple Podcasts citation. 7.5:1 on the ground.
- **Purple Deep** (`#7e3f8e`): the hover state of every filled blue button.
  6.4:1 under ink. This is the one place the site performs the cover's own
  blue-beside-purple pairing as a state change.
- **Platform Red** (`#dc2626`): not a brand colour. It appears only on
  subscribe actions, where it is quoting YouTube's own affordance.

### Neutral

- **Ground** (`#0e1122`): the page. The navy, one step below the cover's own.
- **Card** (`#191d3a`): the cover's centre panel, sampled exactly. Episode
  cards, the search field, transcript and summary containers, the `/partners`
  stats band.
- **Overlay** (`#242b4d`): the step above a card — the mobile menu, the skip
  link, the copy-link button, hover fills on the scroll buttons.
- **Hairline** (`#333c66`): every border and divider at rest, plus the fill of
  inert topic chips. 1.55:1 against a card — a separator, not a boundary.
- **Control Outline** (`#6b76a8`): where a border *is* the thing that
  identifies a control, a text field above all. 3.7:1 against a card, which is
  what WCAG 1.4.11 asks of a component boundary and what the hairline cannot
  give.
- **Ink** (`#f2f4fd`): headings, active states. 17:1.
- **Ink Body** (`#c3c9e6`): running prose — descriptions, transcript lines,
  summary text. The default reading colour, never white. 11.4:1.
- **Ink Muted** (`#a8b0d2`): dates, counts, captions, idle navigation. 8.7:1.
- **Ink Subtle** (`#8a94bd`): placeholders, search icon, tertiary counts. The
  floor of legibility; nothing meaningful goes below it. 6.3:1 on the ground and
  4.6:1 on the overlay, so it still clears AA on the darkest thing it can sit on.

### Named Rules

**The Two-Job Rule.** Blue means *you can act on this*. Purple means *this is
what kind of thing it is*. A new element picks the one that describes its job;
it does not pick whichever looks better in the mock. The gradient is not a third
option — it appears only where the cover's framing is quoted wholesale.

**The Fill/Type Split.** Each accent has three values and they are not
interchangeable. `-strong` fills shapes that carry text. The bare token fills
shapes that do not, and colours icons. `-text` colours type. Putting the bare
blue under white text fails contrast at 3.2:1, which is exactly the mistake the
previous palette shipped.

**The Sample-Don't-Invent Rule.** A colour that is not in `global.css` and not
in the cover does not belong in this system. `src/styles/palette-literals.test.ts`
enforces the negative half of that for the palette this one replaced.

**The Red Is Borrowed Rule.** Platform Red belongs to YouTube, not to
Ngobrolin WEB. Use it on subscribe affordances and nowhere else.

## Typography

**Display Font:** system UI stack (`ui-sans-serif, system-ui, -apple-system,
Segoe UI, Roboto, …`)
**Body Font:** the same stack — there is no pairing
**Label/Mono Font:** system monospace (`ui-monospace, SFMono-Regular, Menlo,
Monaco, Consolas`), transcript timecodes only

**Character:** Deliberately impersonal. The system ships no webfont, so type
personality comes entirely from the reader's own platform. Every distinction
in the hierarchy is made with two weights and four grey values. On a
long-form Indonesian transcript this is a strength: nothing competes with the
words.

### Hierarchy

- **Display** (700, `clamp(2.25rem, 6vw, 3.75rem)`, 1.1): The homepage
  wordmark only. Appears once per site.
- **Headline** (700, `1.875rem`, 1.2): Page titles — "Semua Episode",
  "Topik", "Episode 2024".
- **Title** (700, `1.5rem`, 1.3): Section headings within a page, and the
  episode title on a detail page (which scales to `1.875rem` at `md`).
- **Body** (400, `1rem`, 1.625): All running prose. Constrained to
  `max-w-2xl`–`max-w-4xl` containers rather than a `ch` measure.
- **Label** (700, `0.75rem`, 1): Badges — `BARU`, `EP 178`. Always
  uppercase by content, never by `text-transform`.
- **Timecode** (400 mono, `0.875rem`): Transcript timestamps in Studio
  Indigo, `0.5rem` right margin, forming a vertical rail down the transcript.

### Named Rules

**The Two Weights Rule.** 700 or 400. There is no 500 or 600 anywhere in the
system. A heading that needs to feel lighter gets a greyer colour, not a
lower weight.

**The Ink Ladder Rule.** Every block of text picks exactly one rung: `ink` for
headings, `ink-body` for prose, `ink-muted` for metadata, `ink-subtle` for
placeholders. Inventing an intermediate value flattens the ladder for
everything else, and the ladder is what carries hierarchy here.

## Layout

A single centred container (`container mx-auto px-4`) governs every page;
there is no full-bleed treatment anywhere. Reading surfaces narrow further:
`max-w-4xl` for an episode page, `max-w-2xl` for about and subscribe prose,
`max-w-3xl` for the homepage hero.

The dominant grid is the episode grid: `1 → 2 → 4` columns at
`base → sm → lg`, with a `1.5rem` gutter. It is used identically on the
homepage, the archive, year pages and tag pages, which is what makes those
pages feel like one product. Related episodes on a detail page use a
`1 → 3` variant.

Vertical rhythm is section-scale rather than fine-grained: `py-12` (`3rem`)
for a standard section, `py-16`/`py-24` for the homepage hero, `mb-8`
(`2rem`) between a page header and its content, `mb-4`/`mb-6` within a block.
Breakpoints are Tailwind defaults; only `sm` (640px), `md` (768px) and `lg`
(1024px) are used. `md` is the navigation breakpoint — the desktop nav row
collapses to a hamburger overlay below it.

Density is generous and uniform. There is no compact mode, no list view, and
no alternative to the card grid.

## Elevation & Depth

**This system has no shadow vocabulary at rest.** Depth is tonal: the ground
(`#0e1122`), the card (`#191d3a`), the overlay (`#242b4d`) and a hairline
(`#333c66`) to cut the edge. Each step is a real one — roughly 1.15–1.2:1
against the step below, which is visible where the retired palette's three
greys two points apart were not.

Shadow exists only as a *response*. An episode card on hover gains
`shadow-lg` tinted `accent/10`, which reads as the card catching a little of
the accent light rather than lifting off the page. The mobile menu is separated
by being an overlay-step surface with a border, not by a shadow.

### Shadow Vocabulary

- **Accent catch** (`box-shadow: 0 10px 15px -3px rgb(101 136 254 / 0.1), 0 4px 6px -4px rgb(101 136 254 / 0.1)`):
  Card hover only. Always paired with the border shifting to `accent/50` and
  the thumbnail scaling to `1.05`.

### Named Rules

**The Flat Floor Rule.** Surfaces are flat at rest and separated by hairlines.
A shadow in a static screenshot of this system is a bug.

**The Two Step Rule.** There are exactly two elevations above the ground, and
the overlay step is for things that sit *over* the page — the mobile menu, the
skip link, a hover fill. A third surface means the model is wrong for this
system; use a border, a divider, or a `<details>` disclosure instead.

## Shapes

Soft rectangles throughout, on a three-step radius scale that maps to size:
`0.25rem` for badges and small chips, `0.5rem` for buttons, inputs, year tabs
and prev/next blocks, `0.75rem` for episode cards and the large CTA panels.
Fully round (`9999px`) is reserved for inert topic chips and panellist
avatars.

Borders are always exactly `1px`. At rest they are the hairline (`#333c66`);
where the border is what identifies the control — a text field — they are the
control outline (`#6b76a8`), which is the only value that clears the 3:1 WCAG
1.4.11 asks of a component boundary. The interactive signal is a *colour*
change on that border, never a width change — a border that thickens on hover
would shift layout.

The recurring silhouette is the 16:9 thumbnail with content stacked beneath
it inside a rounded panel. That unit repeats across the entire site and is the
closest thing the system has to a signature form.

## Components

### Buttons

- **Shape:** Softly rounded (`0.5rem`), no border on filled variants.
- **Primary:** Blue Deep fill, ink text, `0.75rem 1.5rem` padding,
  `font-medium`.
- **Hover:** Background crosses to Purple Deep over a default `transition` —
  the cover's pairing as a state change. No transform, no shadow. Lightening
  toward the sampled blue is not available: it would drop the label to 3.2:1.
- **Outline:** Transparent fill with a Control Outline border and ink text; the
  border and label go Blue Glow on hover. Used for the secondary hero action.
- **Subscribe:** Platform Red fill, smaller padding (`0.5rem 1rem`), `text-sm`.
  Carries `data-analytics-event="cta_click"` wherever it appears.

### Chips

- **Topic chip (inert):** hairline fill, `ink-body` text, fully rounded,
  `text-sm`. Currently used as a non-interactive label on the homepage and
  about page.
- **Year tab:** Two states only. Active is Blue Deep fill with ink text and no
  border; idle is card fill, `ink-muted` text, hairline border, going
  ink-text/blue-border on hover. Carries `aria-current="page"` when active.

### Cards / Containers

- **Corner Style:** `0.75rem`.
- **Background:** the card step (`#191d3a`) on the ground (`#0e1122`).
- **Shadow Strategy:** None at rest; accent catch on hover (see Elevation).
- **Border:** `1px` hairline, shifting to `accent/50` on hover.
- **Internal Padding:** `1rem` for episode cards, `1.5rem` for prose panels.
- **Signature behaviour:** the whole card is a single `<a>`. The thumbnail
  scales to `1.05` under `overflow-hidden` on hover while the title shifts to
  Blue Glow — one hover, three coordinated responses.

### Inputs / Fields

- **Style:** card fill, `1px` Control Outline border, `0.5rem` radius, full
  width, `0.75rem` vertical padding with `3rem` left padding to clear the
  inset search icon.
- **Focus:** the site-wide focus ring (see The Visible Focus Rule) plus the
  border shifting to Blue Glow.
- **Placeholder:** `ink-subtle`.
- **Affordances:** an inset magnifier at `left-1rem` and a clear (`×`) button
  at `right-1rem` that is hidden until the field has content.

### Navigation

- **Desktop (`md` and up):** A single row — wordmark left, text links
  (`ink-body`, `ink` on hover) plus one red subscribe button right. Bottom
  hairline border. `aria-current` marks the section.
- **Mobile:** Hamburger toggling a full-width overlay-step panel with a top
  border; links stack with `1rem` gaps and the subscribe button goes
  full-width. The toggle is an inline script guarded by
  `data-menu-initialized` and marked `data-astro-rerun` so it survives view
  transitions.
- **Breadcrumb (episode pages):** `text-sm`, `ink-muted`, slash-separated,
  current crumb in ink.

### Transcript (signature component)

The system's most distinctive surface and the reason the mono token exists.
Inside a card-step panel, each line is a paragraph with a Cover Blue monospace
timecode inline-left and `ink-body` text, `0.75rem` apart. The first 30
segments render open; the remainder live inside a `<details>` whose summary is
Blue Glow text. An "otomatis" pill (`ink-subtle` text, hairline border) marks
YouTube-auto-captioned transcripts, and a "Bantu Koreksi" link sits
right-aligned in the header.

### Named Rules

**The Whole-Card Target Rule.** An episode card is one link. Nested
interactive elements inside a card are invalid in this system — the offline
indicator is decorative for exactly this reason.

**The Visible Focus Rule.** `:focus-visible` in `global.css` draws a `2px` Blue
Glow outline at `2px` offset on *everything*. It replaced a border-only focus
treatment that only existed on the search field, which left every link and
button in the site relying on the UA outline — near-invisible on this ground.
A component may add to it; nothing may set `outline: none` without replacing
it with something at least as visible.

## Do's and Don'ts

### Do:

- **Do** build any new surface from the tokens: card on ground with a `1px`
  hairline, or overlay for something that sits over the page.
- **Do** carry hierarchy with the ink ladder — `ink` / `ink-body` /
  `ink-muted` / `ink-subtle` — before reaching for size or weight.
- **Do** reuse the `1 → 2 → 4` episode grid with a `1.5rem` gutter for any
  new collection of episodes, so archive, topic and year pages stay one
  product.
- **Do** mark every new inline script `data-astro-rerun` and guard it with an
  initialisation attribute; `ClientRouter` is site-wide and unguarded scripts
  silently die after the first client-side navigation.
- **Do** write every user-facing label in Bahasa Indonesia.
- **Do** keep radius proportional to element size (`0.25` badge / `0.5`
  control / `0.75` card).

### Don't:

- **Don't** introduce a third accent hue. Blue and purple both come from the
  cover and both have a job; Platform Red is a citation, not an accent.
- **Don't** add a shadow to anything at rest. Depth is tonal in this system.
- **Don't** stack a third surface on top of the overlay. There is no popover,
  modal or drawer precedent to follow.
- **Don't** use font weights other than 400 and 700, or add `letter-spacing`
  and `text-transform` — no element in the shipped system does.
- **Don't** put an interactive element inside an episode card; the card is
  itself a single link.
- **Don't** use anything dimmer than `ink-subtle` for text that carries
  meaning, and don't write a hex literal where a token exists.
- **Don't** introduce a webfont; the system is deliberately system-stack and
  ships zero font bytes.
