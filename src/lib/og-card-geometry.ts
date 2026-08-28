/**
 * The site-wide share card's geometry and its two public paths, kept apart from
 * the renderer that uses them.
 *
 * Same split, and for the same reason, as `partner-card-geometry.ts`:
 * `og-card.ts` reaches sharp and, through `palette.ts`, the filesystem. A
 * consumer that only wants the numbers - `Layout.astro` emitting
 * `og:image:width`, `rss.xml.ts` naming the channel image - should not have to
 * drag the renderer in to get them.
 */

export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

/**
 * Where the two artefacts live. Named here so the endpoint that draws each one
 * and the markup that points at it cannot drift apart - which is exactly how
 * the site came to publish two unrelated images, `/og-image.png` in the meta
 * tags and `/og-image.svg` in the feed.
 *
 * `/og-image.png` keeps the URL the hand-made raster used, so nothing already
 * scraped or linked has to be re-fetched.
 */
export const OG_IMAGE_PATH = '/og-image.png';
export const OG_LOGO_PATH = '/og-logo.png';

/**
 * RSS 2.0 on the channel `<image>`: "Maximum value for width is 144, default
 * value is 88." The feed pointed at a 1200x630 banner, so even once the format
 * was right the shape would not have been.
 */
export const RSS_IMAGE_MAX_WIDTH = 144;
export const OG_LOGO_SIZE = 144;

/**
 * The logo's equivalent of `OG_CARD_STAGE_CLEARANCE`: at 144px there is no
 * stage to stay on, so the rule is simply that no glyph reaches the edge. Same
 * reason - the sizes were picked against Helvetica and the build agent draws
 * DejaVu Sans.
 */
export const OG_LOGO_CLEARANCE = 8;

/**
 * How much of the width each outer band takes.
 *
 * The podcast cover is three equal vertical thirds - measured off
 * `public/podcast-cover.jpg`, not eyeballed: blue to x=1008, navy to x=2016,
 * purple to x=3000 of 3000. But the cover is 1:1 and this card is 1.91:1, so
 * equal thirds here leave the navy stage only 400px wide and most of the
 * lockup lands on saturated colour with its cast shadow crossing three
 * different grounds. Narrowing the bands keeps the identity - which is the
 * whole argument for quoting the cover - while giving the wordmark a stage.
 *
 * This is the one number to change if the proportion should be more literal:
 * 1/3 is the cover exactly, 0.115 reduces the bands to a frame.
 */
export const OG_BAND_FRACTION = 0.17;

/**
 * How close a glyph may come to the band it sits beside.
 *
 * This is the clipping guard, and it is the only defence against the trap that
 * type sizes here were chosen against Helvetica, which is what fontconfig
 * resolves `sans-serif` to on a Mac. The Linux build agent resolves it to
 * DejaVu Sans, which is roughly a tenth wider - so a lockup that merely fits
 * locally can run onto the bands, or off the canvas, in production. CI runs the
 * unit tests on Linux, so the assertion in `og-card.test.ts` that uses this is
 * what actually catches it.
 *
 * Deliberately slack: it exists to catch a real overflow, not to freeze one
 * font's metrics. Measured clearance is ~85px on Helvetica and ~40px predicted
 * on DejaVu Sans.
 */
export const OG_CARD_STAGE_CLEARANCE = 24;

/** Where text is drawn, so a test can check glyphs actually landed there. */
export const OG_CARD_TEXT_BANDS = [
  { name: 'eyebrow', top: 96, height: 44 },
  { name: 'wordmark', top: 180, height: 300 },
  { name: 'strapline', top: 540, height: 40 },
] as const;
