/**
 * The machine-checkable half of the episode summary contract.
 *
 * `src/components/Summary.astro` resolves `src/data/summaries/<videoId>.json`
 * by filename and renders `brief` and `keyPoints` with no validation, so a
 * malformed file ships a broken "Ringkasan Episode" block instead of failing
 * the build. These rules are what stops that. The prose half (Bahasa
 * Indonesia, grounding, naming what the episode names) lives in
 * `.agents/skills/summarizing-episodes/SKILL.md`, which quotes the bounds
 * below and is tested against them so the two cannot drift.
 *
 * Two callers: `src/data/summaries.test.ts` (every committed file, with its
 * frozen legacy exceptions) and `scripts/check-summary.ts` (a new draft,
 * with none).
 */

export const KEY_POINTS_MIN = 5;
export const KEY_POINTS_MAX = 7;

// Leftovers from a half-filled template read as plausible prose in a language
// most reviewers of this repo do not proofread word by word, so match them.
export const PLACEHOLDER_PATTERN =
  /\{[A-Za-z_]+\}|\bTODO\b|\bTBD\b|\bFIXME\b|\blorem ipsum\b/i;

// Optional search-result copy for the episode page; see SKILL.md for how to write it.
export const SEO_TITLE_SUFFIX = " | Ngobrolin WEB";
export const SEO_TITLE_MIN = 45;
export const SEO_TITLE_MAX = 60;
export const META_DESCRIPTION_MIN = 120;
export const META_DESCRIPTION_MAX = 155;
const STOCK_OPENING = /^(di\s+)?episode\s+ini\b/i;
const DASH = /[\u2013\u2014]/;

export interface SummaryFile {
  videoId?: string;
  generatedAt: string;
  brief: string;
  keyPoints: string[];
  seoTitle?: string;
  metaDescription?: string;
}

/**
 * Exemptions for files that predate a rule. Only the committed-data guard
 * passes these, and only for files it lists by name; a new draft gets none.
 */
export interface LegacyExemptions {
  /** Allow more than KEY_POINTS_MAX key points. */
  overlong?: boolean;
  /** Allow the `videoId` field to be absent. */
  withoutVideoId?: boolean;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Returns every way `summary` breaks the contract for a file named
 * `fileName` (e.g. `Nq3uKguMNCA.json`). An empty array means it conforms.
 */
export function findSummaryProblems(
  summary: unknown,
  fileName: string,
  legacy: LegacyExemptions = {},
): string[] {
  if (typeof summary !== "object" || summary === null || Array.isArray(summary)) {
    return ["the file must hold a JSON object"];
  }

  const problems: string[] = [];
  const record = summary as Record<string, unknown>;
  const expectedId = fileName.replace(/\.json$/, "");

  if (record.videoId === undefined) {
    if (!legacy.withoutVideoId) problems.push("`videoId` is missing");
  } else if (record.videoId !== expectedId) {
    problems.push(
      `\`videoId\` is ${JSON.stringify(record.videoId)} but the filename says ${JSON.stringify(expectedId)}`,
    );
  }

  if (!isNonEmptyString(record.generatedAt)) {
    problems.push("`generatedAt` must be a non-empty string");
  }

  if (!isNonEmptyString(record.brief)) {
    problems.push("`brief` must be a non-empty string");
  } else if (PLACEHOLDER_PATTERN.test(record.brief)) {
    problems.push("`brief` still contains a template placeholder");
  }

  problems.push(...findSeoProblems(record));

  if (!Array.isArray(record.keyPoints)) {
    problems.push("`keyPoints` must be an array");
    return problems;
  }

  const count = record.keyPoints.length;
  if (count < KEY_POINTS_MIN) {
    problems.push(`\`keyPoints\` has ${count} entries; the minimum is ${KEY_POINTS_MIN}`);
  }
  if (count > KEY_POINTS_MAX && !legacy.overlong) {
    problems.push(`\`keyPoints\` has ${count} entries; the maximum is ${KEY_POINTS_MAX}`);
  }

  record.keyPoints.forEach((point, index) => {
    if (!isNonEmptyString(point)) {
      problems.push(`key point ${index + 1} must be a non-empty string`);
    } else if (PLACEHOLDER_PATTERN.test(point)) {
      problems.push(`key point ${index + 1} still contains a template placeholder`);
    }
  });

  return problems;
}

// Both fields are optional: absent is fine, present must be usable as-is,
// because the page prints them with no fallback.
function findSeoProblems(record: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const { seoTitle, metaDescription } = record;

  if (seoTitle !== undefined) {
    if (typeof seoTitle !== "string") {
      problems.push("`seoTitle` must be a string");
    } else {
      const length = [...seoTitle].length;
      if (length < SEO_TITLE_MIN || length > SEO_TITLE_MAX) {
        problems.push(`\`seoTitle\` is ${length} characters; it must be ${SEO_TITLE_MIN}-${SEO_TITLE_MAX}`);
      }
      if (!seoTitle.endsWith(SEO_TITLE_SUFFIX)) {
        problems.push(`\`seoTitle\` must end with "${SEO_TITLE_SUFFIX}"`);
      }
      if (DASH.test(seoTitle)) problems.push("`seoTitle` contains an en or em dash");
    }
  }

  if (metaDescription !== undefined) {
    if (typeof metaDescription !== "string") {
      problems.push("`metaDescription` must be a string");
    } else {
      const length = [...metaDescription].length;
      if (length < META_DESCRIPTION_MIN || length > META_DESCRIPTION_MAX) {
        problems.push(
          `\`metaDescription\` is ${length} characters; it must be ${META_DESCRIPTION_MIN}-${META_DESCRIPTION_MAX}`,
        );
      }
      if (STOCK_OPENING.test(metaDescription)) {
        problems.push("`metaDescription` opens with \"Episode ini\"; lead with the subject");
      }
      if (/(\.\.\.|\u2026)$/.test(metaDescription)) {
        problems.push("`metaDescription` ends in an ellipsis; finish the sentence");
      }
      if (DASH.test(metaDescription)) problems.push("`metaDescription` contains an en or em dash");
    }
  }

  return problems;
}
