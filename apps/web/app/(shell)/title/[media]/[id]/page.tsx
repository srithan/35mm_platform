import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { TitlePageView } from "@/features/title/components/TitlePageView";
import { fetchTmdbTitleMetadata } from "@/lib/tmdb/serverTmdbTitleMeta";
import { isTitleMedia } from "@/lib/title/paths";

interface PageProps {
  params: Promise<{ media: string; id: string }>;
}

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const resolveMetadataTmdbId = unstable_cache(async function (
  id: string
): Promise<string | null> {
  if (/^\d+$/.test(id)) return id;
  const canonicalId = id.trim().toUpperCase();
  if (!ULID_RE.test(canonicalId)) return null;
  try {
    const response = await fetch(
      API_URL + "/v1/films/" + encodeURIComponent(canonicalId),
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const film = (await response.json()) as { tmdbId?: unknown };
    return typeof film.tmdbId === "number" && film.tmdbId > 0
      ? String(film.tmdbId)
      : null;
  } catch {
    return null;
  }
}, ["film-tmdb-reference"], { revalidate: 300 });

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { media, id } = await params;
  if (!isTitleMedia(media)) {
    return { title: "Title" };
  }
  const tmdbId = await resolveMetadataTmdbId(id);
  if (!tmdbId) return { title: "Title" };
  const m = await fetchTmdbTitleMetadata(media, tmdbId);
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
  if (
    !isTitleMedia(media) ||
    (!/^\d+$/.test(id) && !ULID_RE.test(id.trim().toUpperCase()))
  ) {
    notFound();
  }
  const canonicalId = id.trim().toUpperCase();
  const tmdbId = await resolveMetadataTmdbId(canonicalId);
  if (!tmdbId) notFound();
  return <TitlePageView media={media} id={canonicalId} tmdbId={tmdbId} />;
}
