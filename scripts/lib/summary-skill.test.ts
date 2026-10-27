import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KEY_POINTS_MAX,
  KEY_POINTS_MIN,
  findSummaryProblems,
} from "./summary-contract";

/**
 * The summarizing-episodes skill is the authoritative summary contract and the
 * workflow agents follow. These tests keep it discoverable, keep every path and
 * command it gives real, and keep its prose bounds equal to the ones the data
 * guard enforces, so the skill and src/data/summaries.test.ts cannot drift
 * into two contracts. SUMMARIZE.md is held to being a pointer for the same
 * reason.
 */
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const SKILL_NAME = "summarizing-episodes";
const SKILL_DIR = `.agents/skills/${SKILL_NAME}`;
const SKILL_PATH = `${SKILL_DIR}/SKILL.md`;
const CLAUDE_LINK = `.claude/skills/${SKILL_NAME}`;

const read = (file: string) =>
  readFileSync(path.join(repoRoot, file), "utf-8");

const skill = read(SKILL_PATH);
const pointer = read("SUMMARIZE.md");

function frontmatter(source: string): Record<string, string> {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-z_-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].replace(/^"(.*)"$/, "$1");
  }
  return fields;
}

function codeSpans(source: string): string[] {
  return [...source.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
}

const packageScripts = Object.keys(
  JSON.parse(read("package.json")).scripts as Record<string, string>,
);

describe("summarizing-episodes skill: discovery", () => {
  it("opens with frontmatter naming its own directory", () => {
    expect(skill.startsWith("---\n")).toBe(true);
    const { name } = frontmatter(skill);
    expect(name).toBe(SKILL_NAME);
    // Agent Skills spec: lowercase letters, digits and single hyphens, <= 64.
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(name.length).toBeLessThanOrEqual(64);
  });

  it("has a description that states the trigger, within the spec limit", () => {
    const { description } = frontmatter(skill);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).toMatch(/summar/i);
    expect(description).toMatch(/Use when/);
  });

  it("is reachable from .claude/skills through a symlink, not a copy", () => {
    const link = path.join(repoRoot, CLAUDE_LINK);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(realpathSync(link)).toBe(realpathSync(path.join(repoRoot, SKILL_DIR)));
  });
});

