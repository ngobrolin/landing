import { describe, it, expect } from 'vitest';
import {
  getEpisodeAudio,
  formatClock,
  formatFileSize,
  PLAYBACK_RATES,
  MEDIA_MODE_STORAGE_KEY,
  PLAYBACK_RATE_STORAGE_KEY,
} from './episode-audio';
import { getEpisodes } from './episodes';
import { getPodcastEpisodes } from './podcast';

const complete = {
  audioUrl: 'https://ngobrolinweb-podcast.s3.ap-southeast-1.amazonaws.com/audio/abc.mp3',
  audioDuration: 5100,
  audioFileSize: 81_600_000,
};

describe('getEpisodeAudio', () => {
  it('returns the stored audio when url, duration and size are all present', () => {
    expect(getEpisodeAudio(complete)).toEqual({
      url: complete.audioUrl,
      duration: 5100,
      fileSize: 81_600_000,
    });
  });

  it('returns null when any of the three fields is missing or empty', () => {
    expect(getEpisodeAudio({})).toBeNull();
    expect(getEpisodeAudio({ ...complete, audioUrl: '' })).toBeNull();
    expect(getEpisodeAudio({ ...complete, audioDuration: 0 })).toBeNull();
    expect(getEpisodeAudio({ ...complete, audioFileSize: undefined })).toBeNull();
  });

  it('refuses a non-https url rather than render a mixed-content or script url', () => {
    expect(getEpisodeAudio({ ...complete, audioUrl: 'http://example.com/a.mp3' })).toBeNull();
    expect(getEpisodeAudio({ ...complete, audioUrl: 'javascript:alert(1)' })).toBeNull();
    expect(getEpisodeAudio({ ...complete, audioUrl: 'not a url' })).toBeNull();
  });

  // An invariant, not a snapshot: whatever the sync adds, an episode the
  // podcast feed carries must get a player on its page, and one the feed
  // drops must not get a broken one.
  it('offers a player on exactly the episodes the podcast feed carries', () => {
    const withPlayer = getEpisodes()
      .filter((ep) => getEpisodeAudio(ep) !== null)
      .map((ep) => ep.videoId)
      .sort();
    const inFeed = getPodcastEpisodes()
      .map((ep) => ep.videoId)
      .sort();
    expect(withPlayer).toEqual(inFeed);
  });
});

describe('formatClock', () => {
  it('matches the transcript timecode format', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(5103.9)).toBe('1:25:03');
  });

  it('treats a non-finite or negative value as zero', () => {
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(Infinity)).toBe('0:00');
    expect(formatClock(-4)).toBe('0:00');
  });
});

describe('formatFileSize', () => {
  it('rounds to whole megabytes', () => {
    expect(formatFileSize(87_919_847)).toBe('88 MB');
    expect(formatFileSize(400_000)).toBe('1 MB');
  });
});

describe('player settings', () => {
  it('offers exactly the speeds the issue asks for, 1x first', () => {
    expect([...PLAYBACK_RATES]).toEqual([1, 1.5, 2]);
  });

  it('namespaces its storage keys', () => {
    expect(MEDIA_MODE_STORAGE_KEY).toMatch(/^ngobrolin:/);
    expect(PLAYBACK_RATE_STORAGE_KEY).toMatch(/^ngobrolin:/);
    expect(MEDIA_MODE_STORAGE_KEY).not.toBe(PLAYBACK_RATE_STORAGE_KEY);
  });
});
