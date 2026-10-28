/**
 * Audio-only mode on episode pages (issue #47).
 *
 * The player uses the mp3 the podcast feed already publishes, so it follows the
 * feed's own rule: an episode gets a player only when `audioUrl`,
 * `audioDuration` and `audioFileSize` are all present (see
 * `getPodcastEpisodes()` in `./podcast`). A partial record gets the video, never
 * a player that cannot play. `episode-audio.test.ts` asserts the two sets match.
 *
 * Client behaviour lives in `src/components/EpisodeMedia.astro`. That script is
 * inline (it must run before first paint so a stored "audio" preference does
 * not flash the video), so it cannot import from here and restates
 * `formatClock` and the storage keys; keep them in step.
 */

export const PLAYBACK_RATES = [1, 1.5, 2] as const;

export const MEDIA_MODE_STORAGE_KEY = 'ngobrolin:media-mode';
export const PLAYBACK_RATE_STORAGE_KEY = 'ngobrolin:playback-rate';

export interface EpisodeAudio {
  url: string;
  /** Seconds, from ffprobe at upload time. */
  duration: number;
  /** Bytes. */
  fileSize: number;
}

export function getEpisodeAudio(episode: {
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
}): EpisodeAudio | null {
  const { audioUrl, audioDuration, audioFileSize } = episode;
  if (!audioUrl || !audioDuration || !audioFileSize) return null;

  let url: URL;
  try {
    url = new URL(audioUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  return { url: audioUrl, duration: audioDuration, fileSize: audioFileSize };
}

/** `m:ss` or `h:mm:ss`, the same shape as the transcript timecodes. */
export function formatClock(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Whole megabytes, never "0 MB". */
export function formatFileSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;
}
