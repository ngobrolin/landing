import { getViteConfig } from 'astro/config';

// Renders .astro components through the container API. Kept apart from the
// main project so Astro's Vite pipeline cannot change how the other tests resolve files.
export default getViteConfig({
  test: {
    name: 'astro',
    environment: 'node',
    include: ['src/**/*.render.test.ts'],
  },
});
