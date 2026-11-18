import { describe, expect, it } from "vitest";
import { existsSync, lstatSync, readdirSync, readlinkSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonical = path.join(root, ".claude/skills");
const aliases = path.join(root, ".agents/skills");

// Discover the inventory so adding a skill preserves this convention without
// having to update an unrelated fixed list of names.
const names = readdirSync(canonical);

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
});
