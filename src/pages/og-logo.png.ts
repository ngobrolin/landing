import type { APIRoute } from 'astro';
import { renderOgLogo } from '../lib/og-card';

export const prerender = true;

/**
 * The feed's channel artwork: the same brand as `/og-image.png`, drawn square
 * and small because that is what RSS 2.0 asks for.
 *
 * `/rss.xml` used to publish `/og-image.svg` here, which was wrong three times
 * over - a different design from the one social previews showed, a format the
 * spec does not allow, and a 1200x630 banner in an element capped at 144 wide.
 */
export const GET: APIRoute = async () => {
  const png = await renderOgLogo();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
