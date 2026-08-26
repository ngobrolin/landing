---
name: Ngobrolin WEB
description: Indonesian web-development video podcast and its fully-transcribed episode archive
colors:
  primary: "#5c5fed"
  primary-light: "#818cf8"
  dark: "#0f0f0f"
  dark-card: "#1a1a1a"
  dark-border: "#2a2a2a"
  text-primary: "#f3f4f6"
  text-secondary: "#d1d5db"
  text-muted: "#9ca3af"
  text-faint: "#6b7280"
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
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
    textColor: "#ffffff"
  button-outline:
    backgroundColor: "transparent"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  button-subscribe:
    backgroundColor: "{colors.accent-subscribe}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-episode:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  chip-tag:
    backgroundColor: "{colors.dark-border}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  chip-year-active:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  chip-year-idle:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  input-search:
    backgroundColor: "{colors.dark-card}"
    textColor: "#ffffff"
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

**Creative North Star: "The Late-Night Studio"**

This is a system built to look like the room the show is recorded in on a
Tuesday night at 20:00: lights down, one screen glowing, everyone leaning
toward the same thing. The near-black ground (`#0f0f0f`) is not a
fashionable dark theme applied to a light design — it is the actual condition
of the interface, and every other decision is a reaction to it. Content
surfaces sit one step up from the floor (`#1a1a1a`), separated not by shadow
but by a hairline border (`#2a2a2a`) that reads as the edge of a panel rather
than as a card lifted off a page.

The single indigo accent (`#5c5fed`) does all the signalling in the system.
It marks the current thing, the new thing, and the thing you should click, and
it appears nowhere else. Against a ground this dark, one saturated hue carries
enormous weight; a second accent would immediately halve the value of the
first. The one exception is the subscribe action, which is deliberately
YouTube red — an off-system colour used as a platform citation, not as part
of the palette.

Typography is entirely system-stack and entirely unstyled in personality
terms: no display face, no letter-spacing tricks, no case transforms.
Hierarchy is carried by weight (700 versus 400) and by a wide gulf in colour
value between white headings and `#9ca3af` metadata. The result is quiet and
utilitarian, which suits an archive: the interface is a reading surface for
Indonesian technical speech, and it gets out of the way. The one typographic
signature is the monospace timecode running down the left edge of every
transcript.

**Key Characteristics:**

- Near-black ground with a single one-step tonal lift for content surfaces
- Hairline borders instead of shadows to separate surfaces at rest
- Exactly one accent hue, spent sparingly, plus one off-system platform red
- System font stack throughout; hierarchy from weight and colour value only
- 16:9 thumbnail as the dominant visual unit, repeated in a 4-up grid
- Monospace timecodes as the sole typographic ornament

## Colors

A monochromatic near-black scale carrying one saturated indigo accent, with a
single off-system red reserved for platform actions.

### Primary

- **Studio Indigo** (`#5c5fed`): The system's only signal colour. It fills
  primary buttons, marks the active year tab, tints the `BARU` badge on the
  two newest episodes, and colours the monospace timecodes in transcripts. At
  50% opacity it becomes the hover border on every card.
- **Indigo Glow** (`#818cf8`): The lighter sibling, used exclusively for
  *text* that needs to read as interactive — inline links, hovered headings,
  the emphasised "Selasa malam jam 20:00 WIB" phrase. Studio Indigo is for
  fills; Indigo Glow is for type. They are not interchangeable.

### Secondary

- **Platform Red** (`#dc2626`): Not a brand colour. It appears only on
  subscribe actions, where it is quoting YouTube's own affordance. Treating it
  as an available accent anywhere else breaks the one-accent discipline.

### Neutral

- **Studio Floor** (`#0f0f0f`): The page ground. Every surface is measured
  against it.
- **Panel** (`#1a1a1a`): The single elevation step. Episode cards, the search
  field, transcript and summary containers, prev/next navigation. There is no
  second step; nothing sits on top of a panel.
