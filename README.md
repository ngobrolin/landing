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
npm run transcribe <videoId> -- --model <path>

# Transcribe all missing
npm run transcribe -- --missing --model <path> --limit <number>

# Re-transcribe all episodes
npm run transcribe --all -- --model <path> --limit <number>

# Sample
npm run transcribe -- --missing --model ~/Downloads/ggml-medium.bin --limit 2
```

Requires `whisper-cli` and `yt-dlp` installed locally.

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
