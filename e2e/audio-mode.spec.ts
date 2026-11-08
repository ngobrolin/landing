import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { resolveSlug } from '../src/lib/slug';

interface RawEpisode {
  videoId: string;
  title: string;
  slug?: string;
  publishedAt: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
}

const EPISODES: RawEpisode[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/episodes.json'), 'utf-8')
);
const TRANSCRIPT_IDS = new Set(
  readdirSync(join(process.cwd(), 'src/data/transcripts'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
);

const hasAudio = (ep: RawEpisode) => !!(ep.audioUrl && ep.audioDuration && ep.audioFileSize);
const pathOf = (ep: RawEpisode) => `/episodes/${resolveSlug(ep)}`;

const withAudio = EPISODES.find((ep) => hasAudio(ep) && TRANSCRIPT_IDS.has(ep.videoId));
const withoutAudio = EPISODES.find((ep) => !hasAudio(ep));

const AUDIO_HOST = 'https://ngobrolinweb-podcast.s3.ap-southeast-1.amazonaws.com/**';
const MODE_KEY = 'ngobrolin:media-mode';
const RATE_KEY = 'ngobrolin:playback-rate';

/**
 * Two minutes of 8 kHz unsigned 8-bit silence. The real mp3s are ~80 MB on
 * S3; the suite stubs that host so it never depends on the network and so a
 * test can count exactly when the page asks for audio.
 */
function silentWav(seconds = 120): Buffer {
  const rate = 8000;
  const dataLength = rate * seconds;
  const buf = Buffer.alloc(44 + dataLength, 128);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLength, 40);
  return buf;
}

const WAV = silentWav();

/**
 * Stub the audio host and return a live list of the audio urls requested.
 * Honours Range like S3 does; without it Chrome treats the file as unseekable.
 */
async function stubAudio(page: Page, mode: 'ok' | 'fail' = 'ok'): Promise<string[]> {
  const requested: string[] = [];
  await page.route(AUDIO_HOST, (route) => {
    requested.push(route.request().url());
    if (mode === 'fail') return route.abort('failed');

    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers()['range'] ?? '');
    if (!range) {
      return route.fulfill({
        status: 200,
        headers: { 'Accept-Ranges': 'bytes', 'Content-Type': 'audio/wav' },
        body: WAV,
      });
    }
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), WAV.length - 1) : WAV.length - 1;
    return route.fulfill({
      status: 206,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': 'audio/wav',
        'Content-Range': `bytes ${start}-${end}/${WAV.length}`,
      },
      body: WAV.subarray(start, end + 1),
    });
  });
  return requested;
}

/** Never let a test reach YouTube; an activated embed gets a blank frame. */
async function stubYouTube(page: Page) {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body></body></html>' })
  );
  await page.route('https://www.youtube.com/**', (route) => route.abort());
}

function modeToggle(page: Page) {
  return page.getByRole('group', { name: 'Mode pemutar' });
}

async function audioState(page: Page) {
  return page.getByTestId('episode-audio').evaluate((el) => {
    const a = el as HTMLAudioElement;
    return {
      paused: a.paused,
      currentTime: a.currentTime,
      playbackRate: a.playbackRate,
      src: a.getAttribute('src'),
    };
  });
}

