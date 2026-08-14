# OpenAI Diarize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a separate experimental OpenAI diarization script and refactor shared transcription helpers for all existing transcription entrypoints.

**Architecture:** Shared provider-neutral utilities will move into `scripts/lib/transcribe-common.js`, while each transcription script keeps its provider-specific request and normalization logic. The new diarization script will normalize speaker-labeled segments into the existing transcript schema with an optional `speaker` field.

**Tech Stack:** Node.js, ES modules, OpenAI Node SDK, Vitest, existing `yt-dlp`/`ffmpeg` shell tooling

---

### Task 1: Extract shared transcription utilities

**Files:**
- Create: `scripts/lib/transcribe-common.js`
- Modify: `scripts/transcribe.js`
- Modify: `scripts/transcribe-openai.js`
- Test: `scripts/lib/transcribe-common.test.js`

**Step 1: Write the failing test**

Create unit tests for extracted pure helpers such as non-conversation filtering and transcript assembly/saving inputs.

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- scripts/lib/transcribe-common.test.js`
Expected: FAIL because the shared module does not exist yet.

**Step 3: Write minimal implementation**

Create `scripts/lib/transcribe-common.js` with shared constants and provider-neutral helpers, then update `scripts/transcribe.js` and `scripts/transcribe-openai.js` to import them.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- scripts/lib/transcribe-common.test.js`
Expected: PASS

### Task 2: Add diarization parsing and normalization helpers

**Files:**
- Create: `scripts/lib/transcribe-openai-diarize.js`
- Test: `scripts/lib/transcribe-openai-diarize.test.js`

**Step 1: Write the failing test**

Add tests covering:

- `parseKnownSpeakers`
- `fileToDataUrl`
- diarized response normalization into `{ start, end, text, speaker }`

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- scripts/lib/transcribe-openai-diarize.test.js`
Expected: FAIL because the module does not exist yet.

**Step 3: Write minimal implementation**

Create provider-specific diarization helpers that parse CLI inputs and normalize OpenAI diarized responses.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- scripts/lib/transcribe-openai-diarize.test.js`
Expected: PASS

### Task 3: Add the new diarization script entrypoint

**Files:**
- Create: `scripts/transcribe-openai-diarize.js`
- Modify: `package.json`
- Test: `scripts/transcribe-openai-diarize.test.js`

**Step 1: Write the failing test**

Add tests for argument parsing and transcript normalization decisions that the new script relies on.

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- scripts/transcribe-openai-diarize.test.js`
Expected: FAIL because the entrypoint helpers are not wired yet.

**Step 3: Write minimal implementation**

Create the new entrypoint with:

- OpenAI client setup
- CLI parsing
- known speaker reference handling
- chunked transcription flow
- transcript save path reusing shared helpers

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- scripts/transcribe-openai-diarize.test.js`
Expected: PASS

### Task 4: Verify existing scripts still work after refactor

**Files:**
- Modify: `README.md` (only if usage docs need updating)

**Step 1: Run targeted unit tests**

Run: `npm run test:unit -- scripts/lib/transcribe-common.test.js scripts/lib/transcribe-openai-diarize.test.js scripts/transcribe-openai-diarize.test.js`
Expected: PASS

**Step 2: Run syntax smoke checks**

Run:

```bash
node --check scripts/transcribe.js
node --check scripts/transcribe-openai.js
node --check scripts/transcribe-openai-diarize.js
```

Expected: all commands succeed without syntax errors

**Step 3: Optionally update usage docs**

If the new script should be discoverable immediately, add a matching npm script and short usage example to `README.md`.
