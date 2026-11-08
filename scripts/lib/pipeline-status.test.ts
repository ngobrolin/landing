import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computePipelineStatus, readPipelineInputs } from "./pipeline-status";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const audio = { audioUrl: "https://example.test/a.mp3", audioDuration: 60, audioFileSize: 960000 };
const ep = (videoId: string, extra: Record<string, unknown> = {}) => ({
  videoId,
  slug: `${videoId}-judul`,
  title: `Judul ${videoId}`,
  ...extra,
});

/** Lay out a src/data-shaped fixture and return its path. */
function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pipeline-status-"));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

const json = (value: unknown) => JSON.stringify(value);

describe("computePipelineStatus", () => {
  it("reports per-video stages and treats missing text or audio as work, not a problem", () => {
    const status = computePipelineStatus({
      episodes: [ep("aaa", audio), ep("_bb", audio), ep("ccc")],
      transcriptIds: new Set(["aaa", "_bb"]),
      summaryIds: new Set(["aaa"]),
      unreadable: [],
    });

    expect(status.problems).toEqual([]);
    expect(status.needTranscript).toEqual(["ccc"]);
    expect(status.needSummary).toEqual(["_bb"]);
    expect(status.audioMissing).toEqual(["ccc"]);
    expect(status.rows.find((r) => r.videoId === "aaa")).toEqual({
      videoId: "aaa",
      slug: "aaa-judul",
      transcript: true,
      summary: true,
      audio: "complete",
    });
  });

  it("flags partial audio, which the podcast feed drops silently", () => {
    const status = computePipelineStatus({
      episodes: [ep("aaa", { audioUrl: audio.audioUrl, audioDuration: 60 })],
      transcriptIds: new Set(["aaa"]),
      summaryIds: new Set(["aaa"]),
      unreadable: [],
    });
    expect(status.audioPartial).toEqual(["aaa"]);
    expect(status.problems.join("\n")).toMatch(/partial audio.*aaa/);
  });

  it("flags orphan summaries and transcripts", () => {
    const status = computePipelineStatus({
      episodes: [ep("aaa")],
      transcriptIds: new Set(["aaa", "ghostT"]),
      summaryIds: new Set(["ghostS"]),
      unreadable: [],
    });
    expect(status.problems.join("\n")).toMatch(/orphan summary.*ghostS/);
    expect(status.problems.join("\n")).toMatch(/orphan transcript.*ghostT/);
  });

  it("flags duplicate videoIds, duplicate slugs and records without a slug", () => {
    const status = computePipelineStatus({
      episodes: [ep("aaa"), ep("aaa"), { ...ep("bbb"), slug: "aaa-judul" }, { videoId: "ccc", title: "x" }],
      transcriptIds: new Set(),
      summaryIds: new Set(),
      unreadable: [],
    });
    const text = status.problems.join("\n");
    expect(text).toMatch(/duplicate videoId.*aaa/);
    expect(text).toMatch(/duplicate slug.*aaa-judul/);
    expect(text).toMatch(/no slug.*ccc/);
  });

  it("rejects non-object rows and non-string IDs without throwing or normalizing", () => {
    const status = computePipelineStatus({
      episodes: [null, 42, { videoId: 123, slug: "angka" }, ep("aaa")],
      transcriptIds: new Set(["123"]),
      summaryIds: new Set(),
      unreadable: [],
    });
    const text = status.problems.join("\n");
    expect(text).toMatch(/row 0 is not an object/);
    expect(text).toMatch(/row 1 is not an object/);
    expect(text).toMatch(/row 2 has a non-string videoId/);
    // 123 is not coerced to "123", so the transcript stays an orphan.
    expect(text).toMatch(/orphan transcript: 123/);
    expect(status.rows.map((r) => r.videoId)).toEqual(["aaa"]);
  });

  it("refuses an empty or non-array episode list", () => {
    for (const episodes of [[], {}, null]) {
      const status = computePipelineStatus({
        episodes,
        transcriptIds: new Set(),
        summaryIds: new Set(),
        unreadable: [],
      });
      expect(status.problems.length).toBeGreaterThan(0);
    }
  });
});

describe("readPipelineInputs", () => {
  it("reports empty and malformed files as unreadable instead of throwing", () => {
    const dir = fixture({
      "episodes.json": "{not json",
      "transcripts/aaa.json": "",
      "summaries/aaa.json": "[",
    });
    try {
      const inputs = readPipelineInputs(dir);
      expect(inputs.unreadable.sort()).toEqual(
        ["episodes.json", "summaries/aaa.json", "transcripts/aaa.json"].sort(),
      );
      expect(computePipelineStatus(inputs).problems.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("scripts/pipeline-status.ts", () => {
  const tsx = path.join(repoRoot, "node_modules/.bin/tsx");
  const script = path.join(repoRoot, "scripts/pipeline-status.ts");

  function run(args: string[]): { status: number; stdout: string } {
    try {
      return { status: 0, stdout: execFileSync(tsx, [script, ...args], { encoding: "utf-8" }) };
    } catch (error) {
      const failed = error as { status: number; stdout: string };
      return { status: failed.status, stdout: failed.stdout };
    }
  }

  const snapshot = (dir: string) =>
    readdirSync(dir, { recursive: true, encoding: "utf-8" })
      .sort()
      .map((f) => `${f}:${statSync(path.join(dir, f)).mtimeMs}`);

  it("exits 0 on a valid fixture, prints JSON, and writes nothing", () => {
    const dir = fixture({
      "episodes.json": json([ep("aaa", audio), ep("_bb")]),
      "transcripts/aaa.json": json({ videoId: "aaa" }),
      "summaries/aaa.json": json({ videoId: "aaa" }),
    });
    try {
      const before = snapshot(dir);
      const result = run(["--data-dir", dir, "--json"]);
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.needTranscript).toEqual(["_bb"]);
      expect(parsed.audioMissing).toEqual(["_bb"]);
      expect(snapshot(dir)).toEqual(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails usage when --data-dir has no value instead of reading the cwd", () => {
    for (const args of [["--data-dir"], ["--data-dir", "--json"]]) {
      const result = run(args);
      expect(result.status).toBe(2);
      expect(result.stdout).not.toMatch(/Episodes:/);
    }
  });

  it("exits 1 on an invalid fixture", () => {
    const dir = fixture({
      "episodes.json": json([ep("aaa", { audioUrl: audio.audioUrl })]),
      "summaries/ghost.json": json({ videoId: "ghost" }),
    });
    try {
      const result = run(["--data-dir", dir]);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/partial audio/);
      expect(result.stdout).toMatch(/orphan summary/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
