#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const TRANSCRIPTS_DIR = join(ROOT_DIR, "src/data/transcripts");
const EPISODES_FILE = join(ROOT_DIR, "src/data/episodes.json");
const TEMP_DIR = join(ROOT_DIR, ".tmp-audio");

const WHISPER_MODEL_DEFAULT = join(homedir(), "Downloads/ggml-medium.bin");

// Fallback paths for macOS/Linux when not in PATH
const WHISPER_CLI_FALLBACK = "/Users/riza/.nix-profile/bin/whisper-cli";
const YT_DLP_FALLBACK = "/Users/riza/.nix-profile/bin/yt-dlp";

function findExecutable(name, fallback) {
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

const WHISPER_CLI = findExecutable("whisper-cli", WHISPER_CLI_FALLBACK);
const YT_DLP = findExecutable("yt-dlp", YT_DLP_FALLBACK);

// Patterns for non-conversation segments to filter out
const NON_CONVERSATION_PATTERNS = [
  // Music variations
  /^\[musik\]$/i,
  /^\[music\]$/i,
  /^\[musik intro\]$/i,
  /^\[suara musik\]$/i,
  /^\[dialog musik\]$/i,
  // Sound effects
  /^\[tinggalow\]$/i,
  /^\[ting tong\]$/i,
  /^\[tinggil\]$/i,
  /^\[telolet\]$/i,
  /^\[ringtone\]$/i,
  /^\[drinton\]$/i,
  /^\[suara panggilan\]$/i,
  /^\[suara nafas\]$/i,
  // Laughter
  /^\[tertawa\]$/i,
  /^\[ketawa\]$/i,
  /^\[gelak\]$/i,
  // Applause
  /^\[tepuk tangan\]$/i,
  // Outro/intro messages (metadata, not speech)
  /^\[sampai jumpa di video selanjutnya\]$/i,
  /^\[tekan like dan subscribe\]$/i,
];

function isNonConversation(text) {
  return NON_CONVERSATION_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function filterNonConversation(segments) {
  const filtered = segments.filter((seg) => !isNonConversation(seg.text));
  const removedCount = segments.length - filtered.length;
  if (removedCount > 0) {
    console.log(`  Filtered out ${removedCount} non-conversation segment(s)`);
  }
  return filtered;
}

function getEpisodes() {
  return JSON.parse(readFileSync(EPISODES_FILE, "utf-8"));
}

function getExistingTranscripts() {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
    return new Set();
  }
  const files = execSync(`ls "${TRANSCRIPTS_DIR}"`, {
    encoding: "utf-8",
  }).trim();
  if (!files) return new Set();
  return new Set(files.split("\n").map((f) => f.replace(".json", "")));
}

function downloadAudio(videoId, browser = "brave") {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }

  const outputPath = join(TEMP_DIR, `${videoId}.wav`);

  if (existsSync(outputPath)) {
    console.log(`  Audio already exists: ${outputPath}`);
    return outputPath;
  }

  console.log(`  Downloading audio for ${videoId}...`);

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  spawnSync(
    YT_DLP,
    [
      "-x",
      "--audio-format",
      "wav",
      "--audio-quality",
      "0",
      "--cookies-from-browser",
      browser,
      "-o",
      outputPath,
      url,
    ],
    { stdio: "inherit" }
  );

  return outputPath;
}

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

  const transcript = {
    videoId,
    language: "id",
    generatedAt: new Date().toISOString(),
    segments: filteredSegments,
    fullText: filteredSegments.map((seg) => seg.text).join(" "),
  };

  const outputPath = join(TRANSCRIPTS_DIR, `${videoId}.json`);
  writeFileSync(outputPath, JSON.stringify(transcript, null, 2));
  console.log(`  Saved transcript: ${outputPath}`);

  return transcript;
}

function cleanup(videoId) {
  const files = [
    join(TEMP_DIR, `${videoId}.wav`),
    join(TEMP_DIR, `${videoId}.json`),
  ];

  for (const file of files) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
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
  const ALLOWED_BROWSERS = [
    "brave",
    "chrome",
    "firefox",
    "safari",
    "edge",
    "chromium",
    "opera",
    "vivaldi",
  ];
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
      const audioPath = downloadAudio(videoId, browser);
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
