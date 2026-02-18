# OpenAI Whisper API Transcribe Script — Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Add `scripts/transcribe-openai.js` as a separate transcription script that uses the OpenAI Whisper API (or any OpenAI-compatible endpoint) instead of the local whisper.cpp CLI. The existing `scripts/transcribe.js` remains untouched.

## Goals

- Transcribe podcast episodes using OpenAI's cloud Whisper model
- Support OpenAI-compatible endpoints (Groq, local servers, etc.) via `--base-url`
- Produce identical output format to the existing script
- Keep the same CLI interface (minus whisper.cpp-specific flags)

## Architecture

### New file: `scripts/transcribe-openai.js`

Same overall flow as `transcribe.js`:

1. Validate `OPENAI_API_KEY` env var (exit early if missing)
2. Parse CLI args
3. Load episodes, determine which to process
4. For each video:
   - Download audio as **mp3** via yt-dlp
   - Send mp3 to Whisper API with `verbose_json` response format
   - Transform response segments to match existing transcript format
   - Apply non-conversation filter (carried over from existing script)
   - Save transcript JSON to `src/data/transcripts/<videoId>.json`
   - Clean up temp files

### Dependencies

- Add `openai` to `devDependencies` in `package.json` (script-only, not used in the Astro build)

### npm Script

```json
"transcribe:openai": "node scripts/transcribe-openai.js"
```

Usage: `npm run transcribe:openai -- --missing`

## API Interaction

```js
openai.audio.transcriptions.create({
  file: fs.createReadStream(audioPath),
  model: "whisper-1",          // overridable via --model
  language: "id",
  response_format: "verbose_json",
  timestamp_granularities: ["segment"],
})
```

`verbose_json` returns segments with `start`, `end`, `text` fields that map directly to the existing transcript format. No chunking needed — mp3 stays well under the 25MB API limit for typical podcast episodes.

## CLI Flags

| Flag | Default | Notes |
|------|---------|-------|
| `--base-url <url>` | OpenAI default | For OpenAI-compatible APIs |
| `--model <name>` | `whisper-1` | API model name |
| `--limit <n>` | none | Max episodes to process |
| `--browser <name>` | `brave` | Cookie source for yt-dlp |
| `--all` | — | Process all episodes |
| `--missing` | — | Process episodes without transcripts |
| `<videoId> ...` | — | Process specific episodes |
| _(no args)_ | — | Process next single missing episode |

**Removed from original:** `--suppress-nst` (whisper.cpp-specific), original `--model` for local model file path.

## Output Format

Identical to existing transcripts — no downstream code changes required:

```json
{
  "videoId": "abc123",
  "language": "id",
  "generatedAt": "2026-02-18T00:00:00.000Z",
  "segments": [
    { "start": 0, "end": 5.2, "text": "Halo semuanya" }
  ],
  "fullText": "Halo semuanya"
}
```

## Error Handling

- **Missing API key** — exit immediately before any processing with a clear message
- **API errors** (rate limit, invalid key, file too large) — log error for that episode, continue to next
- **Download failure** — log error, continue to next (same as existing script)