test.describe('Audio-only mode', () => {
  test.beforeAll(() => {
    expect(withAudio, 'an episode with audio and a transcript').toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await stubYouTube(page);
  });

  test('defaults to video and fetches no audio until asked', async ({ page }) => {
    const requested = await stubAudio(page);
    await page.goto(pathOf(withAudio!));

    const toggle = modeToggle(page);
    await expect(toggle).toBeVisible();
    await expect(toggle.getByRole('button', { name: 'Video' })).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle.getByRole('button', { name: 'Audio saja' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('lite-youtube')).toBeVisible();
    await expect(page.getByTestId('audio-player')).toBeHidden();

    // Switching mode alone must not download an 80 MB file either.
    await toggle.getByRole('button', { name: 'Audio saja' }).click();
    await expect(page.getByTestId('audio-player')).toBeVisible();
    await page.waitForTimeout(300);
    expect(requested).toEqual([]);
    expect((await audioState(page)).src).toBeNull();
  });

  test('audio mode shows a real player with standard controls and hides the video', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();

    const player = page.getByTestId('audio-player');
    await expect(player).toBeVisible();
    await expect(page.locator('lite-youtube')).toBeHidden();
    await expect(player.getByRole('button', { name: 'Putar audio' })).toBeVisible();
    await expect(player.getByRole('slider', { name: 'Posisi audio' })).toBeVisible();
    await expect(player.getByRole('button', { name: /Mundur 15 detik/ })).toBeVisible();
    await expect(player.getByRole('button', { name: /Maju 30 detik/ })).toBeVisible();
    await expect(player.getByRole('group', { name: 'Kecepatan putar' })).toBeVisible();

    await player.getByRole('button', { name: 'Putar audio' }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    expect((await audioState(page)).src).toBe(withAudio!.audioUrl);
    await expect(player.getByRole('button', { name: 'Jeda audio' })).toBeVisible();

    await player.getByRole('button', { name: 'Jeda audio' }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(true);
  });

  test('playback speed offers 1x, 1.5x and 2x and is remembered', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();

    const speed = page.getByRole('group', { name: 'Kecepatan putar' });
    await expect(speed.getByRole('button')).toHaveText(['1x', '1.5x', '2x']);
    await expect(speed.getByRole('button', { name: '1x' })).toHaveAttribute('aria-pressed', 'true');

    await speed.getByRole('button', { name: '1.5x' }).click();
    await expect(speed.getByRole('button', { name: '1.5x' })).toHaveAttribute('aria-pressed', 'true');
    await expect(speed.getByRole('button', { name: '1x' })).toHaveAttribute('aria-pressed', 'false');
    expect((await audioState(page)).playbackRate).toBe(1.5);

    // Loading the source resets playbackRate to defaultPlaybackRate, so the
    // chosen speed has to survive the first play.
    await page.getByRole('button', { name: 'Putar audio' }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    expect((await audioState(page)).playbackRate).toBe(1.5);

    await page.reload();
    expect(await page.evaluate((k) => localStorage.getItem(k), RATE_KEY)).toBe('1.5');
    await expect(
      page.getByRole('group', { name: 'Kecepatan putar' }).getByRole('button', { name: '1.5x' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('the mode preference survives a reload and switching back', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    expect(await page.evaluate((k) => localStorage.getItem(k), MODE_KEY)).toBe('audio');

    await page.reload();
    await expect(page.getByTestId('audio-player')).toBeVisible();
    await expect(page.locator('lite-youtube')).toBeHidden();

    await modeToggle(page).getByRole('button', { name: 'Video' }).click();
    expect(await page.evaluate((k) => localStorage.getItem(k), MODE_KEY)).toBe('video');
    await page.reload();
    await expect(page.locator('lite-youtube')).toBeVisible();
    await expect(page.getByTestId('audio-player')).toBeHidden();
  });

  test('switching to video pauses the audio and hands back the media controls', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    await page.getByRole('button', { name: 'Putar audio' }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    const sessionTitle = () => page.evaluate(() => navigator.mediaSession?.metadata?.title ?? null);
    await expect.poll(sessionTitle).not.toBeNull();

    await modeToggle(page).getByRole('button', { name: 'Video' }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(true);
    await expect(page.locator('lite-youtube')).toBeVisible();
    // Lock-screen controls must not keep driving a player that is hidden.
    expect(await sessionTitle()).toBeNull();
  });

  test('the video picks up where the audio was, and from zero after a seek back', async ({ page }) => {
    await page.goto(pathOf(withAudio!));
    const toggle = modeToggle(page);
    const slider = page.getByRole('slider', { name: 'Posisi audio' });
    const params = () => page.locator('lite-youtube').getAttribute('params');

    await toggle.getByRole('button', { name: 'Audio saja' }).click();
    await slider.fill('60');
    await toggle.getByRole('button', { name: 'Video' }).click();
    expect(await params()).toBe('enablejsapi=1&start=60');

    await toggle.getByRole('button', { name: 'Audio saja' }).click();
    await slider.fill('0');
    await toggle.getByRole('button', { name: 'Video' }).click();
    expect(await params()).toBe('enablejsapi=1');
  });

  test('switching to audio stops a video that was already playing', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));
    await page.locator('lite-youtube').click();
    await expect(page.locator('lite-youtube iframe')).toHaveCount(1);

    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    // A hidden iframe keeps playing; the frame has to go.
    await expect(page.locator('lite-youtube iframe')).toHaveCount(0);

    // And the embed still works when the reader comes back to it.
    await modeToggle(page).getByRole('button', { name: 'Video' }).click();
    await page.locator('lite-youtube').click();
    await expect(page.locator('lite-youtube iframe')).toHaveCount(1);
  });

  test('a transcript timecode seeks the audio, not the hidden video, in audio mode', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();

    const stamp = page
      .locator('.timestamp-seek-btn')
      .filter({ has: page.locator('xpath=self::*[number(@data-seek-time) > 5 and number(@data-seek-time) < 100]') })
      .first();
    const seconds = Number(await stamp.getAttribute('data-seek-time'));
    await stamp.click();

    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    // The seek lands once metadata arrives, a moment after play starts.
    await expect
      .poll(async () => (await audioState(page)).currentTime)
      .toBeGreaterThanOrEqual(seconds - 1);
    await expect(page.locator('lite-youtube')).not.toHaveClass(/lyt-activated/);
  });

  test('falls back to the video when the audio fails to load', async ({ page }) => {
    await stubAudio(page, 'fail');
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    await page.getByRole('button', { name: 'Putar audio' }).click();

    await expect(page.locator('lite-youtube')).toBeVisible();
    await expect(page.getByTestId('audio-player')).toBeHidden();
    await expect(page.getByTestId('media-notice')).toContainText('Audio');
    await expect(modeToggle(page).getByRole('button', { name: 'Video' })).toHaveAttribute('aria-pressed', 'true');
    // A transient failure must not silently erase the reader's choice.
    expect(await page.evaluate((k) => localStorage.getItem(k), MODE_KEY)).toBe('audio');
  });

  test('an episode without audio shows the video and says why', async ({ page }) => {
    // The archive is being backfilled. Once every episode has audio this
    // state no longer exists in the build, which is the goal rather than a
    // failure; getEpisodeAudio's unit tests still cover the rule itself.
    test.skip(!withoutAudio, 'every episode has audio');
    await page.goto(pathOf(withoutAudio!));
    await page.evaluate((k) => localStorage.setItem(k, 'audio'), MODE_KEY);
    await page.reload();

    await expect(page.locator('lite-youtube')).toBeVisible();
    await expect(modeToggle(page)).toHaveCount(0);
    await expect(page.getByTestId('audio-player')).toHaveCount(0);
    await expect(page.getByTestId('media-notice')).toBeVisible();

    // Readers who never chose audio see nothing extra.
    await page.evaluate((k) => localStorage.removeItem(k), MODE_KEY);
    await page.reload();
    await expect(page.getByTestId('media-notice')).toBeHidden();
  });

  test('works when localStorage is unavailable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // The comments widget (utteranc.es) reads localStorage unguarded and
    // throws on its own; it is third-party and not what this test is about.
    await page.route('https://utteranc.es/**', (route) => route.abort());
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));

    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    await expect(page.getByTestId('audio-player')).toBeVisible();
    await page.getByRole('group', { name: 'Kecepatan putar' }).getByRole('button', { name: '2x' }).click();
    expect((await audioState(page)).playbackRate).toBe(2);
    expect(errors).toEqual([]);
  });

  test('is keyboard operable', async ({ page }) => {
    await stubAudio(page);
    await page.goto(pathOf(withAudio!));

    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('audio-player')).toBeVisible();

    await page.getByRole('button', { name: 'Putar audio' }).focus();
    await page.keyboard.press('Space');
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);

    const slider = page.getByRole('slider', { name: 'Posisi audio' });
    await expect(slider).toHaveAttribute('aria-valuetext', /dari/);
  });

  test('survives client-side navigation without initialising twice', async ({ page }) => {
    await stubAudio(page);
    // Two neighbouring episodes that both have audio, so prev/next links
    // move between players with the client router.
    const sorted = [...EPISODES].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    const i = sorted.findIndex((ep, n) => hasAudio(ep) && sorted[n + 1] && hasAudio(sorted[n + 1]));
    expect(i, 'neighbouring audio episodes').toBeGreaterThanOrEqual(0);
    const [newer, older] = [sorted[i], sorted[i + 1]];

    await page.goto(pathOf(newer));
    await page.waitForLoadState('load');
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    // Generous timeouts: under a full parallel suite the router's fetch of the
    // next page is the slow part, not anything this test is checking.
    await page.getByRole('link', { name: /Episode Sebelumnya/ }).click();
    await expect(page).toHaveURL(new RegExp(resolveSlug(older)), { timeout: 15_000 });
    await expect(page.getByTestId('audio-player')).toBeVisible();
    await page.getByRole('link', { name: /Episode Selanjutnya/ }).click();
    await expect(page).toHaveURL(new RegExp(resolveSlug(newer)), { timeout: 15_000 });
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    await expect(page.getByTestId('audio-player')).toBeVisible();
    // One click, one toggle: a duplicated listener would play then pause.
    await page.getByRole('button', { name: 'Putar audio' }).click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    await page.waitForTimeout(200);
    expect((await audioState(page)).paused).toBe(false);
    expect((await audioState(page)).src).toBe(newer.audioUrl);
  });

  test('the card thumbnail keeps one visible morph target in either mode', async ({ page }) => {
    await page.goto(pathOf(withAudio!));
    const scoped = page.locator('[data-episode-media] [data-astro-transition-scope]');
    const visibleNames = () =>
      scoped.evaluateAll((els) =>
        els
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => getComputedStyle(el).viewTransitionName)
      );

    const expected = `episode-thumbnail-${resolveSlug(withAudio!)}`;
    expect(await visibleNames()).toEqual([expected]);
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    // Two elements carrying one name is only valid while one is not rendered.
    expect(await visibleNames()).toEqual([expected]);
  });

  test('fits a small screen', async ({ page }) => {
    await stubAudio(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    await expect(page.getByTestId('audio-player')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await page.getByRole('button', { name: 'Putar audio' }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  /**
   * Real boxes for the controls row. The transport is measured from the left
   * edge of back-15 to the right edge of forward-30, and the speed row as the
   * "Kecepatan" label plus the rate group, which stay on one line.
   */
  async function controlsLayout(page: Page) {
    const player = page.getByTestId('audio-player');
    const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!;
    const back = await box(player.getByRole('button', { name: 'Mundur 15 detik' }));
    const play = await box(player.getByRole('button', { name: 'Putar audio' }));
    const forward = await box(player.getByRole('button', { name: 'Maju 30 detik' }));
    const label = await box(player.getByText('Kecepatan', { exact: true }));
    const rates = await box(player.getByRole('group', { name: 'Kecepatan putar' }));
    const rateButtons = await player
      .getByRole('group', { name: 'Kecepatan putar' })
      .getByRole('button')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    const content = await player.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const left = rect.left + el.clientLeft + parseFloat(style.paddingLeft);
      const right = rect.left + el.clientLeft + el.clientWidth - parseFloat(style.paddingRight);
      return { left, right, centre: rect.left + rect.width / 2 };
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    const span = (a: { x: number; y: number; width: number; height: number }[]) => {
      const left = Math.min(...a.map((b) => b.x));
      const right = Math.max(...a.map((b) => b.x + b.width));
      const top = Math.min(...a.map((b) => b.y));
      const bottom = Math.max(...a.map((b) => b.y + b.height));
      return { left, right, top, bottom, centreX: (left + right) / 2, centreY: (top + bottom) / 2 };
    };
    return {
      back,
      play,
      forward,
      rateButtons,
      content,
      overflow,
      transport: span([back, play, forward]),
      speed: span([label, rates]),
    };
  }

  async function openAudioAt(page: Page, width: number, height: number) {
    await stubAudio(page);
    await page.setViewportSize({ width, height });
    await page.goto(pathOf(withAudio!));
    await modeToggle(page).getByRole('button', { name: 'Audio saja' }).click();
    await expect(page.getByTestId('audio-player')).toBeVisible();
  }

  for (const width of [360, 390, 430]) {
    test(`centres the transport and speed rows at ${width}px`, async ({ page }) => {
      await openAudioAt(page, width, 844);
      const l = await controlsLayout(page);
      const centre = l.content.centre;

      expect(Math.abs(l.transport.centreX - centre), 'transport group centred on the card').toBeLessThanOrEqual(1);
      expect(Math.abs(l.play.x + l.play.width / 2 - centre), 'play button centred on the card').toBeLessThanOrEqual(1);
      const gapBefore = l.play.x - (l.back.x + l.back.width);
      const gapAfter = l.forward.x - (l.play.x + l.play.width);
      expect(Math.abs(gapBefore - gapAfter), 'back→play gap equals play→forward gap').toBeLessThanOrEqual(1);

      expect(Math.abs(l.speed.centreX - centre), 'speed row centred on the card').toBeLessThanOrEqual(1);
      expect(l.speed.top, 'speed row sits below the transport').toBeGreaterThanOrEqual(l.transport.bottom);

      for (const b of [l.back, l.play, l.forward, ...l.rateButtons]) {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
      expect(l.overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const width of [640, 1280]) {
    test(`keeps transport left and speed right on one row at ${width}px`, async ({ page }) => {
      await openAudioAt(page, width, 900);
      const l = await controlsLayout(page);

      expect(Math.abs(l.transport.centreY - l.speed.centreY), 'one row').toBeLessThanOrEqual(2);
      expect(Math.abs(l.transport.left - l.content.left), 'transport at the left content edge').toBeLessThanOrEqual(1);
      expect(Math.abs(l.speed.right - l.content.right), 'speed at the right content edge').toBeLessThanOrEqual(1);
      expect(l.overflow).toBeLessThanOrEqual(0);
    });
  }
});
