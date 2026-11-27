// Transcripts are searched on each episode page; the archive search covers
// titles, descriptions and summaries only (SEARCH_KEYS in search.ts).

export const HOME_DESCRIPTION =
  'Video podcast web development berbahasa Indonesia, tayang tiap Selasa 20:00 WIB. Arsipnya dilengkapi ringkasan episode dan transkrip yang bisa dicari.';

export const ABOUT_DESCRIPTION =
  'Kenalan dengan Ngobrolin WEB, video podcast mingguan tentang web development berbahasa Indonesia bersama Eka, Ivan, dan Riza Fahmi.';

export function getArchiveDescription(episodeCount: number): string {
  return `Arsip lengkap ${episodeCount} episode Ngobrolin WEB. Cari lewat judul dan ringkasan, saring per tahun atau topik, dan cari isi transkrip di halaman episode.`;
}
