import { test, expect } from '@playwright/test';

test('sitemap is accessible and valid', async ({ request }) => {
  const response = await request.get('/sitemap-index.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/xml/);

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
