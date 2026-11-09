---
name: summarizing-episodes
description: "Writes a Bahasa Indonesia summary for a Ngobrolin WEB episode in src/data/summaries, grounded on its transcript, then regenerates tags and validates. Use when asked to summarize (ringkas) the next or a named episode, backfill missing summaries, list episodes without a summary, or revise an existing summary. Not for transcription, idea extraction or playlist sync."
---

# Summarizing Ngobrolin WEB episodes

Each episode page shows a "Ringkasan Episode" block read from
`src/data/summaries/<videoId>.json`. This skill writes that file for one
episode at a time, in Bahasa Indonesia, grounded on the episode's own
transcript. It is the authoritative contract for summaries. `SUMMARIZE.md` at
the repo root only points here.

The machine-checkable rules live in `scripts/lib/summary-contract.ts`.
`src/data/summaries.test.ts` applies them to every committed file and
`scripts/check-summary.ts` applies them to a new one. Everything else on this
page is judgement that no test can check, so follow it closely.

## When to use

- "Summarize the next episode", "ringkas episode X", "backfill the missing summaries".
- "Which episodes still need a summary?"
- Revising a summary that is wrong, vague or ungrounded, when asked to.

Not for:

- Transcripts. Generate those first with `pnpm run transcribe:youtube` (see
  "Transcription" in `AGENTS.md`).
- Episode ideas. Use the `extracting-ideas` skill.
- Episode records, slugs or audio. Those come from the playlist sync, never from here.

## The contract

One file per episode at `src/data/summaries/<videoId>.json`. The filename is the
YouTube video ID, and `Summary.astro` finds the file by that name alone.

| Field | Rule |
| :--- | :--- |
| `videoId` | The YouTube video ID. Must equal the filename without `.json`. |
| `generatedAt` | ISO 8601 UTC timestamp of when you wrote the summary, e.g. `2026-10-26T16:24:06Z`. |
| `brief` | 2-3 paragraphs separated by a blank line (`\n\n`). The page renders the line breaks as written. |
| `keyPoints` | 5-7 non-empty strings: the main topics and takeaways. |

No other field is read. No template leftover may survive: `{videoId}`-style
placeholders, `TODO`, `TBD`, `FIXME` or `lorem ipsum` fail the check.

The shape, with the real episode `Nq3uKguMNCA` as the ID:

```json
{
  "videoId": "Nq3uKguMNCA",
  "generatedAt": "2026-10-26T16:24:06Z",
  "brief": "Paragraf pertama: topik utama episode dan siapa yang membahasnya.\n\nParagraf kedua: pembahasan inti, dengan nama teknologi, produk dan orang yang disebut di episode.\n\nParagraf ketiga (opsional): kesimpulan atau ajakan penutup dari para host.",
  "keyPoints": [
    "Poin pertama yang bisa diingat pembaca.",
    "Poin kedua yang bisa diingat pembaca.",
    "Poin ketiga yang bisa diingat pembaca.",
    "Poin keempat yang bisa diingat pembaca.",
    "Poin kelima yang bisa diingat pembaca."
  ]
}
```

For a finished example of the target quality, read
`src/data/summaries/Nq3uKguMNCA.json`.

### Writing rules

- Write in Bahasa Indonesia. Keep technology and product names as the episode says them.
- Keep the brief concise but informative. Key points are memorable takeaways a
  reader can act on or recall, not a table of contents.
- Name what the episode names: technologies, products, people, events. These
  summaries are the site's search corpus, so "membahas berbagai tool AI" does no
  discovery work while "Modern Web Guidance, TensorFlow.js, Baseline" does.