- **Hairline** (`#2a2a2a`): Every border and divider in the system, plus the
  fill of inert topic chips. It is the separator, not a surface.
- **Heading White** (`#f3f4f6` / plain `white`): Episode titles, section
  headings, active states.
- **Body Grey** (`#d1d5db`): Running prose — descriptions, transcript lines,
  summary text. The default reading colour, never white.
- **Metadata Grey** (`#9ca3af`): Dates, counts, captions, idle navigation
  links.
- **Faint Grey** (`#6b7280`): Placeholder text, search icon, tertiary counts.
  The floor of legibility in this system; nothing meaningful goes below it.

### Named Rules

**The One Accent Rule.** Studio Indigo is the only colour that means
"important". If a new element needs to stand out and indigo is already spent
nearby, the answer is weight, size, or space — never a second hue.

**The Fill/Type Split.** Studio Indigo (`#5c5fed`) fills shapes. Indigo Glow
(`#818cf8`) colours text. Indigo Glow on a filled button, or Studio Indigo as
link text on the dark ground, both fail contrast and read as a mistake.

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

**The Grey Ladder Rule.** Every block of text picks exactly one rung: white
for headings, `#d1d5db` for prose, `#9ca3af` for metadata, `#6b7280` for
placeholders. Inventing an intermediate grey flattens the ladder for
everything else.

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

**This system has no shadow vocabulary at rest.** Depth is tonal: the
`#0f0f0f` ground, a single `#1a1a1a` surface step, and a `#2a2a2a` hairline
to cut the edge. Nothing stacks beyond that one step — there is no popover,
no modal, no drawer, no second-level surface anywhere in the implementation.

Shadow exists only as a *response*. An episode card on hover gains
`shadow-lg` tinted `primary/10`, which reads as the card catching a little of
the accent light rather than lifting off the page. The mobile menu overlay
uses a border, not a shadow, to separate itself from the page below.

### Shadow Vocabulary

- **Accent catch** (`box-shadow: 0 10px 15px -3px rgb(92 95 237 / 0.1), 0 4px 6px -4px rgb(92 95 237 / 0.1)`):
  Card hover only. Always paired with the border shifting to `primary/50` and
  the thumbnail scaling to `1.05`.

### Named Rules

**The Flat Floor Rule.** Surfaces are flat at rest and separated by hairlines.
A shadow in a static screenshot of this system is a bug.

**The One Step Rule.** There is exactly one elevation above the ground. If a
design needs a surface on top of a panel, the surface model is wrong for this
system — use a border, a divider, or a `<details>` disclosure instead.

## Shapes

Soft rectangles throughout, on a three-step radius scale that maps to size:
`0.25rem` for badges and small chips, `0.5rem` for buttons, inputs, year tabs
and prev/next blocks, `0.75rem` for episode cards and the large CTA panels.
Fully round (`9999px`) is reserved for inert topic chips and panellist
avatars.

Borders are always exactly `1px` and always `#2a2a2a` at rest. The
interactive signal is a *colour* change on that border (to `primary/50`),
never a width change — a border that thickens on hover would shift layout.

The recurring silhouette is the 16:9 thumbnail with content stacked beneath
it inside a rounded panel. That unit repeats across the entire site and is the
closest thing the system has to a signature form.

## Components

### Buttons

- **Shape:** Softly rounded (`0.5rem`), no border on filled variants.
- **Primary:** Studio Indigo fill, white text, `0.75rem 1.5rem` padding,
  `font-medium`.
- **Hover / Focus:** Background lightens to Indigo Glow over a default
  `transition`. No transform, no shadow.
- **Outline:** Transparent fill with a `#4b5563` border and white text; the
  border goes white on hover. Used for the secondary hero action.
- **Subscribe:** Platform Red fill, smaller padding (`0.5rem 1rem`), `text-sm`.
  Carries `data-analytics-event="cta_click"` wherever it appears.

### Chips

- **Topic chip (inert):** `#2a2a2a` fill, `#d1d5db` text, fully rounded,
  `text-sm`. Currently used as a non-interactive label on the homepage and
  about page.
