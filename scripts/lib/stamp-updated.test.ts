import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatStamp, setUpdatedAt } from "./stamp-updated";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Hand-indented on purpose: the edit must not reformat anything around it.
const SUMMARY = `{
  "videoId": "aaaaaaaaaaa",
  "generatedAt": "2026-08-26T00:00:00.000Z",
  "brief": "Paragraf.",
  "keyPoints": ["Satu",   "Dua", "Tiga", "Empat", "Lima"],
  "seoTitle": "Judul"
}
`;

describe("setUpdatedAt", () => {
  it("inserts updatedAt after generatedAt and leaves every other byte alone", () => {
    const out = setUpdatedAt(SUMMARY, "2026-11-14T14:12:51Z");
    expect(out).toBe(
      SUMMARY.replace(
        '"generatedAt": "2026-08-26T00:00:00.000Z",\n',
        '"generatedAt": "2026-08-26T00:00:00.000Z",\n  "updatedAt": "2026-11-14T14:12:51Z",\n',
      ),
    );
  });

  it("replaces an existing updatedAt in place", () => {
    const once = setUpdatedAt(SUMMARY, "2026-11-14T14:12:51Z");
    expect(setUpdatedAt(once, "2026-11-18T01:02:03Z")).toBe(once.replace("2026-11-14T14:12:51Z", "2026-11-18T01:02:03Z"));
  });

  it("handles generatedAt as the last key", () => {
    const text = '{\n  "videoId": "aaaaaaaaaaa",\n  "generatedAt": "2026-08-26T00:00:00Z"\n}\n';
    expect(JSON.parse(setUpdatedAt(text, "2026-11-14T14:12:51Z"))).toEqual({
      videoId: "aaaaaaaaaaa",
      generatedAt: "2026-08-26T00:00:00Z",
      updatedAt: "2026-11-14T14:12:51Z",
    });
  });

  it("refuses a layout it cannot edit line by line", () => {
    expect(() => setUpdatedAt('{"generatedAt":"2026-08-26T00:00:00Z","brief":"x"}', "2026-11-14T14:12:51Z")).toThrow(
      /generatedAt/,
    );
  });
});

describe("formatStamp", () => {
  it("writes UTC to the second", () => {
    expect(formatStamp(Date.parse("2026-11-14T21:12:51.400+07:00"))).toBe("2026-11-14T14:12:51Z");
  });
});

