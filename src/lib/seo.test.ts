// src/lib/seo.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateHomepageSchema,
  generateAboutPageSchema,
  generateCollectionPageSchema,
  generateVideoSchema
} from './seo';
import type { Episode } from './episodes';

describe('SEO Schema Generators', () => {
  describe('generateHomepageSchema', () => {
    const siteUrl = 'https://ngobrol.in';

    it('should generate valid WebSite schema', () => {
      const schema = generateHomepageSchema(siteUrl, 155);

      expect(schema).toHaveProperty('@context', 'https://schema.org');
      expect(schema).toHaveProperty('@graph');
      expect(Array.isArray(schema['@graph'])).toBe(true);

      const webSite = schema['@graph'].find((item: any) => item['@type'] === 'WebSite');
      expect(webSite).toBeDefined();
      expect(webSite.name).toBe('Ngobrolin WEB');
      expect(webSite.url).toBe(siteUrl);
      expect(webSite.inLanguage).toBe('id-ID');
    });

    it('should include search action in WebSite schema', () => {
      const schema = generateHomepageSchema(siteUrl, 155);
      const webSite = schema['@graph'].find((item: any) => item['@type'] === 'WebSite');

      expect(webSite.potentialAction).toBeDefined();
      expect(webSite.potentialAction['@type']).toBe('SearchAction');
      expect(webSite.potentialAction.target).toContain(siteUrl);
    });

    it('should generate valid Organization schema', () => {
      const schema = generateHomepageSchema(siteUrl, 155);
      const org = schema['@graph'].find((item: any) => item['@type'] === 'Organization');

      expect(org).toBeDefined();
      expect(org.name).toBe('Ngobrolin WEB');
      expect(org.logo).toContain('favicon.svg');
      expect(Array.isArray(org.sameAs)).toBe(true);
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
      expect(podcast.webFeed).toBe(`${siteUrl}/rss.xml`);
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
  });
});