import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The palette is sampled from the podcast cover, which is an artwork rather than
 * a design system: nothing about being on-brand makes a pairing legible. So this
 * asserts the WCAG floors, not the values.
 *
 * Deliberately NOT a snapshot of today's tokens. Repainting the site is allowed
 * and should stay allowed; shipping a pairing a reader cannot resolve is not.
 * Every case below names a pairing the markup actually uses - grep the token
 * names to see where - and the only way to make one go red is to break it.
 */

const CSS = readFileSync(
  fileURLToPath(new URL('./global.css', import.meta.url)),
  'utf8'
);

function token(name: string): string {
  const match = CSS.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`--color-${name} is not defined in global.css`);
  return match[1];
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['surface', 'surface-raised', 'surface-overlay'] as const;

/** WCAG 1.4.3: 4.5:1 for body text, 3:1 for large text and 1.4.11 components. */
const TEXT_AA = 4.5;
const NON_TEXT_AA = 3;

describe('palette contrast', () => {
  describe.each(SURFACES)('on %s', surface => {
    const ground = () => token(surface);

    it.each([
      'ink',
      'ink-body',
      'ink-muted',
      'ink-subtle',
      'accent-text',
      'highlight-text',
    ])('%s clears AA for body text', name => {
      expect(ratio(token(name), ground())).toBeGreaterThanOrEqual(TEXT_AA);
    });

    it('surface-border-strong clears the 3:1 a control boundary owes', () => {
      expect(
        ratio(token('surface-border-strong'), ground())
      ).toBeGreaterThanOrEqual(NON_TEXT_AA);
    });
  });

  it.each(['accent-strong', 'highlight-strong'])(
    'a filled %s button carries ink at AA',
    name => {
      // The sampled accents are too light to sit under white; these are the
      // darkened pair the filled buttons actually use.
      expect(ratio(token('ink'), token(name))).toBeGreaterThanOrEqual(TEXT_AA);
    }
  );

  it('separates every step of the surface scale', () => {
    // Three greys two points apart is what this palette replaced. A step has to
    // be visible or it is not a step.
    const steps = SURFACES.map(token);
    for (let i = 1; i < steps.length; i += 1) {
      expect(
        ratio(steps[i], steps[i - 1]),
        `${SURFACES[i]} is indistinguishable from ${SURFACES[i - 1]}`
      ).toBeGreaterThan(1.1);
    }
  });

  it('keeps the text ladder in descending order, so a rung means something', () => {
    const rungs = ['ink', 'ink-body', 'ink-muted', 'ink-subtle'] as const;
    const contrasts = rungs.map(name => ratio(token(name), token('surface')));
    for (let i = 1; i < contrasts.length; i += 1) {
      expect(
        contrasts[i],
        `${rungs[i]} does not read as quieter than ${rungs[i - 1]}`
      ).toBeLessThan(contrasts[i - 1]);
    }
  });
});
