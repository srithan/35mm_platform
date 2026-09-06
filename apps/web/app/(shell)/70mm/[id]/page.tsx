import { UploadedFilmWatch } from "@/features/videos/components/UploadedFilmWatch";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShortFilmWatchContent, getShortFilmById } from "@/features/70mm";

interface SeventyMmWatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SeventyMmWatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const film = getShortFilmById(id);
  if (!film) {
    return { title: "70mm" };
  }

  return {
    title: film.title,
    description: film.synopsis,
    openGraph: {
      title: `${film.title} - 70mm on 35mm`,
      description: film.synopsis,
    },
  };
}

export default async function SeventyMmWatchPage({
  params,
}: SeventyMmWatchPageProps) {
  const { id } = await params;
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) return <UploadedFilmWatch filmId={id} />;
  const film = getShortFilmById(id);
  if (!film) notFound();
  return <ShortFilmWatchContent film={film} />;
}
