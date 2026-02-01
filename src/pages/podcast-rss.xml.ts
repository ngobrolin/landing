import type { APIContext } from "astro";
import { getPodcastEpisodes, generatePodcastRssXml } from "../lib/podcast";

export async function GET(context: APIContext) {
  const episodes = getPodcastEpisodes();

  const metadata = {
    title: "Ngobrolin WEB",
    description:
      "Video podcast seputar web development. Hadir setiap Selasa malam jam 20:00 WIB bersama Eka dan Ivan.",
    author: "Ngobrolin WEB",
    email: "ngobrolinweb@gmail.com",
    siteUrl: context.site?.toString().replace(/\/$/, "") || "https://ngobrol.in",
    feedUrl: `${context.site?.toString().replace(/\/$/, "") || "https://ngobrol.in"}/podcast-rss.xml`,
    imageUrl: "https://ngobrol.in/podcast-cover.jpg",
    language: "id",
    category: "Technology",
    explicit: false,
  };

  const xml = generatePodcastRssXml(metadata, episodes);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
