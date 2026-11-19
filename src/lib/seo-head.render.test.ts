import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { SEO } from 'astro-seo';
import { describe, expect, it } from 'vitest';
import { buildHeadSeo } from './seo-head';

const site = new URL('https://ngobrol.in');

async function render(input: Partial<Parameters<typeof buildHeadSeo>[0]> & { path: string }) {
  const url = new URL(input.path, site);
  const { props } = buildHeadSeo({
    site,
    url,
    title: 'Judul',
    description: 'Deskripsi',
    ...input,
  });
  const container = await AstroContainer.create();
  const html = await container.renderToString(SEO, {
    props,
    request: new Request(url),
  });
  return html;
}

const count = (html: string, pattern: RegExp) => html.match(new RegExp(pattern, 'g'))?.length ?? 0;

describe('astro-seo output for the layout props', () => {
  it('keeps a hostile title inert in <title> and readable in the social tags', async () => {
    const html = await render({
      path: '/episodes/x/',
      title: 'Deno & JSR </title><script>alert(1)</script>',
    });
    expect(html).toContain(
      '<title>Deno &amp; JSR &lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>',
    );
    // Inside a quoted attribute `<` is inert, and Astro escapes only `&` and `"` there.
    const outsideAttributes = html.replace(/"[^"]*"/g, '""');
    expect(outsideAttributes).not.toContain('<script');
    expect(count(outsideAttributes, /<title>/)).toBe(1);
    expect(count(outsideAttributes, /<\/title>/)).toBe(1);
    expect(html).toContain(
      '<meta property="og:title" content="Deno &#38; JSR </title><script>alert(1)</script>">',
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="Deno &#38; JSR </title><script>alert(1)</script>">',
    );
  });

  it('renders & once-encoded, not as &amp;amp;', async () => {
    const html = await render({ path: '/partners/', title: 'Sponsor & Iklan' });
    expect(html).toContain('<title>Sponsor &amp; Iklan</title>');
    expect(html).not.toContain('&amp;amp;');
  });

  it('drops the query string from canonical and og:url', async () => {
    const html = await render({ path: '/episodes/x/?utm_source=a&ref=b' });
    expect(html).toContain('<link rel="canonical" href="https://ngobrol.in/episodes/x/">');
    expect(html).toContain('<meta property="og:url" content="https://ngobrol.in/episodes/x/">');
    expect(html).not.toContain('utm_source');
  });

  it('omits the canonical link on request but keeps og:url', async () => {
    const html = await render({ path: '/404/', omitCanonical: true });
    expect(count(html, /rel="canonical"/)).toBe(0);
    expect(html).toContain('<meta property="og:url" content="https://ngobrol.in/404/">');
  });

  it('emits each tag once, with one robots directive and no charset', async () => {
    const html = await render({ path: '/' });
    for (const tag of [
      /<title>/,
      /name="description"/,
      /rel="canonical"/,
      /name="robots"/,
      /property="og:title"/,
      /property="og:description"/,
      /property="og:image"/,
      /property="og:url"/,
      /name="twitter:card"/,
      /name="twitter:image"/,
      /name="twitter:description"/,
    ]) {
      expect(count(html, tag), String(tag)).toBe(1);
    }
    expect(html).toContain('<meta name="robots" content="index, follow">');
    expect(html).not.toContain('charset');
    expect(html).not.toContain('og:image:url');
  });

  it('declares the default card size and alt exactly once', async () => {
    const html = await render({ path: '/' });
    expect(count(html, /og:image:width/)).toBe(1);
    expect(count(html, /og:image:height/)).toBe(1);
    expect(count(html, /og:image:alt/)).toBe(1);
    expect(count(html, /twitter:image:alt/)).toBe(1);
  });

  it('leaves size and alt out for a custom card, so the page slot is the only source', async () => {
    const html = await render({ path: '/partners/', image: '/partners-og.png' });
    expect(html).toContain('<meta property="og:image" content="https://ngobrol.in/partners-og.png">');
    expect(html).toContain('<meta name="twitter:image" content="https://ngobrol.in/partners-og.png">');
    for (const tag of [/og:image:width/, /og:image:height/, /og:image:alt/, /twitter:image:alt/]) {
      expect(count(html, tag), String(tag)).toBe(0);
    }
  });
});
