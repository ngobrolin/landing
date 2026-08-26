import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractTags } from '../../scripts/lib/tag-extraction';
import tagsJson from './tags.json';

/**
 * tags.json is fully derived from src/data/summaries/ by
 * scripts/extract-tags.ts, which REPLACES the file rather than merging into it.
 *
 * Nothing enforced that it was ever re-run. The file went 82 summaries stale,
 * so 84 episode pages rendered no topics at all and /tags under-reported the
 * archive while every number on the page was correctly derived from the stale
 * input. The guard is idempotence, not a count: re-running the extractor over
 * today's summaries must reproduce the committed file byte for byte.
 */
const SUMMARIES_DIR = path.join(process.cwd(), 'src/data/summaries');

function extractFromSummaries(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const files = fs
    .readdirSync(SUMMARIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const summary = JSON.parse(
      fs.readFileSync(path.join(SUMMARIES_DIR, file), 'utf-8')
    );
    // The filename is the authoritative videoId, exactly as the extractor
    // treats it - one summary file has no videoId field.
    const videoId = summary.videoId ?? path.basename(file, '.json');
    out[videoId] = extractTags(
      `${summary.brief} ${(summary.keyPoints ?? []).join(' ')}`
    );
  }

  return out;
}

describe('src/data/tags.json', () => {
  const committed = tagsJson as Record<string, string[]>;

  it('covers every summary that exists', () => {
    const derived = extractFromSummaries();
    const missing = Object.keys(derived).filter((id) => !(id in committed));

    expect(
      missing,
      `run "npx tsx scripts/extract-tags.ts" - ${missing.length} summaries have no tag entry`
    ).toEqual([]);
  });

  it('matches what the extractor produces from those summaries', () => {
    expect(committed).toEqual(extractFromSummaries());
  });

  it('holds no entry that no summary produced', () => {
    const derived = extractFromSummaries();
    const orphans = Object.keys(committed).filter((id) => !(id in derived));

    expect(orphans, 'tags.json is a replacement, never a union').toEqual([]);
  });
});
