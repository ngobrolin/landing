import { test, expect } from '@playwright/test';

test('GitHub footer link exists and navigates correctly', async ({ page }) => {
  // Navigate to home page
  await page.goto('/');

  // Find the GitHub footer link
  const githubLink = page.locator('footer a[href="https://github.com/ngobrolin/landing"]');

  // Verify link exists
  await expect(githubLink, 'GitHub link should exist in footer').toBeVisible();

  // Verify link has correct text
  await expect(githubLink, 'GitHub link should have text label').toContainText('GitHub');

  // Verify link has correct href
  const href = await githubLink.getAttribute('href');
  expect(href, 'GitHub link should point to correct URL').toBe('https://github.com/ngobrolin/landing');

  // Verify analytics attributes
  const analyticsEvent = await githubLink.getAttribute('data-analytics-event');
  expect(analyticsEvent, 'GitHub link should have analytics event').toBe('outbound_click');

  // Verify link opens in new tab
  const target = await githubLink.getAttribute('target');
  expect(target, 'GitHub link should open in new tab').toBe('_blank');

  // Verify rel attribute for security
  const rel = await githubLink.getAttribute('rel');
  expect(rel, 'GitHub link should have security rel attributes').toContain('noopener');
  expect(rel, 'GitHub link should have security rel attributes').toContain('noreferrer');

  // Verify link is in footer
  const footer = page.locator('footer');
  await expect(githubLink, 'GitHub link should be within footer').toBeAttached();

  // Verify icon exists (SVG)
  const icon = githubLink.locator('svg');
  await expect(icon, 'GitHub link should have an icon').toBeVisible();
});
