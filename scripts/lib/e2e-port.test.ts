import { describe, it, expect } from 'vitest';
import net from 'node:net';
import {
  E2E_PORT_ENV,
  PORT_RANGE_START,
  PORT_RANGE_END,
  workspacePort,
  resolveE2EServer,
  pinPortForWorkers,
  E2E_PINNED_PORT_ENV,
} from './e2e-port';

/** A `isPortFree` stub where only the listed ports are taken. */
function occupied(...taken: number[]) {
  const seen: number[] = [];
  const isPortFree = async (port: number) => {
    seen.push(port);
    return !taken.includes(port);
  };
  return { isPortFree, probed: seen };
}

/** Binds a real listener on 127.0.0.1 and returns its port plus a closer. */
async function listen(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;
  return {
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('workspacePort', () => {
  it('gives two worktrees of the same repo two different ports', () => {
    const a = workspacePort('/Users/riza/.treehouse/ngobrolin-web-aaa/1/ngobrolin-web');
    const b = workspacePort('/Users/riza/.treehouse/ngobrolin-web-bbb/1/ngobrolin-web');

    expect(a).not.toBe(b);
  });

  it('gives one worktree the same port every run', () => {
    const path = '/Users/riza/code/ngobrolin-web';

    expect(workspacePort(path)).toBe(workspacePort(path));
  });

  it('stays inside the reserved range, clear of both ephemeral ranges', () => {
    const paths = Array.from({ length: 500 }, (_, i) => `/tmp/worktree-${i}`);

    for (const path of paths) {
      const port = workspacePort(path);
      expect(port).toBeGreaterThanOrEqual(PORT_RANGE_START);
      expect(port).toBeLessThanOrEqual(PORT_RANGE_END);
      expect(Number.isInteger(port)).toBe(true);
    }

    // macOS allocates ephemeral ports from 49152, Linux from 32768. Colliding
    // with those would make a run fail at random.
    expect(PORT_RANGE_END).toBeLessThan(32768);
  });

  it('spreads worktrees across the range rather than clustering', () => {
    const ports = new Set(
      Array.from({ length: 200 }, (_, i) => workspacePort(`/Users/riza/.treehouse/lane-${i}/ngobrolin-web`)),
    );

    expect(ports.size).toBe(200);
  });
});

describe('resolveE2EServer', () => {
  const workspacePath = '/Users/riza/.treehouse/lane-a/ngobrolin-web';

  it('uses the workspace port when nothing is listening on it', async () => {
    const { isPortFree } = occupied();

    const target = await resolveE2EServer({ workspacePath, env: {}, isPortFree });

    expect(target.port).toBe(workspacePort(workspacePath));
    expect(target.source).toBe('workspace');
  });

  it('never adopts a server it did not start', async () => {
    const { isPortFree } = occupied();

    const target = await resolveE2EServer({ workspacePath, env: {}, isPortFree });

    expect(target.reuseExistingServer).toBe(false);
  });

  it('steps past a port that is already taken', async () => {
    const start = workspacePort(workspacePath);
    const { isPortFree, probed } = occupied(start, start + 1);

    const target = await resolveE2EServer({ workspacePath, env: {}, isPortFree });

    expect(target.port).toBe(start + 2);
    expect(probed).toEqual([start, start + 1, start + 2]);
  });

  it('wraps back to the start of the range rather than walking out of it', async () => {
    const path = '/tmp/lane-at-the-end';
    const { isPortFree, probed } = occupied(PORT_RANGE_END);

    const target = await resolveE2EServer({
      workspacePath: path,
      env: {},
      isPortFree,
      startPort: PORT_RANGE_END,
    });

    expect(target.port).toBe(PORT_RANGE_START);
    expect(probed).toEqual([PORT_RANGE_END, PORT_RANGE_START]);
  });

  it('refuses rather than guessing when every probed port is taken', async () => {
    const isPortFree = async () => false;

    await expect(resolveE2EServer({ workspacePath, env: {}, isPortFree })).rejects.toThrow(
      new RegExp(E2E_PORT_ENV),
    );
  });

  it('skips a port a real foreign server is holding', async () => {
    const foreign = await listen();
    try {
      const target = await resolveE2EServer({ workspacePath, env: {}, startPort: foreign.port });

      expect(target.port).not.toBe(foreign.port);
      expect(target.reuseExistingServer).toBe(false);
    } finally {
      await foreign.close();
    }
  });

  it('reports the default probe as free for a port nothing holds', async () => {
    const spare = await listen();
    const port = spare.port;
    await spare.close();

    const target = await resolveE2EServer({ workspacePath, env: {}, startPort: port });

    expect(target.port).toBe(port);
  });
});

describe(`the ${E2E_PORT_ENV} override`, () => {
  const workspacePath = '/Users/riza/.treehouse/lane-a/ngobrolin-web';

  it('is honoured exactly, never stepped away from', async () => {
    const { isPortFree, probed } = occupied();

    const target = await resolveE2EServer({
      workspacePath,
      env: { [E2E_PORT_ENV]: '4321' },
      isPortFree,
    });

    expect(target.port).toBe(4321);
    expect(target.source).toBe('override');
    expect(target.reuseExistingServer).toBe(false);
    expect(probed).toEqual([4321]);
  });

  /**
   * Left to Playwright, a busy pinned port produces "…is already used, make sure
   * that nothing is running on the port/url or set reuseExistingServer:true" —
   * advice that reintroduces the false-green bug this whole module exists to
   * kill. Refuse first, and say the right thing.
   */
  it('refuses a port something else already holds, without suggesting adoption', async () => {
    const attempt = resolveE2EServer({
      workspacePath,
      env: { [E2E_PORT_ENV]: '4321' },
      isPortFree: async () => false,
    });

    await expect(attempt).rejects.toThrow(/4321/);
    await expect(attempt).rejects.toThrow(new RegExp(E2E_PORT_ENV));
    await expect(attempt).rejects.not.toThrow(/reuseExistingServer/);
  });

  it.each(['', '   ', 'abc', '0', '-1', '70000', '4321.5', '4321abc'])(
    'refuses the unusable value %j instead of falling back silently',
    async (value) => {
      await expect(
        resolveE2EServer({ workspacePath, env: { [E2E_PORT_ENV]: value }, isPortFree: async () => true }),
      ).rejects.toThrow(new RegExp(E2E_PORT_ENV));
    },
  );
});

describe('pinPortForWorkers', () => {
  const workspacePath = '/Users/riza/.treehouse/lane-a/ngobrolin-web';

  /**
   * The regression this exists for: Playwright re-evaluates the config in every
   * worker process, and by then the port the first evaluation chose is held by
   * the web server the run itself started. A worker that resolves afresh either
   * steps past that port or refuses it as taken — either way it drives the
   * browser at nothing (`net::ERR_CONNECTION_REFUSED`). The decision is made
   * once and carried to the forks.
   *
   * The pin is a separate variable from ${E2E_PORT_ENV} precisely because the
   * two mean opposite things about a busy port: a pinned port is busy *because
   * this run is serving on it*, a user's override being busy means something
   * else got there first.
   */
  it('keeps every re-evaluation of the config on the port the first one chose', async () => {
    const env: Record<string, string | undefined> = {};
    const chosen = workspacePort(workspacePath);
    // Free the first time, then held by the web server this run just started.
    let started = false;
    const isPortFree = async (port: number) => !(started && port === chosen);

    const first = await resolveE2EServer({ workspacePath, env, isPortFree });
    pinPortForWorkers(first, env);
    started = true;

    const inWorker = await resolveE2EServer({ workspacePath, env, isPortFree });

    expect(first.port).toBe(chosen);
    expect(inWorker.port).toBe(chosen);
    expect(inWorker.reuseExistingServer).toBe(false);
  });

  it('does the same for a port the caller pinned by hand', async () => {
    const env: Record<string, string | undefined> = { [E2E_PORT_ENV]: '15999' };
    let started = false;
    const isPortFree = async (port: number) => !(started && port === 15999);

    const first = await resolveE2EServer({ workspacePath, env, isPortFree });
    pinPortForWorkers(first, env);
    started = true;

    const inWorker = await resolveE2EServer({ workspacePath, env, isPortFree });

    expect(inWorker.port).toBe(15999);
    expect(inWorker.reuseExistingServer).toBe(false);
  });

  it('publishes the chosen port under its own name, leaving the override untouched', () => {
    const env: Record<string, string | undefined> = { [E2E_PORT_ENV]: '15999' };

    pinPortForWorkers({ port: 15999, reuseExistingServer: false, source: 'override' }, env);

    expect(env[E2E_PINNED_PORT_ENV]).toBe('15999');
    expect(env[E2E_PORT_ENV]).toBe('15999');
  });

  it('does not let a stale pin from an earlier run override a fresh choice', () => {
    const env: Record<string, string | undefined> = { [E2E_PINNED_PORT_ENV]: '11111' };

    pinPortForWorkers({ port: 19999, reuseExistingServer: false, source: 'workspace' }, env);

    expect(env[E2E_PINNED_PORT_ENV]).toBe('19999');
  });
});
