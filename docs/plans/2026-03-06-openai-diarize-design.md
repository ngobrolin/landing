# OpenAI Diarize Script Design

**Date:** 2026-03-06

**Goal:** Add a separate experimental OpenAI diarization script while extracting shared transcription helpers used by all transcription entrypoints.

## Context

The repository already has:

- `scripts/transcribe.js` for local `whisper-cli`
- `scripts/transcribe-openai.js` for standard OpenAI-compatible transcription

The new requirement is to keep diarization isolated in a new script so experimental OpenAI-only behavior does not reduce compatibility in the stable script.

## Decisions

### 1. Separate diarization entrypoint

Create `scripts/transcribe-openai-diarize.js` instead of extending `scripts/transcribe-openai.js`.

Rationale:

- Keeps the current OpenAI/Groq flow stable
- Allows the new script to evolve independently if the experimental API changes
- Avoids CLI ambiguity around when diarization should be enabled

### 2. Shared helpers across all transcription scripts

Create a shared helper module used by:

- `scripts/transcribe.js`
- `scripts/transcribe-openai.js`
- `scripts/transcribe-openai-diarize.js`

Shared utilities should include:

- common paths and temp directories
- executable lookup
- episode loading
- transcript discovery
- YouTube audio download
- transcript filtering for non-conversation segments
- transcript file writing
- temp file cleanup helpers

Provider-specific logic should remain local to each script.

### 3. Stable transcript output schema

All scripts should continue writing the same transcript object shape:

```json
{
  "videoId": "string",
  "language": "id",
  "generatedAt": "ISO-8601 timestamp",
  "segments": [
    {
      "start": 0,
      "end": 1.2,
      "text": "..."
    }
  ],
  "fullText": "..."
}
```

For diarized transcripts, segments may include an additional `speaker` property:

```json
{
  "start": 0,
  "end": 1.2,
  "text": "...",
  "speaker": "Alice"
}
```

This keeps downstream transcript consumers compatible while exposing speaker data when available.

### 4. CLI behavior for the new script

`scripts/transcribe-openai-diarize.js` should support:

- existing episode selection flags: `--all`, `--missing`, explicit `videoId`
- existing utility flags: `--limit`, `--browser`, `--base-url`
- diarization-specific flags:
  - `--model`
  - repeated `--known-speaker "Name=path"`
  - optional `--response-format diarized_json`

Default model should be `gpt-4o-transcribe-diarize`.

If a non-diarization model is used, the script may still submit the request, but speaker labels should only be written when the API returns diarized segments.

### 5. Keep chunking local to OpenAI scripts

Chunking, file size checks, and OpenAI request retry behavior should stay in the OpenAI-based scripts rather than moving into shared utilities.

Rationale:

- `scripts/transcribe.js` does not use the same API constraints
- the experimental diarization flow may need to diverge later
- shared code should stay small and provider-neutral

## Testing Strategy

Add unit tests for the new pure helper functions instead of relying on live API calls.

Planned coverage:

- parsing repeated `--known-speaker` values
- converting known speaker audio files into data URLs
- normalizing diarized responses into the shared transcript schema
- validating shared transcript save/filter behavior where practical

Live verification with the OpenAI diarization API is out of scope for this environment because networked end-to-end validation is unavailable.
