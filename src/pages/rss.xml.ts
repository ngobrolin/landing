import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getEpisodes } from '../lib/episodes';
import { OG_LOGO_PATH, OG_LOGO_SIZE } from '../lib/og-card-geometry';

export async function GET(context: APIContext) {
  const episodes = getEpisodes();

  // Both of these used to be written out by hand, and both were wrong. The
  // image was `/og-image.svg` - a format RSS 2.0 does not allow, in an element
  // it caps at 144 wide, and a different design from the one social previews
  // showed. The link was `https://ngobrol.in` while the channel link renders
  // with a trailing slash, which the W3C validator reports as
  // ImageLinkDoesntMatch. Deriving both from `context.site` is what stops them
  // drifting again.
  //
  // The dimensions are there for the same reason the 144x144 artefact exists at
  // all: RSS 2.0 defaults an omitted `<width>`/`<height>` to 88x31, so a reader
  // that honours the spec draws this square logo as a squashed letterbox. They
  // come from `OG_LOGO_SIZE`, the size the PNG is actually rendered at, so the
  // declared shape cannot drift from the served one.
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
        <width>${OG_LOGO_SIZE}</width>
        <height>${OG_LOGO_SIZE}</height>
      </image>
    `,
  });
}
