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

    // Scroll down first - scroll to middle of page
    await page.evaluate(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      window.scrollTo(0, scrollHeight / 2);
    });

    // Wait a bit for scroll to complete
    await page.waitForTimeout(100);

    const scrollY = await page.evaluate(() => window.scrollY);
    await expect(scrollY).toBeGreaterThan(100);

    // Click scroll to top button
    const scrollToTop = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    await scrollToTop.click();

    // Wait for smooth scroll to complete
    await page.waitForTimeout(500);

    // Should be at top
    const finalScrollY = await page.evaluate(() => window.scrollY);
    await expect(finalScrollY).toBe(0);
  });

  test('should scroll to bottom when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Click scroll to bottom button
    const scrollToBottom = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));
    await scrollToBottom.click();

    // Wait for smooth scroll to complete
    await page.waitForTimeout(500);

    // Should be at or near bottom
    const { scrollY, documentHeight, windowHeight } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
      windowHeight: window.innerHeight,
    }));
    await expect(scrollY).toBeGreaterThan(documentHeight - windowHeight - 100);
  });

  test('should work after view transition navigation', async ({ page }) => {
    // Start on home page
    await page.goto('/');

    // Scroll down to verify scroll-to-top button appears
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollToTopOnHome = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    await expect(scrollToTopOnHome).toBeVisible();

    // Navigate to about page (uses view transitions)
    await page.getByRole('link', { name: 'Tentang', exact: true }).first().click();

    // Wait for navigation and script re-execution
    await page.waitForTimeout(150); // Allow for inline script execution after view transition

    // Verify buttons exist on new page
    const scrollToTopOnAbout = page.getByLabel('Scroll to top').or(page.getByTitle('Scroll to top'));
    const scrollToBottomOnAbout = page.getByLabel('Scroll to bottom').or(page.getByTitle('Scroll to bottom'));

    await expect(scrollToTopOnAbout).toBeVisible();
    await expect(scrollToBottomOnAbout).toBeVisible();

    // Test scroll functionality on new page
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(50);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 300));

    // Click scroll to top
    await scrollToTopOnAbout.click();

    // Wait for smooth scroll to complete
    await page.waitForTimeout(500);

    // Verify we're at top
    const finalScrollY = await page.evaluate(() => window.scrollY);
    await expect(finalScrollY).toBe(0);
  });
});
