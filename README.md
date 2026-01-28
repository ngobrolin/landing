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

# Transcribe all missing
npm run transcribe --missing

# Re-transcribe all episodes
npm run transcribe --all
```

Requires `whisper-cli` and `yt-dlp` installed locally.

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

## License

MIT
