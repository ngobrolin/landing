# Schema.org / JSON-LD Implementation Design

**Date:** 2026-02-02
**Issue:** https://github.com/ngobrolin/landing/issues/25
**Status:** Design Approved

## Overview

Add comprehensive Schema.org structured data to improve SEO and search engine understanding for Homepage, About page, and Episodes index. Episode pages already have VideoObject, PodcastEpisode, and BreadcrumbList schemas.

## Current State

- Episode pages (`[slug].astro`) have VideoObject, PodcastEpisode, BreadcrumbList schemas
- SEO utilities centralized in `src/lib/seo.ts`
- Episode data fetched from YouTube API, stored in `src/data/episodes.json`
- VideoObject schema missing `duration` property

## Design Decisions

### Schema Organization
**Decision:** Single `@graph` array per page

- Each page gets one `<script type="application/ld+json">` tag
- All related schemas combined in `@graph` array
- Cleaner markup, easier validation

### Duration Data Fetching
**Decision:** Batch fetch via YouTube Videos API

- Two-step API flow: PlaylistItems → Videos (for duration)
- Duration stored in ISO 8601 format (e.g., `PT4M13S`)
- Optional field to handle legacy episodes

## Architecture

### Schema Generator Functions (`src/lib/seo.ts`)

```typescript
// Homepage: WebSite + Organization + PodcastSeries
export function generateHomepageSchema(
  siteUrl: string,
  episodeCount: number
): SchemaGraph

// About: AboutPage + Organization (with founders)
export function generateAboutPageSchema(siteUrl: string): SchemaGraph

// Episodes Index: CollectionPage + ItemList
export function generateCollectionPageSchema(
  name: string,
  description: string,
  url: string,
  items: Episode[]
): SchemaGraph

// Episode: Updated to include duration
export function generateVideoSchema(
  episode: Episode,
  summary: Summary | null,
  transcript: Transcript | null,
  siteUrl: string
): VideoObject
```

### Episode Interface Update

```typescript
// src/lib/episodes.ts
export interface Episode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  slug: string;
  episodeNumber: number;
  brief?: string;
  duration?: string;  // NEW: ISO 8601 format, e.g., "PT4M13S"
}
```

## Data Flow

### YouTube API Two-Step Fetch

1. **Fetch PlaylistItems** - Get video IDs and metadata
   ```
   GET /playlistItems?part=snippet&playlistId=...
   ```

2. **Batch Fetch Videos** - Get duration (50 videos per request)
   ```
   GET /videos?id=videoId1,videoId2,...&part=contentDetails
   ```

3. **Merge and Save** - Combine data, save to `episodes.json`

### Fetch Script Changes (`scripts/fetch-playlist.ts`)

```typescript
// New interface for video details
interface VideoDetails {
  videoId: string;
  duration: string;  // PT4M13S format
}

// New function to batch fetch video details
async function fetchVideoDetails(videoIds: string[]): Promise<Record<string, VideoDetails>>

// Updated main flow
const playlistItems = await fetchAllPlaylistItems();
const videoIds = playlistItems.map(item => item.videoId);
const videoDetails = await fetchVideoDetails(videoIds);
const episodes = mergePlaylistAndDetails(playlistItems, videoDetails);
```

## Page Integration

### Homepage (`src/pages/index.astro`)

```astro
---
import { generateHomepageSchema } from '../lib/seo';

const homepageSchema = generateHomepageSchema(
  Astro.site.toString(),
  episodes.length
);
---

<Layout ...>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(homepageSchema)} />
  </Fragment>
</Layout>
```

**Schemas:**
- WebSite (with search action)
- Organization (social links, founders)
- PodcastSeries (with dynamic episode count)

### About Page (`src/pages/about.astro`)

```astro
---
import { generateAboutPageSchema } from '../lib/seo';

const aboutSchema = generateAboutPageSchema(Astro.site.toString());
---

<Layout ...>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(aboutSchema)} />
  </Fragment>
</Layout>
```

