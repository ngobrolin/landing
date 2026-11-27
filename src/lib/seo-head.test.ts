import { describe, expect, it } from 'vitest';
import { buildHeadSeo, escapeTitle } from './seo-head';
import { OG_CARD_HEIGHT, OG_CARD_WIDTH, OG_IMAGE_PATH } from './og-card-geometry';

const site = new URL('https://ngobrol.in');

const base = {
  site,
  url: new URL('https://ngobrol.in/episodes/abc-slug/?utm_source=x&ref=y'),
  title: 'Deno & JSR </title><script>alert(1)</script>',
  description: 'Kata "kutipan" & <b>tag</b>',
};

describe('escapeTitle', () => {
  it('escapes the characters Astro escapes in text, so <title> bytes stay as before', () => {
    expect(escapeTitle(`a & b < c > d " e ' f`)).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &#39; f',
    );
  });
});

describe('buildHeadSeo', () => {
  it('escapes only the title astro-seo writes with set:html, and keeps social titles raw', () => {
    const { props } = buildHeadSeo(base);
    expect(props.title).toBe(
      'Deno &amp; JSR &lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    // Attributes are escaped by Astro itself; escaping here would double-encode.
    expect(props.openGraph?.basic.title).toBe(base.title);
    expect(props.twitter?.title).toBe(base.title);
    expect(props.description).toBe(base.description);
    expect(props.openGraph?.optional?.description).toBe(base.description);
    expect(props.twitter?.description).toBe(base.description);
  });

  it('builds a path-only canonical and og:url, dropping the query string', () => {
    const { canonicalURL, props } = buildHeadSeo(base);
    expect(canonicalURL.href).toBe('https://ngobrol.in/episodes/abc-slug/');
    expect(props.canonical).toBe('https://ngobrol.in/episodes/abc-slug/');
    expect(props.openGraph?.basic.url).toBe('https://ngobrol.in/episodes/abc-slug/');
  });

  it('keeps the root canonical slash-terminated', () => {
    const { props } = buildHeadSeo({ ...base, url: new URL('https://ngobrol.in/?q=1') });
    expect(props.canonical).toBe('https://ngobrol.in/');
  });

  it('omits the canonical with null, but still states og:url', () => {
    const { props } = buildHeadSeo({
      ...base,
      url: new URL('https://ngobrol.in/404/'),
      omitCanonical: true,
    });
    expect(props.canonical).toBeNull();
    expect(props.openGraph?.basic.url).toBe('https://ngobrol.in/404/');
  });

  it('declares the default card size and alt once, and never through og:image:url', () => {
    const { props, absoluteImage } = buildHeadSeo(base);
    expect(absoluteImage).toBe(`https://ngobrol.in${OG_IMAGE_PATH}`);
    expect(props.openGraph?.basic.image).toBe(absoluteImage);
    expect(props.twitter?.image).toBe(absoluteImage);
    // openGraph.image would add og:image:url, a tag the site never shipped.
    expect(props.openGraph?.image).toBeUndefined();
    const meta = props.extend?.meta ?? [];
    expect(meta.map(m => m.property)).toEqual([
      'og:image:width',
      'og:image:height',
      'og:image:alt',
    ]);
    expect(meta.map(m => m.content)).toEqual([
      String(OG_CARD_WIDTH),
      String(OG_CARD_HEIGHT),
      props.twitter?.imageAlt,
    ]);
  });

  it('leaves size and alt to a page that brings its own card', () => {
    const { props, absoluteImage } = buildHeadSeo({ ...base, image: '/partners-og.png' });
    expect(absoluteImage).toBe('https://ngobrol.in/partners-og.png');
    expect(props.extend).toBeUndefined();
    expect(props.twitter?.imageAlt).toBeUndefined();
    expect(props.openGraph?.image).toBeUndefined();
  });

  // Episode pages share the YouTube thumbnail, whose size varies, so they get alt but no size.
  it('states a given alt on both og and twitter for an image without a known size', () => {
    const image = 'https://i.ytimg.com/vi/abc/maxresdefault.jpg';
    const imageAlt = 'Thumbnail episode Ngobrolin WEB: Modern Web UI';
    const { props } = buildHeadSeo({ ...base, image, imageAlt });
    expect(props.twitter?.imageAlt).toBe(imageAlt);
    expect(props.extend?.meta).toEqual([{ property: 'og:image:alt', content: imageAlt }]);
  });

  it('passes an absolute image through untouched', () => {
    const image = 'https://i.ytimg.com/vi/abc/maxresdefault.jpg';
    expect(buildHeadSeo({ ...base, image }).absoluteImage).toBe(image);
  });

  it('does not set charset, so the layout keeps the only one', () => {
    expect(buildHeadSeo(base).props.charset).toBeUndefined();
  });
});
