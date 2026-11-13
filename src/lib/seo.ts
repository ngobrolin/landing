import type { Episode } from './episodes';
import { buildEpisodePageTitle, getDisplayTitle } from './episode-title';

/** Canonical episode URL. Pages are served with a trailing slash, so anything else 308s. */
export function episodeUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/$/, '')}/episodes/${slug}/`;
}

interface Summary {
  brief: string;
  keyPoints: string[];
  seoTitle?: string;
  metaDescription?: string;
}

interface Transcript {
  fullText: string;
}

const SITE_DESCRIPTION = 'Video podcast seputar web development dalam Bahasa Indonesia';

interface PageGraphInput {
  siteUrl: string;
  pageUrl: string;
  title: string;
  description: string;
  image: string;
}

/** The Organization, WebSite and WebPage nodes every page carries; other schemas extend them by @id. */
export function buildSiteGraph({ siteUrl, pageUrl, title, description, image }: PageGraphInput) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Ngobrolin WEB',
        url: `${siteUrl}/`,
        // Square and raster: Google wants a logo of at least 112x112, not the 1200x630 share card.
        logo: { '@type': 'ImageObject', url: `${siteUrl}/podcast-cover.jpg`, width: 3000, height: 3000 },
        sameAs: [
          'https://www.youtube.com/@RizaFahmi',
          'https://open.spotify.com/show/1o2d75xrADb9x0AahDO0Ai',
          'https://github.com/orgs/ngobrolin/discussions'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: 'Ngobrolin WEB',
        // Fixed on purpose: the page's own description belongs on WebPage, not on the site.
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: 'id-ID',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/episodes/?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { '@id': `${siteUrl}/#website` },
        inLanguage: 'id-ID',
        primaryImageOfPage: { '@type': 'ImageObject', url: image }
      }
    ]
  };
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

/** The episode's hand-written <title> when its summary has one, else the composed one. */
export function getEpisodePageTitle(episode: Episode, summary: Summary | null): string {
  return summary?.seoTitle ?? buildEpisodePageTitle(episode.title);
}

const META_DESCRIPTION_MAX = 160;

/** Cuts on a word boundary so a search snippet never ends mid-word. */
function truncateDescription(text: string): string {
  if (text.length <= META_DESCRIPTION_MAX) return text;
  const room = text.slice(0, META_DESCRIPTION_MAX - 3);
  const lastSpace = room.lastIndexOf(' ');
  const cut = lastSpace > 0 ? room.slice(0, lastSpace) : room;
  return `${cut.replace(/[\s,;:.\-–—]+$/, '')}...`;
}

export function getMetaDescription(episode: Episode, summary: Summary | null): string {
  if (summary?.metaDescription) return summary.metaDescription;
  if (summary?.brief) return truncateDescription(summary.brief.split('\n')[0]);
  return truncateDescription(episode.description.replace(/\n/g, ' '));
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
      // Same @id as buildSiteGraph's Organization, so this extends that node instead of
      // declaring a second, conflicting organisation.
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        'name': 'Ngobrolin WEB',
        'url': `${siteUrl}/`,
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
        'description': SITE_DESCRIPTION,
        'url': `${siteUrl}/`,
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
      '@id': `${siteUrl}/#organization`,
      'name': 'Ngobrolin WEB',
      'description': 'Video podcast mingguan yang membahas berbagai topik seputar web development dalam Bahasa Indonesia',
      'url': `${siteUrl}/`,
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
