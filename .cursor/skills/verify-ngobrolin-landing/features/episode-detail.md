# Episode Detail

The episode detail page displays a single podcast episode with embedded video player, full transcript, summary, metadata, and sharing options. This is the primary content consumption page.

## Sub-features

- **Episode metadata header** with breadcrumb navigation, episode number badge, title, date, duration
- **Video embed** using `lite-youtube-embed` for performant YouTube player loading
- **Episode summary** ("Ringkasan Episode") with key points, when available
- **Full transcript** with timestamps, search functionality, and seek-to-time buttons
- **Transcript search** filters segments in real-time as user types
- **Subscribe CTA** block linking to podcast platforms and RSS
- **Share buttons** for social media and link copying
- **Topics/tags** when summary includes tags
- **Related episodes** suggestions (when implemented)

## How to get to it

1. From homepage: Click the latest episode spotlight card or any recent episode card
2. From `/episodes`: Click any episode card in the grid
3. From search results: Click a search result card
4. Direct URL: `/episodes/{slug}` where slug is the **stored** value from `episodes.json`

Examples (using stored slugs):
- `/episodes/htmx-the-new-meta-framework`
- `/episodes/livestream-2-astro-view-transitions`

**Note:** To verify an episode, get its slug from the episode card's `href` attribute or `data-episode-slug` attribute, never reconstruct from the title.

## Driving it with Playwright

The episode page is covered by `e2e/episode.spec.ts`. Key interactions:

1. **Navigate from homepage:**
   ```typescript
   await page.goto('/');
   const firstEpisode = page.locator('[data-testid="episode-card"]').first();
   await firstEpisode.click();
   await expect(page).toHaveURL(/\/episodes\/.+/);
   ```

2. **Verify episode title and metadata:**
   ```typescript
   await expect(page.locator('main h1').first()).toBeVisible();
   await expect(page).toHaveTitle(/- Ngobrolin WEB/);
   ```

3. **Check video embed:**
   ```typescript
   const ytEmbed = page.locator('lite-youtube');
   await expect(ytEmbed).toBeVisible();
   await expect(ytEmbed).toHaveAttribute('videoid');
   ```

4. **Verify episode number badge:**
   ```typescript
   const badge = page.getByTestId('episode-number-badge');
   await expect(badge).toBeVisible();
   await expect(badge).toHaveText(/^EP \d+$/);
   ```

5. **Test transcript search:**
   ```typescript
   const transcript = page.getByTestId('transcript');
   await expect(transcript).toBeVisible();
   
   const searchInput = transcript.locator('#transcript-search-input');
   await searchInput.fill('web');
   
   const statusText = transcript.locator('#transcript-search-status');
   await expect(statusText).toContainText(/Ditemukan \d+ segmen/);
   ```

6. **Test transcript timestamp seeking:**
   ```typescript
   const seekBtn = transcript.locator('.timestamp-seek-btn').first();
   await expect(seekBtn).toBeVisible();
   await expect(seekBtn).toHaveAttribute('data-seek-time');
   await seekBtn.click();
   // Verify YouTube player receives seek command
   ```

7. **Verify breadcrumb navigation:**
   ```typescript
   const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
   await expect(crumbs.getByRole('link', { name: 'Beranda' })).toBeVisible();
   await expect(crumbs.getByRole('link', { name: 'Episode' })).toBeVisible();
   ```

## Gotchas

- **Slugs are stored, never derived:** Episode slugs in URLs come from the `slug` field in `episodes.json` (stored data). **Never reconstruct slugs from titles** when verifying — get them from episode card `href` attributes, `data-episode-slug` attributes, or directly from `episodes.json`. Title-based derivation is a legacy fallback in the code but must not be used for verification.
- **Transcript search is client-side:** Filtering happens in the browser without page reload. The search input filters the displayed segments array.
- **Transcript timestamps clickable:** Each timestamp has a seek button that sends a message to the YouTube iframe API to seek to that time.
- **Some episodes lack transcripts:** If `src/data/transcripts/{videoId}.json` doesn't exist, the transcript section won't render.
- **Some episodes lack summaries:** If `src/data/summaries/{videoId}.json` doesn't exist, the summary section won't render.
- **Transcript source provenance:** Newer transcripts have a `source` field (`"youtube-auto"` or `"whisper"`). Older ones omit this field.
- **View transitions:** Scripts must survive client-side navigation. Episode page uses initialization guards and `data-astro-rerun`.