describe("scripts/stamp-updated.ts", () => {
  const tsx = path.join(repoRoot, "node_modules/.bin/tsx");
  const script = path.join(repoRoot, "scripts/stamp-updated.ts");
  let root: string;
  const summaryPath = (id: string) => path.join(root, "src/data/summaries", `${id}.json`);
  const readSummary = (id: string) => readFileSync(summaryPath(id), "utf-8");

  function run(args: string[]): { status: number; output: string } {
    try {
      const output = execFileSync(tsx, [script, ...args], { cwd: root, encoding: "utf-8", stdio: "pipe" });
      return { status: 0, output };
    } catch (error) {
      const failed = error as { status: number; stdout: string; stderr: string };
      return { status: failed.status, output: failed.stdout + failed.stderr };
    }
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "stamp-updated-"));
    mkdirSync(path.join(root, "src/data/summaries"), { recursive: true });
    mkdirSync(path.join(root, "src/data/transcripts"), { recursive: true });
    writeFileSync(
      path.join(root, "src/data/episodes.json"),
      JSON.stringify([{ videoId: "aaaaaaaaaaa" }, { videoId: "bbbbbbbbbbb" }]),
    );
    writeFileSync(summaryPath("aaaaaaaaaaa"), SUMMARY);
    writeFileSync(summaryPath("bbbbbbbbbbb"), SUMMARY.replace("aaaaaaaaaaa", "bbbbbbbbbbb"));
    writeFileSync(path.join(root, "src/data/transcripts/aaaaaaaaaaa.json"), SUMMARY);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("stamps a supplied past time on the named file only, as UTC", () => {
    const result = run(["--at", "2026-11-14T21:12:51+07:00", "src/data/summaries/aaaaaaaaaaa.json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(readSummary("aaaaaaaaaaa")).updatedAt).toBe("2026-11-14T14:12:51Z");
    expect(readSummary("aaaaaaaaaaa")).toBe(setUpdatedAt(SUMMARY, "2026-11-14T14:12:51Z"));
    expect(readSummary("bbbbbbbbbbb")).toBe(SUMMARY.replace("aaaaaaaaaaa", "bbbbbbbbbbb"));
  });

  it("stamps the current time when no --at is given", () => {
    const before = Math.floor(Date.now() / 1000) * 1000;
    expect(run(["src/data/summaries/aaaaaaaaaaa.json"]).status).toBe(0);
    const stamped = Date.parse(JSON.parse(readSummary("aaaaaaaaaaa")).updatedAt);
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
  });

  it("writes nothing on --dry-run", () => {
    const result = run(["--dry-run", "--at", "2026-11-14T14:12:51Z", "src/data/summaries/aaaaaaaaaaa.json"]);
    expect(result.status).toBe(0);
    expect(result.output).toContain("would stamp");
    expect(readSummary("aaaaaaaaaaa")).toBe(SUMMARY);
  });

  it("treats the same stamp twice as a no-op", () => {
    const args = ["--at", "2026-11-14T14:12:51Z", "src/data/summaries/aaaaaaaaaaa.json"];
    run(args);
    const first = readSummary("aaaaaaaaaaa");
    const again = run(args);
    expect(again.status).toBe(0);
    expect(again.output).toContain("unchanged");
    expect(readSummary("aaaaaaaaaaa")).toBe(first);
  });

  it.each([
    [["src/data/summaries/ccccccccccc.json"], "not an episode"],
    [["src/data/transcripts/aaaaaaaaaaa.json"], "src/data/summaries/"],
    [["--at", "2026-11-14T14:12:51", "src/data/summaries/aaaaaaaaaaa.json"], "timezone"],
    [["--at", "2999-01-01T00:00:00Z", "src/data/summaries/aaaaaaaaaaa.json"], "future"],
    [["--at", "2026-08-01T00:00:00Z", "src/data/summaries/aaaaaaaaaaa.json"], "earlier than its generatedAt"],
    [["src/data/summaries/aaaaaaaaaaa.json", "./src/data/summaries/aaaaaaaaaaa.json"], "more than once"],
    [[], "Usage"],
  ])("refuses %j and writes nothing", (args, message) => {
    // A valid path rides along so the test proves validation happens before any write.
    const result = run(args.length ? [...args, "src/data/summaries/bbbbbbbbbbb.json"] : args);
    expect(result.status).toBe(1);
    expect(result.output).toContain(message);
    expect(readSummary("aaaaaaaaaaa")).toBe(SUMMARY);
    expect(readSummary("bbbbbbbbbbb")).toBe(SUMMARY.replace("aaaaaaaaaaa", "bbbbbbbbbbb"));
  });

  it("refuses a file that is not a JSON object", () => {
    writeFileSync(summaryPath("aaaaaaaaaaa"), "null\n");
    const result = run(["src/data/summaries/aaaaaaaaaaa.json"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("must hold a JSON object");
  });

  it("refuses a symlink in the summaries folder, wherever it points", () => {
    const outside = path.join(root, "elsewhere.json");
    writeFileSync(outside, SUMMARY);
    rmSync(summaryPath("aaaaaaaaaaa"));
    symlinkSync(outside, summaryPath("aaaaaaaaaaa"));
    const result = run(["src/data/summaries/aaaaaaaaaaa.json"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("symlink");
    expect(readFileSync(outside, "utf-8")).toBe(SUMMARY);
  });

  it("refuses to move an existing updatedAt backwards", () => {
    writeFileSync(summaryPath("aaaaaaaaaaa"), setUpdatedAt(SUMMARY, "2026-11-14T14:12:51Z"));
    const result = run(["--at", "2026-11-13T06:57:06Z", "src/data/summaries/aaaaaaaaaaa.json"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("already records a later edit");
    expect(JSON.parse(readSummary("aaaaaaaaaaa")).updatedAt).toBe("2026-11-14T14:12:51Z");
  });
});
