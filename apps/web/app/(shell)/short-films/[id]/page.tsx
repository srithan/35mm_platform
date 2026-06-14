import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShortFilmWatchContent, getShortFilmById } from "@/features/short-films";

interface ShortFilmWatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ShortFilmWatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const film = getShortFilmById(id);
  if (!film) {
    return { title: "Short film" };
  }

  return {
    title: film.title,
    description: film.synopsis,
    openGraph: {
      title: `${film.title} - 35mm Short films`,
      description: film.synopsis,
    },
  };
}

export default async function ShortFilmWatchPage({
  params,
}: ShortFilmWatchPageProps) {
  const { id } = await params;
  const film = getShortFilmById(id);
  if (!film) notFound();
  return <ShortFilmWatchContent film={film} />;
}
