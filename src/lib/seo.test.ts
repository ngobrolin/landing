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
});