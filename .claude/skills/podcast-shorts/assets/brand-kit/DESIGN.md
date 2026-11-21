---
version: alpha
name: Ngobrolin WEB Video
description: Video-first extension of the existing Ngobrolin WEB identity. Visual direction approved; video implementation pending.
colors:
  primary: "#2f4fd0"
  background: "#0e1122"
  foreground: "#f2f4fd"
  panel: "#191d3a"
  muted: "#b7c2e4"
  highlight: "#f0a030"
  paper: "#f1f2f6"
typography:
  title:
    fontFamily: Archivo
    fontSize: 80px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  caption:
    fontFamily: Archivo
    fontSize: 56px
    fontWeight: 800
    lineHeight: 1.1785714285714286
    letterSpacing: "0em"
    fontVariation: "'wdth' 100"
  label:
    fontFamily: Archivo
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0em"
rounded:
  panel: 16px
spacing:
  unit: 8px
  caption-padding: 24px
  safe-left: 72px
  safe-right: 180px
  safe-top: 150px
  safe-bottom: 370px
components:
  caption:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.panel}"
    padding: "{spacing.caption-padding}"
  title-card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.foreground}"
    typography: "{typography.title}"
  speaker-label:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
  secondary-copy:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted}"
  light-logo:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.background}"
  orange-marker:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.background}"
---

## Overview

Ngobrolin WEB is a conversation about web development, in Bahasa Indonesia. The video identity keeps the recognisable navy, blue and orange. Archivo ties the new vector wordmark to the existing website. The new element is a pair of overlapping speech bubbles: a blue opening voice and an orange reply.

Ivan has approved this visual direction for the video-first kit. It does not replace the website's DESIGN.md or publish a new logo. The two bubbles represent an exchange, not a claim that the show has only two hosts. The symbol has not undergone trademark or similarity clearance.

Viewers encounter these videos on small phone screens, often in changing ambient light. A navy caption plate keeps contrast stable against unpredictable footage. Face visibility and speech comprehension take priority over decoration.

## Colors

- Navy `#0e1122`: base canvas and caption plate.
- Blue `#2f4fd0`: title fields and the opening speech bubble.
- Orange `#f0a030`: reply bubble and short decorative markers. Do not put white text on orange. Navy text is allowed for review-board labels, but the video defaults to orange without text.
- Near-white `#f2f4fd`: captions, title text, and reversed wordmark.
- Lifted navy `#191d3a`: optional speaker labels.
- Muted blue-white `#b7c2e4`: secondary labels, never primary spoken captions.
- Cool paper `#f1f2f6`: light-background logo applications.

The original palette remains unchanged. Graphic forms, rather than a new colour, create the refresh.

## Typography

Use Archivo only. Included static TTFs support raster video rendering; the variable WOFF2 supports the HTML review board. The original font's SIL Open Font License is included in `fonts/OFL.txt`.

- Wordmark: Archivo 800, width 118%, converted to vector outlines. Do not recreate it by typing the name in another font.
- Hook/title: 80 px at 1080×1920, width 118%, maximum two lines. Increase or shorten copy only after measuring. The title belongs in the opening, not above every shot for the whole clip.
- Captions: 56 px, weight 800, normal width, 66 px line height. Maximum two lines, preferably three to seven words per cue. Nine words is a soft ceiling, never permission to make an unreadable cue. Split at natural phrase boundaries. Shorten neither meaning nor qualifications to fit.
- Labels: 32 px, weight 600. Do not use tiny metadata as decoration.

Caption timings come from the speech, not evenly divided text. Preserve Indonesian mixed with English technical terms. Correct names against audio and episode context. No word-by-word bouncing, flashing, or full-line orange emphasis. Proper punctuation is preferred; fillers may be omitted only without changing meaning.

## Layout

Master format: 1080×1920, square pixels, 30 fps. Keep important text inside x=72 to x=900 and y=150 to y=1550. The rightmost 180 px and bottom 370 px are reserved conservatively for platform controls. Platform UI varies, so these are production defaults, not a universal guarantee. Test the exported video in the target app before publishing.

The small logo begins at x=72, y=150, width 360 px. The master SVG aspect ratio is preserved. The compact symbol can replace the wordmark when the full lockup would be illegible. Do not put a white logo directly on pale footage; use navy space or the dark-ink version.