**Schemas:**
- AboutPage
- Organization (with founding date, founders as Person)

### Episodes Index (`src/pages/episodes/index.astro`)

```astro
---
import { generateCollectionPageSchema } from '../../lib/seo';
import { getEpisodes } from '../../lib/episodes';

const episodes = getEpisodes();
const collectionSchema = generateCollectionPageSchema(
  'Semua Episode - Ngobrolin WEB',
  'Daftar lengkap semua episode video podcast Ngobrolin WEB',
  `${Astro.site}/episodes`,
  episodes
);
---

<Layout ...>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(collectionSchema)} />
  </Fragment>
</Layout>
```

**Schemas:**
- CollectionPage
- ItemList (all episodes with positions)

### Episode Page (`src/pages/episodes/[slug].astro`)

**Update existing:** Add `duration` to VideoObject schema

```typescript
const videoSchema = generateVideoSchema(episode, summary, transcript, siteUrl);
// Now includes: duration: episode.duration
```

## Error Handling

| Scenario | Approach |
|----------|----------|
| Duration fetched successfully | Store and use in schema |
| Duration missing from API | Store as `undefined`, omit from schema |
| Private/deleted video | Already skipped in fetch script |
| Legacy episodes without duration | Optional field, schema still valid |
| Missing site URL | Fallback to `https://ngobrol.in` |

## Schema Content Details

### Homepage Schemas

**WebSite:**
- name: "Ngobrolin WEB"
- url, description
- inLanguage: "id-ID"
- potentialAction: SearchAction

**Organization:**
- name, url, logo
- description, sameAs (social links)
- founders: Eka, Ivan, Riza (as Person with jobTitle)

**PodcastSeries:**
- name, description, url
- webFeed: `/rss.xml`
- numberOfEpisodes: (dynamic)
- inLanguage: "id-ID"

### About Page Schemas

**AboutPage:**
- mainEntity: Organization

**Organization:**
- foundingDate: "2019"
- founders: Detailed Person schemas

### CollectionPage Schemas

**CollectionPage:**
- name, description, url

**ItemList:**
- numberOfItems
- itemListElement: each episode as ListItem with PodcastEpisode

## Testing

### Unit Tests (`src/lib/seo.test.ts`)

- Test each schema generator function
- Verify valid Schema.org structure
- Test with missing/optional data
- Verify dynamic values (episode count, positions)

### E2E Tests

- Verify JSON-LD script tag exists on each page
- Validate JSON is parseable
- Check for required schema types

### Manual Validation

1. Build and inspect HTML for `<script type="application/ld+json">`
2. Google Rich Results Test: https://search.google.com/test/rich-results
3. Schema Markup Validator: https://validator.schema.org/
4. Google Search Console monitoring

## Acceptance Criteria

- [ ] `scripts/fetch-playlist.ts` fetches duration via Videos API
- [ ] Episode interface includes `duration?: string` property
- [ ] `episodes.json` includes duration for each episode
- [ ] Homepage has WebSite, Organization, PodcastSeries schemas
- [ ] About page has AboutPage + Organization schema
- [ ] Episodes index has CollectionPage schema
- [ ] VideoObject schema includes `duration` property
- [ ] All schemas pass Google Rich Results Test
- [ ] Unit tests for schema generators
- [ ] E2E tests for JSON-LD presence

## References

- [Schema.org VideoObject](https://schema.org/VideoObject)
- [Schema.org PodcastEpisode](https://schema.org/PodcastEpisode)
- [Schema.org Organization](https://schema.org/Organization)
- [Schema.org WebSite](https://schema.org/WebSite)
- [Schema.org CollectionPage](https://schema.org/CollectionPage)
- [YouTube Data API - Videos Resource](https://developers.google.com/youtube/v3/docs/videos)
