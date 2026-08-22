# ADR-001: Audio Podcast Hosting on AWS S3

## Status

Accepted

## Date

2025-02-01

## Context

Ngobrolin WEB is a video podcast distributed via YouTube with 155+ episodes. To expand audience reach, we want to distribute audio versions to platforms like Apple Podcasts and Spotify.

This requires:
1. Extracting audio from YouTube videos
2. Hosting audio files accessible via public URLs
3. Generating a podcast-compliant RSS feed

### Key Constraints

- **155 existing episodes** need batch processing
- **Budget**: AWS credits available to burn
- **Primary audience**: Indonesian developers
- **Content type**: Conversational/speech (not music)

## Decision

### Storage: AWS S3 (ap-southeast-1)

**Choice**: Direct S3 bucket in Singapore region, no CloudFront CDN.

**Rationale**:
- Singapore region provides lowest latency for Indonesian audience
- Direct S3 is simpler to set up and maintain
- CDN overhead not justified for initial traffic levels
- Can add CloudFront later if needed

**Rejected alternatives**:
- *Cloudflare R2*: Free egress, but user has AWS credits to use
- *Backblaze B2*: Cheapest, but adds complexity with separate provider
- *Podcast hosting services (Anchor, Buzzsprout)*: Less control, potential limitations

### Audio Format: MP3 128kbps Mono

**Choice**: 128kbps mono MP3 files (~28 MB/hour).

**Rationale**:
- Industry standard for speech podcasts
- Mono is appropriate for conversation (no spatial audio needed)
- Reduces storage to ~4.3 GB total (vs 8.7 GB stereo)
- Reduces bandwidth costs by 50%
- Compatible with all podcast platforms and players

**Rejected alternatives**:
- *128kbps stereo*: Unnecessary for speech, doubles file size
- *192kbps+*: Overkill for conversation, higher costs
- *AAC*: Better compression but less compatible

### Processing: Local Execution

**Choice**: Run audio extraction locally, not via GitHub Actions.

**Rationale**:
- Initial batch of 155 episodes is large (~10-15 hours processing)
- Avoids GitHub Actions minute limits and costs
- Local tools (yt-dlp, ffmpeg) already available
- Full control over process and error handling
- No need to store YouTube cookies/auth in CI

**Rejected alternatives**:
- *GitHub Actions*: Would consume significant CI minutes, auth complexity
- *Cloud processing (Lambda, EC2)*: Over-engineered for this use case

### RSS Feed: Static Generation via Astro

**Choice**: Generate podcast RSS at build time via `src/pages/podcast-rss.xml.ts`.

**Rationale**:
- Consistent with existing `rss.xml.ts` pattern
- No runtime dependencies
- Cached at edge via Cloudflare Pages
- Easy to maintain alongside video RSS

## Consequences

### Positive

- Full control over audio files and metadata
- No vendor lock-in to podcast hosting platforms
- Predictable costs with AWS credits
- Can customize RSS feed format exactly
- Audio URLs are permanent and portable

### Negative

- Manual local processing for batch and new episodes
- Must manage S3 bucket permissions and lifecycle
- Bandwidth costs scale with downloads (no free tier)
- Need to handle upload failures and retries manually

### Risks

- **YouTube rate limiting**: Mitigate by processing slowly with delays
- **Storage costs if traffic spikes**: Monitor and set billing alerts
- **Apple/Spotify rejection**: Follow RSS spec strictly, validate before submission

## Implementation

Operational pipeline details: AGENTS.md (Podcast audio pipeline).

### Scripts

1. `scripts/extract-audio.ts` - Download and convert to MP3
2. `scripts/upload-s3.ts` - Upload to S3, update episodes.json
3. `src/pages/podcast-rss.xml.ts` - Podcast RSS feed

### S3 Bucket Configuration

Authoritative current bucket name, object key layout, and upload invariants:
AGENTS.md (Podcast audio pipeline) and `scripts/upload-s3.ts`.

## References

- [Apple Podcasts RSS Requirements](https://podcasters.apple.com/support/823-podcast-requirements)
- [Spotify Podcast Delivery Spec](https://podcasters.spotify.com/support/articles/audio-quality)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
