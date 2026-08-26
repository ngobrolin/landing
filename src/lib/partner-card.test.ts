import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import {
  PARTNER_CARD_HEIGHT,
  PARTNER_CARD_SAFE_MARGIN,
  PARTNER_CARD_TEXT_BANDS,
  PARTNER_CARD_TEXT_LEFT,
  PARTNER_CARD_WIDTH,
  buildPartnerCardSvg,
  renderPartnerCard,
} from './partner-card';
import { getPartnerCardStats, type PartnerTile } from './partner-stats';

const SYNTHETIC: PartnerTile[] = [
  { id: 'episodes', scope: 'Acara Uji', value: '4.242', label: 'Label episode uji' },
  { id: 'subscribers', scope: 'Kanal Uji', value: '9.909', label: 'Label subscriber uji' },
  { id: 'age', scope: 'Kanal Uji', value: '11,1%', label: 'Label usia uji' },
];

describe('buildPartnerCardSvg', () => {
  it('renders whatever the stats module hands it, so the two cannot diverge', () => {
    const svg = buildPartnerCardSvg(SYNTHETIC);

    for (const tile of SYNTHETIC) {
      expect(svg).toContain(tile.value);
      expect(svg).toContain(tile.label);
      expect(svg).toContain(tile.scope);
    }

    // If the card kept its own copy of the real numbers, they would survive
    // being handed a different set. That is exactly the "164+" failure.
    for (const tile of getPartnerCardStats()) {
      expect(svg).not.toContain(tile.value);
    }
  });

  it('carries the real figures when handed the real stats', () => {
    const svg = buildPartnerCardSvg(getPartnerCardStats());

    for (const tile of getPartnerCardStats()) {
      expect(svg).toContain(tile.value);
      expect(svg).toContain(tile.label);
    }
  });

  it('names the show and the page it links to', () => {
    const svg = buildPartnerCardSvg(getPartnerCardStats());

    expect(svg).toContain('Ngobrolin WEB');
    expect(svg).toContain('ngobrol.in/partners');
  });

  it('asks for a font family fontconfig can always resolve', () => {
    // "system-ui" resolves to nothing on a Linux build agent and the text
    // silently disappears from the rasterised card.
    const svg = buildPartnerCardSvg(getPartnerCardStats());

    expect(svg).toContain('sans-serif');
    expect(svg).not.toContain('system-ui');
  });
});

describe('renderPartnerCard', () => {
  let png: Buffer;

  beforeAll(async () => {
    png = await renderPartnerCard();
  }, 30_000);

  it('is a PNG at the dimensions every share preview expects', async () => {
    const meta = await sharp(png).metadata();

    expect(meta.format).toBe('png');
    expect(meta.width).toBe(PARTNER_CARD_WIDTH);
    expect(meta.height).toBe(PARTNER_CARD_HEIGHT);
    expect(PARTNER_CARD_WIDTH / PARTNER_CARD_HEIGHT).toBeCloseTo(1.9, 1);
  });

  /**
   * A missing font does not fail the build: librsvg draws the background and
   * skips the glyphs, and the card ships blank. Measure ink instead of trusting
   * the SVG string.
   */
  async function maxLuma(
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<number> {
    // sharp's stats() reads the input image and ignores a pending extract(),
    // so crop to a buffer first and measure that.
    const { data, info } = await sharp(png)
      .extract({ left, top, width, height })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let max = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      max = Math.max(max, data[i], data[i + 1], data[i + 2]);
    }
    return max;
  }

  it('actually draws glyphs in every band that is supposed to hold text', async () => {
    expect(PARTNER_CARD_TEXT_BANDS.length).toBeGreaterThanOrEqual(4);

    for (const band of PARTNER_CARD_TEXT_BANDS) {
      // Start at the text origin, not the safe margin: the accent bar lives
      // between the two and would answer for the glyphs in the top bands.
      const ink = await maxLuma(
        PARTNER_CARD_TEXT_LEFT,
        band.top,
        PARTNER_CARD_WIDTH - PARTNER_CARD_TEXT_LEFT * 2,
        band.height
      );
      expect(ink, `no glyphs rendered in the "${band.name}" band`).toBeGreaterThan(80);
    }
  });

  it('clips nothing: the safe margins stay clear of content', async () => {
    const strips: Array<[number, number, number, number]> = [
      [0, 0, PARTNER_CARD_SAFE_MARGIN, PARTNER_CARD_HEIGHT],
      [
        PARTNER_CARD_WIDTH - PARTNER_CARD_SAFE_MARGIN,
        0,
        PARTNER_CARD_SAFE_MARGIN,
        PARTNER_CARD_HEIGHT,
      ],
      [0, 0, PARTNER_CARD_WIDTH, PARTNER_CARD_SAFE_MARGIN],
      [
        0,
        PARTNER_CARD_HEIGHT - PARTNER_CARD_SAFE_MARGIN,
        PARTNER_CARD_WIDTH,
        PARTNER_CARD_SAFE_MARGIN,
      ],
    ];

    for (const [left, top, width, height] of strips) {
      expect(
        await maxLuma(left, top, width, height),
        `content reaches the margin at ${left},${top}`
      ).toBeLessThan(80);
    }
  });

  it('stays small enough that a link preview fetches it', () => {
    // LinkedIn and WhatsApp give up on large images.
    expect(png.byteLength).toBeLessThan(1_000_000);
  });
});
