#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import {
  createReadStream,
  existsSync,
  statSync,
} from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
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
import {
  buildKnownSpeakerReferences,
  normalizeDiarizedSegments,
  parseKnownSpeakers,
} from "./lib/transcribe-openai-diarize.js";

const YT_DLP_FALLBACK = "/Users/riza/.nix-profile/bin/yt-dlp";
const YT_DLP = findExecutable("yt-dlp", YT_DLP_FALLBACK);

const MAX_FILE_SIZE = 24 * 1024 * 1024;
const DEFAULT_MODEL = "gpt-4o-transcribe-diarize";
const REQUIRED_RESPONSE_FORMAT = "diarized_json";
const MAX_RETRIES = 3;

export function parseArgs(rawArgs) {
  const parsed = {
    baseURL: undefined,
    browser: "brave",
    knownSpeakerArgs: [],
    limit: null,
    model: DEFAULT_MODEL,
    responseFormat: REQUIRED_RESPONSE_FORMAT,
    targets: [],
  };

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];

    if (arg === "--base-url") {
      parsed.baseURL = requireValue(rawArgs, index, "--base-url");
      index += 1;
      continue;
    }

    if (arg === "--model") {
      parsed.model = requireValue(rawArgs, index, "--model");
      index += 1;
      continue;
    }

    if (arg === "--browser") {
      const browser = requireValue(rawArgs, index, "--browser");
      if (!ALLOWED_BROWSERS.includes(browser)) {
        throw new Error(`--browser must be one of: ${ALLOWED_BROWSERS.join(", ")}`);
      }
      parsed.browser = browser;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      const value = requireValue(rawArgs, index, "--limit");
      const limit = Number.parseInt(value, 10);
      if (Number.isNaN(limit) || limit < 1) {
        throw new Error("--limit must be a positive integer");
      }
      parsed.limit = limit;
      index += 1;
      continue;
    }

    if (arg === "--known-speaker") {
      parsed.knownSpeakerArgs.push(requireValue(rawArgs, index, "--known-speaker"));
      index += 1;
      continue;
    }

    if (arg === "--response-format") {
      parsed.responseFormat = requireValue(rawArgs, index, "--response-format");
      index += 1;
      continue;
    }

    parsed.targets.push(arg);
  }

  return parsed;
}

function requireValue(args, index, flagName) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${flagName} requires a value`);
  }
  return value;
}

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
      missing.push(`${tool} not found in PATH - install via: ${hint}`);
    }
  }

  if (missing.length > 0) {
    console.error("Missing requirements:");
    for (const item of missing) {
      console.error(`  x ${item}`);
    }
    process.exit(1);
  }

  console.log("Requirements: OK OPENAI_API_KEY, yt-dlp, ffmpeg, ffprobe");
}

function validateConfiguration(options) {
  if (options.responseFormat !== REQUIRED_RESPONSE_FORMAT) {
    throw new Error(
      `scripts/transcribe-openai-diarize.js requires --response-format ${REQUIRED_RESPONSE_FORMAT}`
    );
  }

  if (options.model !== DEFAULT_MODEL) {
    throw new Error(
      `scripts/transcribe-openai-diarize.js currently requires --model ${DEFAULT_MODEL} because non-diarized models do not return timestamped segments`
    );
  }
}

function getAudioDuration(audioPath) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "quiet", "-print_format", "json", "-show_format", audioPath],
    { encoding: "utf-8" }
  );
  const info = JSON.parse(result.stdout);
  return Number.parseFloat(info.format.duration);
}

function splitAudio(audioPath, videoId, chunkDuration) {
  const chunkBase = join(TEMP_DIR, `${videoId}_chunk`);

  spawnSync(
    "ffmpeg",
    [
      "-i",
      audioPath,
      "-f",
      "segment",
      "-segment_time",
      String(chunkDuration),
      "-c",
      "copy",
      `${chunkBase}_%03d.mp3`,
    ],
    { stdio: "inherit" }
  );

  const chunks = [];
  let index = 0;
  while (true) {
    const chunkPath = `${chunkBase}_${String(index).padStart(3, "0")}.mp3`;
    if (!existsSync(chunkPath)) {
      break;
    }
    chunks.push(chunkPath);
    index += 1;
  }

  return chunks;
}

function parseWaitTime(errorMessage) {
  const minuteMatch = errorMessage.match(/try again in (\d+)m(\d+\.?\d*)s/);
  if (minuteMatch) {
    return Number.parseInt(minuteMatch[1], 10) * 60 + Number.parseFloat(minuteMatch[2]);
  }

  const secondMatch = errorMessage.match(/try again in (\d+\.?\d*)s/);
  if (secondMatch) {
    return Number.parseFloat(secondMatch[1]);
  }

  return 60;
}

async function withRetry(fn) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error.status !== 429 && error.statusCode !== 429) {
        throw error;
      }

      const waitTime = parseWaitTime(error.message);
      if (attempt < MAX_RETRIES) {
        console.log(
          `  Rate limited. Waiting ${waitTime.toFixed(1)}s before retry ${attempt}/${MAX_RETRIES}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      } else {
        console.log(`  Rate limited. Max retries (${MAX_RETRIES}) reached.`);
      }
    }
  }

  throw lastError;
}

