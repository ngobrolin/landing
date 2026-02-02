# Sitemap Enhancement Design

## Overview

Enhance the sitemap generation with proper priorities, change frequencies, and last modified dates based on episode publish dates.

## Architecture

### Components

1. **robots.txt** - Fixed sitemap URL (remove trailing dot)
2. **Astro Config** - Enhanced `@astrojs/sitemap` integration with `serialize` function
3. **E2E Tests** - Playwright tests to validate sitemap output

### Data Flow

```
Build → Astro collects pages → sitemap.serialize() → Customizes each entry → sitemap.xml
```

The `serialize` function:
1. Receives each URL from Astro
2. Matches pathname to determine page type
3. Looks up episode data for episode pages
4. Applies priority, changefreq, and lastmod

## Serialize Function Logic

| Page Type | Priority | Change Frequency | Lastmod |
|-----------|----------|------------------|---------|
| Homepage (`/`) | 1.0 | daily | No |
| Episodes listing (`/episodes`) | 0.9 | weekly | No |
| Individual episodes (`/episodes/:slug`) | 0.8 | monthly | Yes (from `publishedAt`) |
| About (`/about`) | 0.5 | monthly | No |
| Subscribe (`/subscribe`) | 0.3 | monthly | No |
| Partners (`/partners`) | 0.3 | monthly | No |

## Implementation Changes

### 1. Fix `public/robots.txt`

```diff
- Sitemap: https://ngobrol.in./sitemap-index.xml
+ Sitemap: https://ngobrol.in/sitemap-index.xml
```

### 2. Update `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { getEpisodes } from './src/lib/episodes';

export default defineConfig({
  site: 'https://ngobrol.in',
  // ... other config
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        const url = new URL(item.url);

        // Homepage
        if (url.pathname === '/') {
          item.changefreq = 'daily';
          item.priority = 1.0;
          return item;
        }

        // Episodes listing
        if (url.pathname === '/episodes') {
          item.changefreq = 'weekly';
          item.priority = 0.9;
          return item;
        }

        // Individual episodes
        if (url.pathname.match(/^\/episodes\/[^/]+$/)) {
          const slug = url.pathname.split('/episodes/')[1];
          const episode = getEpisodes().find(ep => ep.slug === slug);

          if (episode) {
            item.lastmod = new Date(episode.publishedAt);
            item.priority = 0.8;
            item.changefreq = 'monthly';
          }
          return item;
        }

        // Static pages
        if (url.pathname === '/about') {
          item.changefreq = 'monthly';
          item.priority = 0.5;
          return item;
        }

        if (['/subscribe', '/partners'].includes(url.pathname)) {
          item.changefreq = 'monthly';
          item.priority = 0.3;
          return item;
        }

        return item;
      }
    })
  ],
  // ... rest of config
});
```

### 3. Add `e2e/sitemap.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('sitemap is accessible and valid', async ({ request }) => {
  const response = await request.get('/sitemap-index.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/xml');

  const text = await response.text();
  expect(text).toContain('sitemap-0.xml');
});

test('main sitemap contains all pages', async ({ request }) => {
  const response = await request.get('/sitemap-0.xml');
  const text = await response.text();

  expect(text).toContain('https://ngobrol.in/');
  expect(text).toContain('/episodes/');

  const urlCount = (text.match(/<loc>/g) || []).length;
  expect(urlCount).toBeGreaterThanOrEqual(160);
});

test('homepage has highest priority', async ({ request }) => {
  const response = await request.get('/sitemap-0.xml');
  const text = await response.text();

  const homepageEntry = text.match(/<loc>https:\/\/ngobrol\.in\/<\/loc>[\s\S]*?<\/url>/);
  expect(homepageEntry).toBeTruthy();
  expect(homepageEntry![0]).toContain('<priority>1.0</priority>');
  expect(homepageEntry![0]).toContain('<changefreq>daily</changefreq>');
});
```

## Validation

### Build Test
```bash
npm run build
ls -la dist/sitemap*.xml
cat dist/sitemap-0.xml | grep -o '<loc>[^<]*</loc>' | wc -l  # Should be >= 160
```

### Content Verification
```bash
# Check homepage priority
grep -A5 '<loc>https://ngobrol.in/</loc>' dist/sitemap-0.xml

# Check episode lastmod
grep -B2 -A5 'episodes/' dist/sitemap-0.xml | head -20
```

### E2E Test
```bash
npm run test:e2e
```

## Acceptance Criteria

- [ ] robots.txt has correct sitemap URL (no trailing dot)
- [ ] Sitemap config includes `serialize` function
- [ ] Homepage has `priority: 1.0, changefreq: daily`
- [ ] Episode pages have `priority: 0.8` and `lastmod` from `publishedAt`
- [ ] Sitemap accessible at https://ngobrol.in/sitemap-index.xml
- [ ] All 160+ URLs present
- [ ] E2E tests pass

## Post-Implementation

1. Submit sitemap to [Google Search Console](https://search.google.com/search-console)
2. Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)
3. Monitor coverage reports
