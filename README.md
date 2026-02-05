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

Generate transcripts for episodes using local Whisper:

```bash
# Transcribe next episode without transcript
npm run transcribe

# Transcribe specific episode
npm run transcribe <videoId>

# Transcribe all missing episodes
npm run transcribe -- --missing

# Re-transcribe all episodes
npm run transcribe -- --all
```

### Options

| Flag               | Description                                        | Default                       |
| ------------------ | -------------------------------------------------- | ----------------------------- |
| `--model <path>`   | Path to Whisper model (.bin)                       | `~/Downloads/ggml-medium.bin` |
| `--browser <name>` | Browser for cookies (chrome, brave, firefox, etc.) | `brave`                       |
| `--limit <number>` | Max number of episodes to process                  | None (all)                    |
| `--missing`        | Process episodes without transcripts               | -                             |
| `--all`            | Process all episodes                               | -                             |

### Examples

```bash
# Transcribe 5 missing episodes with custom model
npm run transcribe -- --missing --limit 5 --model ~/Downloads/ggml-medium.bin

# Transcribe all missing using Chrome cookies
npm run transcribe -- --missing --browser chrome

# Transcribe specific episode with all options
npm run transcribe -- abc123xyz --model ~/models/ggml-large.bin --browser firefox --limit 1
```

### Requirements

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
