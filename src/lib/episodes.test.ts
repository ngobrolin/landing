import { describe, it, expect } from 'vitest';
import {
  slugify,
  getBrief,
  getEpisodes,
  getEpisodeBySlug,
  getEpisodeByVideoId,
  getEpisodesByYear,
  getAvailableYears,
  getYearCount,
  formatDuration,
  getCardBlurb,
  getNewEpisodeSlugs,
} from './episodes';

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('replaces multiple spaces with single dash', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('collapses multiple dashes into one', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Episode 123')).toBe('episode-123');
  });
});

describe('getBrief', () => {
  const existingVideoIds = ['x1jm57leZW0', 'Tkh8-LleLws', 'ZcYNuHirHOA'];
  const nonExistentVideoId = 'non-existent-video-id-12345';

  it('returns brief string when summary exists', () => {
    const brief = getBrief(existingVideoIds[0]);
    expect(brief).toBeDefined();
    expect(typeof brief).toBe('string');
    expect(brief?.length).toBeGreaterThan(0);
  });

  it('returns undefined when summary does not exist', () => {
    const brief = getBrief(nonExistentVideoId);
    expect(brief).toBeUndefined();
  });

  it('returns consistent brief for same videoId', () => {
    const brief1 = getBrief(existingVideoIds[0]);
    const brief2 = getBrief(existingVideoIds[0]);
    expect(brief1).toBe(brief2);
  });

  it('returns different briefs for different videoIds', () => {
    const brief1 = getBrief(existingVideoIds[0]);
    const brief2 = getBrief(existingVideoIds[1]);
    // Briefs should be different (unless they coincidentally have the same content)
    expect(brief1).not.toBe(brief2);
  });

  it('handles empty videoId gracefully', () => {
    const brief = getBrief('');
    expect(brief).toBeUndefined();
  });
});

describe('getEpisodes', () => {
  it('returns an array', () => {
    const episodes = getEpisodes();
    expect(Array.isArray(episodes)).toBe(true);
  });

  it('each episode has slug and episodeNumber', () => {
    const episodes = getEpisodes();
    for (const ep of episodes) {
      expect(ep).toHaveProperty('slug');
      expect(ep).toHaveProperty('episodeNumber');
      expect(typeof ep.slug).toBe('string');
      expect(typeof ep.episodeNumber).toBe('number');
    }
  });

  it('is sorted by date descending', () => {
    const episodes = getEpisodes();
    for (let i = 1; i < episodes.length; i++) {
      const prevDate = new Date(episodes[i - 1].publishedAt).getTime();
      const currDate = new Date(episodes[i].publishedAt).getTime();
      expect(prevDate).toBeGreaterThanOrEqual(currDate);
    }
  });

  it('transforms YouTube thumbnails to WebP', () => {
    const episodes = getEpisodes();
    for (const ep of episodes) {
      if (ep.thumbnail.includes('i.ytimg.com')) {
        expect(ep.thumbnail).toMatch(/https:\/\/i\.ytimg\.com\/vi_webp\/.*\/hqdefault\.webp/);
      }
    }
  });

  it('populates brief field for episodes with summaries', () => {
    const episodes = getEpisodes();
    const episodesWithSummaries = ['x1jm57leZW0', 'Tkh8-LleLws', 'ZcYNuHirHOA'];

    for (const videoId of episodesWithSummaries) {
      const episode = episodes.find(ep => ep.videoId === videoId);
      expect(episode).toBeDefined();
      expect(episode?.brief).toBeDefined();
      expect(typeof episode?.brief).toBe('string');
      expect(episode?.brief?.length).toBeGreaterThan(0);
    }
  });

  it('does not populate brief for episodes without summaries', () => {
    const episodes = getEpisodes();
    // Find an episode that definitely doesn't have a summary
    const episodeWithoutSummary = episodes.find(ep => !ep.brief);

    // At least one episode should not have a summary (or all have summaries, which is also valid)
    if (episodeWithoutSummary) {
      expect(episodeWithoutSummary.brief).toBeUndefined();
    }
  });
});

describe('getEpisodeBySlug', () => {
  it('finds episode by slug', () => {
    const episodes = getEpisodes();
    if (episodes.length > 0) {
      const firstEp = episodes[0];
      const found = getEpisodeBySlug(firstEp.slug);
      expect(found).toBeDefined();
      expect(found?.videoId).toBe(firstEp.videoId);
    }
  });

  it('returns undefined for non-existent slug', () => {
    const found = getEpisodeBySlug('non-existent-slug-12345');
    expect(found).toBeUndefined();
  });
});

