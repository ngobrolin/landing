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
- `src/data/summaries.test.ts` enforces this contract: `videoId` must equal the
  filename, `generatedAt`/`brief`/every key point must be non-empty, key points
  must number 5-7, and no unfilled template placeholder (`{...}`, `TODO`, `TBD`)
  may survive. Run `pnpm run test:unit` after adding a summary. A handful of
  older files are grandfathered in that test; do not copy their shape.
