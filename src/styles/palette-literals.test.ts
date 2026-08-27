import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The site used to carry a flat indigo (`#5c5fed`/`#818cf8`) and three
 * near-identical greys (`#0f0f0f`/`#1a1a1a`/`#2a2a2a`) that came from nowhere -
 * not from the podcast cover, not from the channel. They were replaced by the
 * tokens in `global.css`, sampled from `public/podcast-cover.jpg`.
 *
 * The way that repaint gets quietly undone is not by someone re-editing the
 * theme block; it is by a new component reaching for a literal, the way
 * `ScrollButtons`, `YouTubeEmbed`, `partner-card.ts` and `og-image.svg` each
 * already had. So this asserts the RULE - a retired literal appears nowhere -
 * rather than the current token values, which are free to move.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Every literal the pre-cover palette shipped, including its two strays. */
const RETIRED = [
  '#5c5fed', // primary
  '#818cf8', // primary-light
  '#6366f1', // the indigo two components hardcoded instead of the token
  '#0f0f0f', // dark
  '#1a1a1a', // dark-card
  '#2a2a2a', // dark-border
];

const SEARCHED = ['src', 'public', 'e2e', 'scripts'];
const EXTENSIONS = new Set([
  '.astro',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.css',
  '.html',
  '.svg',
]);
/** Episode content is not ours to edit, and the build never reads it as code. */
const EXCLUDED = ['src/data', 'node_modules', 'dist'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full);
    if (EXCLUDED.some(skip => rel === skip || rel.startsWith(`${skip}/`))) {
      continue;
    }
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

describe('the retired palette', () => {
  // This file is the registry of what is banned, so it is the one place the
  // literals are allowed to appear.
  const SELF = relative(ROOT, fileURLToPath(import.meta.url));
  const files = SEARCHED.flatMap(dir => sourceFiles(join(ROOT, dir))).filter(
    file => relative(ROOT, file) !== SELF
  );

  it('has some source to check, so a broken walk cannot pass silently', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(RETIRED)('no source file still writes %s', literal => {
    const offenders = files
      .filter(file =>
        readFileSync(file, 'utf8').toLowerCase().includes(literal)
      )
      .map(file => relative(ROOT, file));

    expect(
      offenders,
      `${literal} belongs to the palette this site replaced; use a token from src/styles/global.css`
    ).toEqual([]);
  });
});
