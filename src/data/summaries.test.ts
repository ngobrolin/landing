import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Summaries are one generated file per episode, rendered by Summary.astro,
// which reads `brief` and `keyPoints` directly with no validation. A malformed
// file therefore ships a broken "Ringkasan Episode" block instead of failing
// the build, so the shape is guarded here.
//
// This is deliberately NOT a completeness gate: the weekly playlist sync opens
// a PR adding episodes before anyone has summarised them, and a coverage
// assertion would turn that PR red. Coverage is a human/agent task, not CI's.
const SUMMARIES_DIR = join(process.cwd(), "src/data/summaries");

const files = readdirSync(SUMMARIES_DIR).filter((file) =>
  file.endsWith(".json")
);

interface Summary {
  videoId?: string;
  generatedAt: string;
  brief: string;
  keyPoints: string[];
}

function load(file: string): Summary {
  return JSON.parse(readFileSync(join(SUMMARIES_DIR, file), "utf-8"));
}

// SUMMARIZE.md asks for 5-7 key points. These files predate that being
// enforced and run to 12; they are readable as shipped, so they are frozen
// rather than rewritten. The count assertion below stops the list growing —
// new summaries must obey the 5-7 rule.
const LEGACY_OVERLONG = new Set([
  "0sMCTZ77Fjk.json",
  "5P6heS1ZtPw.json",
  "7JewigkI4Do.json",
  "89TRqTXfwrg.json",
  "99CaLw7Q7os.json",
  "9PpM7f7TEbw.json",
  "AtRclaIb4zE.json",
  "GGfh-olIzl0.json",
  "IPWEi0I3bf0.json",
  "KzqALj3KpDo.json",
  "TsJQsHCdhUQ.json",
  "aPv5UxXSPfM.json",
  "d28J0ZgkORY.json",
  "f1g2zrOmzN0.json",
  "j-wZjh62Gaw.json",
  "kpyPIYuChU0.json",
  "lb6jvnmDM6I.json",
  "m7rsN2Wmb78.json",
  "mYBN0iKfWUA.json",
  "q2Xe49Du4no.json",
  "w0--WVHU5DE.json",
  "wRF7vpvs95s.json",
  "zX0gDaovb1w.json",
]);

// Summary.astro resolves the file by filename and never reads `videoId`, so
// this one shipped without the field and still renders. Same deal: frozen, not
// rewritten, and no new file may join it.
const LEGACY_WITHOUT_VIDEO_ID = new Set(["94-ige23PDs.json"]);

// Leftovers from a half-filled template read as plausible prose in a language
// most reviewers of this repo do not proofread word by word, so match them.
const PLACEHOLDER_PATTERN =
  /\{[A-Za-z_]+\}|\bTODO\b|\bTBD\b|\bFIXME\b|\blorem ipsum\b/i;

describe("summary data files", () => {
  it("has summaries to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has the shape Summary.astro reads", (file) => {
    const summary = load(file);

    if (!LEGACY_WITHOUT_VIDEO_ID.has(file)) {
      expect(summary.videoId).toBe(file.replace(/\.json$/, ""));
    }

    expect(typeof summary.generatedAt).toBe("string");
    expect(summary.generatedAt.trim().length).toBeGreaterThan(0);

    expect(typeof summary.brief).toBe("string");
    expect(summary.brief.trim().length).toBeGreaterThan(0);
    expect(summary.brief).not.toMatch(PLACEHOLDER_PATTERN);

    expect(Array.isArray(summary.keyPoints)).toBe(true);
    expect(summary.keyPoints.length).toBeGreaterThanOrEqual(5);
    if (!LEGACY_OVERLONG.has(file)) {
      expect(summary.keyPoints.length).toBeLessThanOrEqual(7);
    }

    for (const point of summary.keyPoints) {
      expect(typeof point).toBe("string");
      expect(point.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps the grandfathered exceptions from growing", () => {
    const overlong = files.filter((file) => load(file).keyPoints.length > 7);
    expect(overlong.sort()).toEqual([...LEGACY_OVERLONG].sort());

    const withoutVideoId = files.filter((file) => !load(file).videoId);
    expect(withoutVideoId.sort()).toEqual([...LEGACY_WITHOUT_VIDEO_ID].sort());
  });
});
