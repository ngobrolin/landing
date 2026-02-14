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

  // Navigate away to trigger view transition
  await page.click('a[href="/about"]');
  await expect(page).toHaveURL(/\/about/);

  // Navigate back to home
  await page.click('a[href="/"]');
  await expect(page).toHaveURL('/');

  // Re-query GitHub link after view transition
  const githubLinkAfterNav = page.locator('footer a[href="https://github.com/ngobrolin/landing"]');

  // Verify link still works after view transition
  await expect(githubLinkAfterNav, 'GitHub link should exist after view transition').toBeVisible();
  await expect(githubLinkAfterNav, 'GitHub link should have text label after view transition').toContainText('GitHub');

  const hrefAfterNav = await githubLinkAfterNav.getAttribute('href');
  expect(hrefAfterNav, 'GitHub link should point to correct URL after view transition').toBe('https://github.com/ngobrolin/landing');

  const analyticsEventAfterNav = await githubLinkAfterNav.getAttribute('data-analytics-event');
  expect(analyticsEventAfterNav, 'GitHub link should have analytics event after view transition').toBe('outbound_click');

  const iconAfterNav = githubLinkAfterNav.locator('svg');
  await expect(iconAfterNav, 'GitHub link should have icon after view transition').toBeVisible();
});
