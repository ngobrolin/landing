import data from '../data/media-kit.json';

/**
 * The hand-copied half of the `/partners` figures, and the catalogue of what
 * they are.
 *
 * Kept apart from `partner-stats.ts` for the same reason
 * `partner-card-geometry.ts` is: the monthly freshness check
 * (`scripts/check-media-kit-freshness.ts`) needs the capture date and the
 * figure catalogue and nothing else, and should not have to drag the episode
 * JSON in through `partner-stats.ts` to get them.
 *
 * Everything here is YouTube **Analytics** data: owner-scoped, OAuth only, so
 * no script in this repo can refresh it. The read-only `YOUTUBE_API_KEY` cannot
 * reach any of it. That is why these are stored with the date they were
 * captured and why something nags when that date goes old — see
 * `scripts/lib/media-kit-freshness.ts`.
 *
 * `capturedAt` is the machine-readable original; the "Agustus 2026" the page
 * prints is formatted from it in `partner-stats.ts`. A hand-written prose date
 * beside a machine-readable one is two copies of the same fact, which is the
 * failure mode this page exists to pay down.
 *
 * `partner-stats.ts` is still the only place any of this becomes published
 * copy. Nothing here is formatted, labelled for the page, or scoped.
 */

export interface MediaKit {
  /** ISO date (YYYY-MM-DD) these figures were read off YouTube Studio. */
  capturedAt: string;
  age25to34Percent: number;
  returningViewersPercent: number;
  fromIndonesiaPercent: number;
  watchHours28d: number;
  averageViewDuration: string;
  topInterest: string;
}

export const mediaKit: MediaKit = data;

export interface MediaKitFigure {
  /** The key in `src/data/media-kit.json`. */
  key: Exclude<keyof MediaKit, 'capturedAt'>;
  /** As it reads on the page, so a maintainer can match it by eye. */
  label: string;
  /** Where in YouTube Studio the current value is read off. */
  where: string;
}

/**
 * Every stored figure, named the way the page names it and paired with where
 * to go and get a fresh one. The freshness issue is built from this list, so a
 * figure added to the JSON without an entry here would go un-nagged — which is
 * why `media-kit.test.ts` asserts the two cannot drift apart.
 */
export const MEDIA_KIT_FIGURES: readonly MediaKitFigure[] = [
  {
    key: 'age25to34Percent',
    label: 'Audiens berusia 25-34',
    where: 'YouTube Studio → Analytics → Audience → Age (last 28 days)',
  },
  {
    key: 'returningViewersPercent',
    label: 'Penonton yang kembali',
    where: 'YouTube Studio → Analytics → Audience → New vs returning (last 28 days)',
  },
  {
    key: 'fromIndonesiaPercent',
    label: 'Dari Indonesia',
    where: 'YouTube Studio → Analytics → Audience → Top geographies (last 28 days)',
  },
  {
    key: 'watchHours28d',
    label: 'Jam ditonton per 28 hari',
    where: 'YouTube Studio → Analytics → Overview → Watch time (last 28 days)',
  },
  {
    key: 'averageViewDuration',
    label: 'Rata-rata durasi tayangan',
    where: 'YouTube Studio → Analytics → Overview → Average view duration (last 28 days)',
  },
  {
    key: 'topInterest',
    label: 'Minat teratas audiens',
    where: 'YouTube Studio → Analytics → Audience → Top interests',
  },
];
