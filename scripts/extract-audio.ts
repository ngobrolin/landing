#!/usr/bin/env -S pnpm exec tsx

import { execSync } from "child_process";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatDuration, formatFileSize, parseDurationString } from "./lib/utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const AUDIO_DIR = join(ROOT_DIR, ".audio");
const EPISODES_FILE = join(ROOT_DIR, "src/data/episodes.json");

const YT_DLP = process.env.YT_DLP || "yt-dlp";
const FFMPEG = process.env.FFMPEG || "ffmpeg";

interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  position: number;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
}

function getEpisodes(): Episode[] {
  return JSON.parse(readFileSync(EPISODES_FILE, "utf-8"));
}

function saveEpisodes(episodes: Episode[]): void {
  writeFileSync(EPISODES_FILE, JSON.stringify(episodes, null, 2));
}

function getExistingAudio(): Set<string> {
  if (!existsSync(AUDIO_DIR)) {
    mkdirSync(AUDIO_DIR, { recursive: true });
    return new Set();
  }
  const files = execSync(`ls "${AUDIO_DIR}"`, { encoding: "utf-8" }).trim();
  if (!files) return new Set();
  return new Set(files.split("\n").map((f) => f.replace(".mp3", "")));
}

function extractAudio(videoId: string): {
  path: string;
  duration: number;
  fileSize: number;
} {
  const outputPath = join(AUDIO_DIR, `${videoId}.mp3`);

  if (existsSync(outputPath)) {
    console.log(`  Audio already exists: ${outputPath}`);
    const stats = statSync(outputPath);
    const duration = getAudioDuration(outputPath);
    return { path: outputPath, duration, fileSize: stats.size };
  }

  console.log(`  Downloading and converting audio for ${videoId}...`);

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempPath = join(AUDIO_DIR, `${videoId}.temp.wav`);

  // Download as WAV first (use cookies to avoid 403)
  execSync(
    `${YT_DLP} -x --audio-format wav --audio-quality 0 --cookies-from-browser brave -o "${tempPath}" "${url}"`,
    { stdio: "inherit" }
  );

  // Convert to MP3 128kbps mono
  execSync(
    `${FFMPEG} -i "${tempPath}" -ac 1 -ab 128k -ar 44100 "${outputPath}" -y`,
    { stdio: "inherit" }
  );

  // Clean up temp file
  if (existsSync(tempPath)) {
    execSync(`rm "${tempPath}"`);
  }

  const stats = statSync(outputPath);
  const duration = getAudioDuration(outputPath);

  return { path: outputPath, duration, fileSize: stats.size };
}

function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `${FFMPEG} -i "${filePath}" 2>&1 | grep "Duration" | cut -d ' ' -f 4 | sed s/,//`,
      { encoding: "utf-8" }
    ).trim();
    return parseDurationString(result);
  } catch {
    console.warn(`  Warning: Could not get duration for ${filePath}`);
  }
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const episodes = getEpisodes();
  const existingAudio = getExistingAudio();

  let toProcess: string[] = [];

  const missing = episodes
    .filter((e) => !existingAudio.has(e.videoId))
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map((e) => e.videoId);

  if (args.length > 0) {
    if (args[0] === "--all") {
      toProcess = episodes.map((e) => e.videoId);
    } else if (args[0] === "--missing") {
      toProcess = missing;
    } else if (args[0] === "--status") {
      console.log(`Total episodes: ${episodes.length}`);
      console.log(`Audio extracted: ${existingAudio.size}`);
      console.log(`Missing: ${missing.length}`);
      return;
    } else if (args[0] === "--help") {
      console.log(`
Usage: pnpm exec tsx scripts/extract-audio.ts [options] [videoId...]

Options:
  --missing   Extract audio for all episodes without audio
  --all       Extract audio for all episodes (re-process existing)
  --status    Show extraction status
  --help      Show this help message

Examples:
  pnpm exec tsx scripts/extract-audio.ts              # Extract next missing episode
  pnpm exec tsx scripts/extract-audio.ts --missing    # Extract all missing
  pnpm exec tsx scripts/extract-audio.ts Tkh8-LleLws  # Extract specific episode
`);
      return;
    } else {
      toProcess = args;
    }
  } else {
    // Default: extract next one missing
    toProcess = missing.slice(0, 1);
  }

  if (toProcess.length === 0) {
    console.log("All episodes already have audio extracted!");
    return;
  }

  console.log(`Processing ${toProcess.length} episode(s)...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const videoId of toProcess) {
    const episode = episodes.find((e) => e.videoId === videoId);
    console.log(`\n[${videoId}] ${episode?.title || "Unknown"}`);

    try {
      const { path, duration, fileSize } = extractAudio(videoId);
      console.log(`  Duration: ${formatDuration(duration)}`);
      console.log(`  Size: ${formatFileSize(fileSize)}`);
      console.log(`  Path: ${path}`);
      console.log(`  ✓ Done!`);
      successCount++;
    } catch (error) {
      console.error(
        `  ✗ Error: ${error instanceof Error ? error.message : error}`
      );
      errorCount++;
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Extraction complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
}

main().catch(console.error);
