// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { visualizer } from 'rollup-plugin-visualizer';
import { getEpisodes } from './src/lib/episodes';

// https://astro.build/config
export default defineConfig({
  site: 'https://ngobrol.in',
  image: {
    domains: ["i.ytimg.com"]
  },
  build: {
    inlineStylesheets: 'always'
  },
  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.json',
        gzipSize: true,
        brotliSize: true,
        template: 'raw-data',
      }),
    ]
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        const url = new URL(item.url);

        // Homepage - highest priority
        if (url.pathname === '/') {
          item.changefreq = 'daily';
          item.priority = 1.0;
          return item;
        }

        // Episodes listing
        if (url.pathname === '/episodes' || url.pathname === '/episodes/') {
          item.changefreq = 'weekly';
          item.priority = 0.9;
          return item;
        }

        // Individual episodes - use published date
        if (url.pathname.match(/^\/episodes\/[^/]+\/?$/)) {
          const slug = url.pathname.replace(/^\/episodes\//, '').replace(/\/$/, '');
          const episode = getEpisodes().find(ep => ep.slug === slug);

          if (episode) {
            item.lastmod = new Date(episode.publishedAt);
            item.priority = 0.8;
            item.changefreq = 'monthly';
          }
          return item;
        }

        // About page
        if (url.pathname === '/about' || url.pathname === '/about/') {
          item.changefreq = 'monthly';
          item.priority = 0.5;
          return item;
        }

        // Subscribe page
        if (url.pathname === '/subscribe' || url.pathname === '/subscribe/') {
          item.changefreq = 'monthly';
          item.priority = 0.3;
          return item;
        }

        // Partners page
        if (url.pathname === '/partners' || url.pathname === '/partners/') {
          item.changefreq = 'monthly';
          item.priority = 0.3;
          return item;
        }

        return item;
      }
    })
  ]
});
