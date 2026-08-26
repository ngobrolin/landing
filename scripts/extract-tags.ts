/**
 * Extract tags from episode summaries.
 *
 * Usage:
 *   npx tsx scripts/extract-tags.ts
 *
 * The matching rule lives in scripts/lib/tag-extraction.ts, where it is tested.
 * It is word-boundary based: bare substring matching against Indonesian prose
 * tagged every summarised episode as "ai" (mulai, berbagai, sebagai, sesuai...).
 *
 * Output is a full REPLACEMENT of src/data/tags.json. See the note on merging
 * below before changing that.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractTags } from './lib/tag-extraction';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Summary {
  videoId?: string;
  brief: string;
  keyPoints: string[];
}

interface TagsData {
  [videoId: string]: string[];
}

async function main() {
  const summariesDir = path.join(__dirname, '../src/data/summaries');
  const outputPath = path.join(__dirname, '../src/data/tags.json');

  if (!fs.existsSync(summariesDir)) {
    console.error('Error: summaries directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(summariesDir).filter((f) => f.endsWith('.json'));
  const tagsData: TagsData = {};

  console.log(`Processing ${files.length} summaries...`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(summariesDir, file), 'utf-8');
    const summary: Summary = JSON.parse(content);

    // The filename is the authoritative videoId. One real summary file has no
    // videoId field, and reading it blindly wrote a literal "undefined" key
    // into tags.json - a phantom episode whose 8 tags inflated 8 tag counts
    // and made /tags report 98 tagged episodes when only 97 were real.
    const videoId = summary.videoId ?? path.basename(file, '.json');
    if (!summary.videoId) {
      console.warn(`  ! ${file} has no videoId field; using the filename`);
    }

    const tags = extractTags(`${summary.brief} ${(summary.keyPoints ?? []).join(' ')}`);
    tagsData[videoId] = tags;

    console.log(`  ${videoId}: ${tags.join(', ') || '(no tags)'}`);
  }

  // Deliberately a replacement, not a merge.
  //
  // This used to union the new tags with whatever was already in the file, to
  // "preserve manual edits". The effect was that a tag could be added but never
  // removed, so every false positive the old substring matcher ever produced
  // was permanent - and fixing the matcher would have changed nothing at all.
  //
  // tags.json is fully derived: it was verified byte-for-byte against the
  // extractor's own output, with no manual edits present. If hand-tuned tags
  // are ever wanted, they need their own file that this one is merged WITH, not
  // an accumulating output file that can only grow.
  const sorted: TagsData = {};
  for (const videoId of Object.keys(tagsData).sort()) {
    sorted[videoId] = tagsData[videoId];
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`\n✓ Saved ${Object.keys(sorted).length} entries to src/data/tags.json`);
}

main();
