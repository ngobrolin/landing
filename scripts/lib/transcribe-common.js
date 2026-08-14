import { execSync, spawnSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = join(__dirname, "../..");
export const TRANSCRIPTS_DIR = join(ROOT_DIR, "src/data/transcripts");
export const EPISODES_FILE = join(ROOT_DIR, "src/data/episodes.json");
export const TEMP_DIR = join(ROOT_DIR, ".tmp-audio");

export const ALLOWED_BROWSERS = [
  "brave",
  "chrome",
  "firefox",
  "safari",
  "edge",
  "chromium",
  "opera",
  "vivaldi",
];

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

export function findExecutable(name, fallback) {
  try {
    return execSync(`which ${name}`, { encoding: "utf-8" }).trim();
  } catch {
    if (fallback && existsSync(fallback)) {
      return fallback;
    }
    throw new Error(
      `Could not find ${name}. Ensure it's installed or check the path: ${fallback}`
    );
  }
}

export function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function isNonConversation(text) {
  return NON_CONVERSATION_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

export function filterNonConversation(segments) {
  const filtered = segments.filter((segment) => !isNonConversation(segment.text));
  const removedCount = segments.length - filtered.length;
  if (removedCount > 0) {
    console.log(`  Filtered out ${removedCount} non-conversation segment(s)`);
  }
  return filtered;
}

export function buildTranscript(videoId, segments, options = {}) {
  const {
    generatedAt = new Date().toISOString(),
    language = "id",
  } = options;

  return {
    videoId,
    language,
    generatedAt,
    segments,
    fullText: segments.map((segment) => segment.text).join(" "),
  };
}

export function saveTranscript(videoId, segments, options = {}) {
  ensureDirectory(options.transcriptsDir ?? TRANSCRIPTS_DIR);

  const transcript = buildTranscript(videoId, segments, options);
  const outputPath = join(
    options.transcriptsDir ?? TRANSCRIPTS_DIR,
    `${videoId}.json`
  );

  writeFileSync(outputPath, JSON.stringify(transcript, null, 2));
  console.log(`  Saved transcript: ${outputPath}`);

  return transcript;
}

export function getEpisodes() {
  return JSON.parse(readFileSync(EPISODES_FILE, "utf-8"));
}

export function getExistingTranscripts() {
  ensureDirectory(TRANSCRIPTS_DIR);

  const files = execSync(`ls "${TRANSCRIPTS_DIR}"`, {
    encoding: "utf-8",
  }).trim();

  if (!files) {
    return new Set();
  }

  return new Set(files.split("\n").map((file) => file.replace(".json", "")));
}

export function downloadAudio(
  videoId,
  {
    audioFormat,
    browser = "brave",
    outputExtension = audioFormat,
    ytDlpPath,
  }
) {
  ensureDirectory(TEMP_DIR);

  const outputPath = join(TEMP_DIR, `${videoId}.${outputExtension}`);

  if (existsSync(outputPath)) {
    console.log(`  Audio already exists: ${outputPath}`);
    return outputPath;
  }

  console.log(`  Downloading audio for ${videoId}...`);

  spawnSync(
    ytDlpPath,
    [
      "-x",
      "--audio-format",
      audioFormat,
      "--audio-quality",
      "0",
      "--cookies-from-browser",
      browser,
      "-o",
      outputPath,
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { stdio: "inherit" }
  );

  return outputPath;
}

export function cleanupFiles(files) {
  for (const file of files) {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
}
