import sharp from 'sharp';
import { token } from './palette';
import {
  OG_BAND_FRACTION,
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  OG_LOGO_SIZE,
} from './og-card-geometry';

/**
 * The site-wide share card, drawn at build time.
 *
 * What it replaced, and why it is generated: `public/og-image.png` was a
 * hand-made raster with no source file, so the cover repaint could only
 * hue-rotate it. The filter did not land on the palette - the ground came out a
 * purple-black at hue 258 where the tokens are hue 233, one corner desaturated
 * to a neutral grey, and the wordmark landed on a blue in no token measuring
 * 2.86:1 against its own ground. Nothing went red, because the contrast tests
 * guard the stylesheet and nothing guarded an image. It also weighed 1.0 MB,
 * which is past the point where WhatsApp silently drops a link preview.
 *
 * The design quotes the podcast cover - the artwork already on every podcast
 * directory carrying this show - so the share card, the feed logo, the favicon,
 * the /partners card and the cover are visibly one property. The letterforms
 * approximate the cover's logotype rather than matching it: the cover uses a
 * real oblique display face, and this obliques the fontconfig `sans-serif`,
 * because embedding a font is the one thing that would put the build agent's
 * rendering back at the mercy of what happens to be installed.
 *
 * Two rules hold the whole file together, both learned the hard way:
 *
 * 1. `sans-serif`, never `system-ui`. librsvg resolves fonts through
 *    fontconfig; `system-ui` maps to nothing on a Linux build agent and the
 *    failure is silent - the bands render and the glyphs do not.
 * 2. Nothing measures text. `sans-serif` is Helvetica on a Mac and DejaVu Sans
 *    on the agent, so any width computed here would be wrong in production.
 *    Every string is anchored `start` or `middle`, and the cast shadow is a
 *    duplicate of the same anchored string rather than a shape placed behind a
 *    measured one.
 */

export {
  OG_BAND_FRACTION,
  OG_CARD_HEIGHT,
  OG_CARD_STAGE_CLEARANCE,
  OG_CARD_TEXT_BANDS,
  OG_CARD_WIDTH,
  OG_IMAGE_PATH,
  OG_LOGO_CLEARANCE,
  OG_LOGO_PATH,
  OG_LOGO_SIZE,
  RSS_IMAGE_MAX_WIDTH,
} from './og-card-geometry';

/**
 * librsvg resolves fonts through fontconfig. "system-ui" maps to nothing on a
 * Linux build agent, and the failure is silent: the background renders and the
 * glyphs simply do not. "sans-serif" is the one family fontconfig always
 * aliases to something installed.
 */
const FONT = 'sans-serif';

/** The cover's wordmark is white, not a token. Everything else is a token. */
const WORDMARK = '#ffffff';

const escape = (value: string) =>
  value.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[
      char
    ]!
  );

interface TextOptions {
  x: number;
  y: number;
  size: number;
  fill: string;
  weight?: string;
  anchor?: 'start' | 'middle';
  letterSpacing?: number;
  italic?: boolean;
  opacity?: number;
}

function text(content: string, opts: TextOptions): string {
  const {
    x,
    y,
    size,
    fill,
    weight = 'normal',
    anchor = 'start',
    letterSpacing,
    italic,
    opacity,
  } = opts;

  return (
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" ` +
    `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"` +
    (letterSpacing === undefined ? '' : ` letter-spacing="${letterSpacing}"`) +
    (italic ? ' font-style="italic"' : '') +
    (opacity === undefined ? '' : ` opacity="${opacity}"`) +
    `>${escape(content)}</text>`
  );
}

/**
 * The cover sets its wordmark on a hard offset shadow. Drawing the same
 * anchored string twice reproduces it without knowing how wide the string is -
 * an `feDropShadow` would work too, but this keeps the card to shapes and text,
 * which is the part of SVG librsvg has never surprised us on.
 */
function castText(content: string, opts: TextOptions, offset = 8): string {
  return (
    text(content, { ...opts, x: opts.x + offset, y: opts.y + offset, fill: token('surface') }) +
    text(content, opts)
  );
}

