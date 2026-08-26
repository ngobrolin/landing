/**
 * The share card's geometry, kept apart from the renderer that uses it.
 *
 * `partner-card.ts` reaches sharp and, through `partner-stats.ts`, the episode
 * JSON — neither of which a plain Node context can load (Playwright's loader
 * rejects the JSON import; see `e2e/transcript-provenance.spec.ts`). The page's
 * `og:image:width`/`height` and the e2e spec that checks them need these numbers
 * and nothing else, so a consumer that only wants the geometry does not have to
 * drag the renderer in to get it.
 */

export const PARTNER_CARD_WIDTH = 1200;
export const PARTNER_CARD_HEIGHT = 630;
/** Preview crops nibble the edges; keep every glyph inside this inset. */
export const PARTNER_CARD_SAFE_MARGIN = 48;
/**
 * Left edge of every glyph on the card. The accent bar sits between this and
 * the safe margin, so a pixel test measuring ink has to start here or it reads
 * the bar and passes with no text rendered at all.
 */
export const PARTNER_CARD_TEXT_LEFT = PARTNER_CARD_SAFE_MARGIN + 44;

/** Where text is drawn, so a test can check glyphs actually landed there. */
export const PARTNER_CARD_TEXT_BANDS = [
  { name: 'wordmark', top: 74, height: 60 },
  { name: 'headline', top: 150, height: 76 },
  { name: 'lead', top: 240, height: 44 },
  { name: 'figures', top: 330, height: 170 },
  { name: 'footer', top: 530, height: 50 },
] as const;
