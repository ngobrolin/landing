---
name: Ngobrolin WEB
description: Indonesian web-development video podcast and its fully-transcribed episode archive
colors:
  surface: "#f1f2f6"
  surface-raised: "#ffffff"
  surface-overlay: "#e3e6f0"
  surface-border: "#c5c9d8"
  surface-border-strong: "#6a7090"
  ink: "#14183a"
  ink-body: "#3b4163"
  ink-muted: "#4c5274"
  ink-subtle: "#575d7e"
  accent: "#3557e0"
  accent-text: "#2a46c0"
  accent-strong: "#2f4fd0"
  accent-hover: "#14183a"
  on-accent: "#ffffff"
  on-accent-muted: "#dfe5ff"
  highlight: "#f0a030"
  highlight-text: "#8a4f00"
  highlight-strong: "#7a4500"
  accent-subscribe: "oklch(57.7% 0.245 27.325)"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 8.2vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 118"
  masthead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.33
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "normal"
  timecode:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
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
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-cover:
    backgroundColor: "{colors.on-accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 1.75rem"
    height: "3.25rem"
  button-cover-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-accent}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  button-subscribe:
    backgroundColor: "{colors.accent-subscribe}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  cover-block:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.on-accent}"
    padding: "3.5rem"
  archive-panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-body}"
    padding: "1.75rem"
  card-episode:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  chip-tag:
    backgroundColor: "{colors.surface-border}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  chip-year-active:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  chip-year-idle:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  input-search:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 5rem 0.75rem 3rem"
  badge-new:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
    typography: "{typography.label}"
  badge-episode-number:
    backgroundColor: "rgba(0, 0, 0, 0.7)"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
---

# Design System: Ngobrolin WEB

## Overview

**Creative North Star: "Edisi Mingguan"**

The site is a weekly, and the homepage is this week's issue. The newest episode
is the cover story: a full-width blue band carrying its title in very large
type, a deck, one action and the thumbnail in a white frame. The band opens with
one quiet line, the issue ("Edisi 189 · 11 November 2026") on the left and the
broadcast schedule on the right. Everything older is back issues, listed as
numbered rows and reached through the archive band. The homepage draws no
divider rules and no cards: each job gets a full-width band in its own tone.

There are two grounds. By day it is a cool light paper (`#f1f2f6`) with white
cards and navy ink (`#14183a`); by night it is the podcast cover's navy
(`#0e1122`) with a lifted card (`#191d3a`) and near-white ink (`#f2f4fd`). The
site follows the system preference and a footer toggle pins the other scheme;
see "Colour schemes" below. Two hues sit on both grounds, and `src/styles/global.css` records where each
came from: the blue is the podcast cover's band darkened until it carries white
type, and the orange is the title strip on every episode thumbnail. Blue means
a reader can act on something, and it owns the one drenched surface on the
site, the homepage cover block. Orange is decoration: icon fills and a
faint tint. Purple, which the previous palette
carried, is gone from the stylesheet. The Langganan button in the navigation is a filled blue control like any
other; YouTube red appears only where a link goes to YouTube.

One typeface does everything. Archivo ships as a single self-hosted variable
file with a width axis, and the `.display` class pushes it wide and heavy for
the wordmark, the cover title, the homepage section headings and the episode
numerals. The episode page uses the same voice for its title and section
headings. The archive, topic, about, subscribe and partners pages have not
taken it yet: their titles are plain 700. All of them share the palette, the
hairlines and the episode card.

**Key Characteristics:**

- Cool paper ground, white cards, navy ink, hairline rules; the cover navy with lifted cards in the dark scheme
- One blue with three steps for acting, one orange that only decorates
- A single drenched surface: the blue cover block on the homepage
- Archivo throughout; `.display` (118% width, weight 800) as the masthead voice
- Full-width tonal bands and numbered rows on the homepage, the 16:9 card grid on archive pages
- Monospace for transcript timecodes and other machine-flavoured text

