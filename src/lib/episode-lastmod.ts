import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Episode } from './episodes';

// Resolved from the working directory (the project root for builds and tests), like palette.ts:
// this runs inside astro.config.mjs, where import.meta.glob is unavailable.
const DATA_DIR = join(process.cwd(), 'src', 'data');

const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/;

/**
 * Epoch ms of an ISO 8601 timestamp that names its timezone and a real calendar date, else undefined.
 * A zoneless value would read as the build machine's local time, and Date.parse rolls Feb 30 into March.
 */
export function parseContentTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = TIMESTAMP.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return undefined;
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  if (match[9] !== undefined && (Number(match[9]) > 23 || Number(match[10]) > 59)) return undefined;
  return Date.parse(value);
}

/** Every way a summary's optional `updatedAt` is unusable as a lastmod. */
export function findUpdatedAtProblems(record: Record<string, unknown>, now = Date.now()): string[] {
  if (record.updatedAt === undefined) return [];
  const updated = parseContentTimestamp(record.updatedAt);
  if (updated === undefined) {
    return ['`updatedAt` must be an ISO 8601 timestamp with a timezone, e.g. 2026-11-14T05:50:57Z'];
  }
  const problems: string[] = [];
  const generated = parseContentTimestamp(record.generatedAt);
  if (generated !== undefined && updated < generated) problems.push('`updatedAt` is earlier than `generatedAt`');
  if (updated > now) problems.push('`updatedAt` is in the future');
  return problems;
}

// Only summaries carry `updatedAt`: a transcript is regenerated rather than edited, which moves `generatedAt`.
// An `updatedAt` the summary validator would reject is dropped here too, so a direct build agrees with CI.
function contentTimestamps(dataDir: string, kind: 'summaries' | 'transcripts', videoId: string, now: number): number[] {
  const file = join(dataDir, kind, `${videoId}.json`);
  if (!existsSync(file)) return [];
  const record = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof record !== 'object' || record === null) return [];
  const stamps = [record.generatedAt];
  if (kind === 'summaries' && findUpdatedAtProblems(record, now).length === 0) stamps.push(record.updatedAt);
  return stamps.map(parseContentTimestamp).filter((t): t is number => t !== undefined);
}

/**
 * When the episode page last changed in substance: the newest valid, non-future stored date among
 * publication, summary, transcript and summary edit. Undefined when none is valid, so no lastmod is emitted.
 */
export function getEpisodeLastModified(episode: Episode, dataDir = DATA_DIR, now = Date.now()): Date | undefined {
  const stamps = [
    parseContentTimestamp(episode.publishedAt),
    ...contentTimestamps(dataDir, 'summaries', episode.videoId, now),
    ...contentTimestamps(dataDir, 'transcripts', episode.videoId, now),
  ].filter((t): t is number => t !== undefined && t <= now);
  return stamps.length > 0 ? new Date(Math.max(...stamps)) : undefined;
}