- **Year tab:** Two states only. Active is Studio Indigo fill with white
  text and no border; idle is `#1a1a1a` fill, `#9ca3af` text, `#2a2a2a`
  border, going white-text/indigo-border on hover. Carries `aria-current="page"`
  when active.

### Cards / Containers

- **Corner Style:** `0.75rem`.
- **Background:** `#1a1a1a` on the `#0f0f0f` ground.
- **Shadow Strategy:** None at rest; accent catch on hover (see Elevation).
- **Border:** `1px #2a2a2a`, shifting to `primary/50` on hover.
- **Internal Padding:** `1rem` for episode cards, `1.5rem` for prose panels.
- **Signature behaviour:** the whole card is a single `<a>`. The thumbnail
  scales to `1.05` under `overflow-hidden` on hover while the title shifts to
  Indigo Glow — one hover, three coordinated responses.

### Inputs / Fields

- **Style:** `#1a1a1a` fill, `1px #2a2a2a` border, `0.5rem` radius, full
  width, `0.75rem` vertical padding with `3rem` left padding to clear the
  inset search icon.
- **Focus:** `outline-none` with the border shifting to Studio Indigo. This is
  the only focus treatment in the system and it is border-only.
- **Placeholder:** `#6b7280`.
- **Affordances:** an inset magnifier at `left-1rem` and a clear (`×`) button
  at `right-1rem` that is hidden until the field has content.

### Navigation

- **Desktop (`md` and up):** A single row — wordmark left, text links
  (`#d1d5db`, white on hover) plus one red subscribe button right. Bottom
  border `#2a2a2a`. No active-page indication.
- **Mobile:** Hamburger toggling a full-width `#0f0f0f` overlay with a top
  border; links stack with `1rem` gaps and the subscribe button goes
  full-width. The toggle is an inline script guarded by
  `data-menu-initialized` and marked `data-astro-rerun` so it survives view
  transitions.
- **Breadcrumb (episode pages):** `text-sm`, `#9ca3af`, slash-separated,
  current crumb in white.

### Transcript (signature component)

The system's most distinctive surface and the reason the mono token exists.
Inside a `#1a1a1a` panel, each line is a paragraph with a Studio Indigo
monospace timecode inline-left and `#d1d5db` body text, `0.75rem` apart. The
first 30 segments render open; the remainder live inside a `<details>` whose
summary is Indigo Glow text. An "otomatis" pill (`#6b7280` text, hairline
border) marks YouTube-auto-captioned transcripts, and a "Bantu Koreksi" link
sits right-aligned in the header.

### Named Rules

**The Whole-Card Target Rule.** An episode card is one link. Nested
interactive elements inside a card are invalid in this system — the offline
indicator is decorative for exactly this reason.

**The Border-Focus Rule.** Focus is expressed by the border going Studio
Indigo. Do not add a ring, a glow, or an outline offset; it would be the only
one in the system.

## Do's and Don'ts

### Do:

- **Do** use `#1a1a1a` on `#0f0f0f` with a `1px #2a2a2a` border for any new
  surface. That trio is the entire surface language.
- **Do** carry hierarchy with the grey ladder — white / `#d1d5db` /
  `#9ca3af` / `#6b7280` — before reaching for size or weight.
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

- **Don't** introduce a second accent hue. Studio Indigo is the only signal
  colour, and Platform Red is a citation, not an accent.
- **Don't** add a shadow to anything at rest. Depth is tonal in this system.
- **Don't** stack a surface on top of a panel. There is one elevation step
  and no popover, modal or drawer precedent to follow.
- **Don't** use font weights other than 400 and 700, or add `letter-spacing`
  and `text-transform` — no element in the shipped system does.
- **Don't** put an interactive element inside an episode card; the card is
  itself a single link.
- **Don't** use a grey lighter than `#6b7280` for text that carries meaning.
- **Don't** introduce a webfont; the system is deliberately system-stack and
  ships zero font bytes.