async function callDiarizedTranscriptionApi(
  openai,
  model,
  filePath,
  knownSpeakerReferences,
  offsetSeconds = 0
) {
  const response = await openai.audio.transcriptions.create({
    file: createReadStream(filePath),
    model,
    language: "id",
    response_format: REQUIRED_RESPONSE_FORMAT,
    chunking_strategy: "auto",
    ...(knownSpeakerReferences.known_speaker_names.length > 0
      ? knownSpeakerReferences
      : {}),
  });

  return normalizeDiarizedSegments(response, offsetSeconds);
}

async function transcribe(audioPath, videoId, openai, options) {
  console.log(`  Transcribing ${videoId} via OpenAI diarization API (model: ${options.model})...`);

  const fileSize = statSync(audioPath).size;
  let rawSegments;

  if (fileSize <= MAX_FILE_SIZE) {
    rawSegments = await withRetry(() =>
      callDiarizedTranscriptionApi(
        openai,
        options.model,
        audioPath,
        options.knownSpeakerReferences
      )
    );
  } else {
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    console.log(`  File is ${sizeMB}MB - splitting into chunks...`);

    const duration = getAudioDuration(audioPath);
    const chunkDuration = Math.floor((MAX_FILE_SIZE / fileSize) * duration * 0.9);
    const chunkPaths = splitAudio(audioPath, videoId, chunkDuration);

    console.log(`  Split into ${chunkPaths.length} chunk(s) of ~${chunkDuration}s each`);

    rawSegments = [];
    try {
      for (let index = 0; index < chunkPaths.length; index++) {
        const chunkPath = chunkPaths[index];
        const offsetSeconds = index * chunkDuration;
        console.log(`  Transcribing chunk ${index + 1}/${chunkPaths.length}...`);

        const chunkSegments = await withRetry(() =>
          callDiarizedTranscriptionApi(
            openai,
            options.model,
            chunkPath,
            options.knownSpeakerReferences,
            offsetSeconds
          )
        );

        rawSegments.push(...chunkSegments);
      }
    } finally {
      cleanupFiles(chunkPaths);
    }
  }

  return saveTranscript(videoId, filterNonConversation(rawSegments));
}

function getTargets(episodes, existingTranscripts, parsedArgs) {
  const missing = episodes
    .filter((episode) => !existingTranscripts.has(episode.videoId))
    .map((episode) => episode.videoId);

  let targets;
  if (parsedArgs.targets.length === 0) {
    targets = missing.slice(0, 1);
  } else if (parsedArgs.targets[0] === "--all") {
    targets = episodes.map((episode) => episode.videoId);
  } else if (parsedArgs.targets[0] === "--missing") {
    targets = missing;
  } else {
    targets = parsedArgs.targets;
  }

  if (parsedArgs.limit !== null && parsedArgs.limit < targets.length) {
    console.log(`Limiting to ${parsedArgs.limit} episode(s)`);
    return targets.slice(0, parsedArgs.limit);
  }

  return targets;
}

export async function main(rawArgs = process.argv.slice(2)) {
  const apiKey = process.env.OPENAI_API_KEY;
  checkRequirements(apiKey);

  const parsedArgs = parseArgs(rawArgs);
  validateConfiguration(parsedArgs);

  const knownSpeakers = parseKnownSpeakers(parsedArgs.knownSpeakerArgs);
  const knownSpeakerReferences = buildKnownSpeakerReferences(knownSpeakers);
  const openai = new OpenAI({
    apiKey,
    ...(parsedArgs.baseURL ? { baseURL: parsedArgs.baseURL } : {}),
  });

  const episodes = getEpisodes();
  const existingTranscripts = getExistingTranscripts();
  const targets = getTargets(episodes, existingTranscripts, parsedArgs);

  if (targets.length === 0) {
    console.log("All episodes already have transcripts!");
    return;
  }

  console.log(`Processing ${targets.length} episode(s)...\n`);

  for (const videoId of targets) {
    const episode = episodes.find((item) => item.videoId === videoId);
    console.log(`\n[${videoId}] ${episode?.title || "Unknown"}`);

    try {
      const audioPath = downloadAudio(videoId, {
        audioFormat: "mp3",
        browser: parsedArgs.browser,
        outputExtension: "mp3",
        ytDlpPath: YT_DLP,
      });

      await transcribe(audioPath, videoId, openai, {
        knownSpeakerReferences,
        model: parsedArgs.model,
      });

      cleanupFiles([join(TEMP_DIR, `${videoId}.mp3`)]);
      console.log("  OK Done!");
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log("\nTranscription complete!");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
