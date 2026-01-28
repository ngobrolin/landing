import type { Episode } from './episodes';

interface Summary {
  brief: string;
  keyPoints: string[];
}

interface Transcript {
  fullText: string;
}

export function getSummary(videoId: string): Summary | null {
  try {
    const summaries = import.meta.glob('../data/summaries/*.json', { eager: true });
    const key = `../data/summaries/${videoId}.json`;
    if (summaries[key]) {
      return summaries[key] as Summary;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getTranscript(videoId: string): Transcript | null {
  try {
    const transcripts = import.meta.glob('../data/transcripts/*.json', { eager: true });
    const key = `../data/transcripts/${videoId}.json`;
    if (transcripts[key]) {
      return transcripts[key] as Transcript;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getMetaDescription(episode: Episode, summary: Summary | null): string {
  if (summary?.brief) {
    // Use first paragraph of summary, truncated to ~160 chars
    const firstParagraph = summary.brief.split('\n')[0];
    return firstParagraph.length > 160 
      ? firstParagraph.slice(0, 157) + '...'
      : firstParagraph;
  }
  // Fallback to episode description, truncated
  const desc = episode.description.replace(/\n/g, ' ');
  return desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
}

export function generateVideoSchema(
  episode: Episode,
  summary: Summary | null,
  transcript: Transcript | null,
  siteUrl: string
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: episode.title,
    description: summary?.brief || episode.description,
    thumbnailUrl: episode.thumbnail,
    uploadDate: episode.publishedAt.split('T')[0],
    embedUrl: `https://www.youtube.com/embed/${episode.videoId}`,
    contentUrl: `https://www.youtube.com/watch?v=${episode.videoId}`,
    publisher: {
      '@type': 'Organization',
      name: 'Ngobrolin WEB',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/favicon.svg`
      }
    }
  };

  if (transcript?.fullText) {
    schema.transcript = transcript.fullText;
  }

  return schema;
}

export function generateBreadcrumbSchema(
  episode: Episode,
  siteUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Episodes',
        item: `${siteUrl}/episodes`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `EP ${episode.episodeNumber}`,
        item: `${siteUrl}/episodes/${episode.slug}`
      }
    ]
  };
}

export function generatePodcastEpisodeSchema(
  episode: Episode,
  summary: Summary | null,
  siteUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: episode.title,
    description: summary?.brief || episode.description,
    datePublished: episode.publishedAt,
    episodeNumber: episode.episodeNumber,
    url: `${siteUrl}/episodes/${episode.slug}`,
    associatedMedia: {
      '@type': 'VideoObject',
      embedUrl: `https://www.youtube.com/embed/${episode.videoId}`
    },
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: 'Ngobrolin WEB',
      url: siteUrl
    }
  };
}