## Colors

A cool-neutral scale in two schemes with one working blue and one decorative
orange. The values in the front matter and the ratios quoted below are the
light scheme; the dark values are in "Colour schemes".
`src/styles/global.css` is the only place a colour is decided.
`src/styles/contrast.test.ts` asserts the WCAG floors rather than the values:
every ink step, `accent-text` and `highlight-text` at 4.5:1 on all three
surfaces, `surface-border-strong` at 3:1 on all three, white at 4.5:1 on
`accent-strong`, `accent-hover` and `highlight-strong`, and `on-accent-muted`
at 4.5:1 on `accent-strong`. It runs every one of those in both schemes. Ratios
below were measured against the light ground unless stated.

### Colour schemes

`docs/adr/002-color-scheme.md` records the decision. Each token that differs has
its two values once in `global.css`, as `--light-<name>` and `--dark-<name>`.

| Token | Light | Dark |
| :--- | :--- | :--- |
| `surface` | `#f1f2f6` | `#0e1122` |
| `surface-raised` | `#ffffff` | `#191d3a` |
| `surface-overlay` | `#e3e6f0` | `#242b4d` |
| `surface-border` | `#c5c9d8` | `#333c66` |
| `surface-border-strong` | `#6a7090` | `#6b76a8` |
| `ink` | `#14183a` | `#f2f4fd` |
| `ink-body` | `#3b4163` | `#c3c9e6` |
| `ink-muted` | `#4c5274` | `#a8b0d2` |
| `ink-subtle` | `#575d7e` | `#8a94bd` |
| `accent` | `#3557e0` | `#6588fe` |
| `accent-text` | `#2a46c0` | `#86a2fe` |
| `accent-hover` | `#14183a` | `#3f61ea` |
| `highlight-text` | `#8a4f00` | `#f0a030` |

`accent-strong`, `on-accent`, `on-accent-muted`, `highlight` and
`highlight-strong` are the same in both. That keeps the homepage cover block and
every filled control identical across schemes.

**The Fixed-On-Fixed Rule.** Type on a fill that does not change takes a token
that does not change. The white button on the cover block is `on-accent` with
`accent-strong` type, never `ink`, which flips and would vanish in dark.

**The toggle.** A text button in the footer, first in the link row, with a
44px target. It names the scheme it switches to: "Ganti ke tema gelap" with a
moon in light, "Ganti ke tema terang" with a sun in dark. CSS decides which label shows, so it is
right before any script runs. Choosing the scheme the system already shows
removes the pin.

### Primary

- **Cover Blue** (`accent`): icons, tints (`accent/20`), hover borders
  (`accent/50`), avatar rings and the audio seek progress. Transcript timecodes
  also use it as type, at 5.9:1 on a card.
- **Blue Ink** (`accent-text`): blue as type. Links, hovered headings, the row
  numerals, the `/partners` figures, the site-wide focus ring. 6.9:1 on the
  ground, 7.7:1 on a card, 6.2:1 on the overlay.
- **Blue Fill** (`accent-strong`): filled controls, the `BARU` badge, the
  active year tab, the pressed state of segmented toggles, and the cover block.
  Carries white at 6.7:1 and `on-accent-muted` at 5.3:1.
- **Pressed Navy** (`accent-hover`): the same value as ink. Every filled blue
  control goes to it under the pointer. Carries white at 17.2:1.
- **On Accent** (`on-accent`) and **On Accent Muted** (`on-accent-muted`):
  primary and secondary type on Blue Fill. On the cover block the primary
  button inverts the pair: white fill, ink label.

### Secondary

- **Thumbnail Orange** (`highlight`): decorative icon fills, and tints at 5%
  to 40% opacity. 1.9:1 on the
  ground and 2.15:1 under white, so it never fills a control and never colours
  type.
