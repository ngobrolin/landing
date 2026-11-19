/**
 * Text edits behind scripts/stamp-updated.ts. They change only `updatedAt` (plus a comma
 * when it becomes the last property), so a stamp never shows up as a reformat in review.
 */

import { isDeepStrictEqual } from "node:util";

/** UTC to the second, the shape the summaries already use for generatedAt. */
export function formatStamp(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000Z", "Z");
}

const UPDATED_AT_LINE = /^([ \t]+)"updatedAt": "[^"]*"(,?)$/m;
const GENERATED_AT_LINE = /^([ \t]+)"generatedAt": "[^"]*"(,?)$/m;

/** Sets the top-level `updatedAt` of a pretty-printed summary to `stamp`, inserting it after `generatedAt`. */
export function setUpdatedAt(text: string, stamp: string): string {
  const before = JSON.parse(text);
  let out: string;
  if (before.updatedAt !== undefined) {
    if (!UPDATED_AT_LINE.test(text)) throw new Error("cannot find the `updatedAt` line to replace");
    out = text.replace(UPDATED_AT_LINE, (_, indent, comma) => `${indent}"updatedAt": "${stamp}"${comma}`);
  } else {
    if (!GENERATED_AT_LINE.test(text)) throw new Error("cannot find a `generatedAt` line to insert after");
    out = text.replace(GENERATED_AT_LINE, (line, indent, comma) =>
      comma ? `${line}\n${indent}"updatedAt": "${stamp}",` : `${line},\n${indent}"updatedAt": "${stamp}"`,
    );
  }

  // The regexes are anchored to whole lines, but a nested key could still match; prove it did not.
  if (!isDeepStrictEqual(JSON.parse(out), { ...before, updatedAt: stamp })) {
    throw new Error("the edit changed more than `updatedAt`");
  }
  return out;
}
