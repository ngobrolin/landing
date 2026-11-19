import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          exclude: ['node_modules', 'e2e', 'src/**/*.render.test.ts'],
        },
      },
      './vitest.astro.config.ts',
    ],
  },
});
