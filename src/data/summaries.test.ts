import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  KEY_POINTS_MAX,
  findSummaryProblems,
} from "../../scripts/lib/summary-contract";

// Summaries are one generated file per episode, rendered by Summary.astro,
// which reads `brief` and `keyPoints` directly with no validation. A malformed
// file therefore ships a broken "Ringkasan Episode" block instead of failing
// the build, so the shape is guarded here. The rules themselves live in
// scripts/lib/summary-contract.ts, shared with scripts/check-summary.ts.
//
// This is deliberately NOT a completeness gate: the weekly playlist sync opens
// a PR adding episodes before anyone has summarised them, and a coverage
// assertion would turn that PR red. Coverage is a human/agent task, not CI's.
const SUMMARIES_DIR = join(process.cwd(), "src/data/summaries");

const files = readdirSync(SUMMARIES_DIR).filter((file) =>
  file.endsWith(".json")
);

function load(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SUMMARIES_DIR, file), "utf-8"));
}

// The summarizing-episodes skill asks for 5-7 key points. These files predate
// that being enforced and run to 12; they are readable as shipped, so they are
// frozen rather than rewritten. The count assertion below stops the list
// growing — new summaries must obey the 5-7 rule.
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

describe("summary data files", () => {
  it("has summaries to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has the shape Summary.astro reads", (file) => {
    const problems = findSummaryProblems(load(file), file, {
      overlong: LEGACY_OVERLONG.has(file),
      withoutVideoId: LEGACY_WITHOUT_VIDEO_ID.has(file),
    });
    expect(problems).toEqual([]);
  });

  it("keeps the grandfathered exceptions from growing", () => {
    const overlong = files.filter((file) => {
      const keyPoints = load(file).keyPoints;
      return Array.isArray(keyPoints) && keyPoints.length > KEY_POINTS_MAX;
    });
    expect(overlong.filter((file) => !LEGACY_OVERLONG.has(file))).toEqual([]);

    const withoutVideoId = files.filter((file) => !load(file).videoId);
    expect(
      withoutVideoId.filter((file) => !LEGACY_WITHOUT_VIDEO_ID.has(file))
    ).toEqual([]);
  });
});
