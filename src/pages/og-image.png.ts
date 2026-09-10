import type { APIRoute } from 'astro';
import { renderOgCard } from '../lib/og-card';

export const prerender = true;

/**
 * The site-wide share card, drawn at build time.
 *
 * It keeps the URL the hand-made `public/og-image.png` used, so nothing already
 * scraped, cached or linked has to be re-fetched. See `src/lib/og-card.ts` for
 * why it is generated rather than a static file.
 */
export const GET: APIRoute = async () => {
  const png = await renderOgCard();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
