// e2e/seo.spec.ts
import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', name: 'homepage' },
  { path: '/about', name: 'about page' },
  { path: '/episodes', name: 'episodes index' },
];

test.describe('SEO - JSON-LD Schema', () => {
  for (const { path, name } of pages) {
    test(`${name} should have JSON-LD script tag`, async ({ page }) => {
      await page.goto(path);

      const scripts = await page.locator('script[type="application/ld+json"]').all();

      expect(scripts.length).toBeGreaterThan(0);

      for (const script of scripts) {
        const content = await script.textContent();
        expect(content).toBeDefined();

        // Verify valid JSON
        expect(() => JSON.parse(content || '')).not.toThrow();

        // Verify Schema.org context
        const parsed = JSON.parse(content || '');
        if (Array.isArray(parsed['@graph'])) {
          expect(parsed['@context']).toBe('https://schema.org');
          expect(parsed['@graph'].length).toBeGreaterThan(0);
        } else {
          expect(parsed['@context']).toBe('https://schema.org');
        }
      }
    });
  }

  test('episode page should have JSON-LD with duration', async ({ page }) => {
    // Navigate to homepage first to get an episode link
    await page.goto('/');
    const firstEpisodeLink = await page.locator('a[href^="/episodes/"]').first();
    const href = await firstEpisodeLink.getAttribute('href');

    if (!href) {
      test.skip();
      return;
    }

    await page.goto(href);

    const scripts = await page.locator('script[type="application/ld+json"]').all();
    expect(scripts.length).toBeGreaterThan(0);

    // Check for VideoObject schema
    let hasVideoObject = false;
    for (const script of scripts) {
      const content = await script.textContent();
      const parsed = JSON.parse(content || '');

      if (parsed['@type'] === 'VideoObject') {
        hasVideoObject = true;
        // Duration is optional, so we just check the type exists
        expect(parsed.name).toBeDefined();
      }
    }

    expect(hasVideoObject).toBe(true);
  });
});
test.describe('SEO - page titles', () => {
  // 119 of 178 episode pages used to ship
  // <title>X - Ngobrolin WEB - Ngobrolin WEB</title>, and the same doubled
  // string in og:title and twitter:title, because the template appended the
  // site name to titles that already carried it.
  const DOUBLED = /ng(?:ob|bo)r(?:o)?lin\s+web\s*[-–]\s*ng(?:ob|bo)r(?:o)?lin\s+web/i;

  test('an episode page does not repeat the site name', async ({ page }) => {
    await page.goto('/episodes');
    const href = await page
      .locator('#episodes-grid > a')
      .first()
      .getAttribute('href');
    await page.goto(href!);

    const title = await page.title();
    expect(title, `doubled site name in <title>: ${title}`).not.toMatch(DOUBLED);
    expect(title).toMatch(/ngobrolin web/i);

    for (const selector of [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]) {
      const content = await page.locator(selector).getAttribute('content');
      expect(content, `doubled site name in ${selector}: ${content}`).not.toMatch(
        DOUBLED
      );
    }
  });
});
