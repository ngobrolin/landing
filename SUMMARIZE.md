# Episode Summarization Instructions

You are helping summarize podcast episodes for the Ngobrolin WEB website.

## Task

1. Find episodes that have transcripts but no summaries yet
2. Generate a summary for one episode at a time
3. Save the summary to the correct location

## Steps

### Step 1: Find Episodes Needing Summaries

Check which episodes have transcripts but no summaries:

- Transcripts location: `src/data/transcripts/{videoId}.json`
- Summaries location: `src/data/summaries/{videoId}.json`

List transcripts that don't have corresponding summaries.

### Step 2: Read the Transcript

Read the transcript file for the episode you want to summarize. The transcript contains:
- `fullText`: Complete transcript text
- `segments`: Timestamped segments

### Step 3: Generate Summary

Create a summary in **Indonesian** with:

1. **brief**: 2-3 paragraph overview of what the episode discusses
2. **keyPoints**: 5-7 bullet points of main topics/takeaways

### Step 4: Save Summary

Create the summary file at `src/data/summaries/{videoId}.json`:

```json
{
  "videoId": "{videoId}",
  "generatedAt": "{ISO timestamp}",
  "brief": "Episode ini membahas tentang...",
  "keyPoints": [
    "Point pertama...",
    "Point kedua...",
    "Point ketiga..."
  ]
}
```

## Example Output

```json
{
  "videoId": "Tkh8-LleLws",
  "generatedAt": "2026-01-28T15:30:00Z",
  "brief": "Episode ini membahas penggunaan AI Agentic Coding dalam pengembangan software. Eka dan Ivan berbagi pengalaman mereka menggunakan tools seperti Cursor dan GitHub Copilot untuk meningkatkan produktivitas coding.\n\nDiskusi mencakup bagaimana AI dapat membantu dalam menulis kode, debugging, dan refactoring, serta tips praktis untuk memaksimalkan penggunaan tools tersebut.",
  "keyPoints": [
    "AI Agentic Coding adalah pendekatan di mana AI berperan sebagai 'agent' yang membantu proses coding",
    "Tools populer termasuk Cursor, GitHub Copilot, dan Claude",
    "Penting untuk memberikan konteks yang jelas kepada AI untuk hasil terbaik",
    "AI sangat membantu untuk boilerplate code dan refactoring",
    "Tetap perlu review manual untuk memastikan kualitas kode",
    "Kolaborasi dengan DomaiNesia untuk cloud hosting"
  ]
}
```

## Notes

- Always write summaries in Indonesian (Bahasa Indonesia)
- Keep the brief concise but informative
- Key points should be actionable/memorable takeaways
- Create `src/data/summaries/` directory if it doesn't exist
- Name what the episode names — technologies, products, people, events —
  rather than writing around them. These summaries are the site's search
  corpus, so "membahas berbagai tool AI" does no discovery work while "Modern
  Web Guidance, TensorFlow.js, Baseline" does. Ground every name in that
  episode's own transcript, allowing for ASR garbling (the transcript's "yakin
  C-dots" is Kent C. Dodds), or in its episode title, which is usually where a
  guest's name survives intact. Never invent a name the episode does not
  support, and see the whisper-repetition warning in AGENTS.md before grounding
  a summary. Density is a symptom, not a target: leave a summary light when the
  episode really is about a concept, and do not weaken prose that is already
  specific. Some older summaries deliberately stay vague — that style is not
  the target.
- `src/data/summaries.test.ts` enforces this contract: `videoId` must equal the
  filename, `generatedAt`/`brief`/every key point must be non-empty, key points
  must number 5-7, and no unfilled template placeholder (`{...}`, `TODO`, `TBD`)
  may survive. Run `pnpm run test:unit` after adding a summary. A handful of
  older files are grandfathered in that test; do not copy their shape.