Default caption text begins at x=72, y=1390. Text width is at most 828 px. Keep every text glyph and backing plate inside the safe bottom. Plates may extend 24 px beyond the text at the sides. Set lines by measured width, not by character count.

Three layout states:

- **Solo:** the active speaker occupies most of the frame. No permanent giant heading or ornamental border. Reframe based on the actual source shot.
- **Duo:** retain both speakers for exchanges and reactions. Scale or reposition panels to keep faces visible. Do not force a full-height crop that cuts mouths or foreheads.
- **Title:** a short blue field with the hook and small logo. This is the basis for an intro, not a completed animation.

The included PNGs are static layout studies using one real episode frame. Their caption text is illustrative and is not claimed to be a timed excerpt. The available source is a landscape composite with burned-in chat. Do not fabricate missing camera coverage or extend bodies with generative imagery. A frame that cannot support a clean solo crop should use the duo or a wider shot instead.

## Elevation & Depth

Flat colour only. Contrast and placement establish hierarchy. Caption plates are solid navy, not glass, blur, translucent gradients, or floating cards with shadows. The speaker is the visual subject; the shell stays secondary.

## Shapes

The primary symbol is two offset speech bubbles with opposing tails. The opening bubble carries three alternating-length lines. Rounded corners avoid a heavy software-window appearance. Do not add microphones, waveforms, code brackets, or extra bubbles.

Use the supplied SVGs:

- `logo-dark.svg`: near-white lettering for a dark ground.
- `logo-light.svg`: navy lettering for a light ground.
- `logo-stacked-dark.svg` and `logo-stacked-light.svg`: centred bookend/cover lockups.
- `logo-mono-dark.svg` and `logo-mono-light.svg`: single-ink applications, with real transparent cutouts.
- `symbol.svg` and monochrome symbol variants: compact applications.

Dark/light suffixes name the intended background, not the ink colour. Horizontal assets have a 790×160 viewBox; stacked assets have a 640×410 viewBox; symbols have a 160×160 viewBox. Never stretch, rotate, recolour, or add strokes.

Clear space is at least one eighth of the symbol's height around the complete lockup. At 1080-wide video resolution, use the horizontal lockup at 360 px wide or larger and the isolated symbol at 72 px or larger. Check the final phone-size result; these thresholds do not replace visual inspection.

## Components

**Logo bug:** stable placement near the top-left safe corner. Small, static during speech, never competing with a face. On pale footage use the appropriate ink variant or dedicated navy headroom.

**Caption plate:** solid navy, 16 px corner radius, 24 px padding. Near-white text. Measure the actual longest phrase. Never hide a face to preserve a fixed caption location; move the crop or switch layout.

**Speaker label:** optional, shows a verified name only when identification is useful. Do not guess a speaker from automatic transcription.

**Hook card:** title and logo only. No episode date, sponsor claim, or decorative counter by default. Let the first spoken hook enter promptly.

**Outro card:** stacked logo and “Obrolan lengkap di ngobrol.in”. A future animation should last no more than 1.5 seconds. It must not cut off the final sentence.

**Sponsor treatment:** retain visible source credits where the crop allows. Do not invent sponsorship for the new short or silently change source artwork.

## Do's and Don'ts

- Keep the original podcast audio. Caption cleanup is not permission to rewrite what was said.
- Use the speaker's expression and the other host's reaction as the primary motion.
- Choose a shot because the conversation changed, not because a timer expired.
- Prefer a hard cut for an actual speaker change. A restrained reframe can take 240 ms, using `cubic-bezier(0.16,1,0.3,1)`, only when it does not expose the other source panel or chat overlay.
- Hold a composition for roughly two seconds or longer unless the conversation justifies a quicker change. This is an editorial default, not a forced cadence.
- A logo reveal may take 420 ms within an intro no longer than 900 ms. Avoid withholding speech until the animation finishes.
- Captions switch immediately at phrase boundaries. Keep their location stable during shot transitions.
- Do not add zoom, shake, or motion to every caption. Do not use neon, bloom, glossy effects, stock music, or unlicensed sound effects.
- Logo/design-system approval does not authorize website changes or a new video render. Keep the existing pilot and website unchanged until the respective work is requested.

## Delivery status

Created in this phase: vector logo family, transparent raster exports, machine-readable tokens, formal design specification, responsive HTML review board, and static portrait studies.

Not created in this phase: animated intro, animated outro, automatic speaker tracking, a production video shell renderer, or a revised pilot video. Motion values are specifications awaiting an exercised video prototype.
