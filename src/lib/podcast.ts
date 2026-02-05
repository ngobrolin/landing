import episodesData from "../data/episodes.json";
import { slugify } from "./episodes";
import { getSummary } from "./seo";

export interface PodcastEpisode {
  title: string;
  description: string;
  publishedAt: string;
  audioUrl: string;
  audioDuration: number;
  audioFileSize: number;
  episodeNumber: number;
  slug: string;
  videoId: string;
}

export interface PodcastMetadata {
  title: string;
  description: string;
  author: string;
  email: string;
  siteUrl: string;
  feedUrl: string;
  imageUrl: string;
  language: string;
  category: string;
  explicit: boolean;
}

interface RawEpisode {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  position: number;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
}

export function formatPodcastDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const EPISODE_DESCRIPTION_SUFFIX =
  "\n\nKunjungi https://ngobrol.in untuk skrip, rangkuman, tautan dan informasi menarik lainnya.";

export function getPodcastEpisodes(): PodcastEpisode[] {
  const rawEpisodes = episodesData as RawEpisode[];

  return rawEpisodes
    .filter(
      (ep): ep is RawEpisode & { audioUrl: string; audioDuration: number; audioFileSize: number } =>
        !!ep.audioUrl && !!ep.audioDuration && !!ep.audioFileSize
    )
    .map((ep) => {
      const summary = getSummary(ep.videoId);
      return {
        title: ep.title,
        description: (summary?.brief || ep.description) + EPISODE_DESCRIPTION_SUFFIX,
        publishedAt: ep.publishedAt,
        audioUrl: ep.audioUrl,
        audioDuration: ep.audioDuration,
        audioFileSize: ep.audioFileSize,
        slug: `${ep.videoId}-${slugify(ep.title)}`,
        videoId: ep.videoId,
        episodeNumber: 0,
      };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map((ep, idx, arr) => ({
      ...ep,
      episodeNumber: arr.length - idx,
    }));
}

export function generatePodcastRssXml(
  metadata: PodcastMetadata,
  episodes: PodcastEpisode[]
): string {
  const items = episodes
    .map(
      (ep) => `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description)}</description>
      <pubDate>${new Date(ep.publishedAt).toUTCString()}</pubDate>
      <link>${metadata.siteUrl}/episodes/${ep.slug}</link>
      <guid isPermaLink="false">${ep.videoId}</guid>
      <enclosure url="${ep.audioUrl}" length="${ep.audioFileSize}" type="audio/mpeg"/>
      <itunes:duration>${formatPodcastDuration(ep.audioDuration)}</itunes:duration>
      <itunes:episode>${ep.episodeNumber}</itunes:episode>
      <itunes:explicit>${metadata.explicit ? "yes" : "no"}</itunes:explicit>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(metadata.title)}</title>
    <description>${escapeXml(metadata.description)}</description>
    <link>${metadata.siteUrl}</link>
    <language>${metadata.language}</language>
    <atom:link href="${metadata.feedUrl}" rel="self" type="application/rss+xml"/>
    <itunes:author>${escapeXml(metadata.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(metadata.author)}</itunes:name>
      <itunes:email>${metadata.email}</itunes:email>
    </itunes:owner>
    <itunes:image href="${metadata.imageUrl}"/>
    <itunes:category text="${escapeXml(metadata.category)}"/>
    <itunes:explicit>${metadata.explicit ? "yes" : "no"}</itunes:explicit>
    <image>
      <url>${metadata.imageUrl}</url>
      <title>${escapeXml(metadata.title)}</title>
      <link>${metadata.siteUrl}</link>
    </image>
${items}
  </channel>
</rss>`;
}
