import type { APIContext } from 'astro';
import { getEpisodes } from '../lib/episodes';

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');
  const episodes = getEpisodes();
  const recent = episodes.slice(0, 10);
  const remaining = episodes.slice(10);

  const formatEpisode = (ep: (typeof episodes)[0]) => {
    const line = `- [${ep.title}](${site}/episodes/${ep.slug})`;
    return ep.brief ? `${line}: ${ep.brief}` : line;
  };

  const lines = [
    '# Ngobrolin WEB',
    '',
    '> An Indonesian-language (Bahasa Indonesia) video podcast about web development, hosted on YouTube.',
    '',
    'Ngobrolin WEB is hosted by Eka, Ivan, and Riza Fahmi. The show is recorded in Bahasa Indonesia and published as a video podcast on YouTube. Episodes cover web development topics including frameworks, tooling, best practices, and industry trends.',
    '',
    '## Pages',
    '',
    `- [Home](${site}/): Main landing page with featured and recent episodes`,
    `- [About](${site}/about): About the podcast and hosts`,
    `- [Episodes](${site}/episodes): Full archive of all episodes`,
    `- [Subscribe](${site}/subscribe): Subscribe to the podcast`,
    '',
    '## Feeds',
    '',
    `- [RSS Feed](${site}/rss.xml): RSS feed for blog readers`,
    `- [Podcast RSS Feed](${site}/podcast-rss.xml): Podcast RSS feed with audio enclosures`,
    '',
    '## Recent Episodes',
    '',
    ...recent.map(formatEpisode),
    '',
    '## Optional',
    '',
    ...remaining.map(formatEpisode),
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
