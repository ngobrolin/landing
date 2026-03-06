import { readFileSync } from "fs";
import { extname } from "path";

const AUDIO_MIME_TYPES = {
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".mpeg": "audio/mpeg",
  ".mpga": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
};

export function parseKnownSpeakers(values = []) {
  return values.map((value) => {
    const separatorIndex = value.indexOf("=");

    if (separatorIndex < 1 || separatorIndex === value.length - 1) {
      throw new Error('--known-speaker must use the format "Name=path"');
    }

    const name = value.slice(0, separatorIndex).trim();
    const path = value.slice(separatorIndex + 1).trim();

    if (!name || !path) {
      throw new Error('--known-speaker must use the format "Name=path"');
    }

    return { name, path };
  });
}

export function fileToDataUrl(filePath) {
  const extension = extname(filePath).toLowerCase();
  const mimeType = AUDIO_MIME_TYPES[extension];

  if (!mimeType) {
    throw new Error(`Unsupported speaker reference format: ${extension || filePath}`);
  }

  const base64 = readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export function buildKnownSpeakerReferences(knownSpeakers = []) {
  return {
    known_speaker_names: knownSpeakers.map((speaker) => speaker.name),
    known_speaker_references: knownSpeakers.map((speaker) =>
      fileToDataUrl(speaker.path)
    ),
  };
}

export function normalizeDiarizedSegments(response, offsetSeconds = 0) {
  return (response.segments ?? []).map((segment) => ({
    start: segment.start + offsetSeconds,
    end: segment.end + offsetSeconds,
    text: segment.text.trim(),
    speaker: segment.speaker,
  }));
}
