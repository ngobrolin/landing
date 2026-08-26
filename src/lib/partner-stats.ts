import { getEpisodes } from './episodes';

/**
 * The single source for every figure `/partners` publishes — the page, its meta
 * description and its share card all read from here.
 *
 * Each wrong number this page has shipped ("164+", "1K+ Views/Episode",
 * "Konsistensi 4+ Tahun") was a second copy of a figure that had moved on
 * without it. A share card that disagrees with the page it links to is the same
 * failure in front of the one reader who is deciding whether to believe us, so
 * there is exactly one copy and everything else derives from it.
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
  supportingScope: string;
  supporting: string;
  attribution: string;
  metaDescription: string;
}

const SHOW = 'Ngobrolin WEB';
const CHANNEL = 'Kanal YouTube';

/**
 * Channel figures, from the YouTube channel media kit of August 2026.
 * Subscribers are lifetime; the audience percentages cover the last 28 days.
 * Ngobrolin WEB is one of two shows on the channel, so every one of these is
 * labelled as the channel's rather than the show's — presenting them as the
 * show's own would repeat the credibility failure this page is paying down.
 */
const CHANNEL_SUBSCRIBERS = 7100;
const CHANNEL_AGE_25_34 = 88.7;
const CHANNEL_RETURNING = 37.8;
const CHANNEL_FROM_INDONESIA = 87.7;
const CHANNEL_WATCH_HOURS_28D = 545;
const CHANNEL_AVERAGE_VIEW = '5:58';
const CHANNEL_TOP_INTEREST = 'High-End Computer Aficionados';
const MEDIA_KIT_DATE = 'Agustus 2026';

const percent = (value: number) =>
  `${value.toLocaleString('id-ID', { minimumFractionDigits: 1 })}%`;
const count = (value: number) => value.toLocaleString('id-ID');

/** The tiles the share card carries, in the order it draws them. */
export const PARTNER_CARD_STAT_IDS = ['episodes', 'subscribers', 'age'] as const;

export function getPartnerStats(): PartnerStats {
  const episodes = getEpisodes();
  const episodeCount = episodes.length;

  // A fixed start year stays true forever; a tenure counter ("4+ Tahun") is
  // only true while somebody remembers to bump it.
  const firstYear = Math.min(
    ...episodes.map(ep => new Date(ep.publishedAt).getUTCFullYear())
  );

  return {
    episodeCount,
    firstYear,
    tiles: [
      {
        id: 'episodes',
        scope: SHOW,
        value: count(episodeCount),
        label: `Episode, mingguan sejak ${firstYear}`,
      },
      {
        id: 'subscribers',
        scope: CHANNEL,
        value: count(CHANNEL_SUBSCRIBERS),
        label: 'Subscriber kanal',
      },
      {
        id: 'age',
        scope: CHANNEL,
        value: percent(CHANNEL_AGE_25_34),
        label: 'Audiens berusia 25-34',
      },
      {
        id: 'returning',
        scope: CHANNEL,
        value: percent(CHANNEL_RETURNING),
        label: 'Penonton yang kembali',
      },
    ],
    supportingScope: `${CHANNEL}:`,
    supporting: [
      `${percent(CHANNEL_FROM_INDONESIA)} dari Indonesia`,
      `${count(CHANNEL_WATCH_HOURS_28D)} jam ditonton per 28 hari`,
      `rata-rata ${CHANNEL_AVERAGE_VIEW} per tayangan`,
      `minat teratas: ${CHANNEL_TOP_INTEREST}.`,
    ].join(' · '),
    attribution:
      `Data kanal YouTube, ${MEDIA_KIT_DATE}. Kanal ini menayangkan ${SHOW} ` +
      'bersama satu program lain, sehingga angka kanal di atas bukan angka ' +
      `${SHOW} saja.`,
    // Written for the search a sponsor actually runs — the show's name beside
    // "sponsor" or "pasang iklan" — and kept under Google's ~160 character cut.
    metaDescription:
      `Sponsor episode, pasang iklan, atau kerja sama media partner dengan ` +
      `${SHOW}: podcast developer Indonesia, ${episodeCount} episode sejak ` +
      `${firstYear}.`,
  };
}

export function getPartnerCardStats(): PartnerTile[] {
  const byId = new Map(getPartnerStats().tiles.map(tile => [tile.id, tile]));
  return PARTNER_CARD_STAT_IDS.map(id => {
    const tile = byId.get(id);
    if (!tile) throw new Error(`Share card asks for missing stat "${id}"`);
    return tile;
  });
}
