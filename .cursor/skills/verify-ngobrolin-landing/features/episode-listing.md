# Episode Listing

The episode listing page (`/episodes`) displays all podcast episodes in a grid with search, year navigation, and metadata. Users can filter by year, search by text, and navigate to individual episode pages.

## Sub-features

- **Episode grid** showing all episodes with thumbnails, titles, dates, durations, episode numbers
- **Year navigation** (links, not tabs) for filtering episodes by publication year
- **Search bar** with client-side search across titles, descriptions, brief summaries, and key points (Fuse.js for queries >2 chars; word-boundary matching on title+keyPoints for ≤2 chars)
- **Episode count** displayed in the header
- **"New" badges** on the 2 most recent episodes (build-time, not time window)
- **Keyboard navigation** for search (`/` and `Cmd/Ctrl+K` to focus, `Escape` to blur)

## How to get to it

1. From homepage: Click "Lihat Semua Episode" button in hero or "Lihat semua →" link above recent episodes grid
2. From header: Click "Episode" in navigation (header only; mobile menu on small screens)
3. Direct URL: `/episodes`
4. From search results: Submit a search query (redirects to `/episodes?q=...`)

## Driving it with Playwright

The episode listing is partially covered by `e2e/episodes-by-year.spec.ts` and `e2e/search.spec.ts`. Key interactions:

1. **Load and verify:**
   ```typescript
   await page.goto('/episodes');
   await expect(page).toHaveTitle(/Semua Episode/);
   await expect(page.getByRole('heading', { name: 'Semua Episode' })).toBeVisible();
   ```

2. **Check episode count:**
   ```typescript
   await expect(page.getByText(/\d+ episode tersedia/)).toBeVisible();
   ```

3. **Verify year navigation:**
   ```typescript
   const yearNav = page.locator('nav[aria-label="Navigasi tahun"]');
   await expect(yearNav).toBeVisible();
   const firstYearLink = yearNav.locator('a').nth(1); // nth(0) is "Semua"
   await firstYearLink.click();
   ```

4. **Test search functionality:**
   ```typescript
   const searchInput = page.locator('#search-input');
   await searchInput.fill('astro');
   // Allow debounce (120ms) + render
   await expect.poll(() => page.locator('#episodes-grid > a:visible').count()).toBeGreaterThan(0);
   ```

5. **Verify episode cards render:**
   ```typescript
   const cards = page.locator('[data-testid="episode-card"]');
   await expect(cards.first()).toBeVisible();
   await expect(cards.first().locator('img')).toBeVisible();
   ```

6. **Navigate to episode:**
   ```typescript
   await cards.first().click();
   await expect(page).toHaveURL(/\/episodes\/.+/);
   ```

## Gotchas

- **Client-side search:** The search uses Fuse.js for queries longer than 2 characters across `title`, `description`, `brief`, and `keyPoints` fields (NOT transcript fullText). Queries of 2 characters or less use simple word-boundary matching on `title` and `keyPoints` only. Results update as you type (debounced 120ms). The search index (`/search-index.json`) is fetched on first interaction, not inlined.
- **Year navigation, not tabs:** The UI uses links (`<a>`) with `aria-current="page"` on the active year, not ARIA tabs/tablist. Navigation is `<nav aria-label="Navigasi tahun">` containing links.
- **Year navigation clears search:** When switching years, any active `?q=` query is dropped (year links have no query string).
- **URL query param:** Search can be prefilled via `?q=term` (or `?query=term`), which is bookmarkable and shareable. However, typing in the search box on `/episodes` does NOT update the URL — the query param is read-only on this page. It's written only by the homepage search form and direct navigation.
- **"New" badge logic:** The 2 newest episodes (by archive order) get a "BARU" badge via `getNewEpisodeSlugs()` (`NEW_EPISODE_COUNT = 2`). This is a count, not a time window.
- **Episode order:** Episodes are sorted newest-first by `publishedAt` (from YouTube video metadata, not playlist join date).
