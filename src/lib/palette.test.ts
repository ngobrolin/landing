import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPalette, token } from './palette';

const GLOBAL_CSS = readFileSync(
  fileURLToPath(new URL('../styles/global.css', import.meta.url)),
  'utf8'
);

describe('getPalette', () => {
  it('reads the tokens out of global.css rather than restating them', () => {
    const palette = getPalette();

    // If this module kept its own copy, the values would still look like
    // colours - so prove they came from the stylesheet by finding each one
    // there. Asserting the literal values instead would freeze the palette and
    // go red on a repaint that behaved correctly.
    for (const [name, value] of Object.entries(palette)) {
      expect(GLOBAL_CSS, `--color-${name} is not declared in global.css`).toContain(
        `--color-${name}: ${value}`
      );
    }
  });

  it('finds every token the theme block declares', () => {
    const declared = [...GLOBAL_CSS.matchAll(/--color-([a-z-]+):/g)].map(m => m[1]);

    expect(declared.length).toBeGreaterThan(0);
    expect(Object.keys(getPalette()).sort()).toEqual([...new Set(declared)].sort());
  });

  it('returns six-digit hex values, which is what SVG fill needs', () => {
    for (const value of Object.values(getPalette())) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('token', () => {
  it('resolves a declared token', () => {
    expect(token('surface')).toBe(getPalette().surface);
  });

  /**
   * The whole point of reading the stylesheet is that a rename cannot silently
   * paint a share card black on black. A missing token has to be loud.
   */
  it('throws on a token that is not declared, naming what it looked for', () => {
    expect(() => token('surface-that-does-not-exist')).toThrow(
      /surface-that-does-not-exist/
    );
  });
});
