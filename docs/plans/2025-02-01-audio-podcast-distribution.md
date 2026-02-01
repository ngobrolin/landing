# Audio Podcast Distribution Plan

## Overview

Extract audio from 155 YouTube episodes, host on S3, and distribute to Apple Podcasts/Spotify via RSS.

## Architecture

```
YouTube Videos
      ↓
[extract-audio.ts] ← yt-dlp + ffmpeg
      ↓
MP3 files (128kbps, mono)
      ↓
[upload-s3.ts] ← AWS SDK
      ↓
S3 Bucket (public read)
      ↓
[podcast-rss.xml.ts] ← Astro endpoint
      ↓
Apple Podcasts / Spotify
```

## Components

| Component | Description |
|-----------|-------------|
| `scripts/extract-audio.ts` | Download from YouTube, convert to MP3 (similar to transcribe.js) |
| `scripts/upload-s3.ts` | Upload MP3s to S3, update episodes.json with `audioUrl` |
| `src/data/episodes.json` | Add `audioUrl` and `duration` fields |
| `src/pages/podcast-rss.xml.ts` | Generate podcast-compliant RSS feed |
| `src/data/podcast.json` | Podcast metadata (title, author, cover art, categories) |

## Episode Data Changes

```json
{
  "videoId": "Tkh8-LleLws",
  "title": "Agentic Coding Tools",
  "audioUrl": "https://s3.amazonaws.com/ngobrolin-audio/Tkh8-LleLws.mp3",
  "duration": 3600,
  "fileSize": 56000000
}
```

## Podcast RSS Requirements (Apple/Spotify)

- Cover art: 3000x3000 JPEG/PNG
- Audio: MP3, 64-320kbps
- Required tags: `<itunes:author>`, `<itunes:category>`, `<itunes:explicit>`, `<enclosure>`

## Workflow

1. **One-time**: Create S3 bucket, upload cover art, create `podcast.json`
2. **Batch**: Run `extract-audio.ts --missing` to process all 155 episodes
3. **Ongoing**: Add to weekly GitHub Action after `fetch-playlist.yml`
4. **Submit**: Register RSS feed URL with Apple Podcasts & Spotify

## Estimated Effort

| Task | Time |
|------|------|
| S3 bucket setup | 15 min |
| extract-audio.ts script | 1 hr |
| upload-s3.ts script | 30 min |
| podcast-rss.xml.ts | 1 hr |
| Cover art & metadata | 30 min |
| Batch process 155 episodes | ~10-15 hrs (automated) |

## Cost Estimate

- **Storage**: 8.7 GB × $0.023/GB = ~$0.20/month
- **Bandwidth**: $0.09/GB egress (varies by downloads)
- **Example**: 10,000 downloads/month = ~$50/month bandwidth
