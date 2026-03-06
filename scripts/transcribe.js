#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
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

const WHISPER_MODEL_DEFAULT = join(homedir(), "Downloads/ggml-medium.bin");

// Fallback paths for macOS/Linux when not in PATH
const WHISPER_CLI_FALLBACK = "/Users/riza/.nix-profile/bin/whisper-cli";
const YT_DLP_FALLBACK = "/Users/riza/.nix-profile/bin/yt-dlp";

const WHISPER_CLI = findExecutable("whisper-cli", WHISPER_CLI_FALLBACK);
const YT_DLP = findExecutable("yt-dlp", YT_DLP_FALLBACK);

function transcribe(audioPath, videoId, model, suppressNst = false) {
  console.log(`  Transcribing ${videoId}${suppressNst ? " (with -sns flag)" : ""}...`);

  const outputBase = join(TEMP_DIR, videoId);

  const whisperArgs = ["-m", model, "-l", "id", "-oj", "-of", outputBase];
  if (suppressNst) {
    whisperArgs.push("-sns");
  }
  whisperArgs.push(audioPath);

  console.log(`  Command: ${WHISPER_CLI} ${whisperArgs.map((arg) => arg.includes(" ") ? `"${arg}"` : arg).join(" ")}`);

  spawnSync(WHISPER_CLI, whisperArgs, { stdio: "inherit" });

  const whisperOutput = JSON.parse(readFileSync(`${outputBase}.json`, "utf-8"));

  const rawSegments = whisperOutput.transcription.map((seg) => ({
    start: seg.offsets.from / 1000,
    end: seg.offsets.to / 1000,
    text: seg.text.trim(),
  }));

  // Only filter if not using -sns (suppression should handle it during transcription)
  const filteredSegments = suppressNst ? rawSegments : filterNonConversation(rawSegments);

  return saveTranscript(videoId, filteredSegments);
}

function cleanup(videoId) {
  cleanupFiles([
    join(TEMP_DIR, `${videoId}.wav`),
    join(TEMP_DIR, `${videoId}.json`),
  ]);
}

async function main() {
  const args = process.argv.slice(2);

  // Parse --model argument
  let whisperModel = WHISPER_MODEL_DEFAULT;
  const modelIndex = args.indexOf("--model");
  if (modelIndex !== -1) {
    const modelValue = args[modelIndex + 1];
    if (!modelValue || modelValue.startsWith("-")) {
      console.error("--model requires a value");
      process.exit(1);
    }
    whisperModel = modelValue;
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

  // Parse --suppress-nst argument
  let suppressNst = false;
  const suppressNstIndex = args.indexOf("--suppress-nst");
  if (suppressNstIndex !== -1) {
    suppressNst = true;
    console.log("Using -sns flag to suppress non-speech tokens (bypasses post-filter)");
    args.splice(suppressNstIndex, 1); // Remove --suppress-nst from args
  }

  const episodes = getEpisodes();
  const existingTranscripts = getExistingTranscripts();

  let toProcess = [];

  const missing = episodes
    .filter((e) => !existingTranscripts.has(e.videoId))
    .map((e) => e.videoId);

  if (args.length > 0) {
    if (args[0] === "--all") {
      toProcess = episodes.map((e) => e.videoId);
    } else if (args[0] === "--missing") {
      toProcess = missing;
    } else {
      toProcess = args;
    }
  } else {
    // Default: transcribe next one missing
    toProcess = missing.slice(0, 1);
  }

  // Apply limit if specified
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
        audioFormat: "wav",
        browser,
        outputExtension: "wav",
        ytDlpPath: YT_DLP,
      });
      transcribe(audioPath, videoId, whisperModel, suppressNst);
      cleanup(videoId);
      console.log(`  ✓ Done!`);
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
  }

  console.log("\nTranscription complete!");
}

main().catch(console.error);