describe('getEpisodeByVideoId', () => {
  it('finds episode by videoId', () => {
    const episodes = getEpisodes();
    if (episodes.length > 0) {
      const firstEp = episodes[0];
      const found = getEpisodeByVideoId(firstEp.videoId);
      expect(found).toBeDefined();
      expect(found?.slug).toBe(firstEp.slug);
    }
  });

  it('returns undefined for non-existent videoId', () => {
    const found = getEpisodeByVideoId('non-existent-video-id');
    expect(found).toBeUndefined();
  });
});

describe('getEpisodesByYear', () => {
  it('should return episodes from a specific year', () => {
    const years = getAvailableYears();
    expect(years.length).toBeGreaterThan(0);
    const year = years[0];
    const episodes = getEpisodesByYear(year);
    expect(Array.isArray(episodes)).toBe(true);
    expect(episodes.length).toBeGreaterThan(0);
    episodes.forEach(ep => {
      expect(ep.publishedAt.startsWith(`${year}-`)).toBe(true);
    });
  });

  it('should return episodes sorted by published date descending', () => {
    const years = getAvailableYears();
    expect(years.length).toBeGreaterThan(0);
    const episodes = getEpisodesByYear(years[0]);
    for (let i = 0; i < episodes.length - 1; i++) {
      const current = new Date(episodes[i].publishedAt).getTime();
      const next = new Date(episodes[i + 1].publishedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('should return empty array for year with no episodes', () => {
    const episodes = getEpisodesByYear(2020);
    expect(episodes).toEqual([]);
  });
});

describe('getEpisodesByYear edge cases', () => {
  it('should handle year 0 correctly', () => {
    const episodes = getEpisodesByYear(0);
    expect(episodes).toEqual([]);
  });

  it('should handle negative years', () => {
    const episodes = getEpisodesByYear(-1);
    expect(episodes).toEqual([]);
  });

  it('should handle future years', () => {
    const episodes = getEpisodesByYear(9999);
    expect(episodes).toEqual([]);
  });
});

describe('getAvailableYears', () => {
  it('should return array of years with episodes', () => {
    const years = getAvailableYears();
    expect(Array.isArray(years)).toBe(true);
    expect(years.length).toBeGreaterThan(0);
  });

  it('should return years sorted descending (newest first)', () => {
    const years = getAvailableYears();
    for (let i = 0; i < years.length - 1; i++) {
      expect(years[i]).toBeGreaterThan(years[i + 1]);
    }
  });

  it('should contain unique years only', () => {
    const years = getAvailableYears();
    const uniqueYears = new Set(years);
    expect(years.length).toBe(uniqueYears.size);
  });
});

describe('getYearCount', () => {
  it('should return number of episodes in a year', () => {
    const years = getAvailableYears();
    expect(years.length).toBeGreaterThan(0);
    const year = years[0];
    const count = getYearCount(year);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  it('should return 0 for year with no episodes', () => {
    const years = getAvailableYears();
    const maxYear = Math.max(...years);
    const count = getYearCount(maxYear + 1);
    expect(count).toBe(0);
  });

  it('should match length of getEpisodesByYear', () => {
    const year = getAvailableYears()[0];
    const count = getYearCount(year);
    const episodes = getEpisodesByYear(year);
    expect(count).toBe(episodes.length);
  });
});



describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration('PT1H24M39S')).toBe('1j 24m');
  });

  it('formats minutes alone', () => {
    expect(formatDuration('PT47M12S')).toBe('47m');
  });

  it('formats a whole hour without a stray zero', () => {
    expect(formatDuration('PT2H')).toBe('2j');
  });

  it('rounds sub-minute episodes up to a minute rather than showing 0m', () => {
    // "Ngobrolin Lebaran" is a real 50-second episode.
    expect(formatDuration('PT50S')).toBe('1m');
  });

  it('returns null for missing or unparseable input', () => {
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration('')).toBeNull();
    expect(formatDuration('banana')).toBeNull();
  });

  it('formats every real episode duration', () => {
    for (const ep of getEpisodes()) {
      if (!ep.duration) continue;
      expect(formatDuration(ep.duration), `bad duration: ${ep.duration}`).toMatch(
        /^(\d+j( \d+m)?|\d+m)$/
      );
    }
  });
});