describe("summarizing-episodes skill: references", () => {
  const docs: Record<string, string> = {
    [SKILL_PATH]: skill,
    "SUMMARIZE.md": pointer,
  };

  it.each(Object.keys(docs))("%s names only repo paths that exist", (doc) => {
    const paths = codeSpans(docs[doc])
      .map((span) => span.replace(/^pnpm exec tsx /, "").split(" ")[0])
      .filter((span) => /^(\.agents|\.claude|src|scripts|e2e|public)\//.test(span))
      // `src/data/summaries/<videoId>.json` names a pattern; check its folder.
      .map((span) => (span.includes("<") ? path.dirname(span) : span));

    expect(paths.length).toBeGreaterThan(0);
    const missing = paths.filter((p) => !existsSync(path.join(repoRoot, p)));
    expect(missing, "paths that do not exist").toEqual([]);
  });

  it.each(Object.keys(docs))("%s runs only package scripts that exist", (doc) => {
    const used = [...docs[doc].matchAll(/pnpm run ([a-z:-]+)/g)].map((m) => m[1]);
    const unknown = used.filter((name) => !packageScripts.includes(name));
    expect(unknown, "unknown pnpm scripts").toEqual([]);
  });

  it.each(Object.keys(docs))("%s carries no machine-local path", (doc) => {
    expect(docs[doc]).not.toMatch(/\/Users\/|\/home\/|[A-Z]:\\/);
  });

  it.each(Object.keys(docs))("%s names only skills that exist", (doc) => {
    const named = [...docs[doc].matchAll(/`([a-z0-9-]+)`(?: agent)? skill/g)].map(
      (m) => m[1],
    );
    expect(named.length).toBeGreaterThan(0);
    const missing = named.filter(
      (name) =>
        !existsSync(path.join(repoRoot, ".agents/skills", name, "SKILL.md")) &&
        !existsSync(path.join(repoRoot, ".claude/skills", name, "SKILL.md")),
    );
    expect(missing, "skills that do not exist").toEqual([]);
  });
});

describe("summarizing-episodes skill: one contract", () => {
  it("states the key point bounds the data guard enforces", () => {
    expect(skill).toContain(`${KEY_POINTS_MIN}-${KEY_POINTS_MAX} non-empty strings`);
  });

  it("shows a shape example that passes the contract for a real episode", () => {
    const block = skill.match(/```json\n([\s\S]*?)\n```/);
    expect(block, "the skill has a JSON example").not.toBeNull();
    const example = JSON.parse(block![1]);

    expect(findSummaryProblems(example, `${example.videoId}.json`)).toEqual([]);

    const episodes: { videoId: string }[] = JSON.parse(read("src/data/episodes.json"));
    expect(episodes.some((ep) => ep.videoId === example.videoId)).toBe(true);
  });

  it("names an exemplar summary that itself passes with no exemptions", () => {
    const exemplar = skill.match(/`(src\/data\/summaries\/([\w-]+)\.json)`/);
    expect(exemplar).not.toBeNull();
    const file = `${exemplar![2]}.json`;
    expect(findSummaryProblems(JSON.parse(read(exemplar![1])), file)).toEqual([]);
  });

  it("keeps SUMMARIZE.md a pointer rather than a second contract", () => {
    expect(pointer).toContain(SKILL_PATH);
    expect(pointer).not.toMatch(/keyPoints|\d-\d|generatedAt/);
  });
});

describe("scripts/check-summary.ts", () => {
  const tsx = path.join(repoRoot, "node_modules/.bin/tsx");
  const script = path.join(repoRoot, "scripts/check-summary.ts");

  function run(args: string[]): { status: number; output: string } {
    try {
      const output = execFileSync(tsx, [script, ...args], {
        cwd: repoRoot,
        encoding: "utf-8",
      });
      return { status: 0, output };
    } catch (error) {
      const failed = error as { status: number; stdout: string };
      return { status: failed.status, output: failed.stdout };
    }
  }

  it("passes a draft outside the repo that follows the contract, and fails a broken one", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "check-summary-"));
    try {
      // The real exemplar, copied out as if it were a fresh draft.
      const good = path.join(dir, "good", "Nq3uKguMNCA.json");
      const bad = path.join(dir, "bad", "Nq3uKguMNCA.json");
      const draft = JSON.parse(read("src/data/summaries/Nq3uKguMNCA.json"));
      for (const [file, body] of [
        [good, draft],
        [bad, { ...draft, keyPoints: draft.keyPoints.slice(0, 3) }],
      ] as const) {
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(body));
      }

      expect(run([good]).status).toBe(0);

      const failed = run([bad]);
      expect(failed.status).toBe(1);
      expect(failed.output).toContain(`the minimum is ${KEY_POINTS_MIN}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a summary for a video that is not an episode", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "check-summary-"));
    try {
      const file = path.join(dir, "notAnEpisode.json");
      const draft = JSON.parse(read("src/data/summaries/Nq3uKguMNCA.json"));
      writeFileSync(file, JSON.stringify({ ...draft, videoId: "notAnEpisode" }));

      const result = run([file]);
      expect(result.status).toBe(1);
      expect(result.output).toContain("is not an episode");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("lists missing summaries without writing anything", () => {
    // Which episodes it lists is covered against fixtures in
    // summary-coverage.test.ts; this proves the CLI wiring runs read-only.
    const dataState = () =>
      execFileSync("git", ["status", "--porcelain", "--", "src/data"], {
        cwd: repoRoot,
        encoding: "utf-8",
      });
    const before = dataState();
    const result = run(["--missing"]);
    expect(result.status).toBe(0);
    expect(result.output).toMatch(
      /Transcribed but not summarised|Every transcribed episode has a summary/,
    );
    expect(dataState()).toBe(before);
  });
});
