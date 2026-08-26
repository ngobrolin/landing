#!/usr/bin/env pnpm exec tsx

/**
 * Generate transcripts from YouTube's free auto-generated subtitles.
 *
 * Unlike `transcribe.js` (local whisper-cli) and `transcribe-openai.js`, this
 * downloads no media and needs no API key, no browser cookies, and no GPU — it
 * asks yt-dlp for the auto-caption track only:
 *
 *   yt-dlp --skip-download --write-automatic-subs --sub-format vtt --sub-langs id <url>
 *
 * The output is byte-compatible with the whisper-generated transcripts already
 * in src/data/transcripts/, plus a `source` field recording the provenance.
 * See scripts/lib/vtt.ts for how rolling captions are reconstructed.
 *
 * Usage:
 *   pnpm exec tsx scripts/transcribe-youtube.ts                  # next missing episode
 *   pnpm exec tsx scripts/transcribe-youtube.ts --missing        # every missing episode
 *   pnpm exec tsx scripts/transcribe-youtube.ts <videoId> [...]  # specific episodes
 *   pnpm exec tsx scripts/transcribe-youtube.ts --all --force    # regenerate everything
 *
 * Options:
 *   --limit <n>    Process at most n episodes
 *   --lang <code>  Subtitle language to request (default: id)
 *   --force        Overwrite transcripts that already exist
 *   --delay <s>    Seconds to wait between episodes (default: 3)
 *
 * YouTube rate-limits bulk requests with HTTP 429 ("Sign in to confirm you're
 * not a bot"). The delay plus exponential backoff below keeps a full run under
 * that threshold without needing cookies.
 */

import { execSync, spawnSync } from "child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { vttToTranscript } from "./lib/vtt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const TRANSCRIPTS_DIR = join(ROOT_DIR, "src/data/transcripts");
const EPISODES_FILE = join(ROOT_DIR, "src/data/episodes.json");
const TEMP_DIR = join(ROOT_DIR, ".tmp-subs");

// Fallback path for macOS/Linux when not in PATH
const YT_DLP_FALLBACK = "/Users/riza/.nix-profile/bin/yt-dlp";

function findExecutable(name: string, fallback: string): string {
  try {
    return execSync(`which ${name}`, { encoding: "utf-8" }).trim();
  } catch {
    if (existsSync(fallback)) {
      return fallback;
    }
    throw new Error(
      `Could not find ${name}. Ensure it's installed or check the path: ${fallback}`
    );
  }
}

const YT_DLP = findExecutable("yt-dlp", YT_DLP_FALLBACK);

const MAX_ATTEMPTS = 4;
const BACKOFF_BASE_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** YouTube's rate limit surfaces as a 429 or as a bot-check error message. */
function isRateLimited(message: string): boolean {
  return (
    message.includes("HTTP Error 429") ||
    message.includes("Too Many Requests") ||
    message.includes("confirm you")
  );
}

interface EpisodeRecord {
  videoId: string;
  title: string;
}

function getEpisodes(): EpisodeRecord[] {
  return JSON.parse(readFileSync(EPISODES_FILE, "utf-8"));
}

function getExistingTranscripts(): Set<string> {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
    return new Set();
  }
  return new Set(
    readdirSync(TRANSCRIPTS_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
  );
}

/**
 * Download the auto-caption track for a video and return the raw VTT.
 * Returns null when YouTube has no auto-captions in the requested language.
 */
async function downloadSubtitles(
  videoId: string,
  lang: string
): Promise<string | null> {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }

  const outputBase = join(TEMP_DIR, videoId);
  const subtitlePath = `${outputBase}.${lang}.vtt`;

  if (existsSync(subtitlePath)) {
    console.log(`  Subtitles already downloaded: ${subtitlePath}`);
    return readFileSync(subtitlePath, "utf-8");
  }

  console.log(`  Downloading ${lang} auto-subtitles for ${videoId}...`);

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = spawnSync(
      YT_DLP,
      [
        "--skip-download",
        "--write-automatic-subs",
        "--sub-format",
        "vtt",
        "--sub-langs",
        lang,
        "-o",
        outputBase,
        url,
      ],
      { encoding: "utf-8" }
    );

    if (result.status === 0) {
      return existsSync(subtitlePath)
        ? readFileSync(subtitlePath, "utf-8")
        : null;
    }

    const stderr = (result.stderr || "").trim();

    if (isRateLimited(stderr) && attempt < MAX_ATTEMPTS) {
      const waitMs = BACKOFF_BASE_MS * 2 ** (attempt - 1);
      console.log(
        `  Rate limited by YouTube, retrying in ${waitMs / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})...`
      );
      await sleep(waitMs);
      continue;
    }

    throw new Error(`yt-dlp failed (exit ${result.status}): ${stderr}`);
  }

  return null;
}

