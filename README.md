# Ngobrolin WEB

Website untuk video podcast Ngobrolin WEB - hadir setiap Selasa malam jam 20:00 WIB.

## Tech Stack

- **Astro** - Static Site Generator
- **Tailwind CSS** - Styling
- **YouTube Data API** - Fetch playlist data

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Fetch YouTube Playlist Data

To fetch all episodes from the YouTube playlist:

```bash
# Get a YouTube Data API key from Google Cloud Console
# https://console.cloud.google.com/apis/library/youtube.googleapis.com

# Run the fetch script
YOUTUBE_API_KEY=your_api_key npx tsx scripts/fetch-playlist.ts
```

This will update `src/data/episodes.json` with all playlist videos.

## Transcription

Two transcription backends are available — local (whisper.cpp) and cloud (OpenAI API).

### Option A: Local Whisper (whisper.cpp)

Runs entirely offline. Requires a local model file and `whisper-cli` installed.

```bash
# Transcribe next episode without transcript
npm run transcribe

# Transcribe specific episode
npm run transcribe -- <videoId>

# Transcribe all missing episodes
npm run transcribe -- --missing

# Re-transcribe all episodes
npm run transcribe -- --all
```

#### Options

| Flag                 | Description                                                            | Default                       |
| -------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| `--model <path>`     | Path to Whisper model (.bin)                                           | `~/Downloads/ggml-medium.bin` |
| `--browser <name>`   | Browser for cookies (chrome, brave, firefox, etc.)                     | `brave`                       |
| `--limit <number>`   | Max number of episodes to process                                      | None (all)                    |
| `--suppress-nst`     | Use Whisper's `-sns` flag to suppress non-speech tokens (music, etc.)  | Off (uses post-filter)        |
| `--missing`          | Process episodes without transcripts                                   | -                             |
| `--all`              | Process all episodes                                                   | -                             |

#### Examples

```bash
# Transcribe 5 missing episodes with custom model
npm run transcribe -- --missing --limit 5 --model ~/Downloads/ggml-medium.bin

# Transcribe all missing using Chrome cookies
npm run transcribe -- --missing --browser chrome

# Transcribe specific episode with all options
npm run transcribe -- abc123xyz --model ~/models/ggml-large.bin --browser firefox --limit 1

# Transcribe with Whisper's native non-speech suppression (faster, no post-filter)
npm run transcribe -- --missing --suppress-nst
```

#### Requirements

