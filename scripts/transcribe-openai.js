#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import {
  existsSync,
  createReadStream,
  statSync,
} from "fs";
import { join } from "path";
import OpenAI from "openai";
import {
  ALLOWED_BROWSERS,
  TEMP_DIR,
  cleanupFiles,
  downloadAudio,
  filterNonConversation,
  findExecutable,
  getEpisodes,
  getExistingTranscripts,
  saveTranscript,
} from "./lib/transcribe-common.js";

// Fallback paths for macOS/Linux when not in PATH
const YT_DLP_FALLBACK = "/Users/riza/.nix-profile/bin/yt-dlp";

const YT_DLP = findExecutable("yt-dlp", YT_DLP_FALLBACK);

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB — stay under the 25MB API limit

function checkRequirements(apiKey) {
  const missing = [];

  if (!apiKey) {
    missing.push("OPENAI_API_KEY environment variable is not set");
  }

  for (const tool of ["yt-dlp", "ffmpeg", "ffprobe"]) {
    try {
      execSync(`which ${tool}`, { encoding: "utf-8", stdio: "pipe" });
    } catch {
      const hint = tool === "yt-dlp" ? "brew install yt-dlp" : "brew install ffmpeg";
      missing.push(`${tool} not found in PATH — install via: ${hint}`);
    }
  }

  if (missing.length > 0) {
    console.error("Missing requirements:");
    for (const item of missing) {
      console.error(`  ✗ ${item}`);
    }
    process.exit(1);
  }

  console.log("Requirements: ✓ OPENAI_API_KEY, ✓ yt-dlp, ✓ ffmpeg, ✓ ffprobe");
}

function getAudioDuration(audioPath) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "quiet", "-print_format", "json", "-show_format", audioPath],
    { encoding: "utf-8" }
  );
  const info = JSON.parse(result.stdout);
  return parseFloat(info.format.duration);
}

function splitAudio(audioPath, videoId, chunkDuration) {
  const chunkBase = join(TEMP_DIR, `${videoId}_chunk`);
  spawnSync(
    "ffmpeg",
    [
      "-i", audioPath,
      "-f", "segment",
      "-segment_time", String(chunkDuration),
      "-c", "copy",
      `${chunkBase}_%03d.mp3`,
    ],
    { stdio: "inherit" }
  );

  const chunks = [];
  let i = 0;
  while (true) {
    const chunkPath = `${chunkBase}_${String(i).padStart(3, "0")}.mp3`;
    if (!existsSync(chunkPath)) break;
    chunks.push(chunkPath);
    i++;
  }
  return chunks;
}

const MAX_RETRIES = 3;

/**
 * Parses wait time from rate limit error message.
 * Example: "Please try again in 5m14.5s" -> 314.5 seconds
 */
function parseWaitTime(errorMessage) {
  const match = errorMessage.match(/try again in (\d+)m(\d+\.?\d*)s/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    return minutes * 60 + seconds;
  }
  // Fallback: look for just seconds
  const secondsMatch = errorMessage.match(/try again in (\d+\.?\d*)s/);
  if (secondsMatch) {
    return parseFloat(secondsMatch[1]);
  }
  // Default wait time if we can't parse
  return 60;
}

/**
 * Wraps an async function with retry logic for rate limit errors.
 */
