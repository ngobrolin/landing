import { getEpisodes } from './episodes';
import { mediaKit, type MediaKit } from './media-kit';
import storedSubscribers from '../data/channel-subscribers.json';

/**
 * The single source for every figure `/partners` publishes — the page, its meta
 * description and its share card all read from here.
 *
 * Each wrong number this page has shipped ("164+", "1K+ Views/Episode",
 * "Konsistensi 4+ Tahun") was a second copy of a figure that had moved on
 * without it. A share card that disagrees with the page it links to is the same
 * failure in front of the one reader who is deciding whether to believe us, so
 * there is exactly one copy and everything else derives from it.
 *
 * The raw values now sit one layer down, in `src/data/`, because each is kept
 * fresh by a different mechanism and each carries its own provenance date:
 *
 *   - `channel-subscribers.json` is **derived**. The weekly playlist sync reads
 *     it from `channels.list` with the read-only `YOUTUBE_API_KEY` and opens a
 *     PR, so the figure arrives as a reviewable diff. See
 *     `scripts/lib/channel-subscribers.ts`.
 *   - `media-kit.json` is **hand-copied** from YouTube Studio. Those are
 *     Analytics figures — owner-scoped OAuth only — so nothing here can refresh
 *     them, and a monthly check opens an issue once they pass four months old.
 *     See `scripts/lib/media-kit-freshness.ts`.
 *
 * This module is still the only place any of it becomes published copy: the
 * scope labels, the id-ID formatting and both provenance dates are composed
 * here and nowhere else.
 */

export interface PartnerTile {
  id: string;
  /** Whose number this is. The channel carries a second show; see below. */
  scope: string;
  /** Already formatted in id-ID: no consumer formats a figure itself. */
  value: string;
  label: string;
}

export interface PartnerStats {
  episodeCount: number;
  firstYear: number;
  tiles: PartnerTile[];
  /** The subset the share card draws, in the order it draws them. */
  cardTiles: PartnerTile[];
  supportingScope: string;
  supporting: string;
  attribution: string;
  metaDescription: string;
}

/** What `src/data/channel-subscribers.json` holds. Absent is a real state. */
export interface StoredSubscribers {
  count: number;
  fetchedAt: string;
}

export interface PartnerStatsInput {
  episodes: ReadonlyArray<{ publishedAt: string }>;
  subscribers: StoredSubscribers | null;
  mediaKit: MediaKit;
}

const SHOW = 'Ngobrolin WEB';
const CHANNEL = 'Kanal YouTube';

/**
 * Ngobrolin WEB is one of two shows on the channel, so every channel figure is
 * labelled as the channel's rather than the show's — presenting them as the
 * show's own would repeat the credibility failure this page is paying down.
 * That holds for the derived subscriber count too: automating a figure does not
 * change whose it is.
 */

const percent = (value: number) =>
  `${value.toLocaleString('id-ID', { minimumFractionDigits: 1 })}%`;
const count = (value: number) => value.toLocaleString('id-ID');

/**
 * Both provenance dates are stored as ISO and rendered here. A prose date
 * written by hand beside a machine-readable one is two copies of one fact, and
 * the machine-readable one is what the freshness check reads.
 */
const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const fullDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** The tiles the share card carries, in the order it draws them. */
export const PARTNER_CARD_STAT_IDS = ['episodes', 'subscribers', 'age'] as const;

