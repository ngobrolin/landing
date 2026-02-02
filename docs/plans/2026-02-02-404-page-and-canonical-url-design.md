# 404 Page & Canonical URL Design

**Date:** 2026-02-02
**Status:** Design Approved

## Problem Statement

1. **Missing 404 Page**: No dedicated 404 page exists. When users navigate to non-existent routes, Astro shows the homepage with the incorrect URL as canonical.
2. **SEO Impact**: Without a proper 404 page, search engines may index non-existent URLs as if they were valid content.

## Current State

**Canonical URLs** - Already implemented in `src/layouts/Layout.astro:53`:

```typescript
const canonicalURL = new URL(Astro.url.pathname, site);
// ...
<link rel="canonical" href={canonicalURL} />
```

This works correctly for all valid pages, but the 404 situation needs addressing.

## Solution Overview

Create a dedicated 404 page that:
1. Uses the existing Layout component (branded experience)
2. Omits the canonical tag to avoid SEO confusion
3. Shows a simple "Halaman tidak ditemukan" message
4. Includes a funny meme image
5. Provides a link back to homepage

## Implementation Details

### 1. Extend Layout.astro

Add optional `omitCanonical` prop to allow pages to skip canonical tag generation:

```typescript
interface Props {
  title: string;
  description?: string;
  image?: string;
  preloadImage?: string;
  omitCanonical?: boolean;  // New prop
}
```

Update the canonical link rendering:

```astro
<!-- SEO -->
<title>{title}</title>
<meta name="description" content={description} />
{!omitCanonical && <link rel="canonical" href={canonicalURL} />}
```

### 2. Create 404.astro Page

File: `src/pages/404.astro`

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="404 - Halaman Tidak Ditemukan" omitCanonical={true}>
  <div class="container mx-auto px-4 py-16 text-center">
    <h1 class="text-6xl font-bold text-white mb-4">404</h1>
    <p class="text-xl text-gray-300 mb-8">Halaman tidak ditemukan</p>

    <!-- Meme Image -->
    <div class="mb-8">
      <img
        src="/404-meme.jpg"
        alt="404 Meme"
        class="mx-auto max-w-md rounded-lg shadow-lg"
      />
    </div>

    <a
      href="/"
      class="inline-block bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-medium transition"
    >
      Kembali ke Beranda
    </a>
  </div>
</Layout>
```

### 3. Add Meme Image

Place the meme image at `public/404-meme.jpg` (or `.png`).

User should provide a funny Indonesian web development themed meme.

## Files to Modify

| File | Action |
|------|--------|
| `src/layouts/Layout.astro` | Add `omitCanonical` prop |
| `src/pages/404.astro` | Create new 404 page |
| `public/404-meme.jpg` | Add meme image (user provides) |

## Testing Checklist

- [ ] Visit non-existent route (e.g., `/non-existent`) → shows 404 page
- [ ] 404 page has header and footer (branded layout)
- [ ] 404 page has no canonical tag in `<head>`
- [ ] Meme image loads correctly
- [ ] "Kembali ke Beranda" link navigates to homepage
- [ ] Verify meta title shows "404 - Halaman Tidak Ditemukan"

## SEO Considerations

- **No canonical on 404**: Prevents search engines from indexing 404 pages
- **404 status code**: Astro automatically returns 404 status for this page
- **User-friendly**: Clear messaging and navigation options
