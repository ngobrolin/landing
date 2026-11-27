/**
 * Episode title helpers.
 *
 * These live in their own module because both the data layer (episodes.ts, for
 * card display) and the SEO layer (seo.ts, for the browser title) need them,
 * and importing one from the other would couple them for no reason.
 *
 * Episode titles follow no single convention - AGENTS.md is explicit about
 * this. Most titles carry a trailing credit, in dozens of distinct shapes: the
 * canonical " - Ngobrolin WEB", numbered "ep1".."ep52" variants, a "& @handle"
 * guest credit, and a real "Ngborlin WEB" misspelling. A minority carry no
 * suffix at all. The counts are deliberately not written down here - the
 * playlist grows weekly, so derive them from src/data/episodes.json if needed.
 */

export const SITE_NAME = 'Ngobrolin WEB';

/** Matches the show name anywhere, including the playlist's misspelling. */
const SHOW_NAME = /ng(?:ob|bo)r(?:o)?lin\s+web/i;

/**
 * Matches the show name only where it appears as a trailing credit: preceded by
 * a dash separator, optionally followed by an episode number.
 *
 * Anchoring on the separator is what protects the four real titles that use the
 * show name as their SUBJECT - "Ngobrolin WebSocket - Ngobrolin WEB" must lose
 * the credit and keep the topic.
 */
const TRAILING_CREDIT = /\s*[-–—]\s*ng(?:ob|bo)r(?:o)?lin\s+web(?:\s*ep\.?\s*\d+)?/i;

/**
 * The title as a reader should see it, on a card or as a heading.
 *
 * Repeating "Ngobrolin WEB" on every card of a site called Ngobrolin WEB spends
 * the card's most valuable line on nothing. The show name still belongs in the
 * browser title and the social tags - that is buildEpisodePageTitle's job.
 *
 * Falls back to the original whenever stripping would leave nothing, because a
 * blank heading is worse than a redundant one.
 */
export function getDisplayTitle(episodeTitle: string): string {
  const title = episodeTitle.trim();
  const stripped = title.replace(TRAILING_CREDIT, '').trim();
  return stripped.length > 0 ? stripped : title;
}

/**
 * The <title> for an episode page, without repeating the show name.
 *
 * 119 episode pages used to ship
 * `<title>X - Ngobrolin WEB - Ngobrolin WEB</title>`, plus the same doubled
 * string in og:title and twitter:title, because the template appended the site
 * name to titles that already carried it.
 */
export function buildEpisodePageTitle(episodeTitle: string): string {
  const title = episodeTitle.trim();
  return SHOW_NAME.test(title) ? title : `${title} - ${SITE_NAME}`;
}

/**
 * CSS font-size expression for the homepage cover headline.
 *
 * Two constraints keep the cover balanced without per-episode hand tuning:
 * 1. The longest word must never overflow its column into the thumbnail
 *    (0.7em is Archivo's widest per-character advance at display weight/width).
 * 2. Longer multi-word titles scale by sqrt(28 / length) so their total block
 *    height stays roughly constant and the primary CTA stays above the fold on
 *    a 390x844 phone viewport.
 */
export function getCoverTitleSize(displayTitle: string): string {
  const trimmed = displayTitle.trim();
  const longestWord = Math.max(
    1,
    ...trimmed.split(/\s+/).map((word) => word.length)
  );
  const scale = trimmed.length > 28 ? Math.max(0.55, Math.sqrt(28 / trimmed.length)) : 1;
  const minRem = (2.75 * scale).toFixed(2);
  const preferredVw = (8.2 * scale).toFixed(2);
  const maxRem = (7 * scale).toFixed(2);
  return `min(clamp(${minRem}rem, ${preferredVw}vw, ${maxRem}rem), calc(100cqi / ${(longestWord * 0.7).toFixed(2)}))`;
}
