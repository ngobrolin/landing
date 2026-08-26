import { test, expect } from '@playwright/test';

/**
 * Episode pages must link the topics they belong to.
 *
 * Before this, 0 of 178 episode pages linked to any /tags/* URL, so all 36 tag
 * pages sat at exactly 1 inbound link (from /tags alone) and were one hop from
 * a dead end. The tag data was already loaded on the episode page by
 * related.ts and simply never rendered.
 *
 * 81 of 178 episodes carry no tags at all, weighted toward the newest ones, so
 * the absent case is the majority case for the front of the archive and has to
 * degrade cleanly rather than render an empty shell.
 */

const TAGGED = '/episodes/00ZHWKLlp5g-stack-dan-tools-ngobrolin-web';
const UNTAGGED = '/episodes/qei6_h3wwPY-model-context-protocol-ngobrolin-web';

test.describe('Episode topics', () => {
  test('a tagged episode links each of its topics', async ({ page }) => {
    await page.goto(TAGGED);

    const topicLinks = page.locator('[data-testid="episode-topics"] a');
    await expect(topicLinks.first()).toBeVisible();
    expect(await topicLinks.count()).toBeGreaterThan(1);

    for (const link of await topicLinks.all()) {
      await expect(link).toHaveAttribute('href', /^\/tags\/[a-z0-9-]+$/);
    }
  });

  test('a topic link actually reaches its tag page', async ({ page }) => {
    await page.goto(TAGGED);

    const first = page.locator('[data-testid="episode-topics"] a').first();
    const label = (await first.textContent())?.trim();
    await first.click();

    await expect(page).toHaveURL(/\/tags\/[a-z0-9-]+\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(label!);
    await expect(page.getByTestId('episode-card').first()).toBeVisible();
  });

  test('an episode with no tags renders no empty topic shell', async ({ page }) => {
    await page.goto(UNTAGGED);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-testid="episode-topics"]')).toHaveCount(0);
  });

  test('every topic link on an episode page resolves', async ({ page, request }) => {
    await page.goto(TAGGED);

    const hrefs = await page
      .locator('[data-testid="episode-topics"] a')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `${href} did not resolve`).toBe(200);
    }
  });
});
