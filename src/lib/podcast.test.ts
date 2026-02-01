import { describe, it, expect } from "vitest";
import {
  formatPodcastDuration,
  getPodcastEpisodes,
  generatePodcastRssXml,
  type PodcastEpisode,
  type PodcastMetadata,
} from "./podcast";

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
