export interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptMinute {
  start: number;
  cues: Cue[];
}

export interface OfferedTerm {
  term: string;
  count: number;
}

/**
 * What may sit before a search term. The transcript's inline script cannot
 * import this module, so the component hands it over in a data attribute.
 */
export const TERM_BOUNDARY = '(^|[^\\p{L}\\p{N}])';

const MIN_TERM_LENGTH = 4;
const MIN_MENTIONS = 3;
const MAX_TERMS = 8;
const MAX_DECK_LENGTH = 220;

// Capitalised mid-sentence in a summary without naming anything a reader would search for.
const NOT_A_TERM = new Set([
  'ngobrolin', 'episode', 'host', 'para', 'web', 'indonesia', 'bahasa', 'selasa',
  'menurut', 'mereka', 'salah', 'untuk', 'dalam', 'dengan', 'tidak', 'yang',
  // The hosts are in every episode, so their names find nothing in particular.
  'riza', 'fahmi', 'ivan',
]);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Starts-with on a word, so "Deno" finds "Denonya" but "bun" never finds "bergabung". */
export function termPattern(term: string): RegExp {
  return new RegExp(TERM_BOUNDARY + escapeRegExp(term.trim()), 'iu');
}

/** Whisper loops repeat one line for hundreds of cues; a run is shown once. */
export function dropRepeatedCues<T extends Cue>(cues: T[]): T[] {
  return cues.filter((cue, index) => index === 0 || cue.text.trim() !== cues[index - 1].text.trim());
}

export function groupByMinute(cues: Cue[]): TranscriptMinute[] {
  const minutes: TranscriptMinute[] = [];
  for (const cue of cues) {
    const minute = Math.floor(cue.start / 60);
    const last = minutes[minutes.length - 1];
    if (last && Math.floor(last.start / 60) === minute) last.cues.push(cue);
    else minutes.push({ start: cue.start, cues: [cue] });
  }
  return minutes;
}

/** Jump points every ten minutes, from the top to the last one the episode reaches. */
export function timeMarks(duration: number, step = 600): number[] {
  const marks: number[] = [];
  for (let at = 0; at < duration; at += step) marks.push(at);
  return marks;
}

/**
 * Indexes of the cues that mention a term. A cue right after another match is
 * the same moment, so it is not counted again.
 */
export function findMentions(cues: Cue[], term: string): number[] {
  const pattern = termPattern(term);
  const found: number[] = [];
  let previous = -2;
  cues.forEach((cue, index) => {
    if (!pattern.test(cue.text)) return;
    if (index !== previous + 1) found.push(index);
    previous = index;
  });
  return found;
}

/**
 * Names and terms a summary uses: anything capitalised mid-sentence. Tags and
 * title words stay out; one is a broad topic, the other is often plain prose.
 */
export function termCandidates(source: { keyPoints?: string[]; brief?: string }): string[] {
  const seen = new Map<string, string>();
  const add = (raw: string) => {
    const term = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}+#]+$/gu, '');
    const key = term.toLowerCase();
    if (term.length < MIN_TERM_LENGTH || NOT_A_TERM.has(key) || seen.has(key)) return;
    seen.set(key, term);
  };

  const prose = [...(source.keyPoints ?? []), source.brief ?? ''].join('\n');
  for (const sentence of prose.split(/(?<=[.!?;:])\s+|\n+/)) {
    sentence
      .split(/\s+/)
      .slice(1)
      .filter((word) => /^["“(]?\p{Lu}/u.test(word))
      .forEach(add);
  }
  return [...seen.values()];
}

/** The candidates the transcript really contains, most mentioned first. */
export function offeredTerms(cues: Cue[], candidates: string[]): OfferedTerm[] {
  return candidates
    .map((term) => ({ term, count: findMentions(cues, term).length }))
    .filter(({ count }) => count >= MIN_MENTIONS)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TERMS);
}

/** The brief's first sentence, or nothing when it runs too long to sit under a title. */
export function getDeck(brief: string | undefined): string | null {
  if (!brief) return null;
  const match = brief.trim().match(/^.+?[.!?](?=\s+["“]?\p{Lu}|\s*$)/su);
  const sentence = (match ? match[0] : '').trim();
  if (!sentence || sentence.length > MAX_DECK_LENGTH || sentence.includes('\n')) return null;
  return sentence;
}