function cleanup(videoId: string, lang: string): void {
  const subtitlePath = join(TEMP_DIR, `${videoId}.${lang}.vtt`);
  if (existsSync(subtitlePath)) {
    rmSync(subtitlePath);
  }
}

async function transcribe(videoId: string, lang: string): Promise<void> {
  try {
    const vtt = await downloadSubtitles(videoId, lang);

    if (vtt === null) {
      throw new Error(
        `No "${lang}" auto-captions available on YouTube for this video`
      );
    }

    const transcript = vttToTranscript(vtt, { videoId, language: lang });

    const outputPath = join(TRANSCRIPTS_DIR, `${videoId}.json`);
    writeFileSync(outputPath, JSON.stringify(transcript, null, 2));

    const words = transcript.fullText.split(/\s+/).length;
    console.log(
      `  Saved transcript: ${outputPath} (${transcript.segments.length} segments, ${words} words)`
    );
  } finally {
    cleanup(videoId, lang);
  }
}

function parseValueFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;

  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    console.error(`${flag} requires a value`);
    process.exit(1);
  }
  args.splice(index, 2);
  return value;
}

function parseBooleanFlag(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const lang = parseValueFlag(args, "--lang") ?? "id";
  const force = parseBooleanFlag(args, "--force");

  const delayValue = parseValueFlag(args, "--delay");
  const delayMs = delayValue === null ? 3000 : Number(delayValue) * 1000;
  if (isNaN(delayMs) || delayMs < 0) {
    console.error("--delay must be a non-negative number of seconds");
    process.exit(1);
  }

  let limit: number | null = null;
  const limitValue = parseValueFlag(args, "--limit");
  if (limitValue !== null) {
    limit = parseInt(limitValue, 10);
    if (isNaN(limit) || limit < 1) {
      console.error("--limit must be a positive integer");
      process.exit(1);
    }
  }

  const episodes = getEpisodes();
  const existingTranscripts = getExistingTranscripts();

  const missing = episodes
    .filter((episode) => !existingTranscripts.has(episode.videoId))
    .map((episode) => episode.videoId);

  let toProcess: string[];

  if (args.length > 0) {
    if (args[0] === "--all") {
      toProcess = episodes.map((episode) => episode.videoId);
    } else if (args[0] === "--missing") {
      toProcess = missing;
    } else {
      toProcess = args;
    }
  } else {
    // Default: transcribe next one missing
    toProcess = missing.slice(0, 1);
  }

  // Existing transcripts are whisper-generated and cleaner than deduplicated
  // rolling captions, so overwriting them is a downgrade. Require --force.
  if (!force) {
    const skipped = toProcess.filter((videoId) =>
      existingTranscripts.has(videoId)
    );
    if (skipped.length > 0) {
      console.log(
        `Skipping ${skipped.length} episode(s) that already have a transcript (pass --force to overwrite)`
      );
      toProcess = toProcess.filter(
        (videoId) => !existingTranscripts.has(videoId)
      );
    }
  }

  if (limit !== null && limit < toProcess.length) {
    toProcess = toProcess.slice(0, limit);
    console.log(`Limiting to ${limit} episode(s)`);
  }

  if (toProcess.length === 0) {
    console.log("All episodes already have transcripts!");
    return;
  }

  console.log(`Processing ${toProcess.length} episode(s)...\n`);

  let failed = 0;

  for (const [index, videoId] of toProcess.entries()) {
    const episode = episodes.find((item) => item.videoId === videoId);
    console.log(`\n[${videoId}] ${episode?.title || "Unknown"}`);

    if (index > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    try {
      await transcribe(videoId, lang);
      console.log(`  ✓ Done!`);
    } catch (error) {
      failed++;
      console.error(`  ✗ Error: ${(error as Error).message}`);
    }
  }

  console.log(
    `\nTranscription complete! ${toProcess.length - failed} succeeded, ${failed} failed.`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
