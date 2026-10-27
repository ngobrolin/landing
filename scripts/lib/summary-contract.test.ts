import { describe, expect, it } from "vitest";
import {
  KEY_POINTS_MAX,
  KEY_POINTS_MIN,
  findSummaryProblems,
} from "./summary-contract";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    videoId: "abcDEF12345",
    generatedAt: "2026-10-26T16:24:06Z",
    brief: "Paragraf pertama.\n\nParagraf kedua.",
    keyPoints: ["Satu", "Dua", "Tiga", "Empat", "Lima"],
    ...overrides,
  };
}

const FILE = "abcDEF12345.json";

describe("findSummaryProblems", () => {
  it("accepts a conforming summary", () => {
    expect(findSummaryProblems(summary(), FILE)).toEqual([]);
  });

  it("requires videoId to match the filename", () => {
    expect(findSummaryProblems(summary({ videoId: "other" }), FILE)).toEqual([
      expect.stringContaining("filename"),
    ]);
  });

  it("requires videoId unless the file is exempt", () => {
    const missing = summary({ videoId: undefined });
    expect(findSummaryProblems(missing, FILE)).toEqual([
      "`videoId` is missing",
    ]);
    expect(
      findSummaryProblems(missing, FILE, { withoutVideoId: true }),
    ).toEqual([]);
  });

  it("requires a non-empty generatedAt and brief", () => {
    expect(
      findSummaryProblems(summary({ generatedAt: " ", brief: "" }), FILE),
    ).toHaveLength(2);
  });

  it(`bounds key points to ${KEY_POINTS_MIN}-${KEY_POINTS_MAX}`, () => {
    const points = (n: number) =>
      Array.from({ length: n }, (_, i) => `Poin ${i + 1}`);

    expect(
      findSummaryProblems(summary({ keyPoints: points(KEY_POINTS_MIN - 1) }), FILE),
    ).toHaveLength(1);
    expect(
      findSummaryProblems(summary({ keyPoints: points(KEY_POINTS_MAX) }), FILE),
    ).toEqual([]);
    expect(
      findSummaryProblems(summary({ keyPoints: points(KEY_POINTS_MAX + 1) }), FILE),
    ).toHaveLength(1);
    expect(
      findSummaryProblems(
        summary({ keyPoints: points(KEY_POINTS_MAX + 1) }),
        FILE,
        { overlong: true },
      ),
    ).toEqual([]);
  });

  it("rejects empty or non-string key points", () => {
    expect(
      findSummaryProblems(
        summary({ keyPoints: ["Satu", "", "Tiga", 4, "Lima"] }),
        FILE,
      ),
    ).toHaveLength(2);
  });

  it.each(["{videoId}", "TODO", "TBD", "FIXME", "Lorem ipsum"])(
    "rejects the template leftover %s",
    (leftover) => {
      expect(
        findSummaryProblems(summary({ brief: `Episode ini ${leftover}` }), FILE),
      ).toHaveLength(1);
      expect(
        findSummaryProblems(
          summary({ keyPoints: ["Satu", "Dua", "Tiga", "Empat", leftover] }),
          FILE,
        ),
      ).toHaveLength(1);
    },
  );

  it("rejects a file that is not an object or has no key point array", () => {
    expect(findSummaryProblems([], FILE)).toHaveLength(1);
    expect(findSummaryProblems(null, FILE)).toHaveLength(1);
    expect(findSummaryProblems(summary({ keyPoints: "Satu" }), FILE)).toEqual([
      "`keyPoints` must be an array",
    ]);
  });
});