export function buildOgCardSvg(): string {
  const band = Math.round(OG_CARD_WIDTH * OG_BAND_FRACTION);
  const centre = OG_CARD_WIDTH / 2;
  const stage = OG_CARD_WIDTH - band * 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_CARD_WIDTH}" height="${OG_CARD_HEIGHT}" viewBox="0 0 ${OG_CARD_WIDTH} ${OG_CARD_HEIGHT}">`,

    // The cover's framing: blue and purple as hard vertical bands either side
    // of the navy panel the wordmark sits on. Not a gradient - DESIGN.md is
    // explicit that they are bands, whatever they look like at thumbnail size.
    `<rect x="0" y="0" width="${band}" height="${OG_CARD_HEIGHT}" fill="${token('accent')}"/>`,
    `<rect x="${band}" y="0" width="${stage}" height="${OG_CARD_HEIGHT}" fill="${token('surface-raised')}"/>`,
    `<rect x="${OG_CARD_WIDTH - band}" y="0" width="${band}" height="${OG_CARD_HEIGHT}" fill="${token('highlight')}"/>`,

    // The cover's own underlined eyebrow. It is the one element that tells a
    // stranger what the thing is; the wordmark alone is a name and a URL.
    text('VIDEO PODCAST', {
      x: centre,
      y: 130,
      size: 26,
      fill: WORDMARK,
      weight: 'bold',
      anchor: 'middle',
      letterSpacing: 8,
    }),
    `<rect x="${centre - 126}" y="146" width="252" height="3" fill="${WORDMARK}"/>`,

    castText('NGOBROLIN', {
      x: centre,
      y: 300,
      size: 104,
      fill: WORDMARK,
      weight: 'bold',
      anchor: 'middle',
      italic: true,
    }),
    castText('WEB', {
      x: centre,
      y: 462,
      size: 170,
      fill: WORDMARK,
      weight: 'bold',
      anchor: 'middle',
      italic: true,
    }),

    `<rect x="${centre - 320}" y="524" width="640" height="1.5" fill="${WORDMARK}" opacity="0.4"/>`,
    text('Setiap Selasa 20:00 WIB  •  ngobrol.in', {
      x: centre,
      y: 574,
      size: 30,
      fill: WORDMARK,
      anchor: 'middle',
      opacity: 0.94,
    }),

    '</svg>',
  ].join('');
}

/**
 * The same brand at the size RSS 2.0 actually asks for.
 *
 * The feed published the 1200x630 banner as its channel `<image>`, which is
 * wrong twice: the spec allows GIF, JPEG or PNG and the file was an SVG, and it
 * caps the image at 144 wide, so a landscape banner would have been squashed to
 * illegibility even in the right format. Here the bands stay equal thirds - at
 * 1:1 there is no stage to protect, and equal thirds is what the cover is.
 */
export function buildOgLogoSvg(): string {
  const third = OG_LOGO_SIZE / 3;
  const centre = OG_LOGO_SIZE / 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_LOGO_SIZE}" height="${OG_LOGO_SIZE}" viewBox="0 0 ${OG_LOGO_SIZE} ${OG_LOGO_SIZE}">`,
    `<rect x="0" y="0" width="${third}" height="${OG_LOGO_SIZE}" fill="${token('accent')}"/>`,
    `<rect x="${third}" y="0" width="${third}" height="${OG_LOGO_SIZE}" fill="${token('surface-raised')}"/>`,
    `<rect x="${third * 2}" y="0" width="${third}" height="${OG_LOGO_SIZE}" fill="${token('highlight')}"/>`,
    castText(
      'NGOBROLIN',
      {
        x: centre,
        y: 58,
        size: 18,
        fill: WORDMARK,
        weight: 'bold',
        anchor: 'middle',
        italic: true,
      },
      2
    ),
    castText(
      'WEB',
      {
        x: centre,
        y: 106,
        size: 40,
        fill: WORDMARK,
        weight: 'bold',
        anchor: 'middle',
        italic: true,
      },
      2
    ),
    '</svg>',
  ].join('');
}

const toPng = (svg: string): Promise<Buffer> =>
  sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();

export const renderOgCard = (): Promise<Buffer> => toPng(buildOgCardSvg());
export const renderOgLogo = (): Promise<Buffer> => toPng(buildOgLogoSvg());
