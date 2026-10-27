/**
 * Check episode summaries against the contract before they ship, and list the
 * episodes still waiting for one.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-summary.ts --missing
 *   pnpm exec tsx scripts/check-summary.ts <path/to/videoId.json> [...]
 *
 * `--missing` lists episodes that have a transcript but no summary. It reads
 * only; it never writes anything.
 *
 * Given paths, it checks each file with the same rules `src/data/summaries.test.ts`
 * applies (scripts/lib/summary-contract.ts) but with none of that test's legacy
 * exemptions, because a new summary must not copy a grandfathered shape. It
 * also confirms the filename names a real episode in src/data/episodes.json and
 * that a transcript exists to ground it on. The file can live anywhere, so a
 * draft can be checked before it is placed in src/data/summaries/.
 *
 * The workflow around this is in .agents/skills/summarizing-episodes/SKILL.md.
 *
 * Exit codes: 0 when every file passes (or after listing), 1 otherwise.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { findSummaryProblems } from './lib/summary-contract';
import { type EpisodeRef, findUnsummarisedEpisodes } from './lib/summary-coverage';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(repoRoot, 'src/data');
const transcriptsDir = path.join(dataDir, 'transcripts');
const summariesDir = path.join(dataDir, 'summaries');

function loadEpisodes(): EpisodeRef[] {
  return JSON.parse(readFileSync(path.join(dataDir, 'episodes.json'), 'utf-8'));
}

function idsIn(dir: string): Set<string> {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.basename(file, '.json')),
  );
}

function listMissing(): void {
  const { ready, untranscribed } = findUnsummarisedEpisodes(
    loadEpisodes(),
    idsIn(transcriptsDir),
    idsIn(summariesDir),
  );

  if (ready.length === 0) {
    console.log('Every transcribed episode has a summary.');
  } else {
    console.log(`Transcribed but not summarised (${ready.length}):`);
    for (const ep of ready) console.log(`  ${ep.videoId}  ${ep.title}`);
  }

  if (untranscribed.length > 0) {
    console.log(
      `\n${untranscribed.length} episode(s) have no transcript yet; transcribe them first:`,
    );
    for (const ep of untranscribed) console.log(`  ${ep.videoId}  ${ep.title}`);
  }
}

function checkFiles(paths: string[]): boolean {
  const episodeIds = new Set(loadEpisodes().map((ep) => ep.videoId));
  const transcripts = idsIn(transcriptsDir);
  let allPass = true;

  for (const filePath of paths) {
    const fileName = path.basename(filePath);
    const videoId = path.basename(fileName, '.json');
    const problems: string[] = [];

    if (!fileName.endsWith('.json')) {
      problems.push('the filename must be <videoId>.json');
    }

    let summary: unknown;
    try {
      summary = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (error) {
      problems.push(`cannot read it as JSON: ${(error as Error).message}`);
    }

    if (summary !== undefined) {
      problems.push(...findSummaryProblems(summary, fileName));
    }
    if (!episodeIds.has(videoId)) {
      problems.push(`${videoId} is not an episode in src/data/episodes.json`);
    }
    if (!transcripts.has(videoId)) {
      problems.push(`src/data/transcripts/${videoId}.json does not exist to ground it on`);
    }

    if (problems.length === 0) {
      console.log(`✓ ${filePath}`);
    } else {
      allPass = false;
      console.log(`✗ ${filePath}`);
      for (const problem of problems) console.log(`    - ${problem}`);
    }
  }

  return allPass;
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(
    'Usage:\n' +
      '  pnpm exec tsx scripts/check-summary.ts --missing\n' +
      '  pnpm exec tsx scripts/check-summary.ts <path/to/videoId.json> [...]',
  );
  process.exit(args.length === 0 ? 1 : 0);
}

if (args.includes('--missing')) {
  listMissing();
} else if (!checkFiles(args)) {
  process.exit(1);
}
