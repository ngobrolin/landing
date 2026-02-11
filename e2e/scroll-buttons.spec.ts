import { test, expect } from '@playwright/test';

test.describe('ScrollButtons', () => {
  test('should render scroll buttons on initial page load', async ({ page }) => {
    await page.goto('/');

    // Both buttons should be present
    const scrollToTop = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    const scrollToBottom = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));

    await expect(scrollToTop).toBeVisible();
    await expect(scrollToBottom).toBeVisible();
  });

  test('should scroll to top when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollY = await page.evaluate(() => window.scrollY);
    await expect(scrollY).toBeGreaterThan(400);

    // Click scroll to top button
    const scrollToTop = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    await scrollToTop.click();

    // Should be at top
    const finalScrollY = await page.evaluate(() => window.scrollY);
    await expect(finalScrollY).toBe(0);
  });

  test('should scroll to bottom when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Click scroll to bottom button
    const scrollToBottom = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));
    await scrollToBottom.click();

    // Should be at or near bottom
    const scrollY = await page.evaluate(() => window.scrollY);
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await expect(scrollY).toBeGreaterThan(documentHeight - window.innerHeight - 100);
  });
});
