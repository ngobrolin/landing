import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { E2E_PINNED_PORT_ENV, E2E_PORT_ENV } from './scripts/lib/e2e-port';
import type { PlaywrightTestConfig } from '@playwright/test';

type WebServerConfig<T> = T extends readonly (infer Element)[] ? Element : T;

/**
 * The bug this guards: the port used to be written out three times by hand
 * (`use.baseURL`, `webServer.command`, `webServer.url`). Three copies of one
 * fact is how a run ends up testing a server it never started.
 */
describe('playwright.config', () => {
  // Importing the config runs its top-level port resolution in this process.
  // Left to the ambient environment, a developer exercising the debugging
  // override (`E2E_PORT=15999 pnpm run test:e2e`) would turn this suite red
  // while the port machinery behaved exactly as designed. Resolve from a clean
  // environment instead, so these assertions depend only on the config.
  const saved: Record<string, string | undefined> = {};
  let config: PlaywrightTestConfig;
  let webServer: WebServerConfig<NonNullable<PlaywrightTestConfig['webServer']>>;

  beforeAll(async () => {
    for (const name of [E2E_PORT_ENV, E2E_PINNED_PORT_ENV]) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
    config = (await import('./playwright.config')).default;
    const resolved = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    webServer = resolved!;
  });

  afterAll(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('points the browser, the server and its readiness check at one port', () => {
    const baseURL = new URL(config.use!.baseURL as string);
    const serverURL = new URL(webServer.url as string);

    expect(serverURL.port).toBe(baseURL.port);
    expect(webServer.command).toContain(`--port ${baseURL.port}`);
  });

  it('never adopts a server it did not start', () => {
    expect(webServer.reuseExistingServer).toBe(false);
  });

  it('binds IPv4 loopback, because some environments restrict ::1', () => {
    expect(webServer.command).toContain('--host 127.0.0.1');
    expect(new URL(config.use!.baseURL as string).hostname).toBe('127.0.0.1');
  });

  it('passes flags to astro rather than to pnpm', () => {
    // npm strips the first `--`; pnpm forwards it verbatim, so `pnpm run preview
    // -- --port N` silently ignores the flags. See AGENTS.md.
    expect(webServer.command).not.toContain(' -- ');
  });
});
