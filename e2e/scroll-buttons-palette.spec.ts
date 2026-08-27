import { test, expect } from '@playwright/test';

/**
 * The scroll buttons were two 48px WHITE buttons with a light-grey border and a
 * drop shadow, fixed bottom-right on every page of a near-black site. They were
 * the brightest object on any screen, they broke the design system's
 * flat-at-rest rule, and their labels were in English on a lang="id" site.
 *
 * This repaints them INTO the palette; it adds no token. The assertion is
 * therefore "they use the palette's raised surface", read from the token itself
 * - not a literal colour. An earlier version of this file froze `rgb(26,26,26)`
 * and would have gone red the moment the site was legitimately repainted, which
 * says nothing about whether these buttons still belong.
 */
test.describe('Scroll buttons belong to the dark palette', () => {
  test('wear the palette surface, and cast no shadow at rest', async ({
    page,
  }) => {
    await page.goto('/episodes');
    await page.evaluate(() => window.scrollTo(0, 1200));

    const button = page.locator('#scroll-to-top');
    const styles = await button.evaluate(el => {
      const s = getComputedStyle(el);
      const root = getComputedStyle(document.documentElement);
      return {
        background: s.backgroundColor,
        shadow: s.boxShadow,
        raised: root.getPropertyValue('--color-surface-raised').trim(),
      };
    });

    // Resolve the token through the browser so the comparison is colour-space
    // agnostic: the token is authored as a hex and read back as an rgb().
    const expected = await page.evaluate(token => {
      const probe = document.createElement('div');
      probe.style.color = token;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    }, styles.raised);

    expect(styles.background).toBe(expected);
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
