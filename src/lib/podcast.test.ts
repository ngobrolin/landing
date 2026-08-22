import { describe, it, expect } from "vitest";
import {
  formatPodcastDuration,
  getPodcastEpisodes,
  generatePodcastRssXml,
  type PodcastEpisode,
  type PodcastMetadata,
} from "./podcast";
import episodesData from "../data/episodes.json";

describe("formatPodcastDuration", () => {
  it("formats seconds to HH:MM:SS", () => {
    expect(formatPodcastDuration(3661)).toBe("01:01:01");
  });

  it("formats short duration", () => {
    expect(formatPodcastDuration(125)).toBe("00:02:05");
  });

  it("handles zero", () => {
    expect(formatPodcastDuration(0)).toBe("00:00:00");
  });

  it("handles long duration", () => {
    expect(formatPodcastDuration(7200)).toBe("02:00:00");
  });
});

describe("getPodcastEpisodes", () => {
  it("returns only episodes with audioUrl", () => {
    const episodes = getPodcastEpisodes();
    episodes.forEach((ep) => {
      expect(ep.audioUrl).toBeDefined();
      expect(ep.audioUrl).toContain("http");
    });
  });

  it("includes required podcast fields", () => {
    const episodes = getPodcastEpisodes();
    if (episodes.length > 0) {
      const ep = episodes[0];
      expect(ep).toHaveProperty("title");
      expect(ep).toHaveProperty("description");
      expect(ep).toHaveProperty("publishedAt");
      expect(ep).toHaveProperty("audioUrl");
      expect(ep).toHaveProperty("audioDuration");
      expect(ep).toHaveProperty("audioFileSize");
    }
  });
});

