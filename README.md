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
