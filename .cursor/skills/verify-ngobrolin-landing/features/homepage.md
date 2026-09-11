# Homepage

The homepage is the primary landing page and entry point to the Ngobrolin WEB podcast archive. It showcases the latest episode, recent episodes grid, search functionality, topic tags, year navigation, and host information.

## Sub-features

- **Hero section** with site title, tagline, and archive scale (episode count, transcript availability)
- **Search bar** with keyboard shortcut (`/`), quick suggestion pills, and submit button
- **Latest episode spotlight** with thumbnail, play indicator, episode number, duration, and link
- **Recent episodes grid** showing 4 most recent episodes with cards
- **Topic tags** section with links to tag pages showing episode counts
- **Year navigation** grid linking to year-filtered episode pages
- **Hosts & community** section with host profiles (name, role, GDE badge, GitHub/X links)
- **CTA buttons** to episodes listing and YouTube subscribe

## How to get to it

Navigate to the root URL: `/`

From anywhere on the site, click the "Ngobrolin WEB" brand text in the header.

## Driving it with Playwright

The homepage is covered by `e2e/home.spec.ts`. Key interactions:

1. **Load and verify title:**
   ```typescript
   await page.goto('/');
   await expect(page).toHaveTitle(/Ngobrolin WEB/);
   ```

2. **Check hero elements:**
   ```typescript
   await expect(page.getByRole('heading', { name: 'Ngobrolin WEB', exact: true })).toBeVisible();
   await expect(page.getByText('Video podcast seputar web development dalam Bahasa Indonesia.')).toBeVisible();
   ```

3. **Verify archive scale:**
   ```typescript
   const archiveScale = page.getByTestId('archive-scale');
   await expect(archiveScale).toContainText(/\d+ episode/);
   ```

4. **Test search bar:**
   ```typescript
   const searchInput = page.locator('#home-search-input');
   await searchInput.fill('typescript');
   await page.getByRole('button', { name: 'Cari' }).click();
   await expect(page).toHaveURL(/\/episodes\?q=typescript/);
   ```

5. **Verify recent episodes grid:**
   ```typescript
   const cards = page.locator('[data-testid="episode-card"]');
   await expect(cards.first()).toBeVisible();
   // Note: Source slices to 4; e2e asserts visibility, not exact count
   ```

6. **Check topic tags:**
   ```typescript
   const topics = page.getByTestId('home-topics');
   await expect(topics.locator('a').first()).toBeVisible();
   ```

7. **Check year navigation:**
   ```typescript
   const years = page.getByTestId('home-years');
   await expect(years.locator('a').first()).toBeVisible();
   ```

## Gotchas

- **Search keyboard shortcut:** The `/` key focuses the search input only when not typing in another input. Test that `Escape` blurs the input.
- **Tuesday banner:** On Tuesdays (Indonesian time), the hero shows "Livestream malam ini jam 20:00 WIB!" with animated indicator. On other days, it shows "Episode baru setiap Selasa malam jam 20:00 WIB."
- **Episode count derivation:** The displayed episode count (`{episodeCount} episode`) is derived from `src/data/episodes.json` at build time, not hardcoded.
- **Latest episode thumbnail:** The latest episode thumbnail uses `loading="eager"` and `fetchpriority="high"` for LCP optimization.
- **View transitions:** The site uses Astro's client-side routing (`ClientRouter`), so navigation scripts must handle `astro:page-load` events.
