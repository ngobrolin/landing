/**
 * Stamps `updatedAt` on named summaries after a substantive edit, moving their sitemap lastmod.
 * Checks every argument before writing; when to run it is in .agents/skills/summarizing-episodes/SKILL.md.
 */

import { existsSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { parseContentTimestamp } from '../src/lib/episode-lastmod';
import { formatStamp, setUpdatedAt } from './lib/stamp-updated';

const USAGE =
  'Usage: pnpm exec tsx scripts/stamp-updated.ts [--at <timestamp>] [--dry-run] src/data/summaries/<videoId>.json [...]';

const root = process.cwd();
const summariesDir = path.join(root, 'src/data/summaries');

function fail(problems: string[]): never {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error('Nothing was written.');
  process.exit(1);
}

let dryRun = false;
let at: string | undefined;
const paths: string[] = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry-run') dryRun = true;
  else if (args[i] === '--at') at = args[++i] ?? '';
  else if (args[i] === '--help') {
    console.log(USAGE);
    process.exit(0);
  } else paths.push(args[i]);
}
if (paths.length === 0) {
  console.log(USAGE);
  process.exit(1);
}

const now = Date.now();
let stampMs = now;
if (at !== undefined) {
  const parsed = parseContentTimestamp(at);
  if (parsed === undefined) {
    fail([`--at ${at} must be an ISO 8601 timestamp with a timezone, e.g. 2026-11-14T14:12:51Z`]);
  }
  if (parsed > now) fail([`--at ${at} is in the future`]);
  stampMs = parsed;
}
// The file keeps whole seconds, so every comparison below uses the value as written.
stampMs = Math.floor(stampMs / 1000) * 1000;
const stamp = formatStamp(stampMs);

const episodeIds = new Set(
  (JSON.parse(readFileSync(path.join(root, 'src/data/episodes.json'), 'utf-8')) as { videoId: string }[]).map(
    (ep) => ep.videoId,
  ),
);

const problems: string[] = [];
const planned: { file: string; text: string | undefined }[] = [];
const seen = new Set<string>();

for (const arg of paths) {
  const file = path.resolve(root, arg);
  const shown = path.relative(root, file);
  if (path.dirname(file) !== summariesDir || !file.endsWith('.json')) {
    problems.push(`${arg}: only src/data/summaries/<videoId>.json files carry updatedAt`);
    continue;
  }
  if (seen.has(file)) {
    problems.push(`${shown} is named more than once`);
    continue;
  }
  seen.add(file);

  const videoId = path.basename(file, '.json');
  if (!episodeIds.has(videoId)) problems.push(`${shown}: ${videoId} is not an episode in src/data/episodes.json`);
  if (!existsSync(file)) {
    problems.push(`${shown} does not exist`);
    continue;
  }
  // A link could point anywhere, and the write would follow it out of the folder this command is scoped to.
  if (lstatSync(file).isSymbolicLink()) {
    problems.push(`${shown} is a symlink; stamp the real file in src/data/summaries/`);
    continue;
  }

  const text = readFileSync(file, 'utf-8');
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(text);
  } catch (error) {
    problems.push(`${shown}: cannot read it as JSON: ${(error as Error).message}`);
    continue;
  }
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    problems.push(`${shown}: the file must hold a JSON object`);
    continue;
  }

  const generated = parseContentTimestamp(record.generatedAt);
  if (generated === undefined) {
    problems.push(`${shown}: its generatedAt is not a valid timestamp, so a stamp cannot be checked against it`);
    continue;
  }
  if (stampMs < generated) {
    problems.push(`${shown}: ${stamp} is earlier than its generatedAt ${record.generatedAt}`);
    continue;
  }

  if (record.updatedAt !== undefined) {
    const existing = parseContentTimestamp(record.updatedAt);
    if (existing === stampMs) {
      planned.push({ file: shown, text: undefined });
      continue;
    }
    if (existing !== undefined && existing > stampMs) {
      problems.push(`${shown} already records a later edit (${record.updatedAt}); a stamp only moves forward`);
      continue;
    }
  }

  try {
    planned.push({ file: shown, text: setUpdatedAt(text, stamp) });
  } catch (error) {
    problems.push(`${shown}: ${(error as Error).message}`);
  }
}

if (problems.length > 0) fail(problems);

for (const { file, text } of planned) {
  if (text === undefined) {
    console.log(`= ${file} unchanged, already stamped ${stamp}`);
  } else if (dryRun) {
    console.log(`~ ${file} would stamp updatedAt ${stamp}`);
  } else {
    writeFileSync(path.join(root, file), text);
    console.log(`✓ ${file} updatedAt ${stamp}`);
  }
}
