import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * AGENTS.md rules that pnpm is the only package manager here. An `npx` or
 * `npm run` left in a script, a doc, or a shebang is either a stale instruction
 * or executable code that bypasses the pinned `packageManager` field.
 *
 * Excluded on purpose, by the "live instruction or historical record?" test:
 *   - `docs/plans/` — dated design records of what was decided and run at the
 *     time. Rewriting their commands falsifies the record.
 *   - `.agents/` — agent skill files are their own instruction surface with
 *     their own contract, not project documentation.
 */
const ALLOWED_PREFIXES = ["docs/plans/", ".agents/"];

/**
 * Files that quote the forbidden forms in order to forbid them: AGENTS.md states
 * the pnpm-only rule and the `--` trap, and this test spells out what it greps
 * for. Both must contain the strings they ban.
 */
const ALLOWED_QUOTING_FILES = [
  "AGENTS.md:",
  "scripts/lib/package-manager.test.ts:",
];

function gitGrep(pattern: string): string[] {
  try {
    return execFileSync(
      "git",
      ["grep", "-n", "-E", pattern, "--", ".", ":!src/data", ":!pnpm-lock.yaml"],
      { cwd: repoRoot, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    // git grep exits 1 when nothing matches.
    return [];
  }
}

describe("package manager consistency", () => {
  it("has no npx or npm invocation outside the excluded surfaces", () => {
    const offenders = gitGrep("(^|[^p])npx |(^|[^p])npm (run|install|ci) ")
      .filter((line) => !ALLOWED_PREFIXES.some((p) => line.startsWith(p)))
      .filter((line) => !ALLOWED_QUOTING_FILES.some((f) => line.startsWith(f)));

    expect(offenders, `pnpm-only rule violated`).toEqual([]);
  });

  /**
   * npm strips the first `--` before handing arguments to the script; pnpm
   * forwards it verbatim. So `npm run preview -- --port 4321` becomes
   * `astro preview -- --port 4321` under pnpm, and astro ignores every flag
   * after the stray separator. Scripts that treat positional args as video IDs
   * would likewise take `--` for a video ID. The pnpm form omits the separator.
   */
  it("never uses npm's -- argument separator with pnpm run", () => {
    const offenders = gitGrep("pnpm run [a-z:-]+ -- ")
      .filter((line) => !ALLOWED_PREFIXES.some((p) => line.startsWith(p)))
      .filter((line) => !ALLOWED_QUOTING_FILES.some((f) => line.startsWith(f)));

    expect(offenders, "pnpm forwards -- verbatim; drop it").toEqual([]);
  });
});
