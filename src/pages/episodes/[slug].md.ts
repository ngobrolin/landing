import type { GetStaticPaths } from 'astro';
import { getEpisodes, type Episode } from '../../lib/episodes';
import { getSummary, getTranscript } from '../../lib/seo';

export const getStaticPaths: GetStaticPaths = () => {
  const episodes = getEpisodes();
  return episodes.map((episode) => ({
    params: { slug: episode.slug },
    props: { episode },
  }));
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildMarkdown(episode: Episode, siteUrl: string): string {
  const summary = getSummary(episode.videoId);
  const transcript = getTranscript(episode.videoId);
  const pageUrl = `${siteUrl}/episodes/${episode.slug}`;
  const youtubeUrl = `https://www.youtube.com/watch?v=${episode.videoId}`;

  const lines: string[] = [];

  lines.push(`# ${episode.title}`);
  lines.push('');
  lines.push(`- **Episode:** ${episode.episodeNumber}`);
  lines.push(`- **Tanggal:** ${formatDate(episode.publishedAt)}`);
  lines.push(`- **YouTube:** ${youtubeUrl}`);
  lines.push(`- **Halaman:** ${pageUrl}`);

  if (summary?.brief) {
    lines.push('');
    lines.push('## Ringkasan');
    lines.push('');
    lines.push(summary.brief);
  }

  if (summary?.keyPoints && summary.keyPoints.length > 0) {
    lines.push('');
    lines.push('## Poin Penting');
    lines.push('');
    for (const point of summary.keyPoints) {
      lines.push(`- ${point}`);
    }
  }

  if (transcript?.fullText) {
    lines.push('');
    lines.push('## Transcript');
    lines.push('');
    lines.push(transcript.fullText);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`[Lihat halaman episode →](${pageUrl})`);
  lines.push('');

  return lines.join('\n');
}

export function GET({ props }: { props: { episode: Episode } }) {
  const episode = props.episode;
  const siteUrl = 'https://ngobrol.in';
  const body = buildMarkdown(episode, siteUrl);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
