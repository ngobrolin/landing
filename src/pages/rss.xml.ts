import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEpisodes } from '../lib/episodes';
import { OG_LOGO_PATH } from '../lib/og-card-geometry';

export async function GET(context: APIContext) {
  const episodes = getEpisodes();

  // Both of these used to be written out by hand, and both were wrong. The
  // image was `/og-image.svg` - a format RSS 2.0 does not allow, in an element
  // it caps at 144 wide, and a different design from the one social previews
  // showed. The link was `https://ngobrol.in` while the channel link renders
  // with a trailing slash, which the W3C validator reports as
  // ImageLinkDoesntMatch. Deriving both from `context.site` is what stops them
  // drifting again.
  const site = context.site!.toString();
  const logo = new URL(OG_LOGO_PATH, context.site!).toString();

  return rss({
    title: 'Ngobrolin WEB',
    description: 'Video podcast seputar web development. Hadir setiap Selasa malam jam 20:00 WIB.',
    site: context.site!,
    items: episodes.map((episode) => ({
      title: episode.title,
      pubDate: new Date(episode.publishedAt),
      description: episode.description,
      link: `/episodes/${episode.slug}`,
    })),
    customData: `
      <language>id</language>
      <image>
        <url>${logo}</url>
        <title>Ngobrolin WEB</title>
        <link>${site}</link>
      </image>
    `,
  });
}