export function buildPartnerStats({
  episodes,
  subscribers,
  mediaKit: kit,
}: PartnerStatsInput): PartnerStats {
  const episodeCount = episodes.length;

  // A fixed start year stays true forever; a tenure counter ("4+ Tahun") is
  // only true while somebody remembers to bump it.
  const firstYear = Math.min(
    ...episodes.map(ep => new Date(ep.publishedAt).getUTCFullYear())
  );

  const tiles: PartnerTile[] = [
    {
      id: 'episodes',
      scope: SHOW,
      value: count(episodeCount),
      label: `Episode, mingguan sejak ${firstYear}`,
    },
    // Nothing stored means the tile is left off, not filled with a zero or a
    // dash. The sync fails soft so this should only ever happen before the
    // first successful run, and an absent figure is honest where "0" is not.
    ...(subscribers
      ? [
          {
            id: 'subscribers',
            scope: CHANNEL,
            value: count(subscribers.count),
            label: 'Subscriber kanal',
          },
        ]
      : []),
    {
      id: 'age',
      scope: CHANNEL,
      value: percent(kit.age25to34Percent),
      label: 'Audiens berusia 25-34',
    },
    {
      id: 'returning',
      scope: CHANNEL,
      value: percent(kit.returningViewersPercent),
      label: 'Penonton yang kembali',
    },
  ];

  const byId = new Map(tiles.map(tile => [tile.id, tile]));

  return {
    episodeCount,
    firstYear,
    tiles,
    // Selected by id, and quietly short one column if the subscriber figure is
    // missing — a card that draws a gap is worse than a card that draws two.
    cardTiles: PARTNER_CARD_STAT_IDS.map(id => byId.get(id)).filter(
      (tile): tile is PartnerTile => tile !== undefined
    ),
    supportingScope: `${CHANNEL}:`,
    supporting: [
      `${percent(kit.fromIndonesiaPercent)} dari Indonesia`,
      `${count(kit.watchHours28d)} jam ditonton per 28 hari`,
      `rata-rata ${kit.averageViewDuration} per tayangan`,
      `minat teratas: ${kit.topInterest}.`,
    ].join(' · '),
    attribution: [
      `Data kanal YouTube, ${monthYear(kit.capturedAt)}.`,
      // Said out loud because it is the one figure here that keeps itself
      // current, and a reader has no other way to tell it apart from the rest.
      ...(subscribers
        ? [
            `Subscriber kanal diperbarui otomatis dari YouTube API; angka di ` +
              `atas tercatat ${fullDate(subscribers.fetchedAt)}.`,
          ]
        : []),
      `Kanal ini menayangkan ${SHOW} bersama satu program lain, sehingga ` +
        `angka kanal di atas bukan angka ${SHOW} saja.`,
    ].join(' '),
    // Written for the search a sponsor actually runs — the show's name beside
    // "sponsor" or "pasang iklan" — and kept under Google's ~160 character cut.
    metaDescription:
      `Sponsor episode, pasang iklan, atau kerja sama media partner dengan ` +
      `${SHOW}: podcast developer Indonesia, ${episodeCount} episode sejak ` +
      `${firstYear}.`,
  };
}

export function getPartnerStats(): PartnerStats {
  return buildPartnerStats({
    episodes: getEpisodes(),
    subscribers: readStoredSubscribers(),
    mediaKit,
  });
}

/**
 * Read the sync's store, tolerating the shapes a half-written or hand-edited
 * file can take. A malformed store leaves the tile off rather than rendering
 * `NaN` at a sponsor.
 *
 * The store also carries `checkedAt`, the date of the last successful read.
 * Nothing here publishes it: what a sponsor is owed is how old the *number* is,
 * which is `fetchedAt`. `checkedAt` exists so the monthly freshness check can
 * tell a sync that is quietly no longer running from one whose count has simply
 * not moved — see `scripts/lib/media-kit-freshness.ts`.
 */
function readStoredSubscribers(): StoredSubscribers | null {
  const stored = storedSubscribers as Partial<StoredSubscribers> | null;
  if (!stored) return null;

  const { count: value, fetchedAt } = stored;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (typeof fetchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) {
    return null;
  }

  return { count: value, fetchedAt };
}

export function getPartnerCardStats(): PartnerTile[] {
  const { cardTiles } = getPartnerStats();
  if (cardTiles.length === 0) {
    throw new Error('Share card has no stats to draw');
  }
  return cardTiles;
}
