import { describe, it, expect, beforeEach } from 'vitest';
import { determineCacheStrategy, getCacheName, isSameOrigin, isHtmlRequest } from './sw-utils';

describe('sw-utils', () => {
  beforeEach(() => {
    global.self = { location: { origin: 'https://ngobrol.in' } } as any;
  });

  describe('isSameOrigin', () => {
    it('returns true for same-origin requests', () => {
      const request = new Request('https://ngobrol.in/episodes/test');
      expect(isSameOrigin(request)).toBe(true);
    });

    it('returns false for external requests', () => {
      const request = new Request('https://i.ytimg.com/vi/test/default.jpg');
      expect(isSameOrigin(request)).toBe(false);
    });

    it('returns false for YouTube thumbnails', () => {
      const request = new Request('https://i.ytimg.com/vi/test/default.jpg');
      expect(isSameOrigin(request)).toBe(false);
    });
  });

  describe('isHtmlRequest', () => {
    it('returns true for HTML requests', () => {
      const request = new Request('https://ngobrol.in/episodes/test', {
        headers: { 'Accept': 'text/html,application/xhtml+xml' }
      });
      expect(isHtmlRequest(request)).toBe(true);
    });

    it('returns false for CSS requests', () => {
      const request = new Request('https://ngobrol.in/_astro/index.css', {
        headers: { 'Accept': 'text/css,*/*' }
      });
      expect(isHtmlRequest(request)).toBe(false);
    });

    it('returns false when accept header is missing', () => {
      const request = new Request('https://ngobrolin/api/endpoint');
      expect(isHtmlRequest(request)).toBe(false);
    });
  });

  describe('determineCacheStrategy', () => {
    it('returns network-first for same-origin HTML requests', () => {
      const request = new Request('https://ngobrol.in/episodes/test', {
        headers: { 'Accept': 'text/html' }
      });
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('network-first');
      expect(result.cacheName).toBe('ngobrol-pages-v1');
    });

    it('returns cache-first for CSS assets', () => {
      const request = new Request('https://ngobrol.in/_astro/index.css');
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('cache-first');
      expect(result.cacheName).toBe('ngobrol-static-v1');
    });

    it('returns cache-first for JS assets', () => {
      const request = new Request('https://ngobrol.in/_astro/client.js');
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('cache-first');
      expect(result.cacheName).toBe('ngobrol-static-v1');
    });

    it('returns cache-first for font files', () => {
      const request = new Request('https://ngobrol.in/fonts/test.woff2');
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('cache-first');
      expect(result.cacheName).toBe('ngobrol-static-v1');
    });

    it('returns network-only for YouTube thumbnails', () => {
      const request = new Request('https://i.ytimg.com/vi/test/default.jpg');
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('network-only');
      expect(result.cacheName).toBeNull();
    });

    it('returns network-only for external assets', () => {
      const request = new Request('https://example.com/script.js');
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('network-only');
      expect(result.cacheName).toBeNull();
    });

    it('returns network-only for non-GET requests', () => {
      const request = new Request('https://ngobrol.in/api/endpoint', { method: 'POST' });
      const result = determineCacheStrategy(request);
      expect(result.type).toBe('network-only');
      expect(result.cacheName).toBeNull();
    });
  });

  describe('getCacheName', () => {
    it('returns ngobrol-pages-v1 for HTML requests', () => {
      const request = new Request('https://ngobrol.in/episodes/test', {
        headers: { 'Accept': 'text/html' }
      });
      expect(getCacheName(request)).toBe('ngobrol-pages-v1');
    });

    it('returns ngobrol-static-v1 for CSS requests', () => {
      const request = new Request('https://ngobrol.in/_astro/index.css');
      expect(getCacheName(request)).toBe('ngobrol-static-v1');
    });

    it('returns null for network-only requests', () => {
      const request = new Request('https://i.ytimg.com/vi/test/default.jpg');
      expect(getCacheName(request)).toBeNull();
    });
  });
});
