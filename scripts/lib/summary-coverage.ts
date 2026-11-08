/**
 * Which episodes still need a summary. Pure, so `scripts/check-summary.ts
 * --missing` can be tested against fixtures rather than today's archive.
 *
 * Coverage is deliberately not a CI gate (see src/data/summaries.test.ts):
 * the weekly playlist sync adds episodes before anyone has summarised them.
 * This only reports.
 */

export interface EpisodeRef {
  videoId: string;
  title: string;
}

export interface SummaryCoverage {
  /** Has a transcript, has no summary: ready to summarise. */
  ready: EpisodeRef[];
  /** Has neither: needs a transcript first. */
  untranscribed: EpisodeRef[];
}

export function findUnsummarisedEpisodes(
  episodes: EpisodeRef[],
  transcriptIds: ReadonlySet<string>,
  summaryIds: ReadonlySet<string>,
): SummaryCoverage {
  const unsummarised = episodes.filter((ep) => !summaryIds.has(ep.videoId));
  return {
    ready: unsummarised.filter((ep) => transcriptIds.has(ep.videoId)),
    untranscribed: unsummarised.filter((ep) => !transcriptIds.has(ep.videoId)),
  };
}
