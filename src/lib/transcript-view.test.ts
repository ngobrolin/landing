import { describe, expect, it } from 'vitest';
import {
  dropRepeatedCues,
  findMentions,
  getDeck,
  groupByMinute,
  offeredTerms,
  termCandidates,
  termPattern,
  timeMarks,
} from './transcript-view';

const cue = (start: number, text: string) => ({ start, end: start + 2, text });

describe('termPattern', () => {
  it('matches a word and its suffixed forms', () => {
    expect(termPattern('Deno').test('jadi Denonya gimana')).toBe(true);
    expect(termPattern('deno').test('Deno itu bergabung')).toBe(true);
  });

  it('never matches inside another word', () => {
    expect(termPattern('bun').test('tim Deno bergabung')).toBe(false);
    expect(termPattern('ai').test('mulai dari berbagai sisi')).toBe(false);
  });

  it('treats regex characters in a term as text', () => {
    expect(termPattern('Next.js').test('pakai NextXjs')).toBe(false);
    expect(termPattern('C++').test('belajar C++ dulu')).toBe(true);
  });
});

describe('dropRepeatedCues', () => {
  it('keeps one cue from a run of identical lines', () => {
    const cues = [cue(0, 'halo'), cue(2, 'iya'), cue(4, 'iya '), cue(6, 'iya'), cue(8, 'halo')];
    expect(dropRepeatedCues(cues).map((c) => c.start)).toEqual([0, 2, 8]);
  });
});

describe('groupByMinute', () => {
  it('puts cues from the same minute in one paragraph', () => {
    const minutes = groupByMinute([cue(1, 'a'), cue(58, 'b'), cue(61, 'c'), cue(185, 'd')]);
    expect(minutes.map((m) => [m.start, m.cues.length])).toEqual([[1, 2], [61, 1], [185, 1]]);
  });
});

describe('timeMarks', () => {
  it('marks every ten minutes the episode reaches', () => {
    expect(timeMarks(1500)).toEqual([0, 600, 1200]);
    expect(timeMarks(0)).toEqual([]);
  });
});

describe('findMentions', () => {
  it('counts neighbouring cues as one moment', () => {
    const cues = [cue(0, 'Deno baru'), cue(2, 'soal Deno'), cue(4, 'lain'), cue(6, 'Deno lagi')];
    expect(findMentions(cues, 'Deno')).toEqual([0, 3]);
  });
});

describe('termCandidates', () => {
  it('collects names used mid-sentence, not the word that opens a sentence', () => {
    const terms = termCandidates({
      keyPoints: ['Menurut tulisan Cloudflare, Durable Objects adalah solusi yang dicari Ryan Dahl.'],
      brief: 'Para host Ngobrolin WEB membahas Deno.',
    });
    expect(terms).toEqual(['Cloudflare', 'Durable', 'Objects', 'Ryan', 'Dahl', 'Deno']);
  });

  it('leaves out terms too short to search without noise', () => {
    expect(termCandidates({ keyPoints: ['Runtime seperti Bun dan JSR tetap ada.'] })).toEqual([]);
  });
});

describe('offeredTerms', () => {
  it('offers only terms the transcript mentions enough, with the count a search returns', () => {
    const cues = [cue(0, 'Deno'), cue(10, 'x'), cue(20, 'Deno'), cue(30, 'x'), cue(40, 'Deno'), cue(50, 'Fresh')];
    const offered = offeredTerms(cues, ['Deno', 'Fresh', 'Cloudflare']);
    expect(offered).toEqual([{ term: 'Deno', count: 3 }]);
    expect(offered[0].count).toBe(findMentions(cues, 'Deno').length);
  });
});

describe('getDeck', () => {
  it('returns the first sentence of the brief', () => {
    expect(getDeck('Para host membahas Deno. Mereka juga membahas Node.js dan Bun.')).toBe('Para host membahas Deno.');
  });

  it('does not stop at a dot inside a name', () => {
    expect(getDeck('Episode ini membahas Node.js dan Next.js bersama. Lalu Bun.')).toBe(
      'Episode ini membahas Node.js dan Next.js bersama.',
    );
  });

  it('returns nothing when there is no brief or the sentence is too long for a deck', () => {
    expect(getDeck(undefined)).toBeNull();
    expect(getDeck(`${'kata '.repeat(60)}selesai.`)).toBeNull();
  });
});