- Ground every name in that episode's own transcript, allowing for ASR garbling
  (the transcript's "yakin C-dots" is Kent C. Dodds), or in its episode title in
  `src/data/episodes.json`, which is usually where a guest's name survives intact.
  Never invent a name the episode does not support.
- Density is a symptom, not a target. Leave a summary light when the episode
  really is about a concept, and do not weaken prose that is already specific.
  Some older summaries stay deliberately vague; that style is not the target.
- A few older files have 8-12 key points or no `videoId`. They are frozen in
  `src/data/summaries.test.ts`. Do not copy their shape.

## Transcript provenance and limits

A transcript at `src/data/transcripts/<videoId>.json` has `videoId`,
`language`, `generatedAt`, `segments` (`start`, `end`, `text`) and `fullText`.
The `source` field is optional:

- `"youtube-auto"`: YouTube auto-captions. Little punctuation, no speaker labels,
  and names are often misheard.
- Absent: a Whisper transcript from `pnpm run transcribe` or
  `pnpm run transcribe:openai`, neither of which writes the field. Cleaner
  text, but see below.

Whisper repetition loops corrupt roughly a dozen transcripts: one line repeats
for hundreds of wrapped lines, sometimes to the end of the file. Ground the
summary only on the intact portions and never guess what a loop replaced. If
the intact part cannot support 5 grounded key points, stop and report that
instead of padding. Do not regenerate the transcript to fix it: overwriting a
Whisper transcript with auto-captions is a downgrade, which is why
`transcribe:youtube` refuses without `--force`.

## Procedure

1. **Pick the episode.** Run `pnpm exec tsx scripts/check-summary.ts --missing`.
   It lists episodes that have a transcript but no summary, and episodes that
   still need a transcript. If the user named an episode, find its `videoId` by
   title or slug in `src/data/episodes.json`.
   Done when you hold one `videoId` with a transcript.
2. **Do not overwrite.** If `src/data/summaries/<videoId>.json` already exists,
   stop unless the user asked you to revise that summary. When revising, edit
   the existing file, keep its `videoId`, set a new `generatedAt`, and report
   what changed and why.
   Done when the target file is either absent or explicitly in scope.
3. **Read the sources.** Read the transcript and the episode's title in
   `src/data/episodes.json`. Note the `source` field. Scan `fullText` for a
   repetition loop: the same sentence back to back across many segments.
   Done when you know which part of the transcript is intact.
4. **Write the summary** to `src/data/summaries/<videoId>.json` following the
   contract and writing rules above.
   Done when every name in it can be traced to the transcript or the title.
5. **Check the file.** Run
   `pnpm exec tsx scripts/check-summary.ts src/data/summaries/<videoId>.json`.
   It applies the contract with no legacy exemptions and confirms the episode
   and its transcript exist. A draft kept elsewhere can be checked the same way
   before you place it, as long as its filename is `<videoId>.json`.
   Done when it prints `✓` for the file.
6. **Regenerate tags.** Run `pnpm exec tsx scripts/extract-tags.ts`. It
   rebuilds `src/data/tags.json` from every summary and replaces the file
   wholesale; never edit `tags.json` by hand. Then inspect
   `git diff src/data/tags.json`. A new summary adds only its own entry (the
   one removed line you may see is a closing `]` that gained a comma). A
   revision may change its own entry. If a tag vanishes from the file
   altogether, its indexed `/tags/<tag>` page disappears with it: stop and ask
   before going further.
   Done when the diff touches only the episodes you summarised and every tag
   that was in the file is still there.
7. **Run the unit tests** with `pnpm run test:unit`. They cover the summary
   shape, the tag route guards and the golden slug list in
   `src/lib/slugs.golden.txt`.
   Done when they pass.

Repeat from step 1 for the next episode. Check each one before starting another.

## Pitfalls

- `Summary.astro` validates nothing and finds the file by name alone. A wrong
  `videoId` field renders without complaint and a malformed file renders a
  broken block, so skipping step 5 ships the mistake.
- Summarise only episodes in `src/data/episodes.json`. A summary for any other
  video becomes an orphan entry in `tags.json`. The check in step 5 rejects it.
- Leave `src/data/episodes.json`, transcripts and slugs alone. A summary needs
  none of them changed.
- Missing summaries are a normal state after the weekly playlist sync. The
  unit tests check shape, not coverage, so they will not tell you an episode
  still needs one. Use `--missing` for that.

## Verification

- `pnpm exec tsx scripts/check-summary.ts src/data/summaries/<videoId>.json` prints `✓` for every new or revised file.
- `git status` shows only those summary files and `src/data/tags.json`.
- `git diff src/data/tags.json` touches only those episodes, and no tag has left the file.
- `pnpm run test:unit` passes.
- Optional: `pnpm run build`, then `pnpm run preview`, and open the episode page
  to see the "Ringkasan Episode" block.
