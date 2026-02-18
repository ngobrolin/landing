#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  createReadStream,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const TRANSCRIPTS_DIR = join(ROOT_DIR, "src/data/transcripts");
const EPISODES_FILE = join(ROOT_DIR, "src/data/episodes.json");
const TEMP_DIR = join(ROOT_DIR, ".tmp-audio");

// Fallback paths for macOS/Linux when not in PATH
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

const YT_DLP = findExecutable("yt-dlp", YT_DLP_FALLBACK);

// Patterns for non-conversation segments to filter out (same as transcribe.js)
const NON_CONVERSATION_PATTERNS = [
  /^\[musik\]$/i,
  /^\[music\]$/i,
  /^\[musik intro\]$/i,
  /^\[suara musik\]$/i,
  /^\[dialog musik\]$/i,
  /^\[tinggalow\]$/i,
  /^\[ting tong\]$/i,
  /^\[tinggil\]$/i,
  /^\[telolet\]$/i,
  /^\[ringtone\]$/i,
  /^\[drinton\]$/i,
  /^\[suara panggilan\]$/i,
  /^\[suara nafas\]$/i,
  /^\[tertawa\]$/i,
  /^\[ketawa\]$/i,
  /^\[gelak\]$/i,
  /^\[tepuk tangan\]$/i,
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

  const outputPath = join(TEMP_DIR, `${videoId}.mp3`);

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
      "mp3",
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

async function transcribe(audioPath, videoId, openai, model) {
  console.log(`  Transcribing ${videoId} via OpenAI API (model: ${model})...`);

  const response = await openai.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model,
    language: "id",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const rawSegments = response.segments.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  const filteredSegments = filterNonConversation(rawSegments);

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
  const file = join(TEMP_DIR, `${videoId}.mp3`);
  if (existsSync(file)) {
    unlinkSync(file);
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable is required.");
    process.exit(1);
  }

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
    args.splice(baseUrlIndex, 2);
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
    args.splice(modelIndex, 2);
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
    args.splice(limitIndex, 2);
  }

  // Parse --browser argument
  const ALLOWED_BROWSERS = [
    "brave", "chrome", "firefox", "safari", "edge", "chromium", "opera", "vivaldi",
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
    args.splice(browserIndex, 2);
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
      const audioPath = downloadAudio(videoId, browser);
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
