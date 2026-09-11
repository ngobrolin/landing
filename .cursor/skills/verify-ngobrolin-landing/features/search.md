# Search

The search feature allows users to find episodes by searching across titles, descriptions, brief summaries, and key points. Search is available from the homepage and the episode listing page.

## Sub-features

- **Homepage search bar** with keyboard shortcut (`/`) and quick suggestion pills
- **Episodes page search** with client-side fuzzy search (Fuse.js)
- **Search results** display filtered episode cards with match highlighting (when applicable)
- **URL persistence** via `?q=term` query parameter for bookmarkable searches
- **Keyboard shortcuts** — `/` to focus search, `Escape` to blur/clear
- **Search across multiple fields:** title, description, brief (summary), keyPoints (from episode summaries)

## How to get to it

1. **From homepage:**
   - Focus search bar (click or press `/`)
   - Type search query
   - Press Enter or click "Cari" button
   - Redirects to `/episodes?q=query`

2. **From episodes page:**
   - Use search input at top of page
   - Results filter in real-time as you type
   - No page reload (client-side filtering)

3. **Direct URL:**
   - `/episodes?q=astro`
   - `/episodes?q=typescript`

## Driving it with Playwright

Search is covered by `e2e/search.spec.ts`. Key interactions:

1. **Search from homepage:**
   ```typescript
   await page.goto('/');
   const searchInput = page.locator('#home-search-input');
   await searchInput.fill('astro');
   await page.getByRole('button', { name: 'Cari' }).click();
   await expect(page).toHaveURL(/\/episodes\?q=astro/);
   ```

2. **Verify search results on episodes page:**
   ```typescript
   await page.goto('/episodes?q=typescript');
   const results = page.locator('[data-testid="episode-card"]');
   await expect(results.first()).toBeVisible();
   ```

3. **Test real-time search on episodes page:**
   ```typescript
   await page.goto('/episodes');
   const searchInput = page.locator('#search-input');
   await searchInput.fill('htmx');
   await page.waitForTimeout(500); // Debounce delay
   const results = page.locator('#episodes-grid > a:visible');
   const count = await results.count();
   expect(count).toBeGreaterThan(0);
   ```

4. **Test keyboard shortcuts:**
   ```typescript
   await page.goto('/');
   await page.keyboard.press('/');
   const searchInput = page.locator('#home-search-input');
   await expect(searchInput).toBeFocused();
   
   await page.keyboard.press('Escape');
   await expect(searchInput).not.toBeFocused();
   // Note: Escape blurs; clear is via the × button or "Reset Pencarian"
   ```

5. **Test quick suggestion pills:**
   ```typescript
   await page.goto('/');
   const suggestionPill = page.locator('a[href*="?q="]').first();
   await suggestionPill.click();
   await expect(page).toHaveURL(/\/episodes\?q=/);
   ```

6. **Verify empty search state:**
   ```typescript
   await page.goto('/episodes?q=nonexistentqueryterm12345');
   await expect(page.getByText(/Tidak ada episode/)).toBeVisible();
   ```

## Gotchas

- **Two search implementations:** Homepage search is a plain `<form method="get">` that submits to `/episodes?q=...`. The episodes page search is client-side JavaScript using Fuse.js. On `/episodes`, Cmd/Ctrl+K also focuses search (in addition to `/`).
- **Search fields (NOT transcripts):** The search indexes `title`, `description`, `brief`, and `keyPoints` from episode summaries (`src/lib/search.ts` SEARCH_KEYS). It does NOT search full transcript text — that would make the index too large to fetch on every visit.
- **Fuzzy matching:** Fuse.js allows typos and partial matches. Search for "astro" matches "Astro", "astronomy", etc. in indexed fields.
- **Short queries (≤2 chars) use word-boundary matching:** Queries like "ai", "ui", "js" search only `title` and `keyPoints` with exact word-boundary matching to avoid false positives (e.g., "ai" in Indonesian "mulai").
- **Debounce delay:** Client-side search debounces at 120ms to avoid excessive re-renders while typing.
- **Case insensitive:** Search is case-insensitive.
- **No pagination:** All filtered results display on one page (no infinite scroll or pagination).
- **Search index fetched on first interaction:** The index (`/search-index.json`, ~525KB) is fetched when you first interact with search, not inlined in page HTML.