describe("generatePodcastRssXml", () => {
  const mockMetadata: PodcastMetadata = {
    title: "Test Podcast",
    description: "A test podcast",
    author: "Test Author",
    email: "test@example.com",
    siteUrl: "https://example.com",
    feedUrl: "https://example.com/podcast-rss.xml",
    imageUrl: "https://example.com/cover.jpg",
    language: "id",
    category: "Technology",
    explicit: false,
  };

  const mockEpisodes: PodcastEpisode[] = [
    {
      title: "Episode 1",
      description: "First episode",
      publishedAt: "2025-01-01T00:00:00Z",
      audioUrl: "https://example.com/ep1.mp3",
      audioDuration: 3600,
      audioFileSize: 50000000,
      episodeNumber: 1,
      slug: "ep1-episode-1",
      videoId: "abc123",
    },
  ];

  it("generates valid XML", () => {
    const xml = generatePodcastRssXml(mockMetadata, mockEpisodes);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<rss");
    expect(xml).toContain("</rss>");
  });

  it("includes podcast metadata", () => {
    const xml = generatePodcastRssXml(mockMetadata, mockEpisodes);
    expect(xml).toContain("<title>Test Podcast</title>");
    expect(xml).toContain("<itunes:author>Test Author</itunes:author>");
    expect(xml).toContain("<language>id</language>");
  });

  it("includes iTunes namespace", () => {
    const xml = generatePodcastRssXml(mockMetadata, mockEpisodes);
    expect(xml).toContain("xmlns:itunes=");
    expect(xml).toContain("xmlns:content=");
  });

  it("includes episode enclosure with correct attributes", () => {
    const xml = generatePodcastRssXml(mockMetadata, mockEpisodes);
    expect(xml).toContain('url="https://example.com/ep1.mp3"');
    expect(xml).toContain('length="50000000"');
    expect(xml).toContain('type="audio/mpeg"');
  });

  it("includes episode duration in iTunes format", () => {
    const xml = generatePodcastRssXml(mockMetadata, mockEpisodes);
    expect(xml).toContain("<itunes:duration>01:00:00</itunes:duration>");
  });

  it("includes episode guid", () => {
    const xml = generatePodcastRssXml(mockMetadata, mockEpisodes);
    expect(xml).toContain("<guid");
    expect(xml).toContain("abc123");
  });

  it("escapes XML special characters in content", () => {
    const episodesWithSpecialChars: PodcastEpisode[] = [
      {
        ...mockEpisodes[0],
        title: "Episode with <special> & \"chars\"",
        description: "Description with <tags> & ampersands",
      },
    ];
    const xml = generatePodcastRssXml(mockMetadata, episodesWithSpecialChars);
    expect(xml).toContain("&lt;special&gt;");
    expect(xml).toContain("&amp;");
  });

  it("returns empty items when no episodes", () => {
    const xml = generatePodcastRssXml(mockMetadata, []);
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});

describe("audio data integrity (regression: episodes silently missing from feed)", () => {
  const rawEpisodes = episodesData as Array<{
    videoId: string;
    title: string;
    audioUrl?: string;
    audioDuration?: number;
    audioFileSize?: number;
  }>;

  const withAudioUrl = rawEpisodes.filter((ep) => ep.audioUrl);

  it("every episode with an audioUrl has complete, well-formed audio fields", () => {
    // getPodcastEpisodes() requires audioUrl, audioDuration AND audioFileSize to
    // all be truthy. A partially-filled entry is dropped from the podcast feed
    // silently -- no error, just a missing episode. Guard the whole shape.
    const malformed = withAudioUrl.filter(
      (ep) =>
        !/^https:\/\/\S+\.mp3$/.test(ep.audioUrl!) ||
        typeof ep.audioDuration !== "number" ||
        !Number.isInteger(ep.audioDuration) ||
        ep.audioDuration <= 0 ||
        typeof ep.audioFileSize !== "number" ||
        !Number.isInteger(ep.audioFileSize) ||
        ep.audioFileSize <= 0
    );

    expect(
      malformed.map((ep) => `${ep.videoId}: ${JSON.stringify(ep.audioUrl)} / ${ep.audioDuration} / ${ep.audioFileSize}`)
    ).toEqual([]);
  });

  it("has audio for every episode except the knowingly-exempt ones", () => {
    // The podcast feed silently omits any episode lacking audio, which is how
    // 10 episodes went missing for three months. Pin the gap explicitly so a
    // future episode losing audio fails here instead of vanishing quietly.
    //
    // qei6_h3wwPY ("Model Context Protocol", published 2026-08-19) arrived via
    // the playlist sync without audio. Backfilling it is deliberately tracked
    // separately; it is knowingly absent from the podcast feed, not forgotten.
    const KNOWN_WITHOUT_AUDIO = ["qei6_h3wwPY"];

    const withoutAudio = rawEpisodes.filter((ep) => !ep.audioUrl).map((ep) => ep.videoId);

    expect(withoutAudio.sort()).toEqual([...KNOWN_WITHOUT_AUDIO].sort());
    expect(withAudioUrl).toHaveLength(rawEpisodes.length - KNOWN_WITHOUT_AUDIO.length);
  });

  it("exposes every episode with an audioUrl in the podcast feed", () => {
    const feedVideoIds = new Set(getPodcastEpisodes().map((ep) => ep.videoId));
    const dropped = withAudioUrl
      .filter((ep) => !feedVideoIds.has(ep.videoId))
      .map((ep) => ep.videoId);

    expect(dropped).toEqual([]);
  });

  it("renders a well-formed enclosure for every episode with an audioUrl", () => {
    const episodes = getPodcastEpisodes();
    const metadata: PodcastMetadata = {
      title: "Ngobrolin WEB",
      description: "Podcast",
      author: "Riza Fahmi",
      email: "test@example.com",
      siteUrl: "https://ngobrol.in",
      feedUrl: "https://ngobrol.in/podcast-rss.xml",
      imageUrl: "https://ngobrol.in/cover.jpg",
      language: "id",
      category: "Technology",
      explicit: false,
    };
    const xml = generatePodcastRssXml(metadata, episodes);

    const enclosures = [...xml.matchAll(/<enclosure url="([^"]+)" length="([^"]+)" type="([^"]+)"\/>/g)];

    expect(enclosures).toHaveLength(withAudioUrl.length);

    enclosures.forEach(([, url, length, type]) => {
      expect(url).toMatch(/^https:\/\/\S+\.mp3$/);
      expect(Number(length)).toBeGreaterThan(0);
      expect(type).toBe("audio/mpeg");
    });
  });

  it("audio file size is consistent with duration at the pipeline's 128kbps mono bitrate", () => {
    // extract-audio.ts encodes -ab 128k mono => 16000 bytes/sec. A wildly
    // different ratio means a truncated upload or a mismatched file.
    withAudioUrl.forEach((ep) => {
      const bytesPerSecond = ep.audioFileSize! / ep.audioDuration!;
      expect(bytesPerSecond).toBeGreaterThan(14000);
      expect(bytesPerSecond).toBeLessThan(18000);
    });
  });
});
