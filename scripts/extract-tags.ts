/**
 * Extract tags from episode summaries for related episodes feature
 *
 * Usage:
 *   npx tsx scripts/extract-tags.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Summary {
  videoId: string;
  brief: string;
  keyPoints: string[];
}

interface TagsData {
  [videoId: string]: string[];
}

// Common tech terms to extract as tags
const TECH_KEYWORDS: Record<string, string[]> = {
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

function extractTags(summary: Summary): string[] {
  const text = `${summary.brief} ${summary.keyPoints.join(' ')}`.toLowerCase();
  const foundTags = new Set<string>();

  for (const [tag, keywords] of Object.entries(TECH_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        foundTags.add(tag);
        break;
      }
    }
  }

  return Array.from(foundTags).sort();
}

async function main() {
  const summariesDir = path.join(__dirname, '../src/data/summaries');
  const outputPath = path.join(__dirname, '../src/data/tags.json');

  if (!fs.existsSync(summariesDir)) {
    console.error('Error: summaries directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(summariesDir).filter((f) => f.endsWith('.json'));
  const tagsData: TagsData = {};

  console.log(`Processing ${files.length} summaries...`);

  for (const file of files) {
    const filePath = path.join(summariesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const summary: Summary = JSON.parse(content);

    const tags = extractTags(summary);
    tagsData[summary.videoId] = tags;

    console.log(`  ${summary.videoId}: ${tags.join(', ') || '(no tags)'}`);
  }

  // Load existing tags to preserve manual edits
  let existingTags: TagsData = {};
  if (fs.existsSync(outputPath)) {
    existingTags = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  // Merge: keep existing manual tags, add new auto-extracted ones
  const mergedTags: TagsData = { ...existingTags };
  for (const [videoId, tags] of Object.entries(tagsData)) {
    if (!mergedTags[videoId]) {
      mergedTags[videoId] = tags;
    } else {
      // Merge unique tags
      mergedTags[videoId] = Array.from(new Set([...mergedTags[videoId], ...tags])).sort();
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(mergedTags, null, 2));
  console.log(`\n✓ Saved tags to src/data/tags.json`);
}

main();
