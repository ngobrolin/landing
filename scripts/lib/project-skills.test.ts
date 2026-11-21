import { describe, expect, it } from "vitest";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonical = path.join(root, ".claude/skills");
const aliases = path.join(root, ".agents/skills");
const canonicalImpeccable = path.join(canonical, "impeccable");

const markdownFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(item);
    return entry.isFile() && entry.name.endsWith(".md") ? [item] : [];
  });

// Discover the inventory so adding a skill preserves this convention without
// having to update an unrelated fixed list of names.
const names = readdirSync(canonical);
const impeccablePromptFiles = markdownFiles(canonicalImpeccable);
const codexAgentDefinitions = [
  "impeccable_asset_producer.toml",
  "impeccable_documenter.toml",
  "impeccable_finish_reviewer.toml",
  "impeccable_manual_edit_applier.toml",
  "openai.yaml",
];

describe("project skill storage", () => {
  it("keeps the same skill inventory in both discovery paths", () => {
    expect(names.length).toBeGreaterThan(0);
    expect(readdirSync(aliases).sort()).toEqual([...names].sort());
  });

  it.each(names)("keeps %s canonical under .claude with a relative .agents alias", (name) => {
    const source = path.join(canonical, name);
    const alias = path.join(aliases, name);
    expect(lstatSync(source).isDirectory()).toBe(true);
    expect(lstatSync(source).isSymbolicLink()).toBe(false);
    expect(existsSync(path.join(source, "SKILL.md"))).toBe(true);
    expect(lstatSync(alias).isSymbolicLink()).toBe(true);
    expect(readlinkSync(alias)).toBe(`../../.claude/skills/${name}`);
    expect(realpathSync(alias)).toBe(realpathSync(source));
  });

  it.each(codexAgentDefinitions)(
    "keeps Codex agent definition %s reachable through the Impeccable alias",
    (name) => {
      const source = path.join(canonicalImpeccable, "agents", name);
      const alias = path.join(aliases, "impeccable", "agents", name);
      expect(existsSync(source)).toBe(true);
      expect(realpathSync(alias)).toBe(realpathSync(source));
    },
  );
});

describe("shared Impeccable prompts", () => {
  it.each(impeccablePromptFiles)("keeps %s free of Claude-only question APIs", (file) => {
    expect(readFileSync(file, "utf8")).not.toContain("AskUserQuestion");
  });

  it("keeps Codex critique delegation behind explicit user permission", () => {
    const critique = readFileSync(
      path.join(canonicalImpeccable, "reference/critique.md"),
      "utf8",
    );
    expect(critique).toContain("Codex sub-agent gate");
    expect(critique).toContain("the user explicitly allowed sub-agents");
    expect(critique).toContain("the user did not explicitly allow sub-agents");
    expect(critique).toContain("May I use sub-agents for this critique?");
    expect(critique).toContain("`CLAUDE.md` or `AGENTS.md`");
  });
});
