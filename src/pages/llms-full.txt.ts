import type { APIContext } from 'astro';
import { getEpisodes } from '../lib/episodes';
import { getSummary } from '../lib/seo';

export async function GET(context: APIContext) {
  const episodes = getEpisodes();
  const siteUrl = context.site?.origin ?? 'https://ngobrol.in';

  const lines: string[] = [];

  lines.push('# Ngobrolin WEB');
  lines.push('');
  lines.push('> Video podcast mingguan seputar web development dalam Bahasa Indonesia. Hadir setiap Selasa malam jam 20:00 WIB.');
  lines.push('');
  lines.push('- Hosts: Eka (Google Developer Expert - Web), Ivan (Senior Web Engineer - Human Made), Riza Fahmi (Co-founder Hacktiv8)');
  lines.push('- Language: Indonesian (Bahasa Indonesia)');
  lines.push('- Format: Video podcast on YouTube');
  lines.push(`- Website: ${siteUrl}`);
  lines.push(`- RSS: ${siteUrl}/rss.xml`);
  lines.push('');

  for (const episode of episodes) {
    lines.push(`## EP ${episode.episodeNumber}: ${episode.title}`);
    lines.push('');
    lines.push(`- Published: ${new Date(episode.publishedAt).toISOString().split('T')[0]}`);
    lines.push(`- URL: ${siteUrl}/episodes/${episode.slug}`);
    lines.push(`- YouTube: https://www.youtube.com/watch?v=${episode.videoId}`);

    const summary = getSummary(episode.videoId);

    const brief = summary?.brief ?? episode.brief;
    if (brief) {
      lines.push('');
      lines.push(brief);
    }

    if (summary?.keyPoints?.length) {
      lines.push('');
      lines.push('Key points:');
      for (const point of summary.keyPoints) {
        lines.push(`- ${point}`);
      }
    }

    lines.push('');
    lines.push('Full transcript available on the episode page.');
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
