# ADR-002: Light and dark colour schemes with a toggle

## Status

Accepted. Supersedes the single dark ground listed as a hard constraint in `PRODUCT.md`, and the single light ground the November 2026 repaint replaced it with.

## Date

2026-11-13

## Context

The site has had one ground at a time. `PRODUCT.md` listed a dark navy ground (`#0e1122`) as a hard constraint. The November 2026 repaint replaced it with a light paper and did not update that line. Neither version responded to `prefers-color-scheme`, so a reader whose system was set the other way got the wrong one.

## Decision

- The site supports both schemes and follows the system preference by default.
- A two-state toggle in the footer lets a reader pin the other scheme. Toggling back to what the system shows removes the pin, so the site follows the system again.
- The pin is stored in `localStorage` under `color-scheme` as `light` or `dark`. No stored value means "follow the system".
- The light ground is the paper from the repaint. The dark ground is the navy the site used before it.
- The homepage cover block, filled controls and the orange stay the same in both schemes.
- The build-time share cards (`/og-image.png`, `/og-logo.png`, `/partners-og.png`) are fixed artwork and do not change with the scheme.

## How it works

- Each token that differs has its two values once in `src/styles/global.css`, as `--light-<name>` and `--dark-<name>`. The token itself resolves through `light-dark()`.
- `<meta name="color-scheme">` carries the state: `light dark`, `light` or `dark`. `:root:has()` rules map the meta back to the CSS `color-scheme` property, which `light-dark()` reads.
- An inline script in `<head>` applies the stored value before first paint and again on `astro:before-swap`, because the router brings in a head with the default meta.
- With scripts off, the meta stays `light dark` and the system preference decides.
- `src/styles/contrast.test.ts` runs every pairing in both schemes.

## Consequences

- A colour utility that pairs a fixed colour with a token that flips is a bug in one scheme. The cover block hit this: `text-ink` on a white button vanished in dark. Type on a fixed fill takes a fixed token.
- `light-dark()` has been in every major browser since May 2024. An older browser falls back to a `prefers-color-scheme` media query: it follows the system and ignores a pinned scheme.
- The comments widget cannot follow a pinned scheme on its own, so `Comments.astro` picks its theme and posts a `set-theme` message when the scheme changes.
- `public/offline.html` restates both palettes by hand, so a token change has to be made there too and the service worker cache name bumped.

## Alternatives considered

- **System only, no toggle.** Simpler, and what general guidance recommends for most sites. The maintainer chose to have a toggle.
- **A three-state control (system, light, dark).** Clearer for a settings page, too wide for a footer. The two-state toggle reaches all three states.
- **Media queries only, without `light-dark()`.** A pinned scheme then needs a second set of selectors for every token, and native controls and scrollbars do not follow it.
