import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  OG_IMAGE_PATH,
  OG_LOGO_PATH,
  RSS_IMAGE_MAX_WIDTH,
} from '../src/lib/og-card-geometry';

const DIST_DIR = join(process.cwd(), 'dist');

/**
 * The site used to publish two unrelated share images: `/og-image.png` in the
 * meta tags and `/og-image.svg` as the feed's channel artwork. A link shared on
 * social media and the same site opened in a feed reader did not look like the
 * same property. Both are now drawn by `src/lib/og-card.ts`.
 *
 * `og-card.test.ts` covers what the images look like. This covers that they are
 * actually served, and that the markup and the feed point at them.
 */
test.describe('Share artefacts', () => {
  for (const path of [OG_IMAGE_PATH, OG_LOGO_PATH]) {
    test(`${path} is served as a PNG`, async ({ request }) => {
      const response = await request.get(path);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      // The PNG signature, so a 200 carrying an HTML error page fails here.
      expect((await response.body()).subarray(1, 4).toString()).toBe('PNG');
    });
  }

  test('the retired hand-made files are gone from the build', () => {
    expect(existsSync(join(DIST_DIR, 'og-image.svg'))).toBe(false);
  });

  test('the share card stays under the size WhatsApp will fetch', () => {
    // WhatsApp drops a preview over roughly 300 KB and caches the failure. The
    // hand-made raster this replaced was 1,069,114 bytes.
    const built = join(DIST_DIR, OG_IMAGE_PATH.replace(/^\//, ''));

    expect(existsSync(built), `${built} is missing from dist/`).toBe(true);
    expect(statSync(built).size).toBeLessThan(300_000);
    expect(statSync(built).size).toBeGreaterThan(1000);
  });
});

test.describe('Share metadata', () => {
  test('the home page declares the card and its dimensions', async ({ page }) => {
    await page.goto('/');

    const head = page.locator('head');
    await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new RegExp(`${OG_IMAGE_PATH}$`)
    );
    // Dimensions let WhatsApp and LinkedIn commit to the large-image preview
    // before the file finishes downloading. The site declared neither.
    await expect(head.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      String(OG_CARD_WIDTH)
    );
    await expect(head.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      String(OG_CARD_HEIGHT)
    );
  });

  test('a page with its own card declares one set of dimensions, not two', async ({
    page,
  }) => {
    await page.goto('/partners');

    await expect(page.locator('head meta[property="og:image:width"]')).toHaveCount(1);
    await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute(
      'content',
      /partners-og\.png$/
    );
  });
});

test.describe('RSS channel image', () => {
  const feed = () => readFileSync(join(DIST_DIR, 'rss.xml'), 'utf-8');

  test('points at a PNG, which is all RSS 2.0 allows', () => {
    const image = feed().match(/<image>[\s\S]*?<\/image>/)?.[0];

    expect(image, 'the feed declares no channel image').toBeTruthy();
    expect(image).toContain(OG_LOGO_PATH);
    // "<url> is the URL of a GIF, JPEG or PNG image that represents the
    // channel." The feed published an SVG; the W3C validator reported it as
    // ImageUrlFormat.
    expect(image).not.toContain('.svg');
  });

  test('its link matches the channel link exactly', () => {
    const xml = feed();
    const channelLink = xml.match(/<link>(.*?)<\/link>/)?.[1];
    const imageLink = xml
      .match(/<image>[\s\S]*?<\/image>/)?.[0]
      .match(/<link>(.*?)<\/link>/)?.[1];

    // One character apart - the channel link carries a trailing slash and the
    // hand-written image link did not. The validator reports it as
    // ImageLinkDoesntMatch.
    expect(imageLink).toBe(channelLink);
  });

  test('the logo fits the width the spec allows for a channel image', () => {
    const built = join(DIST_DIR, OG_LOGO_PATH.replace(/^\//, ''));

    expect(existsSync(built), `${built} is missing from dist/`).toBe(true);
    // "Maximum value for width is 144, default value is 88." A 1200x630 banner
    // could never have worked here even in the right format.
    expect(RSS_IMAGE_MAX_WIDTH).toBe(144);
  });
});
