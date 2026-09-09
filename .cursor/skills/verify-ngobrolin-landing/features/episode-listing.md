# Episode Listing

The episode listing page (`/episodes`) displays all podcast episodes in a grid with search, year tabs, and metadata. Users can filter by year, search by text, and navigate to individual episode pages.

## Sub-features

- **Episode grid** showing all episodes with thumbnails, titles, dates, durations, episode numbers
- **Year tabs** for filtering episodes by publication year
- **Search bar** with client-side fuzzy search (Fuse.js) across titles, descriptions, and transcripts
- **Episode count** displayed in the header
- **"New" badges** on recently published episodes (within 14 days)
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

3. **Verify year tabs:**
   ```typescript
   const yearTabs = page.locator('[role="tablist"]');
   await expect(yearTabs).toBeVisible();
   const firstYearTab = yearTabs.locator('button').first();
   await firstYearTab.click();
   ```

4. **Test search functionality:**
   ```typescript
   const searchInput = page.locator('#episodes-search');
   await searchInput.fill('astro');
   await page.waitForTimeout(500); // Client-side search debounce
   const results = page.locator('[data-testid="episode-card"]');
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

- **Client-side search:** The search uses Fuse.js to search in-browser across titles, descriptions, and transcript `fullText`. No server round-trip. Results update as you type (debounced).
- **Year tabs preserve search:** When switching year tabs, any active search query should persist in the filtered view.
- **URL query param:** Search submits as `?q=term`, which can be bookmarked and shared. The page reads `Astro.url.searchParams.get('q')` on load.
- **"New" badge logic:** Episodes published within `NEW_BADGE_THRESHOLD_DAYS` (14 days) get a "BARU" badge. This is calculated at build time.
- **Episode order:** Episodes are sorted newest-first by `publishedAt` (from YouTube video metadata, not playlist join date).
