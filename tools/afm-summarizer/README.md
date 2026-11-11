# afm-summarizer

A single Swift script that summarizes one transcript JSON in Bahasa Indonesia using
Apple's on-device model (`FoundationModels`, `SystemLanguageModel.default`). It makes no
network calls, has no cloud fallback and no dependencies, and never touches site data.
The Markdown goes to stdout or to a new file you name.

## Requirements

- macOS 27 on a Mac that supports Apple Intelligence.
- Apple Intelligence turned on in System Settings > Apple Intelligence & Siri, with the
  model downloaded. The script stops with exit code 5 and says which of these is missing.
- Swift 6.4 or newer (Xcode or the Command Line Tools), so `swift` can run the file directly.

## Preflight

Before a manual run, check that this Mac is ready. Run from the repository root:

```sh
tools/afm-summarizer/preflight.sh
```

It checks macOS 27 or newer, Apple silicon (and warns if the shell runs under Rosetta),
`swift`, and a macOS SDK from `xcrun`. Then it compiles a short `swift -e` probe that
imports `FoundationModels` and reports `availability`, `variant.displayName`,
`contextSize` and `supportsLocale(id_ID)`. The probe doubles as the SDK check: the SDK and
toolchain must provide the macOS 27 FoundationModels API, and if they do not, the compile
error is printed as a failed preflight.

Each line reads `PASS`, `WARN` or `FAIL`. Exit 0 means ready, warnings included. Exit 1
means a check failed (an unavailable model comes with what to fix), and exit 2 means it
was given an argument other than `-h` or `--help`. `supportsLocale(id_ID)` being `false`
is only a warning, for the reason under "Indonesian support is not guaranteed" below.

The preflight never generates text, sends a prompt, downloads the model, makes a network
call, installs anything or writes a file. A pass says the model is available, not that a
summary will succeed.

## Usage

Run from the repository root. Paths are relative to wherever you run it.

```sh
# Summary on stdout
swift tools/afm-summarizer/summarize.swift src/data/transcripts/XXXXXXXXXXX.json

# Redirect stdout to a file (progress stays on stderr, in the terminal)
swift tools/afm-summarizer/summarize.swift src/data/transcripts/XXXXXXXXXXX.json > ringkasan.md

# Extra instructions
swift tools/afm-summarizer/summarize.swift src/data/transcripts/XXXXXXXXXXX.json \
  --instructions "Fokus pada tooling dan library yang disebut. Sebutkan juga pendapat yang berbeda."

# Extra instructions from a file, written to a new output file
swift tools/afm-summarizer/summarize.swift src/data/transcripts/XXXXXXXXXXX.json \
  --instructions-file notes/instruksi.txt --output ringkasan.md

# Video IDs can start with "-": use ./ or put the path after --
swift tools/afm-summarizer/summarize.swift ./src/data/transcripts/-DdLCXFsrRY.json
swift tools/afm-summarizer/summarize.swift --chunk-size 4000 -- src/data/transcripts/-DdLCXFsrRY.json
```

`swift tools/afm-summarizer/summarize.swift --help` lists every option. Swift compiles the
script on each run, so expect a few seconds before the first progress line.

| Option | Meaning |
| :--- | :--- |
| `--instructions <text>` | Extra instructions, added to every chunk, reduce and synthesis prompt. |
| `--instructions-file <path>` | Same, read from a UTF-8 file. Can be combined with `--instructions`; the file text comes first. |
| `--output <path>` | Write the Markdown to this file instead of stdout. The file must not exist yet. |
| `--chunk-size <chars>` | Transcript characters per chunk, 1000 to 12000, default 6000. |

The input must be `{ "videoId": String, "language": String, "segments": [{ "text": String, ... }] }`.
Other fields (`fullText`, `start`, `end`, `source`) are ignored.

## How it works

The model's context is 8192 tokens on the setup this was written on, far smaller than an
episode, so the script works in three stages, each in its own fresh session:

1. **Chunk.** Segment texts are joined into chunks of up to `--chunk-size` characters. A
   segment longer than that is split at spaces, and a run of characters with no space is
   cut at the limit. Back-to-back identical segments are dropped first, since whisper
   repetition loops can repeat one line hundreds of times. Each chunk prompt is measured
   with the model's own tokenizer and halved again if it would not fit.
2. **Reduce.** If all chunk notes together do not fit one synthesis prompt, they are
   batched by measured token count and condensed, repeating until they fit. Each round
   must shrink the number of notes, or the script stops.
3. **Synthesis.** One call writes the final Markdown (`## Ringkasan`, `## Poin Utama`,
   `## Topik` by default).

Every stage is instructed in Bahasa Indonesia. There is no English intermediate that gets
translated. Your extra instructions are added to every stage and take precedence over the
default language and format rules, so they can change either.

## Indonesian support is not guaranteed

On the machine this was built on, `supportsLocale(id_ID)` returns `false`, yet Indonesian
in and Indonesian out has worked. The script logs that as a warning and carries on. If the
model does reject the language at runtime (`unsupportedLanguageOrLocale`), the script exits
with code 5 and writes nothing. Read the output before using it anywhere.

## Which model variant runs

`SystemLanguageModel.default` is the only model the script uses. The variant behind it is
identifiable through the public `variant.displayName`: on the machine this was built on it
reports `AFM 3 Core Advanced`, and the script logs that line to stderr on every run. Which
variant serves `.default` is still the system's choice. The API has no way to request Core
Advanced, so another Mac, or the same Mac after an OS update, may log a different variant.

## Failure behaviour

stdout carries only the final Markdown. Everything else (progress, token counts, warnings,
errors) goes to stderr. On any failure the script exits nonzero and prints nothing on stdout;
it never substitutes placeholder text for a chunk it could not summarize.

| Exit | Cause |
| :--- | :--- |
| 2 | Bad arguments: unknown option, missing value, duplicate option, chunk size out of range. |
| 3 | Bad input: missing or unreadable file, invalid JSON, wrong schema, no text, empty or oversized instructions. |
| 4 | Output refused: file exists, same as the input or instructions file, missing directory, or under `src/data/`. |
| 5 | Model unavailable or language rejected. |
| 6 | Generation failed: guardrail, refusal, rate limit, timeout, empty response, or a context overflow that splitting could not fix. |

## Checks

`tools/afm-summarizer/test-cli.sh` compiles the script and runs the argument, input and
output validation cases against synthetic fixtures. None of them reaches the model.
Set `SCRATCH_DIR` to choose where the temporary fixtures go.

```sh
tools/afm-summarizer/test-cli.sh
```
