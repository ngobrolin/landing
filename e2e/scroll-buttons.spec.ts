import { test, expect } from '@playwright/test';

// Labels are Indonesian: this is a lang="id" site, and the buttons shipped with
// English aria-labels. The controls are also desktop-only now - on a phone they
// sat permanently over content in the thumb zone - so these run at the default
// desktop viewport.
test.describe('ScrollButtons', () => {
  test('should render scroll buttons on initial page load', async ({ page }) => {
    await page.goto('/');

    // Both buttons should be present
    const scrollToTop = page.getByLabel('Ke atas halaman').or(page.getByTitle('Ke atas halaman'));
    const scrollToBottom = page.getByLabel('Ke bawah halaman').or(page.getByTitle('Ke bawah halaman'));

    // Check aria-hidden states: scroll-to-top should be hidden at top of page
    const scrollToTopAriaHidden = await scrollToTop.getAttribute('aria-hidden');
    const scrollBottomAriaHidden = await scrollToBottom.getAttribute('aria-hidden');

    await expect(scrollToTopAriaHidden).toBe('true');
    await expect(scrollBottomAriaHidden).toBe('false');
  });

  test('should scroll to top when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Scroll down first - scroll to middle of page
    await page.evaluate(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      window.scrollTo(0, scrollHeight / 2);
    });

    await page.waitForFunction(() => window.scrollY > 0);
    const scrollY = await page.evaluate(() => window.scrollY);
    await expect(scrollY).toBeGreaterThan(0);

    // Click scroll to top button
    const scrollToTop = page.getByLabel('Ke atas halaman').or(page.getByTitle('Ke atas halaman'));
    await scrollToTop.click();

    await page.waitForFunction(() => window.scrollY === 0);
  });

  test('should scroll to bottom when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Click scroll to bottom button
    const scrollToBottom = page.getByLabel('Ke bawah halaman').or(page.getByTitle('Ke bawah halaman'));
    await scrollToBottom.click();

    await page.waitForFunction(
      () =>
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 100
    );

    // Should be at or near bottom
    const { scrollY, documentHeight, windowHeight } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
      windowHeight: window.innerHeight,
    }));
    await expect(scrollY).toBeGreaterThanOrEqual(documentHeight - windowHeight - 100);
  });

  test('should work after view transition navigation', async ({ page }) => {
    // Start on home page
    await page.goto('/');

    // Scroll down to verify scroll-to-top button appears
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollToTopOnHome = page.getByLabel('Ke atas halaman').or(page.getByTitle('Ke atas halaman'));
    await expect(scrollToTopOnHome).toBeVisible();

    // Navigate to about page (uses view transitions)
    await page.getByRole('link', { name: 'Tentang', exact: true }).first().click();
    await page.waitForURL('**/about');

    // Verify buttons exist on new page
    const scrollToTopOnAbout = page.getByLabel('Ke atas halaman').or(page.getByTitle('Ke atas halaman'));
    const scrollToBottomOnAbout = page.getByLabel('Ke bawah halaman').or(page.getByTitle('Ke bawah halaman'));

    await expect(scrollToTopOnAbout).toBeVisible();
    await expect(scrollToBottomOnAbout).toBeVisible();

    // Test scroll functionality on new page
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForFunction(() => window.scrollY > 0);

    // Click scroll to top
    await scrollToTopOnAbout.click();
    await page.waitForFunction(() => window.scrollY === 0);
  });

  test('uses auto behavior when reduced motion is preferred', async ({ page }) => {
    await page.addInitScript(() => {
      const originalScrollTo = window.scrollTo.bind(window);

      window.__lastScrollBehavior = null;
      window.scrollTo = function (...args) {
        if (typeof args[0] === 'object' && args[0] !== null) {
          window.__lastScrollBehavior = args[0].behavior ?? 'auto';
        } else {
          window.__lastScrollBehavior = 'auto';
        }
        return originalScrollTo(...args);
      };
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const scrollToBottom = page.getByLabel('Ke bawah halaman').or(page.getByTitle('Ke bawah halaman'));
    await scrollToBottom.click();

    await expect.poll(() => page.evaluate(() => window.__lastScrollBehavior)).toBe('auto');
  });

  test('cleans up previous scroll listeners after view transitions', async ({ page }) => {
    await page.addInitScript(() => {
      const originalAdd = window.addEventListener.bind(window);
      const originalRemove = window.removeEventListener.bind(window);

      window.__scrollButtonAdds = 0;
      window.__scrollButtonRemoves = 0;

      window.addEventListener = function (type, listener, options) {
        if (
          type === 'scroll' &&
          typeof listener === 'function' &&
          listener.__scrollButtonsListener === true
        ) {
          window.__scrollButtonAdds += 1;
        }
        return originalAdd(type, listener, options);
      };

      window.removeEventListener = function (type, listener, options) {
        if (
          type === 'scroll' &&
          typeof listener === 'function' &&
          listener.__scrollButtonsListener === true
        ) {
          window.__scrollButtonRemoves += 1;
        }
        return originalRemove(type, listener, options);
      };
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Tentang', exact: true }).first().click();
    await page.waitForURL('**/about');
    await page.getByRole('link', { name: 'Ngobrolin WEB', exact: true }).first().click();
    await page.waitForURL('**/');

    const metrics = await page.evaluate(() => ({
      adds: window.__scrollButtonAdds,
      removes: window.__scrollButtonRemoves,
    }));

    expect(metrics.adds - metrics.removes).toBe(1);
  });
});
