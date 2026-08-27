import { defineConfig, devices } from '@playwright/test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinPortForWorkers, resolveE2EServer } from './scripts/lib/e2e-port';

// Keyed on this file's own directory, not `process.cwd()`, so the port belongs
// to the worktree under test however the suite was invoked. See
// scripts/lib/e2e-port.ts for why the port is neither fixed nor adopted.
const server = await resolveE2EServer({ workspacePath: dirname(fileURLToPath(import.meta.url)) });

// Playwright re-evaluates this file in every worker it forks. Pin the choice so
// they all target the server this run actually started.
pinPortForWorkers(server);

// Use IPv4 loopback to avoid environments where IPv6 (::1) binding is restricted.
const origin = `http://127.0.0.1:${server.port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: origin,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm run preview --host 127.0.0.1 --port ${server.port}`,
    url: origin,
    // Never true. A run that adopts a server it did not start can pass against
    // another branch's build, which is how every local green result became
    // unprovable.
    reuseExistingServer: server.reuseExistingServer,
  },
});
