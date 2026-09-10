import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The palette, read from `src/styles/global.css` instead of restated.
 *
 * `AGENTS.md` names the surfaces that cannot reach the stylesheet and therefore
 * keep a hand-maintained copy of the tokens: `public/offline.html`,
 * `public/favicon.svg` and `src/lib/partner-card.ts`. Every copy is a place the
 * site can silently drift out of its own palette, and the raster this replaces
 * was the worst of them - the repaint that swept the others could only
 * hue-rotate `og-image.png`, which put its ground on a purple-black at hue 258
 * where the tokens are hue 233, desaturated one corner to a neutral grey, and
 * left the wordmark on a blue in no token at 2.86:1. Nothing went red, because
 * `contrast.test.ts` guards the stylesheet and nothing guarded an image.
 *
 * Anything that runs at build time does not need a copy. It can read the source.
 * Build time is the only time this runs: its one consumer, `og-card.ts`, is
 * reached from prerendered endpoints, so the stylesheet is always on disk.
 */

const STYLESHEET = join('src', 'styles', 'global.css');

/**
 * Two obvious ways to find that file are both wrong here, and each was tried:
 *
 * - `new URL('../styles/global.css', import.meta.url)` works in vitest and dies
 *   in production. Astro bundles this module into `dist/chunks/`, so
 *   `import.meta.url` no longer points anywhere near `src/` and the build fails
 *   with ENOENT the first time an endpoint asks for a colour.
 * - `import css from '../styles/global.css?raw'` works in `astro build` and
 *   silently returns an EMPTY STRING in vitest, which stubs CSS imports by
 *   default. Every token would resolve to undefined in the tests that are
 *   supposed to catch exactly that.
 *
 * So resolve from the working directory, which is the project root for both
 * `astro build` and `vitest`, and walk up a few levels so running from a
 * subdirectory still works.
 */
function findStylesheet(): string {
  const tried: string[] = [];
  let dir = process.cwd();

  for (let depth = 0; depth < 6; depth++) {
    const candidate = join(dir, STYLESHEET);
    tried.push(candidate);
    if (existsSync(candidate)) return candidate;

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Could not find ${STYLESHEET} from ${process.cwd()}. Looked in:\n  ` +
      tried.join('\n  ')
  );
}

/** `--color-<name>: <#hex>;` - the only shape the theme block uses. */
const TOKEN_PATTERN = /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;

let cached: Readonly<Record<string, string>> | null = null;

export function getPalette(): Readonly<Record<string, string>> {
  if (cached) return cached;

  const path = findStylesheet();
  const palette: Record<string, string> = {};
  for (const [, name, value] of readFileSync(path, 'utf8').matchAll(TOKEN_PATTERN)) {
    palette[name] = value.toLowerCase();
  }

  if (Object.keys(palette).length === 0) {
    throw new Error(
      `No --color-* tokens found in ${path}. ` +
        'The theme block moved or changed shape; palette.ts has to move with it.'
    );
  }

  cached = Object.freeze(palette);
  return cached;
}

/**
 * One token, or a loud failure. A renderer that silently got `undefined` here
 * would paint `fill="undefined"`, which librsvg treats as black - a share card
 * that ships black on black without erroring.
 */
export function token(name: string): string {
  const value = getPalette()[name];
  if (!value) {
    throw new Error(
      `No --color-${name} in ${STYLESHEET}. ` +
        `Declared: ${Object.keys(getPalette()).join(', ')}`
    );
  }
  return value;
}
