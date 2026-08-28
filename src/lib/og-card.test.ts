import { beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  OG_CARD_HEIGHT,
  OG_BAND_FRACTION,
  OG_CARD_STAGE_CLEARANCE,
  OG_CARD_TEXT_BANDS,
  OG_CARD_WIDTH,
  OG_LOGO_CLEARANCE,
  OG_LOGO_SIZE,
  RSS_IMAGE_MAX_WIDTH,
  buildOgCardSvg,
  buildOgLogoSvg,
  renderOgCard,
  renderOgLogo,
} from './og-card';
import { getPalette, token } from './palette';

const HEX = /#[0-9a-fA-F]{6}/g;

/** sRGB relative luminance, per WCAG 2.x. */
function luminance([r, g, b]: number[]): number {
  const [rr, gg, bb] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const hex = ([r, g, b]: number[]) =>
  '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

describe('buildOgCardSvg', () => {
  const svg = buildOgCardSvg();

  it('asks for a font family fontconfig can always resolve', () => {
    // "system-ui" resolves to nothing on a Linux build agent and the failure is
    // silent: the bands render and the glyphs simply do not. `og-image.svg`,
    // which this replaces, asked for exactly that - harmless while a browser
    // drew it, fatal the moment anything rasterised it.
    expect(svg).toContain('sans-serif');
    expect(svg).not.toContain('system-ui');
  });

  it('anchors every string, so no layout depends on measuring text', () => {
    // sans-serif is Helvetica on a Mac and DejaVu Sans on the build agent, so
    // any width this module computed for itself would be wrong in production.
    const anchors = [...svg.matchAll(/<text\b[^>]*>/g)].map(m => m[0]);

    expect(anchors.length).toBeGreaterThan(0);
    for (const tag of anchors) {
      expect(tag, `unanchored <text>: ${tag}`).toMatch(
        /text-anchor="(start|middle)"/
      );
      expect(tag, `<text> carries a width, which cannot be known: ${tag}`).not.toMatch(
        /\btextLength=/
      );
    }
  });

  it('paints only palette tokens and white', () => {
    // The wordmark is white because the cover's wordmark is white; everything
    // else has to be a token, or this card becomes the fifth hand-maintained
    // copy of the palette rather than one fewer.
    const allowed = new Set([...Object.values(getPalette()), '#ffffff']);

    for (const literal of svg.match(HEX) ?? []) {
      expect(allowed, `off-palette literal ${literal}`).toContain(
        literal.toLowerCase()
      );
    }
  });

  it('names the show, the schedule and the site', () => {
    expect(svg).toContain('NGOBROLIN');
    expect(svg).toContain('WEB');
    expect(svg).toContain('VIDEO PODCAST');
    expect(svg).toContain('ngobrol.in');
  });
});

describe('renderOgCard', () => {
  let png: Buffer;
  let pixels: { data: Buffer; channels: number; width: number };

  beforeAll(async () => {
    png = await renderOgCard();
    const raw = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    pixels = { data: raw.data, channels: raw.info.channels, width: raw.info.width };
  }, 30_000);

  const at = (x: number, y: number): number[] => {
    const i = (y * pixels.width + x) * pixels.channels;
    return [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]];
  };

  it('is a PNG at the size every share preview expects', async () => {
    const meta = await sharp(png).metadata();

    expect(meta.format).toBe('png');
    expect(meta.width).toBe(OG_CARD_WIDTH);
    expect(meta.height).toBe(OG_CARD_HEIGHT);
    // 1.91:1 is what Facebook, LinkedIn, Slack, Discord and WhatsApp all
    // assume; 1200x630 is 1.905, which is the canonical way of expressing it.
    expect(OG_CARD_WIDTH / OG_CARD_HEIGHT).toBeGreaterThan(1.9);
    expect(OG_CARD_WIDTH / OG_CARD_HEIGHT).toBeLessThan(1.92);
  });

  it('stays under the size at which WhatsApp drops the preview entirely', () => {
    // WhatsApp gives up somewhere around 300 KB and caches the failure for
    // about a week. The hand-made raster this replaces was 1,069,114 bytes.
    expect(png.byteLength).toBeLessThan(300_000);
  });

  /**
   * The regression this whole change exists to make visible.
   *
   * `src/styles/contrast.test.ts` guards the stylesheet, so the site's surfaces
   * cannot drift. Nothing guarded the share image, which is how a hue rotation
   * moved its ground to hue 258 and its wordmark to a blue in no token, and the
   * repaint shipped believing it had swept every surface. Assert the rendered
   * pixels ARE the palette, not that some glyphs appeared.
   */
  it('renders the cover\'s bands in the palette\'s own colours', () => {
    const midY = Math.round(OG_CARD_HEIGHT * 0.9); // below the type, in flat colour

    expect(hex(at(12, midY))).toBe(token('accent'));
    expect(hex(at(OG_CARD_WIDTH - 12, midY))).toBe(token('highlight'));
    expect(hex(at(Math.round(OG_CARD_WIDTH / 2), 12))).toBe(token('surface-raised'));
  });

  it('keeps the wordmark legible against the stage it sits on', () => {
    const stage = at(Math.round(OG_CARD_WIDTH / 2), 12);

    // Brightest pixel across the lockup: the wordmark itself, measured rather
    // than assumed, so a fill that stopped rendering fails here too.
    const band = OG_CARD_TEXT_BANDS.find(b => b.name === 'wordmark')!;
    let brightest = [0, 0, 0];
    for (let y = band.top; y < band.top + band.height; y += 2) {
      for (let x = 0; x < OG_CARD_WIDTH; x += 2) {
        const px = at(x, y);
        if (luminance(px) > luminance(brightest)) brightest = px;
      }
    }

    expect(contrast(brightest, stage)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The type sizes in this card were chosen against Helvetica, because that is
   * what fontconfig resolves `sans-serif` to on a Mac. The build agent resolves
   * it to DejaVu Sans, which is about a tenth wider. So "it fits" is a claim
   * about one machine unless something measures it on the other - and CI runs
   * these tests on Linux.
   */
  it('keeps every glyph on the stage, whatever sans-serif resolves to', () => {
    const band = Math.round(OG_CARD_WIDTH * OG_BAND_FRACTION);
    const left = band + OG_CARD_STAGE_CLEARANCE;
    const right = OG_CARD_WIDTH - band - OG_CARD_STAGE_CLEARANCE;
    const isGlyph = (p: number[]) => p[0] > 220 && p[1] > 220 && p[2] > 220;

    for (const textBand of OG_CARD_TEXT_BANDS) {
      for (let y = textBand.top; y < textBand.top + textBand.height; y++) {
        for (let x = 0; x < left; x++) {
          expect(
            isGlyph(at(x, y)),
            `"${textBand.name}" reaches x=${x}, past the stage edge at ${left}`
          ).toBe(false);
        }
        for (let x = right; x < OG_CARD_WIDTH; x++) {
          expect(
            isGlyph(at(x, y)),
            `"${textBand.name}" reaches x=${x}, past the stage edge at ${right}`
          ).toBe(false);
        }
      }
    }
  });

  it('actually draws glyphs in every band that is supposed to hold text', () => {
    expect(OG_CARD_TEXT_BANDS.length).toBeGreaterThanOrEqual(3);

    for (const band of OG_CARD_TEXT_BANDS) {
      // The bands are saturated colour, so "is anything bright here" is not
      // enough - white type has to beat the brightest band by a clear margin.
      let brightest = 0;
      for (let y = band.top; y < band.top + band.height; y += 2) {
        for (let x = 0; x < OG_CARD_WIDTH; x += 2) {
          brightest = Math.max(brightest, luminance(at(x, y)));
        }
      }
      expect(brightest, `no glyphs rendered in the "${band.name}" band`).toBeGreaterThan(
        0.85
      );
    }
  });
});

describe('renderOgLogo', () => {
  it('fits the size RSS 2.0 actually allows for a channel image', async () => {
    // The feed used to point at the 1200x630 banner, as an SVG. RSS 2.0 allows
    // GIF, JPEG or PNG only, and caps the image at 144 wide - so the banner
    // could never have worked there even in the right format.
    const png = await renderOgLogo();
    const meta = await sharp(png).metadata();

    expect(meta.format).toBe('png');
    expect(meta.width).toBe(OG_LOGO_SIZE);
    expect(meta.height).toBe(OG_LOGO_SIZE);
    expect(OG_LOGO_SIZE).toBeLessThanOrEqual(RSS_IMAGE_MAX_WIDTH);
  }, 30_000);

  it('keeps its glyphs off the edge, whatever sans-serif resolves to', async () => {
    // Same trap as the banner, less room to absorb it: at 144px a tenth more
    // glyph width is the difference between a margin and a clipped wordmark.
    const png = await renderOgLogo();
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number): number[] => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const isGlyph = (p: number[]) => p[0] > 220 && p[1] > 220 && p[2] > 220;

    for (let y = 0; y < OG_LOGO_SIZE; y++) {
      for (let x = 0; x < OG_LOGO_SIZE; x++) {
        const nearEdge =
          x < OG_LOGO_CLEARANCE ||
          x >= OG_LOGO_SIZE - OG_LOGO_CLEARANCE ||
          y < OG_LOGO_CLEARANCE ||
          y >= OG_LOGO_SIZE - OG_LOGO_CLEARANCE;
        if (nearEdge) {
          expect(isGlyph(at(x, y)), `logo glyph at the edge: ${x},${y}`).toBe(false);
        }
      }
    }
  }, 30_000);

  it('is the same brand as the banner, from the same tokens', () => {
    const svg = buildOgLogoSvg();
    const allowed = new Set([...Object.values(getPalette()), '#ffffff']);

    expect(svg).toContain('sans-serif');
    expect(svg).not.toContain('system-ui');
    expect(svg).toContain('NGOBROLIN');
    for (const literal of svg.match(HEX) ?? []) {
      expect(allowed, `off-palette literal ${literal}`).toContain(
        literal.toLowerCase()
      );
    }
  });
});
