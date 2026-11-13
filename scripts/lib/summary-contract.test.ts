import { describe, expect, it } from "vitest";
import {
  KEY_POINTS_MAX,
  KEY_POINTS_MIN,
  META_DESCRIPTION_MAX,
  META_DESCRIPTION_MIN,
  SEO_TITLE_MAX,
  SEO_TITLE_MIN,
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

describe("optional seoTitle and metaDescription", () => {
  const seoTitle = "Merapikan UI Web Saat Fitur LLM Masuk | Ngobrolin WEB";
  const metaDescription =
    "Riza, Ivan, dan Eka membahas UI web yang berantakan setelah fitur LLM masuk, lalu mencoba Modern Web Guidance untuk membuat karusel CSS.";

  it("accepts a summary without them, and one with conforming values", () => {
    expect(findSummaryProblems(summary(), FILE)).toEqual([]);
    expect(findSummaryProblems(summary({ seoTitle, metaDescription }), FILE)).toEqual([]);
  });

  it(`bounds seoTitle to ${SEO_TITLE_MIN}-${SEO_TITLE_MAX} characters with the show-name suffix`, () => {
    expect(findSummaryProblems(summary({ seoTitle: "UI Web | Ngobrolin WEB" }), FILE)).toEqual([
      expect.stringContaining("characters"),
    ]);
    expect(
      findSummaryProblems(summary({ seoTitle: `${"a".repeat(SEO_TITLE_MAX)} | Ngobrolin WEB` }), FILE),
    ).toEqual([expect.stringContaining("characters")]);
    expect(
      findSummaryProblems(summary({ seoTitle: "Merapikan UI Web Saat Fitur LLM Masuk - Ngobrolin WEB" }), FILE),
    ).toEqual([expect.stringContaining("must end with")]);
    expect(
      findSummaryProblems(summary({ seoTitle: "Merapikan UI Web \u2014 Fitur LLM Masuk | Ngobrolin WEB" }), FILE),
    ).toEqual([expect.stringContaining("dash")]);
  });

  it(`bounds metaDescription to ${META_DESCRIPTION_MIN}-${META_DESCRIPTION_MAX} characters`, () => {
    expect(findSummaryProblems(summary({ metaDescription: "Terlalu pendek." }), FILE)).toEqual([
      expect.stringContaining("characters"),
    ]);
    expect(
      findSummaryProblems(summary({ metaDescription: `${"kata ".repeat(40).trim()}.` }), FILE),
    ).toEqual([expect.stringContaining("characters")]);
  });

  it("rejects a stock opening, a trailing ellipsis and dashes in metaDescription", () => {
    for (const opening of ["Episode ini", "Di episode ini"]) {
      const text = `${opening} ${metaDescription.slice(opening.length + 1)}`;
      expect(findSummaryProblems(summary({ metaDescription: text }), FILE)).toEqual([
        expect.stringContaining("Episode ini"),
      ]);
    }
    expect(
      findSummaryProblems(summary({ metaDescription: metaDescription.replace(/\.$/, "...") }), FILE),
    ).toEqual([expect.stringContaining("ellipsis")]);
    expect(
      findSummaryProblems(summary({ metaDescription: metaDescription.replace(", lalu", " \u2013 lalu") }), FILE),
    ).toEqual([expect.stringContaining("dash")]);
  });

  it("rejects template leftovers in either field", () => {
    expect(
      findSummaryProblems(summary({ seoTitle: "TODO Merapikan UI Web Saat Fitur LLM | Ngobrolin WEB" }), FILE),
    ).toEqual([expect.stringContaining("placeholder")]);
    expect(
      findSummaryProblems(summary({ metaDescription: metaDescription.replace("Riza", "{host}") }), FILE),
    ).toEqual([expect.stringContaining("placeholder")]);
  });

  it("rejects non-string values", () => {
    expect(findSummaryProblems(summary({ seoTitle: 1, metaDescription: [] }), FILE)).toEqual([
      "`seoTitle` must be a string",
      "`metaDescription` must be a string",
    ]);
  });
});
