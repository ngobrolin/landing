# Episode Listing

The episode listing page (`/episodes`) displays all podcast episodes in a grid with search, year tabs, and metadata. Users can filter by year, search by text, and navigate to individual episode pages.

## Sub-features

- **Episode grid** showing all episodes with thumbnails, titles, dates, durations, episode numbers
- **Year navigation** (links, not tabs) for filtering episodes by publication year
- **Search bar** with client-side fuzzy search (Fuse.js) across titles, descriptions, brief summaries, and key points
- **Episode count** displayed in the header
- **"New" badges** on the 2 most recent episodes (positional, not time-based)
- **Keyboard navigation** for search (same `/` shortcut as homepage)

## How to get to it

1. From homepage: Click "Lihat Semua Episode" button in hero or "Lihat semua →" link above recent episodes grid
2. From header/footer: Click "Episode" in navigation
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
   await page.waitForTimeout(500); // Client-side search debounce
   const results = page.locator('#episodes-grid > a:visible');
   await expect(results).toHaveCount(expect.any(Number));
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

- **Client-side search:** The search uses Fuse.js to search in-browser across `title`, `description`, `brief`, and `keyPoints` fields (NOT transcript fullText). No server round-trip. Results update as you type (debounced).
- **Year navigation, not tabs:** The UI uses links (`<a>`) with `aria-current="page"` on the active year, not ARIA tabs/tablist. Navigation is `<nav aria-label="Navigasi tahun">` containing links.
- **Year navigation does NOT preserve search query:** Switching years navigates to plain `/episodes` or `/episodes/{year}` URLs without carrying over the `?q=` parameter.
- **URL query param:** Search submits as `?q=term`, which can be bookmarked and shared. The page reads the query parameter on load to prefill the search, but typing does NOT update the URL.
- **"New" badge logic:** The 2 most recent episodes get a "BARU" badge (`NEW_EPISODE_COUNT = 2` in `src/lib/episodes.ts`). This is positional (top 2 in publication order), not time-based.
- **Episode order:** Episodes are sorted newest-first by `publishedAt` (from YouTube video metadata, not playlist join date).