- **Dark Amber** (`highlight-text`): orange darkened until it reads as type.
  5.9:1 on the ground. Used for the "Paling Populer" label on `/partners` and
  the Apple Podcasts tile on `/subscribe`.
- **Deep Amber** (`highlight-strong`): orange darkened until it carries white.
  Declared and contrast-tested; no markup uses it yet.
- **Platform Red** (`accent-subscribe`, Tailwind's `red-600`): YouTube's
  colour, on subscribe actions that point at YouTube and nowhere else.

### Neutral

- **Paper** (`surface`): the page.
- **Card** (`surface-raised`): episode cards, the homepage archive band, search
  fields, transcript and audio containers, the `/partners` stats band. 1.12:1
  against the paper, so a card on the ground needs its hairline.
- **Overlay** (`surface-overlay`): the mobile menu, the skip link, hover fills
  on icon buttons. It is a darker tint of the paper, 1.25:1 against a card.
- **Hairline** (`surface-border`): borders and dividers at rest, and the fill
  of the small label chip on `/partners`. 1.5:1 on the ground: a separator, not a boundary.
- **Control Outline** (`surface-border-strong`): the border of a text field or
  an outline button, where the border is what identifies the control. 4.3:1 on
  the ground, 4.9:1 on a card, 3.9:1 on the overlay.
- **Ink** (`ink`): headings and active states.
  15.4:1.
- **Ink Body** (`ink-body`): running prose and the `body` default. 8.9:1.
- **Ink Muted** (`ink-muted`): dates on cards, captions, idle controls, the
  footer. 6.8:1.
- **Ink Subtle** (`ink-subtle`): row metadata, placeholders, counts. 5.7:1 on
  the ground and 5.2:1 on the overlay, so the quietest rung still clears AA
  everywhere it can sit.

### Named Rules

**The Two-Job Rule.** Blue means *you can act on this*. Orange means *look
here*, and it only decorates. A new element takes the hue that describes its
job. A link, a button or an active state is blue; a rule, an accent stroke or
a tint may be orange.

**The Fill/Type Split.** Each hue has steps and they are not interchangeable.
For blue: `accent-strong` fills shapes that carry type, `accent-text` colours
type, bare `accent` is for icons, tints and borders. For orange the split is a
contrast matter: the sampled value is 2.15:1 under white and 1.9:1 on the
ground, so type takes `highlight-text` and a fill that carries white takes
`highlight-strong`.

**The One Drench Rule.** Exactly one surface on the site is flooded with the
accent: the homepage cover block. Inside it everything takes the `on-accent`
tokens, and the `.on-accent` class switches the focus ring to white because the
blue ring disappears on blue.

**The Hover Rule.** A filled blue control hovers to `accent-hover`: the ink
navy in light, a brighter blue (`#3f61ea`) in dark, where navy would sink into
the ground. Hover never changes the hue family.

**The Borrowed-Colour Rule.** Platform Red belongs to YouTube. Spotify green
(`#1DB954`), the RSS orange and the share row's brand fills belong to their
platforms too: reproduce the brand value and choose the label colour that
clears AA on it. The Spotify tile is labelled in black for that reason (the
stylesheet comment on `/subscribe` records 2.59:1 for white against 8.12:1 for
black).

## Typography

**Display Font:** Archivo at 118% width, weight 800 (the `.display` class)
**Body Font:** Archivo at normal width, with the system UI stack as fallback
**Label/Mono Font:** system monospace (`ui-monospace, SFMono-Regular, Menlo,
Monaco, Consolas`)

**Character:** One family doing two voices. At normal width Archivo is a plain,
even grotesque that stays out of the way of long Indonesian prose. Pushed wide
and heavy it becomes a newspaper nameplate. The file is
`/fonts/archivo-latin-wdth.woff2` (Latin subset, weights 100 to 900, width 62%
to 125%, about 90 KB), preloaded in `Layout.astro` with `font-display: swap`.

### Hierarchy

- **Display** (800, 118% width, `clamp(2.75rem, 8.2vw, 7rem)`, 0.95,
  `-0.03em`): the cover title only. The size is also capped by its column
  through a container query unit, `100cqi` divided by the longest word's length
  times `0.7`, so a long word never runs into the thumbnail. The episode page
  title is the same voice in ink at `clamp(2rem, 6vw, 3.5rem)`, leading 1.
- **Masthead** (800, 118% width, `-0.02em`, balanced): the same voice at
  working sizes. Wordmark `1.5rem`, `1.875rem` from `lg`. Section headings on
  the homepage and the episode page `1.25rem`, `1.5rem` from `md`. Row numerals `1.5rem`, `1.875rem`
  from `sm`. The homepage archive heading is larger, `1.875rem` and `2.75rem`
  from `md`, because the archive is the page's second job.
- **Headline** (700, `1.875rem`): inner page titles, such as "Semua Episode"
  and "Topik".
- **Title** (700, `1.25rem`, 1.375): row titles on the homepage (`1.125rem`
  below `sm`). Card titles are 600 at `1rem`.
- **Body** (400, `1rem`, 1.5): running prose in `ink-body`. Long reading
  blocks (transcript lines, key points) open to 1.625. Key points are
  `1.0625rem` on both the homepage and the episode page. The cover deck and the
  episode deck are `1.25rem`.
- **Label** (700, `0.75rem`): `BARU`. The `EP 189` and duration badges are 500
  at the same size. Uppercase by content.
- **Timecode** (400 mono, `0.875rem`): transcript timestamps in Cover Blue with
  a `0.5rem` right margin. Mono also sets the audio player's clock, the `/`
  keyboard hint in the search field and one line on the 404 page.

### Named Rules

**The One Family Rule.** Archivo is the only webfont and it is one file. A
second voice comes from the width and weight axes, never from a second family.
The exceptions are surfaces that cannot load it: `public/offline.html`,
`public/favicon.svg` and the build-time share cards stay on the system
`sans-serif`.

**The Masthead Rule.** `.display` is for nameplates, page and section
headings, and numerals. It sets width, weight, tracking and balance; the size stays on the
element. Running text, labels and controls never take it.

**The Ink Ladder Rule.** Every block of text picks one rung: `ink` for
headings, `ink-body` for prose, `ink-muted` for secondary copy, `ink-subtle`
for metadata. The contrast test asserts the four stay in descending order.

**The Tabular Figures Rule.** Numbers that line up or change (dates,
durations, counts, the issue line, the audio clock) take `tabular-nums`.

## Layout

A centred container (`container mx-auto px-4`) holds every page. The single
exception is the homepage, whose bands run edge to edge at every width with
the container inside each one, and the episode page, which does the same for
its transcript and subscribe bands. Reading surfaces narrow further:
`max-w-4xl` for an episode page, `max-w-2xl` for about prose, and `68ch` for
any block of running text inside them.

The episode page reads top to bottom: breadcrumb, title, a one-sentence deck
(the brief's first sentence, left out when it runs past 220 characters), the
player, then "Poin utama" with the full brief behind a fold. The transcript
follows on a raised band as a search. Related episodes are six numbered rows in
two columns from `md`, with the topic links under them. The subscribe block,
the two quiet links and the share buttons share one overlay band, and comments
and previous/next close the page on paper.

The homepage reads top to bottom as an issue, in five bands:

1. The cover, on Blue Fill. It opens with the issue and date in white 700
   followed by the schedule in `on-accent-muted`, both `0.875rem`; on Tuesdays
   the schedule becomes a livestream notice with a pulsing dot (motion-safe
   only). Below that a 12-column grid from `lg`: title, deck and the action in
   seven columns, the thumbnail in five with the hosts' faces and the tagline
   under it. Below `lg` the thumbnail comes first and the title follows, so a
   phone's first viewport shows the newest episode.
2. This week, on paper. Two columns from `lg`: "Di episode ini" with up to
   three key points in five columns, each marked by a small orange square, and
   "Episode Sebelumnya" as three numbered rows in seven. A row's date sits
   under its title. Without a summary the rows take the full width.
3. The archive, on the raised tone: the large "Cari di N episode" heading, the
   search, topics and years as two labelled rows of links, and "Dari arsip" as
   a `1 → 2 → 3` grid of plain links.
4. The hosts, on paper: three columns from `md`, a face beside a name, role
   and links, with no card around them.
5. The invitation, on the overlay tone: one question, two text links and the
   subscribe button. The footer follows with no gap.

Archive, year and topic pages keep the episode grid: `1 → 2 → 4` columns at
`base → sm → lg` with a `1.5rem` gutter. The topic index is a `2 → 3 → 4 → 5` grid of small link
panels.

Vertical rhythm on the homepage is the band padding: `3rem`, `5rem` from `md`,
and about half that for the invitation. Inside a band the gaps stay at
`1.5rem` or less, so distance shows what belongs together. Breakpoints are Tailwind defaults and only
`sm` (640px), `md` (768px) and `lg` (1024px) are used. `md` is the navigation
breakpoint.

## Elevation & Depth

Depth is tonal and drawn with lines. The paper, the white card and the darker
overlay tint are the three surfaces, and a hairline cuts the edge where the
1.12:1 step between paper and card is too quiet to do it alone. The homepage
is the exception and uses no divider rules and no cards: full-width bands of
paper, the raised tone and the overlay tint do the separating, rows are set
apart by space, and the only hairlines left are the header's and the footer's.
In the light scheme the raised band is a soft step from the paper; it reads
because it spans the page.

Shadow exists as a response. An episode card on hover gains a soft shadow
tinted with Cover Blue at 10%, while its border goes to `accent/50` and its
thumbnail scales to `1.05`.

### Shadow Vocabulary

- **Accent catch** (`box-shadow: 0 10px 15px -3px rgb(53 87 224 / 0.1), 0 4px 6px -4px rgb(53 87 224 / 0.1)`):
  episode card hover only.

### Named Rules

**The Flat Floor Rule.** Surfaces are flat at rest and separated by hairlines
or by a step in tone.

**The Two Step Rule.** There are two steps off the paper: the white card and
the overlay tint. The overlay is for things that sit over the page or respond
to the pointer (the mobile menu, the skip link, a hover fill). There is no
popover, modal or drawer precedent in the build.

## Shapes

Two form languages share the site. The homepage's editorial blocks are square:
the bands and the cover's framed thumbnail have no radius; row thumbnails take
`0.375rem`. Everything that is a control or a card is a soft rectangle on a
scale tied to size: `0.25rem` for badges, `0.375rem` for the controls on the
homepage cover and archive band and for the segments inside a toggle group,
`0.5rem` for other buttons, fields, year tabs and icon buttons, `0.75rem` for
episode cards and panels. Fully round is for topic chips and avatars.

Hairlines are `1px`. Heavier strokes are structural and each has one job: the
white frame on the cover thumbnail (`4px`, `6px` from `md`), and a 2px ring or
border on avatars. A control's border changes colour on hover and focus; it
never changes width.

The 16:9 thumbnail recurs at three scales: framed in white on the cover,
`8rem` wide in a row, full-width at the top of an episode card.

## Components

### Buttons

- **Primary:** Blue Fill, white label, `0.5rem` radius, `0.75rem 1.5rem`
  padding, weight 500 to 600. Hovers to Pressed Navy. The `/partners` calls to
  action are the same button at `1rem 2rem` and `1.125rem` type.
- **Cover primary:** on the cover block only. White fill, ink label, weight
  700, `3.25rem` tall, `0.375rem` radius; hover swaps to ink fill and white
  label. It fills the row below `sm`.
- **Outline:** transparent, Control Outline border, ink label, `0.5rem`
  radius, `0.5rem 1rem` padding; border and label go Blue Ink on hover.
- **Subscribe:** Platform Red, white label, `0.5rem 1rem`, `0.875rem` type.
  The navigation's Langganan button uses it.
- **Segmented toggle:** a `1px` hairline group on a card with `0.25rem`
  padding; segments are `ink-muted` at rest and Blue Fill with a white label
  when pressed. Used for the video/audio switch and playback speed.

### Chips

- **Topic links (episode page):** not chips. A wrapping row led by "Topik" in
  `ink-subtle`, each topic a Blue Ink 600 link, like the homepage archive band.
- **Year tab:** active is Blue Fill with a white label and
  `aria-current="page"`; idle is a card fill with a hairline border and
  `ink-muted` label, going ink with a Cover Blue border on hover.
- **Inline index (homepage archive band):** topics and years are two wrapping
  rows, each led by its label in `ink-subtle`, with Blue Ink 600 links and
  tabular counts in `ink-subtle`. No separators; the gap does it.

### Cards / Containers

- **Episode card:** white, `1px` hairline, `0.75rem` radius, `1rem` padding
  under a full-width thumbnail. The whole card is one link. On hover the border
  goes `accent/50`, the shadow appears, the thumbnail scales to `1.05` and the
  title goes Blue Ink, over 300ms. Badges sit on the thumbnail: `BARU` in Blue
  Fill top-left, episode number and duration on black at 70% along the bottom.
- **Panel:** white with a hairline and `0.5rem` to `0.75rem` radius, for the
  transcript and the audio player.

### Inputs / Fields

- **Archive search:** card fill, `1px` Control Outline border, `0.5rem`
  radius, `0.75rem` vertical padding, `3rem` left padding for the inset
  magnifier, a mono `/` hint and a clear button at the right.
- **Homepage search:** paper fill on the raised band, Control Outline
  border, `3.25rem` tall, `0.375rem` radius, beside a Blue Fill "Cari" button. It
  is a plain GET form to `/episodes`.
- **Focus:** the site-wide ring plus the border going Blue Ink.
- **Placeholder:** `ink-subtle`.

### Navigation

- **Desktop (`md` and up):** one row over a hairline. The wordmark sits left
  in the masthead voice and is the `h1` on the homepage. Text links are
  `ink-body`, going `ink` on hover; the red Langganan button closes the row.
  `aria-current` marks the page or its section.
- **Mobile:** a hamburger toggles a full-width overlay-tint panel with a top
  hairline. Links stack with `1rem` gaps and the subscribe button goes
  full-width. The label names the next action ("Buka menu" / "Tutup menu");
  Escape closes the panel and returns focus to the toggle.
- **Breadcrumb (episode pages):** `0.875rem`, `ink-muted`, slash-separated,
  current crumb in ink.

### Cover block (signature component)

The homepage's lead. Blue Fill ground, `3.5rem` padding at `lg` (`2.5rem` at
`md`, `1.5rem 1rem` below). Left: the title in Display as a link that
underlines on hover (4px, offset 8px), a deck in On Accent Muted clamped to
three lines, then the two cover buttons and the duration. Right: the thumbnail
in its white frame, and from `lg` three overlapping `3rem` host avatars with a
credit line. Behind, from `lg`, the episode number in the masthead voice at
`19rem` in Cover Blue on Blue Fill, decorative and hidden from assistive
technology.

### Episode row (signature component)

The homepage's back-issue list. Each row is one link on a grid: a Blue Ink
numeral in the masthead voice, a thumbnail with a `0.375rem` radius (`6rem`, `8rem` from
`sm`), the title at 700, and the date and duration in `ink-subtle`, moved to a
right-aligned column from `sm`. Rows are separated by space, not rules; on hover the row takes
a raised fill and the title goes Blue Ink.

### Transcript (signature component)

The transcript is a search first and a text second. On its raised band sit a
Masthead heading, a paper-fill field `3.25rem` tall, a "Sering disebut" row of
terms with the number of moments each returns, and a "Lompat ke" row of
timecodes every ten minutes. Terms are names the summary uses that the
transcript mentions at least three times; the row is hidden below three terms.
Search matches from the start of a word, so "Deno" finds "Denonya" and "bun"
never finds "bergabung". Each result is the matching caption line with the line
before and after it, the term marked with a Cover Blue 20% tint, and a
monospace Cover Blue timecode inline-left. The full text sits in a `<details>`
whose summary is Blue Ink, grouped into one paragraph per minute. An
"otomatis" pill (`ink-subtle`, hairline border) marks auto-captioned
transcripts.

**The Keep-Your-Place Rule.** A timecode clicked while less than half the
player is on screen never scrolls the page. The episode's audio plays in a bar
pinned to the top: ink fill, paper type, a play button, the clock, the title and
"Ke pemutar". The bar leaves when the player is back on screen. Episodes
without audio fall back to scrolling up to the video.

### Share cards and off-stylesheet surfaces

`/og-image.png` and `/og-logo.png` are drawn from the tokens through
`src/lib/palette.ts`: a Cover Blue band, an ink centre panel and a Thumbnail
Orange band, with white type. `/partners-og.png` sits on ink with white and On
Accent Muted type. `public/favicon.svg` is a Blue Fill rounded square with a
white "N". `public/offline.html` restates both palettes by hand and reads the
pinned scheme. The share cards are fixed artwork and do not follow the scheme. All of
them set type in the system `sans-serif`.

### Named Rules

**The Whole-Card Target Rule.** An episode card or row is one link. Nothing
interactive nests inside it; the offline indicator is decorative for that
reason.

**The Visible Focus Rule.** `:focus-visible` in `global.css` draws a `2px`
Blue Ink outline at `2px` offset on everything, and a white one inside
`.on-accent`. A component may add to it. Nothing may remove it without putting
something at least as visible in its place.

## Do's and Don'ts

### Do:

- **Do** build new surfaces from the tokens: white card on paper with a `1px`
  hairline, or the overlay tint for something that sits over the page.
- **Do** make every filled control Blue Fill with `on-accent` type and a hover
  to `accent-hover`.
- **Do** put anything that lives on the cover block inside `.on-accent` and
  use `on-accent` and `on-accent-muted` for its type.
- **Do** use `.display` for a nameplate, a section heading or a numeral, and
  set the size on the element.
- **Do** carry hierarchy with the ink ladder before reaching for size.
- **Do** reuse the `1 → 2 → 4` episode grid with a `1.5rem` gutter on archive
  pages, so archive, topic and year pages stay one product.
- **Do** restate a moved token in `public/offline.html`, `public/favicon.svg`
  and `src/lib/partner-card.ts`, or read it through `src/lib/palette.ts`.
- **Do** write every user-facing label in Bahasa Indonesia.

### Don't:

- **Don't** put full-strength Thumbnail Orange under type or use it to fill a
  control; it measures 2.15:1 under white.
- **Don't** colour type with bare `highlight`; type takes `highlight-text`.
- **Don't** drench a second surface in the accent. The cover block is the one.
- **Don't** bring purple or a third accent hue back. Platform Red and the
  other brand colours are citations.
- **Don't** add a second webfont, and don't load Archivo from a third party;
  the site ships one self-hosted file.
- **Don't** add a shadow to anything at rest.
- **Don't** put an interactive element inside an episode card or row.
- **Don't** use anything quieter than `ink-subtle` for text that carries
  meaning, and don't write a hex literal where a token exists.
- **Don't** use `system-ui` in anything rasterised at build time; it resolves
  to nothing on the Linux build agent.
