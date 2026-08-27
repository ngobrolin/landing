import { describe, it, expect } from 'vitest';
import config from './playwright.config';

/**
 * The bug this guards: the port used to be written out three times by hand
 * (`use.baseURL`, `webServer.command`, `webServer.url`). Three copies of one
 * fact is how a run ends up testing a server it never started.
 */
describe('playwright.config', () => {
  const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;

  it('points the browser, the server and its readiness check at one port', () => {
    const baseURL = new URL(config.use!.baseURL as string);
    const serverURL = new URL(webServer!.url as string);

    expect(serverURL.port).toBe(baseURL.port);
    expect(webServer!.command).toContain(`--port ${baseURL.port}`);
  });

  it('never adopts a server it did not start', () => {
    expect(webServer!.reuseExistingServer).toBe(false);
  });

  it('binds IPv4 loopback, because some environments restrict ::1', () => {
    expect(webServer!.command).toContain('--host 127.0.0.1');
    expect(new URL(config.use!.baseURL as string).hostname).toBe('127.0.0.1');
  });

  it('passes flags to astro rather than to pnpm', () => {
    // npm strips the first `--`; pnpm forwards it verbatim, so `pnpm run preview
    // -- --port N` silently ignores the flags. See AGENTS.md.
    expect(webServer!.command).not.toContain(' -- ');
  });
});
