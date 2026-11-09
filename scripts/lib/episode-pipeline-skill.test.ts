import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The episode-pipeline skill is a live instruction for unattended runs, so every
 * path, workflow and command it names must be real, and it must never tell an
 * agent to run the steps that stay human-owned (sync, audio, upload, overwrite).
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL_NAME = "episode-pipeline";
const SKILL_DIR = `.agents/skills/${SKILL_NAME}`;
const CLAUDE_LINK = `.claude/skills/${SKILL_NAME}`;

const read = (file: string) => readFileSync(path.join(repoRoot, file), "utf-8");
const skill = read(`${SKILL_DIR}/SKILL.md`);
const codeSpans = [...skill.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
const commandLines = [
  ...codeSpans,
  ...[...skill.matchAll(/```bash\n([\s\S]*?)```/g)].flatMap((m) => m[1].split("\n")),
];

describe("episode-pipeline skill: discovery", () => {
  it("has frontmatter naming its directory and a trigger", () => {
    const front = skill.match(/^---\nname: (.+)\ndescription: "(.+)"\n---\n/);
    expect(front).not.toBeNull();
    expect(front![1]).toBe(SKILL_NAME);
    expect(front![2].length).toBeLessThanOrEqual(1024);
    expect(front![2]).toMatch(/Use when/);
    expect(front![2]).toMatch(/read-only/);
  });

  it("is reachable from .claude/skills through a relative symlink", () => {
    const link = path.join(repoRoot, CLAUDE_LINK);
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(path.isAbsolute(readlinkSync(link))).toBe(false);
    expect(realpathSync(link)).toBe(realpathSync(path.join(repoRoot, SKILL_DIR)));
  });

  it("is pointed to from the README", () => {
    expect(read("README.md")).toContain(`${SKILL_DIR}/SKILL.md`);
  });
});

describe("episode-pipeline skill: references", () => {
  it("names only repo paths that exist", () => {
    const paths = codeSpans
      .map((span) => span.replace(/^pnpm exec tsx /, "").split(" ")[0])
      .filter((span) => /^(src|scripts|\.agents|\.claude|\.github)\//.test(span))
      .map((span) => (span.includes("<") ? path.dirname(span) : span));
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => !existsSync(path.join(repoRoot, p)))).toEqual([]);
  });

  it("names only workflows, package scripts and skills that exist", () => {
    const workflows = [...skill.matchAll(/--workflow ([\w.-]+)/g)].map((m) => m[1]);
    expect(workflows.sort()).toEqual(["fetch-playlist.yml", "playlist-drift.yml"]);
    for (const wf of workflows) expect(existsSync(path.join(repoRoot, ".github/workflows", wf))).toBe(true);

    const scripts = Object.keys(JSON.parse(read("package.json")).scripts);
    const used = [...skill.matchAll(/pnpm run ([a-z:-]+)/g)].map((m) => m[1]);
    expect(used.filter((name) => !scripts.includes(name))).toEqual([]);

    const skills = [...skill.matchAll(/`([a-z0-9-]+)` skill/g)].map((m) => m[1]);
    expect(skills.length).toBeGreaterThan(0);
    for (const name of skills) expect(existsSync(path.join(repoRoot, ".agents/skills", name, "SKILL.md"))).toBe(true);
  });

  it("carries no machine-local path", () => {
    expect(skill).not.toMatch(/\/Users\/|\/home\/|[A-Z]:\\/);
  });
});

describe("episode-pipeline skill: human-owned steps stay out of its commands", () => {
  it("never instructs a sync, audio extraction, upload or paid transcription", () => {
    const forbidden = /tsx scripts\/(fetch-playlist|extract-audio|upload-s3)\.ts|transcribe:openai|gh pr merge|git push/;
    expect(commandLines.filter((line) => forbidden.test(line))).toEqual([]);
  });

  it("never overwrites transcripts", () => {
    expect(commandLines.filter((line) => /transcribe:youtube.*--(all|force)/.test(line))).toEqual([]);
  });
});

describe("episode-pipeline skill: pending-work discovery", () => {
  it("reports a retained run worktree but never the current one", () => {
    const block = [...skill.matchAll(/```bash\n([\s\S]*?)```/g)]
      .map((m) => m[1])
      .find((b) => b.includes("pending worktree:"));
    expect(block, "the step 0 discovery block").toBeDefined();

    const dir = mkdtempSync(path.join(tmpdir(), "pending-wt-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: path.join(dir, "repo"), stdio: "pipe" });
    try {
      execFileSync("git", ["init", "-q", "repo"], { cwd: dir });
      git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "x");
      const current = path.join(dir, "episode-pipeline", "wt-current");
      const retained = path.join(dir, "episode-pipeline", "wt-retained");
      git("worktree", "add", "-q", "--detach", current);
      git("worktree", "add", "-q", "--detach", retained);

      const out = execFileSync("sh", ["-c", block!], {
        cwd: path.join(dir, "repo"),
        env: { ...process.env, RUN_WT: current },
        encoding: "utf-8",
      });
      expect(out).toMatch(/pending worktree: .*wt-retained/);
      expect(out).not.toMatch(/wt-current/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