describe('getCardBlurb', () => {
  // 109 of 178 episode descriptions are the same sentence, so the card text was
  // pure noise across most of the archive. The brief, when present, is the real
  // editorial summary and always wins.
  it('prefers the brief when one exists', () => {
    expect(getCardBlurb({ brief: 'Ringkasan asli.', description: 'apa pun' })).toBe(
      'Ringkasan asli.'
    );
  });

  it('drops the shared boilerplate sentence entirely', () => {
    expect(
      getCardBlurb({
        description:
          'Yuk mari kita diskusi dan ngobrol ngalor-ngidul tentang dunia web. Agar tetap up-to-date dengan teknologi web terkini.\r\n',
      })
    ).toBeNull();
  });

  it('drops the Selasa-malam boilerplate opener but keeps what follows', () => {
    const blurb = getCardBlurb({
      description:
        '\u{1F578}\uFE0F Selasa malam waktunya #ngobrolinweb\n\nKalau sudah cukup lama berkutat dengan coding agent, pasti tidak asing dengan MCP.',
    });
    expect(blurb).toBe(
      'Kalau sudah cukup lama berkutat dengan coding agent, pasti tidak asing dengan MCP.'
    );
  });

  it('strips sponsor and link lines', () => {
    const blurb = getCardBlurb({
      description:
        'Membahas Bun secara mendalam.\n\n\u{1F4E6} Langganan Cloud VPS Turbo? Gunakan kode: NGOBROLINVPSDN\nhttps://example.com/promo',
    });
    expect(blurb).toBe('Membahas Bun secara mendalam.');
  });

  // The real description of yhlD16hyW90 (and four siblings). Everything below
  // the boilerplate opener is an 83-character rule of dashes followed by the
  // membership and donation pitch, so the card used to render the rule plus a
  // truncated "Bergabung menjadi anggota elit di ka..." as its whole blurb.
  const MEMBERSHIP_BOILERPLATE_DESCRIPTION =
    'Yuk mari kita diskusi dan ngobrol ngalor-ngidul tentang dunia web. Agar tetap up-to-date dengan teknologi web terkini.\n\n' +
    'Topik, tautan dan pertanyaan menarik bisa dilayangkan ke https://bit.ly/ngobrolinweb\n\n' +
    '-----------------------------------------------------------------------------------\n' +
    'Bergabung menjadi anggota elit di kanal ini:\n' +
    'https://www.youtube.com/channel/UCHhAlFGFCGgIusQkQIqJLYw/join\n\n' +
    'Donasi dapat meningkatkan kualitas kanal ini:\n\u{1F4B0} https://karyakarsa.com/rizafahmi/tip';

  it('drops a horizontal rule and the membership pitch behind it', () => {
    expect(
      getCardBlurb({ description: MEMBERSHIP_BOILERPLATE_DESCRIPTION })
    ).toBeNull();
  });

  it('never leads a blurb with a line that has no letters or digits', () => {
    const blurb = getCardBlurb({
      description:
        '-----------------------------------\n\u2500\u2500\u2500\u2500\u2500\n***\nMembahas Astro secara mendalam.',
    });
    expect(blurb).toBe('Membahas Astro secara mendalam.');
  });

  it('keeps a line whose only content is a number', () => {
    const blurb = getCardBlurb({ description: '---\n2024 dalam angka.' });
    expect(blurb).toBe('2024 dalam angka.');
  });

  // Every card blurb across the real archive must start with something a reader
  // can read.
  it('never starts a real blurb with punctuation only', () => {
    for (const ep of getEpisodes()) {
      const blurb = getCardBlurb(ep);
      if (!blurb) continue;
      expect(
        /^[\p{L}\p{N}]/u.test(blurb) || /[\p{L}\p{N}]/u.test(blurb.slice(0, 12)),
        `${ep.videoId} leads with "${blurb.slice(0, 20)}"`
      ).toBe(true);
    }
  });

  it('returns null rather than an empty string when nothing survives', () => {
    expect(getCardBlurb({ description: '' })).toBeNull();
    expect(getCardBlurb({})).toBeNull();
    expect(getCardBlurb({ description: 'https://example.com' })).toBeNull();
    expect(getCardBlurb({ description: '-------\n\u2500\u2500\u2500' })).toBeNull();
  });

  // The point of the exercise: card text must actually distinguish episodes.
  it('leaves far fewer duplicate blurbs across the real archive', () => {
    const seen = new Map<string, number>();
    for (const ep of getEpisodes()) {
      const blurb = getCardBlurb(ep);
      if (!blurb) continue;
      const key = blurb.slice(0, 120);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const worst = Math.max(0, ...seen.values());
    // 76 episodes used to share one identical 120-char card blurb.
    expect(worst).toBeLessThan(10);
  });
});

describe('getNewEpisodeSlugs', () => {
  // The BARU badge was positional (`isNew={index < 2}`), so it marked the first
  // two cards of whatever list it was in. /tags/web-components badged two
  // May-2024 episodes as new. Recency is a property of the episode, not of
  // where it happens to sit in a grid.
  it('marks the most recently published episodes in the whole archive', () => {
    const newest = getEpisodes()
      .slice()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 2)
      .map((ep) => ep.slug);

    const flagged = getNewEpisodeSlugs();
    expect(flagged.size).toBe(2);
    for (const slug of newest) {
      expect(flagged.has(slug), `${slug} should be flagged new`).toBe(true);
    }
  });

  it('does not flag an old episode just because it leads a filtered list', () => {
    const oldest = getEpisodes()
      .slice()
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())[0];
    expect(getNewEpisodeSlugs().has(oldest.slug)).toBe(false);
  });
});
