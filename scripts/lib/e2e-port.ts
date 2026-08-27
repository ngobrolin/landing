import net from 'node:net';

/**
 * Which port the Playwright suite serves the build on, and why it is never a
 * fixed one.
 *
 * Two defects came out of the old `playwright.config.ts`, which hardcoded 4321
 * in three places and left `reuseExistingServer: !process.env.CI`:
 *
 * 1. **A green run could be a lie.** Outside CI, Playwright adopted whatever
 *    was already listening on 4321 — routinely a preview server belonging to a
 *    different branch, and once an orphan whose worktree had been deleted
 *    fifteen hours earlier. The suite passed without ever loading the build of
 *    the branch under test.
 * 2. **Two lanes could not run at once.** The second timed out waiting for the
 *    web server with nothing actually wrong with it.
 *
 * Both have to be fixed together: `reuseExistingServer: false` on a fixed port
 * stops the lying but leaves lanes colliding, and a unique port with reuse
 * still on leaves the trust bug latent for whoever pins the port back.
 *
 * So the port is derived from the *worktree path*: one lane always gets the
 * same port (stable URLs, stable traces), two lanes get different ones, and the
 * port is probed before use so an unrelated service — or a stale orphan — is
 * stepped over rather than adopted. `reuseExistingServer` is `false` on every
 * path through this module, including the explicit override, so a server this
 * run did not start can never be tested against.
 *
 * The probing is why `pinPortForWorkers` exists: Playwright re-evaluates the
 * config in every worker process, and by then the chosen port is held by the
 * web server the run itself started. See that function.
 *
 * `e2e-port.test.ts` covers port *selection*. It deliberately does not cover
 * the two end-to-end properties, which need real browser runs — too slow and
 * too machine-dependent for CI — so they are checked by hand instead:
 *
 * - *Two lanes pass at once*: run `pnpm run test:e2e` from two worktrees
 *   simultaneously and confirm with `lsof -nP -iTCP -sTCP:LISTEN` that each
 *   run is serving on its own port.
 * - *No foreign server is adopted*: put a decoy HTTP server on 4321 serving
 *   recognisable content, run the suite, and confirm the decoy logs zero
 *   requests. Under the old config it was adopted and served the tests.
 */

/** The debugging override a person sets. */
export const E2E_PORT_ENV = 'E2E_PORT';

/**
 * How the runner tells its own worker processes which port this run settled on.
 * Deliberately not `E2E_PORT`: the two mean opposite things about a busy port.
 * A pinned port is busy *because this run is serving on it*; a person's
 * override being busy means something else got there first.
 */
export const E2E_PINNED_PORT_ENV = 'E2E_PORT_PINNED';

/**
 * macOS hands out ephemeral ports from 49152 and Linux from 32768. Staying
 * clear of both means an OS-assigned socket elsewhere on the machine can never
 * land on a lane's port mid-run.
 */
export const PORT_RANGE_START = 10000;
export const PORT_RANGE_END = 29999;

const PORT_RANGE_SIZE = PORT_RANGE_END - PORT_RANGE_START + 1;

/** How far to walk before giving up and telling the caller to pick a port. */
const MAX_PROBES = 64;

export type PortSource = 'pinned' | 'override' | 'workspace';

export interface E2EServerTarget {
  port: number;
  /**
   * Always `false`. Typed as the literal so a future edit that tries to turn
   * adoption back on fails to compile rather than quietly shipping.
   */
  reuseExistingServer: false;
  source: PortSource;
}

export interface ResolveOptions {
  /** Absolute path of the worktree the suite is running in. */
  workspacePath: string;
  env?: Record<string, string | undefined>;
  /** Injectable for tests; defaults to a real IPv4 loopback bind. */
  isPortFree?: (port: number) => Promise<boolean>;
  /** Injectable for tests; defaults to `workspacePort(workspacePath)`. */
  startPort?: number;
}

/**
 * FNV-1a over the worktree path. Any stable hash would do; this one is short,
 * dependency-free and spreads neighbouring paths (`.../lane-1`, `.../lane-2`)
 * across the range instead of clustering them.
 */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** The port a given worktree starts from — deterministic, so a lane's URL is stable. */
export function workspacePort(workspacePath: string): number {
  return PORT_RANGE_START + (fnv1a(workspacePath) % PORT_RANGE_SIZE);
}

function nextInRange(port: number): number {
  const offset = (port - PORT_RANGE_START + 1) % PORT_RANGE_SIZE;
  return PORT_RANGE_START + ((offset + PORT_RANGE_SIZE) % PORT_RANGE_SIZE);
}

/** True when nothing holds `port` on IPv4 loopback — the interface the preview server binds. */
function bindProbe(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

function parsePort(raw: string, variable: string): number {
  const port = Number(raw);
  if (!/^\d+$/.test(raw.trim()) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `${variable}="${raw}" is not a usable port. Set ${variable} to a whole number ` +
        `between 1 and 65535, or unset it to let each worktree pick its own.`,
    );
  }
  return port;
}

/**
 * Carries the resolved port to the worker processes that will re-evaluate this
 * config.
 *
 * Playwright loads `playwright.config.ts` once in the runner and again in each
 * worker it forks. Those forks inherit `process.env`, so stamping the choice
 * here makes every later evaluation agree with the server that is actually
 * running. Without it a worker resolves afresh, finds the chosen port now held
 * by its own run's web server, and either steps past it or refuses it — either
 * way the whole suite fails with `net::ERR_CONNECTION_REFUSED`.
 */
export function pinPortForWorkers(
  target: E2EServerTarget,
  env: Record<string, string | undefined> = process.env,
): void {
  env[E2E_PINNED_PORT_ENV] = String(target.port);
}

export async function resolveE2EServer(options: ResolveOptions): Promise<E2EServerTarget> {
  const { workspacePath, env = process.env, isPortFree = bindProbe } = options;

  const pinned = env[E2E_PINNED_PORT_ENV];
  if (pinned !== undefined) {
    // Set by this run's own runner process; the port is busy because we are
    // serving on it, so it is not probed.
    const port = parsePort(pinned, E2E_PINNED_PORT_ENV);
    return { port, reuseExistingServer: false, source: 'pinned' };
  }

  const override = env[E2E_PORT_ENV];
  if (override !== undefined) {
    // An explicit port is never stepped away from — the caller asked for that
    // one. It is still checked, because left to Playwright a busy overridden
    // port produces "…is already used […] or set reuseExistingServer:true",
    // advice that reintroduces exactly the bug this module exists to kill.
    const port = parsePort(override, E2E_PORT_ENV);
    if (!(await isPortFree(port))) {
      throw new Error(
        `${E2E_PORT_ENV}=${port} is already in use by something this run did not start. ` +
          `The browser suite will not test against it. Free the port, or pick another with ` +
          `${E2E_PORT_ENV}=<port>, or unset ${E2E_PORT_ENV} to let this worktree choose one.`,
      );
    }
    return { port, reuseExistingServer: false, source: 'override' };
  }

  const startPort = options.startPort ?? workspacePort(workspacePath);
  let port = startPort;
  for (let probe = 0; probe < MAX_PROBES; probe++) {
    if (await isPortFree(port)) {
      return { port, reuseExistingServer: false, source: 'workspace' };
    }
    port = nextInRange(port);
  }

  throw new Error(
    `No free port for the browser suite after ${MAX_PROBES} tries from ${startPort}. ` +
      `Free some ports, or run with ${E2E_PORT_ENV}=<port> to name one.`,
  );
}
