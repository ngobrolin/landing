import type { APIRoute } from 'astro';
import { getEpisodes } from '../lib/episodes';
import { buildSearchDocuments } from '../lib/search';

/**
 * The search index, served as one static file for the whole archive.
 *
 * It used to be inlined into the HTML of /episodes and all five year pages,
 * which shipped ~500KB of render-blocking JSON to every visitor whether or not
 * they ever typed. One file instead means the bytes arrive only on the first
 * search interaction, and stay in the browser cache across a client-side
 * navigation between the archive and a year page.
 *
 * Serving the whole archive rather than a per-page subset is deliberate: the
 * year pages used to ship overlapping copies of the same documents, and the
 * component filters to the slugs its own grid rendered.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildSearchDocuments(getEpisodes())), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