async function withRetry(fn, context = "operation") {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error (429)
      if (error.status === 429 || error.statusCode === 429) {
        const waitTime = parseWaitTime(error.message);
        if (attempt < MAX_RETRIES) {
          console.log(
            `  Rate limited. Waiting ${waitTime.toFixed(1)}s before retry ${attempt}/${MAX_RETRIES}...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        } else {
          console.log(`  Rate limited. Max retries (${MAX_RETRIES}) reached.`);
        }
      } else {
        // Non-rate-limit errors should not be retried
        throw error;
      }
    }
  }
  throw lastError;
}

async function callWhisperApi(openai, model, filePath, offsetSeconds = 0) {
  const response = await openai.audio.transcriptions.create({
    file: createReadStream(filePath),
    model,
    language: "id",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return (response.segments ?? []).map((seg) => ({
    start: seg.start + offsetSeconds,
    end: seg.end + offsetSeconds,
    text: seg.text.trim(),
  }));
}

async function transcribe(audioPath, videoId, openai, model) {
  console.log(`  Transcribing ${videoId} via OpenAI API (model: ${model})...`);

  const fileSize = statSync(audioPath).size;
  let rawSegments;

  if (fileSize <= MAX_FILE_SIZE) {
    rawSegments = await withRetry(
      () => callWhisperApi(openai, model, audioPath),
      "transcription"
    );
  } else {
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    console.log(`  File is ${sizeMB}MB — splitting into chunks...`);

    const duration = getAudioDuration(audioPath);
    // Each chunk covers a proportional slice of the file, with 10% safety margin
    const chunkDuration = Math.floor((MAX_FILE_SIZE / fileSize) * duration * 0.9);
    const chunkPaths = splitAudio(audioPath, videoId, chunkDuration);
    console.log(`  Split into ${chunkPaths.length} chunk(s) of ~${chunkDuration}s each`);

    rawSegments = [];
    try {
      for (let i = 0; i < chunkPaths.length; i++) {
        const offsetSeconds = i * chunkDuration;
        console.log(`  Transcribing chunk ${i + 1}/${chunkPaths.length}...`);
        const chunkSegments = await withRetry(
          () => callWhisperApi(openai, model, chunkPaths[i], offsetSeconds),
          `chunk ${i + 1}/${chunkPaths.length}`
        );
        rawSegments.push(...chunkSegments);
      }
    } finally {
      cleanupFiles(chunkPaths);
    }
  }

  const filteredSegments = filterNonConversation(rawSegments);

  return saveTranscript(videoId, filteredSegments);
}

function cleanup(videoId) {
  cleanupFiles([join(TEMP_DIR, `${videoId}.mp3`)]);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  checkRequirements(apiKey);

  const args = process.argv.slice(2);

  // Parse --base-url argument
  let baseURL = undefined;
  const baseUrlIndex = args.indexOf("--base-url");
  if (baseUrlIndex !== -1) {
    const baseUrlValue = args[baseUrlIndex + 1];
    if (!baseUrlValue || baseUrlValue.startsWith("-")) {
      console.error("--base-url requires a value");
      process.exit(1);
    }
    baseURL = baseUrlValue;
    args.splice(baseUrlIndex, 2); // Remove --base-url and its value from args
  }

  // Parse --model argument
  let model = "whisper-1";
  const modelIndex = args.indexOf("--model");
  if (modelIndex !== -1) {
    const modelValue = args[modelIndex + 1];
    if (!modelValue || modelValue.startsWith("-")) {
      console.error("--model requires a value");
      process.exit(1);
    }
    model = modelValue;
    args.splice(modelIndex, 2); // Remove --model and its value from args
  }

  // Parse --limit argument
  let limit = null;
  const limitIndex = args.indexOf("--limit");
  if (limitIndex !== -1) {
    const limitValue = args[limitIndex + 1];
    if (!limitValue || limitValue.startsWith("-")) {
      console.error("--limit requires a value");
      process.exit(1);
    }
    limit = parseInt(limitValue, 10);
    if (isNaN(limit) || limit < 1) {
      console.error("--limit must be a positive integer");
      process.exit(1);
    }
    args.splice(limitIndex, 2); // Remove --limit and its value from args
  }

  // Parse --browser argument
  let browser = "brave";
  const browserIndex = args.indexOf("--browser");
  if (browserIndex !== -1) {
    const browserValue = args[browserIndex + 1];
    if (!browserValue || browserValue.startsWith("-")) {
      console.error("--browser requires a value");
      process.exit(1);
    }
    if (!ALLOWED_BROWSERS.includes(browserValue)) {
      console.error(`--browser must be one of: ${ALLOWED_BROWSERS.join(", ")}`);
      process.exit(1);
    }
    browser = browserValue;
    args.splice(browserIndex, 2); // Remove --browser and its value from args
  }

  const openai = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });

  const episodes = getEpisodes();
  const existingTranscripts = getExistingTranscripts();

  const missing = episodes
    .filter((e) => !existingTranscripts.has(e.videoId))
    .map((e) => e.videoId);

  let toProcess = [];

  if (args.length > 0) {
    if (args[0] === "--all") {
      toProcess = episodes.map((e) => e.videoId);
    } else if (args[0] === "--missing") {
      toProcess = missing;
    } else {
      toProcess = args;
    }
  } else {
    toProcess = missing.slice(0, 1);
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

  for (const videoId of toProcess) {
    const episode = episodes.find((e) => e.videoId === videoId);
    console.log(`\n[${videoId}] ${episode?.title || "Unknown"}`);

    try {
      const audioPath = downloadAudio(videoId, {
        audioFormat: "mp3",
        browser,
        outputExtension: "mp3",
        ytDlpPath: YT_DLP,
      });
      await transcribe(audioPath, videoId, openai, model);
      cleanup(videoId);
      console.log(`  ✓ Done!`);
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
  }

  console.log("\nTranscription complete!");
}

main().catch(console.error);
