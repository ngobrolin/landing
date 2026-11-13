import type { Episode } from './episodes';
import { getDisplayTitle } from './episode-title';

/** Canonical episode URL. Pages are served with a trailing slash, so anything else 308s. */
export function episodeUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/$/, '')}/episodes/${slug}/`;
}

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

// Title composition lives in episode-title.ts so the data layer can use it
// too without importing this module. Re-exported for existing callers.
export { SITE_NAME, buildEpisodePageTitle, getDisplayTitle } from './episode-title';

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
  // No contentUrl: Google reads it as the media file, and a YouTube watch page is not one.
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${episodeUrl(siteUrl, episode.slug)}#video`,
    name: episode.title,
    description: summary?.brief || episode.description,
    thumbnailUrl: episode.thumbnail,
    uploadDate: episode.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${episode.videoId}`,
    publisher: { '@id': `${siteUrl}/#organization` }
  };

  // Add duration if available
  if (episode.duration) {
    schema.duration = episode.duration;
  }

  // The transcript stays in the visible page only; inlining it here added 50-60 KB per episode.
  void transcript;

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
        name: 'Beranda',
        item: `${siteUrl}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Episode',
        item: `${siteUrl}/episodes/`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: getDisplayTitle(episode.title),
        item: episodeUrl(siteUrl, episode.slug)
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
    url: episodeUrl(siteUrl, episode.slug),
    // Points at the VideoObject emitted beside it, so the page declares one video, not two.
    associatedMedia: { '@id': `${episodeUrl(siteUrl, episode.slug)}#video` },
    // Named inline as well: the full #podcast node is only emitted on the homepage.
    partOfSeries: {
      '@type': 'PodcastSeries',
      '@id': `${siteUrl}/#podcast`,
      name: 'Ngobrolin WEB',
      url: `${siteUrl}/`
    }
  };
}

export function generateHomepageSchema(siteUrl: string, episodeCount: number) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      // Same @ids as the site graph in Layout.astro, so these extend those nodes instead of
      // declaring a second, conflicting site and organisation.
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        'name': 'Ngobrolin WEB',
        'url': siteUrl,
        'description': 'Video podcast mingguan seputar web development dalam Bahasa Indonesia',
        'founder': [
          {
            '@type': 'Person',
            'name': 'Eka',
            'jobTitle': 'Google Developer Expert - Web'
          },
          {
            '@type': 'Person',
            'name': 'Ivan',
            'jobTitle': 'Senior Web Engineer - Human Made'
          },
          {
            '@type': 'Person',
            'name': 'Riza Fahmi',
            'jobTitle': 'Co-founder Hacktiv8'
          }
        ]
      },
      {
        '@type': 'PodcastSeries',
        '@id': `${siteUrl}/#podcast`,
        'name': 'Ngobrolin WEB',
        'description': 'Video podcast seputar web development dalam Bahasa Indonesia',
        'url': siteUrl,
        'webFeed': `${siteUrl}/podcast-rss.xml`,
        'publisher': { '@id': `${siteUrl}/#organization` },
        'numberOfEpisodes': episodeCount,
        'inLanguage': 'id-ID'
      }
    ]
  };
}

export function generateAboutPageSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'mainEntity': {
      '@type': 'Organization',
      'name': 'Ngobrolin WEB',
      'description': 'Video podcast mingguan yang membahas berbagai topik seputar web development dalam Bahasa Indonesia',
      'url': siteUrl,
      'logo': `${siteUrl}/favicon.svg`,
      'foundingDate': '2019',
      'founder': [
        {
          '@type': 'Person',
          'name': 'Eka',
          'jobTitle': 'Google Developer Expert - Web'
        },
        {
          '@type': 'Person',
          'name': 'Ivan',
          'jobTitle': 'Senior Web Engineer - Human Made'
        },
        {
          '@type': 'Person',
          'name': 'Riza Fahmi',
          'jobTitle': 'Co-founder Hacktiv8'
        }
      ]
    }
  };
}

export function generateCollectionPageSchema(
  name: string,
  description: string,
  url: string,
  items: Episode[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': name,
    'description': description,
    'url': url.endsWith('/') ? url : `${url}/`,
    'mainEntity': {
      '@type': 'ItemList',
      'numberOfItems': items.length,
      'itemListElement': items.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'PodcastEpisode',
          'name': item.title,
          // Episodes live at /episodes/<slug>/ whatever the collection; deriving from `url`
          // published /episodes/<year>/<slug> on year pages, which 404s.
          'url': episodeUrl(new URL(url).origin, item.slug)
        }
      }))
    }
  };
}
