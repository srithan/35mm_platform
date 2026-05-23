type TitleMeta = {
  title: string;
  description: string | null;
};

/**
 * Server-only: Open Graph + metadata for `/title/[media]/[id]`.
 * Uses `TMDB_API_KEY` (same as `/api/tmdb` proxy).
 */
export async function fetchTmdbTitleMetadata(
  media: "movie" | "tv",
  id: string
): Promise<TitleMeta | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const num = /^\d+$/.test(id) ? id : null;
  if (!num) return null;
  const res = await fetch(
    `https://api.themoviedb.org/3/${media}/${num}?api_key=${key}&language=en-US`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    title?: string;
    name?: string;
    overview?: string | null;
  };
  const name = data.title || data.name;
  if (!name) return null;
  return {
    title: name,
    description: data.overview && data.overview.length > 0 ? data.overview : null,
  };
}
