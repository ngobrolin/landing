/**
 * Keyword-based tag extraction for episode summaries.
 *
 * Extracted from scripts/extract-tags.ts so the matching rule can be tested.
 * The rule is the whole point: this used to be `text.includes(keyword)`, and
 * bare substring matching against Indonesian prose is catastrophic.
 *
 * "ai" appears inside mulai, dimulai, memulai, berbagai, sebagai, sesuai,
 * selain, mencapai, bagaimana - so EVERY summarised episode matched it, and
 * /tags/ai became the largest and most useless topic page on the site. "ts"
 * (a typescript alias) matched assistants and snippets: 30 hits, none real.
 * "ml" matched html. "bun" matched membangun and dibangun.
 *
 * Measured over the 98 summarised episodes, substring -> word boundary:
 *   ai 98 -> 26, ui 58 -> 25, typescript 35 -> 9, bun 22 -> 4,
 *   api 51 -> 34, dev-tools 25 -> 10, animation 19 -> 11, seo 10 -> 2.
 *
 * No tag disappears, so no /tags/<tag> URL is lost - only the contents get
 * accurate.
 */

// Common tech terms to extract as tags
export const TECH_KEYWORDS: Record<string, string[]> = {
  // Frameworks & Libraries
  css: ['css', 'tailwind', 'tailwindcss', 'stylesheet', 'styling'],
  javascript: ['javascript', 'js', 'ecmascript'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'reactjs', 'react.js'],
  vue: ['vue', 'vuejs', 'vue.js'],
  svelte: ['svelte', 'sveltekit'],
  angular: ['angular'],
  nextjs: ['next.js', 'nextjs', 'next js'],
  astro: ['astro'],
  node: ['node', 'nodejs', 'node.js'],
  deno: ['deno'],
  bun: ['bun'],

  // AI & Tools
  ai: ['ai', 'artificial intelligence', 'machine learning', 'ml'],
  'ai-coding': ['agentic', 'copilot', 'cursor', 'claude', 'gemini', 'chatgpt', 'llm'],
  'dev-tools': ['vscode', 'terminal', 'cli', 'devtools', 'developer tools'],

  // Web Concepts
  performance: ['performance', 'optimasi', 'optimization', 'speed', 'caching'],
  accessibility: ['accessibility', 'a11y', 'aksesibilitas'],
  seo: ['seo', 'search engine'],
  api: ['api', 'rest', 'graphql', 'endpoint'],
  testing: ['testing', 'test', 'vitest', 'jest', 'playwright', 'cypress'],

  // UI/UX
  ui: ['ui', 'user interface', 'komponen', 'component'],
  ux: ['ux', 'user experience'],
  animation: ['animation', 'animasi', 'transition', 'motion'],
  responsive: ['responsive', 'mobile', 'desktop'],
  design: ['design', 'desain', 'figma', 'design system'],

  // Backend & Infrastructure
  database: ['database', 'db', 'sql', 'nosql', 'postgres', 'mysql', 'mongodb'],
  deployment: ['deploy', 'deployment', 'hosting', 'vercel', 'netlify', 'cloudflare'],
  security: ['security', 'keamanan', 'auth', 'authentication', 'authorization'],

  // Career & Soft Skills
  career: ['karir', 'career', 'job', 'interview', 'gaji', 'salary'],
  learning: ['belajar', 'learning', 'tutorial', 'course'],
  community: ['community', 'komunitas', 'meetup', 'conference'],

  // Specific Topics
  'web-components': ['web component', 'custom element', 'shadow dom'],
  pwa: ['pwa', 'progressive web app', 'service worker'],
  'build-tools': ['bundler', 'webpack', 'vite', 'esbuild', 'rollup'],
  monorepo: ['monorepo', 'turborepo', 'nx'],
  'state-management': ['state management', 'redux', 'zustand', 'pinia'],
};

/**
 * Word-boundary matcher.
 *
 * `\b` is not usable directly: several keywords contain dots ("next.js",
 * "node.js") where `\b` behaves unintuitively. Treating [a-z0-9] as the word
 * character class and requiring a non-word character (or string edge) on both
 * sides gives the same intent and handles the dotted names correctly.
 */
function matches(text: string, keyword: string): boolean {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

/** Extract sorted, de-duplicated tags from a blob of summary text. */
export function extractTags(text: string): string[] {
  const haystack = text.toLowerCase();
  const found = new Set<string>();

  for (const [tag, keywords] of Object.entries(TECH_KEYWORDS)) {
    if (keywords.some((keyword) => matches(haystack, keyword))) {
      found.add(tag);
    }
  }

  return Array.from(found).sort();
}
