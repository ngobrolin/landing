import type { APIRoute } from 'astro';
import { renderPartnerCard } from '../lib/partner-card';

export const prerender = true;

/**
 * The share card for `/partners`, drawn at build time so its figures can only
 * ever be the page's own. See `src/lib/partner-card.ts` for why it is generated
 * rather than a static image.
 */
export const GET: APIRoute = async () => {
  const png = await renderPartnerCard();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
