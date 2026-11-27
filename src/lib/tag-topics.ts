/**
 * Copy and cross-links for /tags/<tag>.
 *
 * Pure: the tag map and the real episode ids come in as arguments, so the
 * ranking and fallback rules are tested against fixtures rather than today's
 * tags.json, which the extractor rewrites on every summary change.
 */

interface TopicCopy {
  /** Short noun phrase for the meta description. */
  focus: string;
  /** One or two sentences on what these episodes cover. */
  intro: string;
}

// Written from the episodes each tag currently matches and from that tag's
// keywords in scripts/lib/tag-extraction.ts, so a sentence never promises a
// subject the matcher cannot put on the page.
export const TOPIC_COPY: Record<string, TopicCopy> = {
  javascript: {
    focus: 'dasar bahasa, fitur ECMAScript baru, runtime, dan framework',
    intro:
      'Topik yang paling sering muncul di Ngobrolin WEB. Obrolannya mencakup dasar JavaScript, fitur ECMAScript baru, runtime seperti Node dan Deno, serta framework dan tooling di sekitarnya.',
  },
  css: {
    focus: 'fitur CSS baru, State of CSS, Tailwind, dan layout',
    intro:
      'Episode CSS di sini sering mengikuti rilis browser: seri CSS Wrapped, State of CSS, Interop, dan fitur yang baru bisa dipakai. Ada juga obrolan soal Tailwind, font, dan cara menata layout.',
  },
  react: {
    focus: 'React Server Component dan perbandingannya dengan framework lain',
    intro:
      'React jarang dibahas sendirian di sini. Biasanya ia jadi pembanding saat membahas Astro, Svelte, Vue atau HTMX, dan sesekali jadi topik utama, seperti di episode React Server Component.',
  },
  ai: {
    focus: 'Gemini, Google I/O, dan pengaruh AI pada cara developer bekerja',
    intro:
      'Obrolan soal AI di Ngobrolin WEB banyak berangkat dari rilis Google seperti Gemini dan Google I/O, lalu melebar ke pengaruhnya pada cara developer bekerja dan belajar.',
  },
  'ai-coding': {
    focus: 'coding agent, Copilot, Cursor, Claude, dan Gemini',
    intro:
      'Episode tentang menulis kode bersama AI: coding agent, Copilot, Cursor, Claude dan Gemini, ditambah pengalaman memakai alat-alat itu di proyek sungguhan.',
  },
  api: {
    focus: 'Web API baru di browser, REST, GraphQL, dan desain endpoint',
    intro:
      'API di sini berarti dua hal: Web API baru yang ditambahkan browser, dan API yang dibangun sendiri di server, seperti REST, GraphQL dan desain endpoint.',
  },
  testing: {
    focus: 'unit test, Playwright, Vitest, Jest, dan otomasi browser',
    intro:
      'Kumpulan obrolan soal menguji kode: unit test, end-to-end test dengan Playwright, otomasi browser, linter, dan code review.',
  },
  security: {
    focus: 'otentikasi, otorisasi, CORS, kata sandi, dan celah keamanan',
    intro:
      'Episode tentang keamanan aplikasi web: otentikasi dan otorisasi, JWT, CORS, kata sandi, serta celah keamanan yang sempat ramai dibahas.',
  },
  performance: {
    focus: 'Core Web Vitals, caching, dan optimasi JavaScript',
    intro:
      'Obrolan soal membuat web terasa cepat: Core Web Vitals, CLS, caching, optimasi JavaScript, dan bedah situs yang mencari apa yang membuat sebuah halaman lambat.',
  },
  accessibility: {
    focus: 'form, komponen UI, unit CSS, dan cara mengujinya',
    intro:
      'Episode yang membahas aksesibilitas: form dan komponen yang bisa dipakai semua orang, unit CSS yang tepat, dan cara mengujinya.',
  },
  seo: {
    focus: 'cara mesin pencari membaca halaman, gambar, dan rendering di server',
    intro:
      'SEO dari sisi developer: bagaimana mesin pencari membaca halaman, peran gambar dan rendering di server, dan apa yang dicek saat membedah sebuah situs.',
  },
  deployment: {
    focus: 'hosting di Vercel, Netlify dan Cloudflare, edge, dan kontainer',
    intro:
      'Obrolan soal membawa aplikasi ke production: hosting di Vercel, Netlify atau Cloudflare, edge, kontainer, dan cerita deploy yang tidak berjalan mulus.',
  },
};

// Tagged episodes all have a summary, since tags are extracted from summaries.
const ARCHIVE_NOTE =
  'Setiap episode di sini punya ringkasan poin utama, dan transkripnya bisa dicari di halaman episode.';

export function getTagIntro(tag: string, label: string, count: number): string {
  const lead = TOPIC_COPY[tag]?.intro ?? `Ngobrolin WEB membahas ${label} di ${count} episode.`;
  return `${lead} ${ARCHIVE_NOTE}`;
}

export function getTagDescription(tag: string, label: string, count: number): string {
  const focus = TOPIC_COPY[tag]?.focus;
  const lead = focus
    ? `${count} episode Ngobrolin WEB tentang ${label}: ${focus}.`
    : `${count} episode Ngobrolin WEB tentang ${label}, podcast web development berbahasa Indonesia.`;
  return `${lead} Ada ringkasan dan transkrip yang bisa dicari.`;
}

/**
 * Tags that share episodes with `tag`, most shared first, ties broken by name.
 * Only real episodes count, for the reason getAllTagsWithCounts gives.
 */
export function getRelatedTags(
  tag: string,
  tagsByVideoId: Record<string, string[]>,
  realIds: ReadonlySet<string>,
  limit = 6,
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const [videoId, tags] of Object.entries(tagsByVideoId)) {
    if (!realIds.has(videoId) || !tags.includes(tag)) continue;
    for (const other of new Set(tags)) {
      if (other !== tag) counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([other, count]) => ({ tag: other, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
