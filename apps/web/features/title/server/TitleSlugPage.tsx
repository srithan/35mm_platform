import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitlePageView } from "@/features/title/components/TitlePageView";
import { resolveTmdbTitleSlug } from "@/lib/tmdb/serverTmdbSlug";
import type { TitleMedia } from "@/lib/title/paths";

export async function titleSlugMetadata(
  media: TitleMedia,
  slug: string,
): Promise<Metadata> {
  const title = await resolveTmdbTitleSlug(media, slug);
  if (!title) return { title: "Title" };
  const pageTitle = title.title + " — 35mm";
  return {
    title: pageTitle,
    description: title.description || undefined,
    alternates: { canonical: `/${media === "movie" ? "film" : "tv"}/${slug}` },
    openGraph: {
      title: pageTitle,
      description: title.description || undefined,
    },
  };
}

export async function renderTitleSlugPage(media: TitleMedia, slug: string) {
  const title = await resolveTmdbTitleSlug(media, slug);
  if (!title) notFound();
  return (
    <TitlePageView
      key={media + ":" + title.id}
      media={media}
      id={title.id}
      tmdbId={title.tmdbId}
    />
  );
}
