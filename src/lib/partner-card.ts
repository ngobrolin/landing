import sharp from 'sharp';
import { getPartnerCardStats, type PartnerTile } from './partner-stats';

/**
 * The `/partners` share card, drawn at build time from `partner-stats.ts`.
 *
 * A sponsor most often meets this page as a link pasted into WhatsApp, LinkedIn
 * or an email, so the preview has to work as a one-page media kit on its own.
 * It is generated rather than hand-made for one reason: a static image would be
 * a second copy of the figures, and a card that disagrees with the page it
 * links to is worse than no card at all. Nothing below states a number.
 */

export const PARTNER_CARD_WIDTH = 1200;
export const PARTNER_CARD_HEIGHT = 630;
/** Preview crops nibble the edges; keep every glyph inside this inset. */
export const PARTNER_CARD_SAFE_MARGIN = 48;

/** Where text is drawn, so a test can check glyphs actually landed there. */
export const PARTNER_CARD_TEXT_BANDS = [
  { name: 'wordmark', top: 74, height: 60 },
  { name: 'headline', top: 150, height: 76 },
  { name: 'lead', top: 240, height: 44 },
  { name: 'figures', top: 330, height: 170 },
  { name: 'footer', top: 530, height: 50 },
] as const;

const BACKGROUND = '#0f0f0f';
const ACCENT = '#818cf8';
const ACCENT_BAR = '#6366f1';
const MUTED = '#9ca3af';
const FAINT = '#6b7280';

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
  const left = PARTNER_CARD_SAFE_MARGIN + 44;
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
    `<rect x="${PARTNER_CARD_SAFE_MARGIN + 12}" y="74" width="8" height="220" rx="4" fill="${ACCENT_BAR}"/>`,
    text('Ngobrolin WEB', {
      x: left,
      y: 122,
      size: 44,
      fill: '#ffffff',
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
    `<rect x="${left}" y="316" width="${PARTNER_CARD_WIDTH - left * 2}" height="1" fill="#27272a"/>`,
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
