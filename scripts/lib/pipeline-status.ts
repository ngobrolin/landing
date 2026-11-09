/**
 * Per-video stage inventory for the episode-pipeline skill: transcript, summary
 * and podcast audio for every record in episodes.json, plus states that are
 * never valid. Read-only by construction; nothing here writes.
 *
 * Missing work (no transcript, no summary, no audio) is a normal state after a
 * sync and is reported, not failed. `problems` holds only states that must not
 * exist: a duplicate or slugless record, partial audio (the feed drops it with
 * no error), a file for a video that is not an episode, an unreadable file.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type AudioStage = "complete" | "partial" | "none";

export interface StageRow {
  videoId: string;
  slug: string | null;
  transcript: boolean;
  summary: boolean;
  audio: AudioStage;
}

export interface PipelineInputs {
  episodes: unknown;
  transcriptIds: ReadonlySet<string>;
  summaryIds: ReadonlySet<string>;
  /** Paths relative to the data dir that are empty or not valid JSON. */
  unreadable: string[];
}

export interface PipelineStatus {
  episodes: number;
  absentFromPlaylist: string[];
  needTranscript: string[];
  needSummary: string[];
  audioMissing: string[];
  audioPartial: string[];
  problems: string[];
  rows: StageRow[];
}

interface RawEpisode {
  videoId?: unknown;
  slug?: unknown;
  audioUrl?: unknown;
  audioDuration?: unknown;
  audioFileSize?: unknown;
  absentFromPlaylistSince?: unknown;
}

// Same inclusion rule as getPodcastEpisodes() in src/lib/podcast.ts.
function audioStage(ep: RawEpisode): AudioStage {
  const present = [ep.audioUrl, ep.audioDuration, ep.audioFileSize].filter(Boolean).length;
  return present === 3 ? "complete" : present === 0 ? "none" : "partial";
}

const duplicates = (values: string[]) =>
  [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];

export function computePipelineStatus(inputs: PipelineInputs): PipelineStatus {
  const problems = inputs.unreadable.map((file) => `unreadable file: ${file}`);
  const raw: unknown[] = Array.isArray(inputs.episodes) ? inputs.episodes : [];
  if (!Array.isArray(inputs.episodes)) problems.push("episodes.json is not an array");
  else if (raw.length === 0) problems.push("episodes.json has no episodes");

  // IDs are compared exactly as stored; coercing 123 to "123" would hide a bad record.
  const list: (RawEpisode & { videoId: string })[] = [];
  raw.forEach((ep, i) => {
    if (typeof ep !== "object" || ep === null || Array.isArray(ep)) {
      problems.push(`row ${i} is not an object`);
    } else if ((ep as RawEpisode).videoId === undefined || (ep as RawEpisode).videoId === "") {
      problems.push(`row ${i} has no videoId`);
    } else if (typeof (ep as RawEpisode).videoId !== "string") {
      problems.push(`row ${i} has a non-string videoId`);
    } else {
      list.push(ep as RawEpisode & { videoId: string });
    }
  });

  const rows: StageRow[] = list.map((ep) => {
    const videoId = ep.videoId;
    return {
      videoId,
      slug: typeof ep.slug === "string" && ep.slug ? ep.slug : null,
      transcript: inputs.transcriptIds.has(videoId),
      summary: inputs.summaryIds.has(videoId),
      audio: audioStage(ep),
    };
  });

  const ids = rows.map((r) => r.videoId);
  const known = new Set(ids);
  for (const id of duplicates(ids)) problems.push(`duplicate videoId: ${id}`);
  for (const slug of duplicates(rows.flatMap((r) => (r.slug ? [r.slug] : []))))
    problems.push(`duplicate slug: ${slug}`);
  for (const r of rows.filter((r) => !r.slug)) problems.push(`record with no slug: ${r.videoId}`);

  const audioPartial = rows.filter((r) => r.audio === "partial").map((r) => r.videoId);
  for (const id of audioPartial) problems.push(`partial audio metadata: ${id}`);
  for (const id of inputs.summaryIds) if (!known.has(id)) problems.push(`orphan summary: ${id}`);
  for (const id of inputs.transcriptIds) if (!known.has(id)) problems.push(`orphan transcript: ${id}`);

  return {
    episodes: rows.length,
    absentFromPlaylist: list.filter((ep) => ep.absentFromPlaylistSince).map((ep) => ep.videoId),
    needTranscript: rows.filter((r) => !r.transcript).map((r) => r.videoId),
    needSummary: rows.filter((r) => r.transcript && !r.summary).map((r) => r.videoId),
    audioMissing: rows.filter((r) => r.audio === "none").map((r) => r.videoId),
    audioPartial,
    problems,
    rows,
  };
}

function parseFile(file: string): { ok: true; value: unknown } | { ok: false } {
  try {
    const text = readFileSync(file, "utf-8");
    return text.trim() ? { ok: true, value: JSON.parse(text) } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Read src/data (or a fixture shaped like it) without writing anything. */
export function readPipelineInputs(dataDir: string): PipelineInputs {
  const unreadable: string[] = [];
  const episodesFile = parseFile(path.join(dataDir, "episodes.json"));
  if (!episodesFile.ok) unreadable.push("episodes.json");

  const idsIn = (sub: string) => {
    const dir = path.join(dataDir, sub);
    const ids = new Set<string>();
    if (!existsSync(dir)) return ids;
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      if (!parseFile(path.join(dir, name)).ok) unreadable.push(`${sub}/${name}`);
      ids.add(name.replace(/\.json$/, ""));
    }
    return ids;
  };

  return {
    episodes: episodesFile.ok ? episodesFile.value : [],
    transcriptIds: idsIn("transcripts"),
    summaryIds: idsIn("summaries"),
    unreadable,
  };
}
