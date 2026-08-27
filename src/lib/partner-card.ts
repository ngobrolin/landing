import sharp from 'sharp';
import { getPartnerCardStats, type PartnerTile } from './partner-stats';
import {
  PARTNER_CARD_HEIGHT,
  PARTNER_CARD_SAFE_MARGIN,
  PARTNER_CARD_TEXT_LEFT,
  PARTNER_CARD_WIDTH,
} from './partner-card-geometry';

/**
 * The `/partners` share card, drawn at build time from `partner-stats.ts`.
 *
 * A sponsor most often meets this page as a link pasted into WhatsApp, LinkedIn
 * or an email, so the preview has to work as a one-page media kit on its own.
 * It is generated rather than hand-made for one reason: a static image would be
 * a second copy of the figures, and a card that disagrees with the page it
 * links to is worse than no card at all. Nothing below states a number.
 */

export {
  PARTNER_CARD_HEIGHT,
  PARTNER_CARD_SAFE_MARGIN,
  PARTNER_CARD_TEXT_BANDS,
  PARTNER_CARD_TEXT_LEFT,
  PARTNER_CARD_WIDTH,
} from './partner-card-geometry';

/**
 * The same tokens as `src/styles/global.css`, restated because librsvg has no
 * stylesheet to read. A sponsor sees this card next to the page it links to, so
 * the two have to be the same colours; when a token there moves, move it here.
 */
const BACKGROUND = '#0e1122'; // --color-surface
const INK = '#f2f4fd'; // --color-ink
const ACCENT = '#86a2fe'; // --color-accent-text
const ACCENT_BAND = '#6588fe'; // --color-accent      (cover blue)
const HIGHLIGHT_BAND = '#a76ab7'; // --color-highlight   (cover purple)
const MUTED = '#a8b0d2'; // --color-ink-muted
const FAINT = '#8a94bd'; // --color-ink-subtle
const HAIRLINE = '#333c66'; // --color-surface-border

/**
 * librsvg resolves fonts through fontconfig. "system-ui" maps to nothing on a
 * Linux build agent, and the failure is silent: the background renders and the
 * glyphs simply do not. "sans-serif" is the one family fontconfig always
 * aliases to something installed.
 */
const FONT = 'sans-serif';

const escape = (value: string) =>
  value.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[
      char
    ]!
  );

function text(
  content: string,
  {
    x,
    y,
    size,
    fill,
    weight = 'normal',
    anchor = 'start',
    letterSpacing,
  }: {
    x: number;
    y: number;
    size: number;
    fill: string;
    weight?: string;
    anchor?: 'start' | 'middle';
    letterSpacing?: number;
  }
): string {
  const spacing =
    letterSpacing === undefined ? '' : ` letter-spacing="${letterSpacing}"`;
  return (
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" ` +
    `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${spacing}>` +
    `${escape(content)}</text>`
  );
}

export function buildPartnerCardSvg(tiles: PartnerTile[]): string {
  const left = PARTNER_CARD_TEXT_LEFT;
  const columnWidth =
    (PARTNER_CARD_WIDTH - PARTNER_CARD_SAFE_MARGIN * 2 - 88) / tiles.length;

  const figures = tiles
    .map((tile, index) => {
      const centre = left + columnWidth * (index + 0.5);
      return [
        text(tile.scope, {
          x: centre,
          y: 356,
          size: 18,
          fill: FAINT,
          anchor: 'middle',
          letterSpacing: 1.6,
        }),
        text(tile.value, {
          x: centre,
          y: 434,
          size: 68,
          fill: ACCENT,
          weight: 'bold',
          anchor: 'middle',
        }),
        text(tile.label, {
          x: centre,
          y: 480,
          size: 22,
          fill: MUTED,
          anchor: 'middle',
        }),
      ].join('');
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PARTNER_CARD_WIDTH}" height="${PARTNER_CARD_HEIGHT}" viewBox="0 0 ${PARTNER_CARD_WIDTH} ${PARTNER_CARD_HEIGHT}">`,
    `<rect width="${PARTNER_CARD_WIDTH}" height="${PARTNER_CARD_HEIGHT}" fill="${BACKGROUND}"/>`,
    // The one place the site quotes the cover's own framing: the artwork sets
    // the blue and the purple side by side as vertical bands, and this rule is
    // the card's version of that.
    `<defs><linearGradient id="brand-band" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${ACCENT_BAND}"/>` +
      `<stop offset="100%" stop-color="${HIGHLIGHT_BAND}"/>` +
      `</linearGradient></defs>`,
    `<rect x="${PARTNER_CARD_SAFE_MARGIN + 12}" y="74" width="8" height="220" rx="4" fill="url(#brand-band)"/>`,
    text('Ngobrolin WEB', {
      x: left,
      y: 122,
      size: 44,
      fill: INK,
      weight: 'bold',
    }),
    text('Sponsor & pasang iklan', {
      x: left,
      y: 210,
      size: 60,
      fill: ACCENT,
      weight: 'bold',
    }),
    text('Video podcast developer Indonesia, tayang setiap Selasa malam', {
      x: left,
      y: 274,
      size: 28,
      fill: MUTED,
    }),
    `<rect x="${left}" y="316" width="${PARTNER_CARD_WIDTH - left * 2}" height="1" fill="${HAIRLINE}"/>`,
    figures,
    text('ngobrol.in/partners', {
      x: left,
      y: 566,
      size: 26,
      fill: FAINT,
    }),
    '</svg>',
  ].join('');
}

export async function renderPartnerCard(): Promise<Buffer> {
  const svg = buildPartnerCardSvg(getPartnerCardStats());
  return sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
}