- **whisper-cli**: Install via `brew install whisper-cpp` ([GitHub](https://github.com/ggml-org/whisper.cpp)) - Metal GPU acceleration enabled on Apple Silicon
- **yt-dlp**: Install via `brew install yt-dlp` ([GitHub](https://github.com/yt-dlp/yt-dlp))
- **Whisper model**: Download from [huggingface.co/ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)

  Available models (size → speed vs accuracy):

  - `ggml-tiny.bin` (~39MB) - Fastest, lowest accuracy
  - `ggml-base.bin` (~74MB) - Fast, good accuracy
  - `ggml-small.bin` (~244MB) - Balanced
  - `ggml-medium.bin` (~769MB) - Slower, better accuracy
  - `ggml-large-v3.bin` (~3.1GB) - Slowest, best accuracy

  ```bash
  # Example: download medium model
  wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin -P ~/Downloads
  ```

---

### Option B: OpenAI Whisper API (cloud)

Uses the OpenAI Whisper API (or any OpenAI-compatible endpoint, e.g. Groq). No local model needed — requires an API key and internet access. Downloads audio as mp3.

#### Prerequisites

- **OPENAI_API_KEY**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **yt-dlp**: Install via `brew install yt-dlp`

#### Basic usage

```bash
# Transcribe next missing episode
OPENAI_API_KEY=sk-... npm run transcribe:openai

# Transcribe specific episode
OPENAI_API_KEY=sk-... npm run transcribe:openai -- <videoId>

# Transcribe all missing episodes
OPENAI_API_KEY=sk-... npm run transcribe:openai -- --missing

# Re-transcribe all episodes
OPENAI_API_KEY=sk-... npm run transcribe:openai -- --all
```

#### Options

| Flag                  | Description                                          | Default      |
| --------------------- | ---------------------------------------------------- | ------------ |
| `--model <name>`      | API model name                                       | `whisper-1`  |
| `--base-url <url>`    | Custom OpenAI-compatible endpoint base URL           | OpenAI default |
| `--browser <name>`    | Browser for cookies (chrome, brave, firefox, etc.)   | `brave`      |
| `--limit <number>`    | Max number of episodes to process                    | None (all)   |
| `--missing`           | Process episodes without transcripts                 | -            |
| `--all`               | Process all episodes                                 | -            |

#### Examples

```bash
# Transcribe 3 missing episodes
OPENAI_API_KEY=sk-... npm run transcribe:openai -- --missing --limit 3

# Use a different browser for cookies
OPENAI_API_KEY=sk-... npm run transcribe:openai -- --missing --browser chrome

# Use Groq's OpenAI-compatible endpoint (whisper-large-v3)
OPENAI_API_KEY=gsk_... npm run transcribe:openai -- \
  --base-url https://api.groq.com/openai/v1 \
  --model whisper-large-v3 \
  --missing

# Smoke test: re-transcribe one known episode to verify output
OPENAI_API_KEY=sk-... npm run transcribe:openai -- 0o-PcX6pR2E
```

#### Verifying output

After running, check that the transcript was saved correctly:

```bash
node -e "
const t = JSON.parse(require('fs').readFileSync('src/data/transcripts/<videoId>.json', 'utf-8'));
console.log('videoId:', t.videoId);
console.log('language:', t.language);
console.log('segments:', t.segments.length);
console.log('first segment:', JSON.stringify(t.segments[0]));
console.log('fullText length:', t.fullText.length);
"
```

#### Notes

- Audio is downloaded as mp3 (not wav) — much smaller, fits well within the API's 25MB limit
- The same non-conversation filter (`[Musik]`, `[tertawa]`, etc.) is applied as in the local script
- Per-episode errors are caught and logged — processing continues to the next episode on failure

---

### Filtering Non-Conversation Elements

Both scripts automatically filter out non-conversation segments like `[Musik]`, `[Music]`, `[tertawa]`, etc. from the final transcript.

The local script additionally supports `--suppress-nst` to use Whisper's native `-sns` flag during transcription instead of post-filtering.

The script automatically finds executables in your PATH, with fallback to hardcoded paths if needed.

## Audio Podcast

Extract audio from YouTube and upload to S3 for Apple Podcasts/Spotify distribution:

```bash
# Check status
npx tsx scripts/extract-audio.ts --status
npx tsx scripts/upload-s3.ts --status

# Extract next episode (oldest first)
npx tsx scripts/extract-audio.ts

# Extract all missing
npx tsx scripts/extract-audio.ts --missing

# Upload to S3 (requires AWS credentials)
npx tsx scripts/upload-s3.ts

# Upload all extracted
npx tsx scripts/upload-s3.ts --missing
```

Requires `yt-dlp` and `ffmpeg` installed locally. AWS credentials via `~/.aws/credentials` or environment variables.

Podcast RSS feed available at `/podcast-rss.xml`.

## Summarization

Generate summaries using AI tools (Amp, Claude, Gemini CLI, etc.):

1. Enter interactive mode with your preferred AI tool
2. Reference the instruction file: `@SUMMARIZE.md`
3. Ask to summarize the next episode

The AI will find episodes with transcripts but no summaries, generate a brief overview and key points in Indonesian, and save to `src/data/summaries/`.

Example:

In any AI tool (Amp, Claude, Gemini CLI):

```
> @SUMMARIZE.md please summarize the next episode
```

## Project Structure

```
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── EpisodeCard.astro
│   │   └── YouTubeEmbed.astro
│   ├── data/
│   │   └── episodes.json       # Episode data from YouTube
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── episodes.ts         # Episode utilities
│   ├── pages/
│   │   ├── about.astro
│   │   ├── episodes/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── index.astro
│   └── styles/
│       └── global.css
├── scripts/
│   └── fetch-playlist.ts       # YouTube playlist fetcher
└── astro.config.mjs
```

## Deployment

Deploy to any static hosting:

- **Cloudflare Pages**: Connect repo, build command `npm run build`, output `dist`
- **Netlify**: Same settings
- **Vercel**: Auto-detected

## Analytics (Optional)

This site supports optional [Umami](https://umami.is) analytics (pageviews + custom events).

Configure at build time (e.g. Cloudflare Pages env vars):

- `PUBLIC_UMAMI_WEBSITE_ID` (required to enable)
- `PUBLIC_UMAMI_SCRIPT_URL` (optional; default `https://cloud.umami.is/script.js`)
- `PUBLIC_UMAMI_DOMAINS` (optional; e.g. `ngobrol.in`)

Tracked events include: `outbound_click`, `subscribe_click`, `cta_click`, `share_click`, `video_play`.

## License

MIT
