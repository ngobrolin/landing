import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Episode } from './episodes';

// Resolved from the working directory (the project root for builds and tests), like palette.ts:
// this runs inside astro.config.mjs, where import.meta.glob is unavailable.
const DATA_DIR = join(process.cwd(), 'src', 'data');

function generatedAt(kind: 'summaries' | 'transcripts', videoId: string): string | undefined {
  const file = join(DATA_DIR, kind, `${videoId}.json`);
  if (!existsSync(file)) return undefined;
  const value = JSON.parse(readFileSync(file, 'utf8')).generatedAt;
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined;
}

/**
 * When the episode page last changed in substance: publication, or a later summary or transcript.
 * Using publishedAt alone told Google that pages given a summary in 2026 had not changed since 2023.
 */
export function getEpisodeLastModified(episode: Episode): Date {
  const dates = [episode.publishedAt, generatedAt('summaries', episode.videoId), generatedAt('transcripts', episode.videoId)]
    .filter((d): d is string => Boolean(d))
    .map((d) => Date.parse(d));
  return new Date(Math.max(...dates));
}
