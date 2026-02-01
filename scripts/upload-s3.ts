#!/usr/bin/env npx tsx

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatDuration, formatFileSize } from "./lib/utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const AUDIO_DIR = join(ROOT_DIR, ".audio");
const EPISODES_FILE = join(ROOT_DIR, "src/data/episodes.json");

// S3 Configuration
const S3_BUCKET = process.env.S3_BUCKET || "ngobrolinweb-podcast";
const S3_REGION = process.env.S3_REGION || "ap-southeast-1";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

const s3Client = new S3Client({ region: S3_REGION });

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

function getLocalAudioFiles(): Set<string> {
  if (!existsSync(AUDIO_DIR)) {
    return new Set();
  }
  const files = execSync(`ls "${AUDIO_DIR}"`, { encoding: "utf-8" }).trim();
  if (!files) return new Set();
  return new Set(
    files
      .split("\n")
      .filter((f) => f.endsWith(".mp3"))
      .map((f) => f.replace(".mp3", ""))
  );
}

async function checkS3Exists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf-8" }
    ).trim();
    return Math.round(parseFloat(result));
  } catch {
    return 0;
  }
}

async function uploadToS3(
  videoId: string,
  filePath: string
): Promise<{ url: string; duration: number; fileSize: number }> {
  const key = `audio/${videoId}.mp3`;
  const fileContent = readFileSync(filePath);
  const stats = statSync(filePath);
  const duration = getAudioDuration(filePath);

  console.log(`  Uploading to s3://${S3_BUCKET}/${key}...`);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000",
    })
  );

  const url = `${S3_BASE_URL}/${key}`;
  return { url, duration, fileSize: stats.size };
}

async function main() {
  const args = process.argv.slice(2);
  const episodes = getEpisodes();
  const localAudio = getLocalAudioFiles();

  // Episodes with local audio but no audioUrl in JSON (oldest first)
  const notUploaded = episodes
    .filter((e) => localAudio.has(e.videoId) && !e.audioUrl)
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

  let toProcess: string[] = [];

  if (args.length > 0) {
    if (args[0] === "--all") {
      toProcess = [...localAudio];
    } else if (args[0] === "--missing") {
      toProcess = notUploaded.map((e) => e.videoId);
    } else if (args[0] === "--status") {
      const withAudioUrl = episodes.filter((e) => e.audioUrl).length;
      console.log(`Total episodes: ${episodes.length}`);
      console.log(`Local audio files: ${localAudio.size}`);
      console.log(`Uploaded (has audioUrl): ${withAudioUrl}`);
      console.log(`Ready to upload: ${notUploaded.length}`);
      return;
    } else if (args[0] === "--help") {
      console.log(`
Usage: npx tsx scripts/upload-s3.ts [options] [videoId...]

Options:
  --missing   Upload all local audio files not yet in S3
  --all       Upload all local audio files (re-upload existing)
  --status    Show upload status
  --help      Show this help message

Environment:
  S3_BUCKET   S3 bucket name (default: ngobrolin-podcast)
  S3_REGION   AWS region (default: ap-southeast-1)
  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or AWS profile

Examples:
  npx tsx scripts/upload-s3.ts                  # Upload next missing
  npx tsx scripts/upload-s3.ts --missing        # Upload all missing
  npx tsx scripts/upload-s3.ts Tkh8-LleLws      # Upload specific episode
`);
      return;
    } else {
      toProcess = args.filter((id) => localAudio.has(id));
      if (toProcess.length !== args.length) {
        const missing = args.filter((id) => !localAudio.has(id));
        console.error(`Audio files not found for: ${missing.join(", ")}`);
        console.error(`Run extract-audio.ts first.`);
      }
    }
  } else {
    // Default: upload next one not uploaded
    toProcess = notUploaded.slice(0, 1).map((e) => e.videoId);
  }

  if (toProcess.length === 0) {
    console.log("No audio files to upload!");
    console.log("Run extract-audio.ts first to create audio files.");
    return;
  }

  console.log(`Uploading ${toProcess.length} file(s) to S3...\n`);
  console.log(`Bucket: ${S3_BUCKET}`);
  console.log(`Region: ${S3_REGION}\n`);

  let successCount = 0;
  let errorCount = 0;
  const updatedEpisodes = [...episodes];

  for (const videoId of toProcess) {
    const episode = updatedEpisodes.find((e) => e.videoId === videoId);
    const filePath = join(AUDIO_DIR, `${videoId}.mp3`);

    console.log(`\n[${videoId}] ${episode?.title || "Unknown"}`);

    try {
      const { url, duration, fileSize } = await uploadToS3(videoId, filePath);

      if (episode) {
        episode.audioUrl = url;
        episode.audioDuration = duration;
        episode.audioFileSize = fileSize;
      }

      console.log(`  URL: ${url}`);
      console.log(`  Duration: ${formatDuration(duration)}`);
      console.log(`  Size: ${formatFileSize(fileSize)}`);
      console.log(`  ✓ Done!`);
      successCount++;
    } catch (error) {
      console.error(
        `  ✗ Error: ${error instanceof Error ? error.message : error}`
      );
      errorCount++;
    }
  }

  // Save updated episodes
  if (successCount > 0) {
    saveEpisodes(updatedEpisodes);
    console.log(`\nUpdated episodes.json with ${successCount} audio URLs.`);
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Upload complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
}

main().catch(console.error);
