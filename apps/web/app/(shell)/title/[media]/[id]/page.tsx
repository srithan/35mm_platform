import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitlePageView } from "@/features/title/components/TitlePageView";
import { fetchTmdbTitleMetadata } from "@/lib/tmdb/serverTmdbTitleMeta";
import { isTitleMedia } from "@/lib/title/paths";

interface PageProps {
  params: Promise<{ media: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { media, id } = await params;
  if (!isTitleMedia(media) || !/^\d+$/.test(id)) {
    return { title: "Title" };
  }
  const m = await fetchTmdbTitleMetadata(media, id);
  if (!m) {
    return { title: "Title" };
  }
  const t = m.title + " — 35mm";
  return {
    title: t,
    description: m.description || undefined,
    openGraph: {
      title: t,
      description: m.description || undefined,
    },
  };
}

export default async function TitlePage({ params }: PageProps) {
  const { media, id } = await params;
  if (!isTitleMedia(media) || !/^\d+$/.test(id)) {
    notFound();
  }
  return <TitlePageView media={media} id={id} />;
}
