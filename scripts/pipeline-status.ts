/**
 * Read-only stage inventory for the episode-pipeline skill.
 *
 *   pnpm exec tsx scripts/pipeline-status.ts            # summary and gaps
 *   pnpm exec tsx scripts/pipeline-status.ts --json     # full per-video rows
 *   pnpm exec tsx scripts/pipeline-status.ts --data-dir <dir>
 *
 * Exits 1 when the data holds a state that must never exist (see
 * scripts/lib/pipeline-status.ts); missing transcripts, summaries or audio are
 * work to do and exit 0. It reads the local snapshot only, so it says nothing
 * about whether the playlist sync is fresh.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computePipelineStatus, readPipelineInputs } from "./lib/pipeline-status";

const args = process.argv.slice(2);
const dirFlag = args.indexOf("--data-dir");
const dirValue = dirFlag >= 0 ? args[dirFlag + 1] : undefined;
if (dirFlag >= 0 && (!dirValue || dirValue.startsWith("--"))) {
  console.error("Usage: pnpm exec tsx scripts/pipeline-status.ts [--json] [--data-dir <dir>]");
  process.exit(2);
}
const dataDir = dirValue
  ? path.resolve(dirValue)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data");

const status = computePipelineStatus(readPipelineInputs(dataDir));

if (args.includes("--json")) {
  console.log(JSON.stringify(status, null, 2));
} else {
  const line = (label: string, ids: string[]) =>
    console.log(`${label}: ${ids.length}${ids.length ? `  ${ids.join(" ")}` : ""}`);
  console.log(`Episodes: ${status.episodes}`);
  line("Need transcript", status.needTranscript);
  line("Need summary (transcript present)", status.needSummary);
  line("No podcast audio", status.audioMissing);
  line("Partial audio metadata", status.audioPartial);
  line("Marked absentFromPlaylistSince", status.absentFromPlaylist);
  if (status.problems.length) {
    console.log(`\nInvalid state (${status.problems.length}):`);
    for (const p of status.problems) console.log(`  - ${p}`);
  }
}

process.exit(status.problems.length ? 1 : 0);
