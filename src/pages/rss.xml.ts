import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEpisodes } from '../lib/episodes';

export async function GET(context: APIContext) {
  const episodes = getEpisodes();

  return rss({
    title: 'Ngobrolin WEB',
    description: 'Video podcast seputar web development. Hadir setiap Selasa malam jam 20:00 WIB.',
    site: context.site!,
    items: episodes.map((episode) => ({
      title: episode.title,
      pubDate: new Date(episode.publishedAt),
      description: episode.description,
      link: `/episodes/${episode.slug}`,
      customData: `<enclosure url="https://www.youtube.com/watch?v=${episode.videoId}" type="video/mp4" />`,
    })),
    customData: `
      <language>id</language>
      <image>
        <url>https://ngobrolin.web.id/og-image.svg</url>
        <title>Ngobrolin WEB</title>
        <link>https://ngobrolin.web.id</link>
      </image>
    `,
  });
}
