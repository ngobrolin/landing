// src/lib/seo.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateHomepageSchema,
  generateAboutPageSchema,
  generateCollectionPageSchema,
  generateVideoSchema,
  generateBreadcrumbSchema,
  generatePodcastEpisodeSchema,
  buildEpisodePageTitle
} from './seo';
import { getEpisodes } from './episodes';
import type { Episode } from './episodes';

describe('SEO Schema Generators', () => {
  describe('generateHomepageSchema', () => {
    const siteUrl = 'https://ngobrol.in';

    // Layout.astro already declares the WebSite and Organization nodes; the homepage graph
    // must extend them by @id rather than declare a second site with conflicting values.
    it('extends the site-wide nodes by @id instead of redeclaring them', () => {
      const schema = generateHomepageSchema(siteUrl, 155);
      const graph = schema['@graph'];

      expect(graph.find((item: any) => item['@type'] === 'WebSite')).toBeUndefined();
      const org = graph.find((item: any) => item['@type'] === 'Organization');
      expect(org['@id']).toBe(`${siteUrl}/#organization`);
      expect(org.logo).toBeUndefined();
      expect(org.sameAs).toBeUndefined();
    });

    it('should include all three founders', () => {
      const schema = generateHomepageSchema(siteUrl, 155);
      const org = schema['@graph'].find((item: any) => item['@type'] === 'Organization');

      expect(org.founder).toBeDefined();
      expect(Array.isArray(org.founder)).toBe(true);
      expect(org.founder).toHaveLength(3);

      const names = org.founder.map((f: any) => f.name);
      expect(names).toContain('Eka');
      expect(names).toContain('Ivan');
      expect(names).toContain('Riza Fahmi');
    });

    it('should generate valid PodcastSeries schema', () => {
      const schema = generateHomepageSchema(siteUrl, 155);
      const podcast = schema['@graph'].find((item: any) => item['@type'] === 'PodcastSeries');

      expect(podcast).toBeDefined();
      expect(podcast.name).toBe('Ngobrolin WEB');
      expect(podcast.webFeed).toBe(`${siteUrl}/podcast-rss.xml`);
      expect(podcast.numberOfEpisodes).toBe(155);
      expect(podcast.inLanguage).toBe('id-ID');
    });

    it('should use dynamic episode count', () => {
      const schema1 = generateHomepageSchema(siteUrl, 100);
      const schema2 = generateHomepageSchema(siteUrl, 200);

      const podcast1 = schema1['@graph'].find((item: any) => item['@type'] === 'PodcastSeries');
      const podcast2 = schema2['@graph'].find((item: any) => item['@type'] === 'PodcastSeries');

      expect(podcast1.numberOfEpisodes).toBe(100);
      expect(podcast2.numberOfEpisodes).toBe(200);
    });
  });

  describe('generateAboutPageSchema', () => {
    const siteUrl = 'https://ngobrol.in';

    it('should generate AboutPage schema', () => {
      const schema = generateAboutPageSchema(siteUrl);

      expect(schema).toHaveProperty('@context', 'https://schema.org');
      expect(schema['@type']).toBe('AboutPage');
      expect(schema.mainEntity).toBeDefined();
    });

    it('should include Organization as mainEntity', () => {
      const schema = generateAboutPageSchema(siteUrl);
      const org = schema.mainEntity;

      expect(org['@type']).toBe('Organization');
      expect(org.name).toBe('Ngobrolin WEB');
      expect(org.foundingDate).toBe('2019');
    });

    it('should include all founders with details', () => {
      const schema = generateAboutPageSchema(siteUrl);
      const org = schema.mainEntity;

      expect(org.founder).toBeDefined();
      expect(Array.isArray(org.founder)).toBe(true);
      expect(org.founder).toHaveLength(3);

      const eka = org.founder.find((f: any) => f.name === 'Eka');
      expect(eka).toBeDefined();
      expect(eka['@type']).toBe('Person');
      expect(eka.jobTitle).toBe('Google Developer Expert - Web');

      const ivan = org.founder.find((f: any) => f.name === 'Ivan');
      expect(ivan).toBeDefined();
      expect(ivan.jobTitle).toBe('Senior Web Engineer - Human Made');

      const riza = org.founder.find((f: any) => f.name === 'Riza Fahmi');
      expect(riza).toBeDefined();
      expect(riza.jobTitle).toBe('Co-founder Hacktiv8');
    });
  });

  describe('generateCollectionPageSchema', () => {
    const siteUrl = 'https://ngobrol.in';

    it('should generate CollectionPage schema', () => {
      const episodes: Episode[] = [
        {
          videoId: 'abc123',
          title: 'Episode 1',
          description: 'Description',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'ep-1',
          episodeNumber: 1
        },
        {
          videoId: 'def456',
          title: 'Episode 2',
          description: 'Description',
          publishedAt: '2024-01-08T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'ep-2',
          episodeNumber: 2
        }
      ];

      const schema = generateCollectionPageSchema(
        'Semua Episode - Ngobrolin WEB',
        'Daftar lengkap semua episode',
        `${siteUrl}/episodes`,
        episodes
      );

      expect(schema).toHaveProperty('@context', 'https://schema.org');
      expect(schema['@type']).toBe('CollectionPage');
      expect(schema.name).toBe('Semua Episode - Ngobrolin WEB');
    });

    it('should include ItemList with all episodes', () => {
      const episodes: Episode[] = [
        {
          videoId: 'abc123',
          title: 'Episode 1',
          description: 'Description',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'ep-1',
          episodeNumber: 1
        },
        {
          videoId: 'def456',
          title: 'Episode 2',
          description: 'Description',
          publishedAt: '2024-01-08T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'ep-2',
          episodeNumber: 2
        }
      ];

      const schema = generateCollectionPageSchema(
        'Semua Episode',
        'Description',
        `${siteUrl}/episodes`,
        episodes
      );

      expect(schema.mainEntity).toBeDefined();
      expect(schema.mainEntity['@type']).toBe('ItemList');
      expect(schema.mainEntity.numberOfItems).toBe(2);
      expect(schema.mainEntity.itemListElement).toHaveLength(2);
    });

    it('should include correct positions for each episode', () => {
      const episodes: Episode[] = [
        {
          videoId: 'abc123',
          title: 'First Episode',
          description: 'Description',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'first-ep',
          episodeNumber: 1
        },
        {
          videoId: 'def456',
          title: 'Second Episode',
          description: 'Description',
          publishedAt: '2024-01-08T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'second-ep',
          episodeNumber: 2
        },
        {
          videoId: 'ghi789',
          title: 'Third Episode',
          description: 'Description',
          publishedAt: '2024-01-15T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'third-ep',
          episodeNumber: 3
        }
      ];

      const schema = generateCollectionPageSchema(
        'Episodes',
        'Description',
        `${siteUrl}/episodes`,
        episodes
      );

      const items = schema.mainEntity.itemListElement;
      expect(items[0].position).toBe(1);
      expect(items[0].item.name).toBe('First Episode');
      expect(items[1].position).toBe(2);
      expect(items[2].position).toBe(3);
    });

    it('links every item to its canonical episode URL, whatever the collection URL', () => {
      const episodes: Episode[] = [
        {
          videoId: 'abc123',
          title: 'Episode 1',
          description: 'Description',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnail: 'https://example.com/thumb.jpg',
          slug: 'ep-1',
          episodeNumber: 1
        }
      ];

      for (const url of [`${siteUrl}/episodes`, `${siteUrl}/episodes/2024`]) {
        const schema = generateCollectionPageSchema('Episodes', 'Description', url, episodes);
        expect(schema.mainEntity.itemListElement[0].item.url).toBe(`${siteUrl}/episodes/ep-1/`);
        expect(schema.url).toBe(`${url}/`);
      }
    });

    it('should handle empty episode list', () => {
      const schema = generateCollectionPageSchema(
        'Episodes',
        'Description',
        `${siteUrl}/episodes`,
        []
      );

      expect(schema.mainEntity.numberOfItems).toBe(0);
      expect(schema.mainEntity.itemListElement).toHaveLength(0);
    });
  });

  describe('generateVideoSchema', () => {
    const siteUrl = 'https://ngobrol.in';

    it('should include duration when available', () => {
      const episode: Episode = {
        videoId: 'abc123',
        title: 'Test Episode',
        description: 'Test Description',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnail: 'https://example.com/thumb.jpg',
        slug: 'test-ep',
        episodeNumber: 1,
        duration: 'PT4M13S'  // 4 minutes 13 seconds
      };

      const schema = generateVideoSchema(episode, null, null, siteUrl);

      expect(schema.duration).toBe('PT4M13S');
    });

    it('should work without duration (legacy episodes)', () => {
      const episode: Episode = {
        videoId: 'abc123',
        title: 'Test Episode',
        description: 'Test Description',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnail: 'https://example.com/thumb.jpg',
        slug: 'test-ep',
        episodeNumber: 1
        // no duration
      };

      const schema = generateVideoSchema(episode, null, null, siteUrl);

      expect(schema.duration).toBeUndefined();
      // Other fields should still be present
      expect(schema['@type']).toBe('VideoObject');
      expect(schema.name).toBe('Test Episode');
    });

    it('leaves out contentUrl and the transcript', () => {
      const episode: Episode = {
        videoId: 'abc123',
        title: 'Test Episode',
        description: 'Test Description',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnail: 'https://example.com/thumb.jpg',
        slug: 'test-ep',
        episodeNumber: 1
      };

      const schema = generateVideoSchema(episode, null, { fullText: 'Halo semuanya' }, siteUrl);

      expect(schema.contentUrl).toBeUndefined();
      expect(schema.transcript).toBeUndefined();
      expect(schema.embedUrl).toBe('https://www.youtube.com/embed/abc123');
    });
  });

  describe('episode page schemas', () => {
    const siteUrl = 'https://ngobrol.in';
    const episode: Episode = {
      videoId: 'abc123',
      title: 'Modern Web UI - Ngobrolin WEB',
      description: 'Test Description',
      publishedAt: '2024-01-01T00:00:00Z',
      thumbnail: 'https://example.com/thumb.jpg',
      slug: 'abc123-modern-web-ui-ngobrolin-web',
      episodeNumber: 180
    };
    const pageUrl = `${siteUrl}/episodes/abc123-modern-web-ui-ngobrolin-web/`;

    it('declares one video: the podcast episode references the VideoObject by @id', () => {
      const video = generateVideoSchema(episode, null, null, siteUrl);
      const podcast = generatePodcastEpisodeSchema(episode, null, siteUrl);

      expect(podcast.url).toBe(pageUrl);
      expect(podcast.associatedMedia).toEqual({ '@id': video['@id'] });
      expect(video['@id']).toBe(`${pageUrl}#video`);
    });

    it('uses the visible breadcrumb labels and canonical URLs', () => {
      const items = generateBreadcrumbSchema(episode, siteUrl).itemListElement;

      expect(items.map((i) => i.name)).toEqual(['Beranda', 'Episode', 'Modern Web UI']);
      expect(items.map((i) => i.item)).toEqual([`${siteUrl}/`, `${siteUrl}/episodes/`, pageUrl]);
    });
  });
});
describe('buildEpisodePageTitle', () => {
  // 163 of 178 episode titles already end in a "Ngobrolin WEB" variant, and the
  // page template used to append the site name unconditionally. That shipped
  // <title>X - Ngobrolin WEB - Ngobrolin WEB</title> on 119 episode pages, and
  // the same doubled string in og:title and twitter:title.
  it('does not repeat the site name when the title already carries it', () => {
    expect(buildEpisodePageTitle('State of CSS - Ngobrolin WEB')).toBe(
      'State of CSS - Ngobrolin WEB'
    );
  });

  it('appends the site name when the title lacks it', () => {
    expect(buildEpisodePageTitle('Ngobrolin React Server Component')).toBe(
      'Ngobrolin React Server Component - Ngobrolin WEB'
    );
  });

  // The playlist carries 46 distinct suffix shapes. AGENTS.md warns that titles
  // follow no single convention, so the rule keys on the site name appearing at
  // all rather than on an exact suffix.
  it('handles the numbered-episode suffixes', () => {
    expect(buildEpisodePageTitle('Web Components - Ngobrolin WEB ep51')).toBe(
      'Web Components - Ngobrolin WEB ep51'
    );
    expect(buildEpisodePageTitle('Deno - Ngobrolin WEB Ep7')).toBe(
      'Deno - Ngobrolin WEB Ep7'
    );
  });

  it('handles the guest-handle suffix', () => {
    expect(
      buildEpisodePageTitle('Liputan langsung Google I/O - Ngobrolin WEB & @sandhikagalihWPU')
    ).toBe('Liputan langsung Google I/O - Ngobrolin WEB & @sandhikagalihWPU');
  });

  // A real title in the playlist misspells the show name. It still must not
  // gain a second site name.
  it('handles the Ngborlin typo that exists in the playlist', () => {
    expect(buildEpisodePageTitle('Bun - Ngborlin WEB')).toBe('Bun - Ngborlin WEB');
  });

  it('is case-insensitive about the existing site name', () => {
    expect(buildEpisodePageTitle('Sesuatu - NGOBROLIN WEB')).toBe(
      'Sesuatu - NGOBROLIN WEB'
    );
  });

  it('trims incidental whitespace', () => {
    expect(buildEpisodePageTitle('  Tailwind  ')).toBe('Tailwind - Ngobrolin WEB');
  });

  // Four real titles use "Ngobrolin Web..." as a topic phrase AND carry the
  // suffix -- "Ngobrolin WebSocket - Ngobrolin WEB", "Ngobrolin Web API Baru -
  // Ngobrolin WEB", and two more. Those are correct as authored, so the
  // invariant is "never append a redundant suffix", not "the show name appears
  // exactly once".
  it('leaves a title that uses the show name as a topic phrase alone', () => {
    expect(buildEpisodePageTitle('Ngobrolin WebSocket - Ngobrolin WEB')).toBe(
      'Ngobrolin WebSocket - Ngobrolin WEB'
    );
  });

  it('never produces an adjacent doubled suffix for any real episode title', () => {
    const doubled = /ng(?:ob|bo)r(?:o)?lin\s+web\s*[-\u2013]\s*ng(?:ob|bo)r(?:o)?lin\s+web/i;
    for (const ep of getEpisodes()) {
      expect(
        doubled.test(buildEpisodePageTitle(ep.title)),
        `doubled site name for: ${ep.title}`
      ).toBe(false);
    }
  });

  it('is idempotent for every real episode title', () => {
    for (const ep of getEpisodes()) {
      const once = buildEpisodePageTitle(ep.title);
      expect(buildEpisodePageTitle(once), `not idempotent: ${ep.title}`).toBe(once);
    }
  });

  it('appends the suffix only to titles that lack the show name', () => {
    const withoutShowName = getEpisodes().filter(
      (ep) => !/ng(?:ob|bo)r(?:o)?lin\s+web/i.test(ep.title)
    );
    expect(withoutShowName.length).toBeGreaterThan(0);
    for (const ep of withoutShowName) {
      expect(buildEpisodePageTitle(ep.title)).toBe(`${ep.title.trim()} - Ngobrolin WEB`);
    }
  });
});
