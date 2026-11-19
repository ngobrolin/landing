import type { SEOProps } from 'astro-seo';
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, OG_IMAGE_PATH } from './og-card-geometry';

export const DEFAULT_CARD_ALT =
  'Ngobrolin WEB - video podcast web development, setiap Selasa 20:00 WIB';

const TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Matches Astro's own text escaping, so `<title>` bytes are what `{title}` produced. */
export function escapeTitle(text: string): string {
  return text.replace(/[&<>"']/g, ch => TEXT_ESCAPES[ch]);
}

interface HeadSeoInput {
  site: URL;
  url: URL;
  title: string;
  description: string;
  image?: string;
  ogType?: string;
  omitCanonical?: boolean;
}

export function buildHeadSeo({
  site,
  url,
  title,
  description,
  image = OG_IMAGE_PATH,
  ogType = 'website',
  omitCanonical = false,
}: HeadSeoInput) {
  // astro-seo's own default keeps the query string, so every link passes this instead.
  const canonicalURL = new URL(url.pathname, site);
  const absoluteImage = image.startsWith('http') ? image : new URL(image, site).toString();

  // A page with its own card (/partners) declares its size and alt in its head
  // slot; two sets of og:image:width in one document is worse than none.
  const isDefaultCard = image === OG_IMAGE_PATH;

  const props: SEOProps = {
    // astro-seo writes the title with set:html, and episode titles come from YouTube.
    title: escapeTitle(title),
    description,
    canonical: omitCanonical ? null : canonicalURL.href,
    openGraph: {
      basic: { title, type: ogType, image: absoluteImage, url: canonicalURL.href },
      optional: { description, siteName: 'Ngobrolin WEB', locale: 'id_ID' },
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image: absoluteImage,
      ...(isDefaultCard && { imageAlt: DEFAULT_CARD_ALT }),
    },
  };

  // Dimensions let WhatsApp and LinkedIn commit to the large-image preview early.
  // Not openGraph.image: astro-seo would add og:image:url, which the site never shipped.
  if (isDefaultCard) {
    props.extend = {
      meta: [
        { property: 'og:image:width', content: String(OG_CARD_WIDTH) },
        { property: 'og:image:height', content: String(OG_CARD_HEIGHT) },
        { property: 'og:image:alt', content: DEFAULT_CARD_ALT },
      ],
    };
  }

  return { canonicalURL, absoluteImage, props };
}
