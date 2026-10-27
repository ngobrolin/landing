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

export interface SummaryFile {
  videoId?: string;
  generatedAt: string;
  brief: string;
  keyPoints: string[];
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
