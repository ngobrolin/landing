import { test, expect } from '@playwright/test';

/**
 * The scroll buttons were two 48px WHITE buttons with a light-grey border and a
 * drop shadow, fixed bottom-right on every page of a #0f0f0f site. They were
 * the brightest object on any screen, they broke the design system's
 * flat-at-rest rule, and their labels were in English on a lang="id" site.
 *
 * This repaints them INTO the frozen palette; it adds no token.
 */
test.describe('Scroll buttons belong to the dark palette', () => {
  test('are not white, and cast no shadow at rest', async ({ page }) => {
    await page.goto('/episodes');
    await page.evaluate(() => window.scrollTo(0, 1200));

    const button = page.locator('#scroll-to-top');
    const styles = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, shadow: s.boxShadow };
    });

    // #1a1a1a is the palette's single surface step.
    expect(styles.background).toBe('rgb(26, 26, 26)');
    expect(styles.shadow, 'flat at rest is a system rule').toBe('none');
  });

  test('are labelled in Indonesian', async ({ page }) => {
    await page.goto('/episodes');
    for (const id of ['#scroll-to-top', '#scroll-to-bottom']) {
      const label = await page.locator(id).getAttribute('aria-label');
      expect(label, `${id} label: ${label}`).not.toMatch(/scroll to/i);
      expect(label).toMatch(/atas|bawah/i);
    }
  });

  test('stay out of the thumb zone on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/episodes');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(page.locator('#scroll-to-top')).toBeHidden();
  });

  test('still work on a desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/episodes');
    await page.evaluate(() => window.scrollTo(0, 2000));

    const top = page.locator('#scroll-to-top');
    await expect(top).toBeVisible();
    await top.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);
  });
});
