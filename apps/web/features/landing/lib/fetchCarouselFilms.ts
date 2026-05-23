/**
 * Server-side fetch of TMDB movie details for the landing page 3D carousel.
 * Uses Next.js fetch with revalidate for 24-hour caching.
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const CAROUSEL_FILM_IDS = [
  389,    // 12 Angry Men
  637,    // Life is Beautiful
  424,    // Schindler's List
  240,    // The Godfather Part II
  755,    // Se7en
  745,    // The Silence of the Lambs
  27205,  // Inception
  157336, // Interstellar
  299536, // Avengers: Infinity War
  120,    // The Lord of the Rings: Fellowship
  550,    // Fight Club
  13,     // Forrest Gump
  20786,  // Taare Zameen Par
  375366, // Tumbbad
  507086, // RRR
  97165,  // Gangs of Wasseypur
  76203,  // Article 15
  394117, // The Florida Project
  129,    // Spirited Away
  496243, // Parasite (correct ID)
  194,    // Amélie
  857,    // Saving Private Ryan
] as const;

export interface CarouselFilm {
  id: number;
  title: string;
  posterUrl: string;
}

async function fetchFilm(id: number): Promise<CarouselFilm | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`;
  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    id: number;
    title: string;
    poster_path: string | null;
  };

  if (!data.poster_path) return null;

  return {
    id: data.id,
    title: data.title,
    posterUrl: `${TMDB_IMAGE_BASE}${data.poster_path}`,
  };
}

export async function fetchCarouselFilms(): Promise<CarouselFilm[]> {
  const results = await Promise.allSettled(
    CAROUSEL_FILM_IDS.map((id) => fetchFilm(id))
  );

  const films: CarouselFilm[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      films.push(result.value);
    }
  }

  if (films.length < 8) {
    console.warn(
      `[LandingCarousel] Only ${films.length} films loaded successfully. Expected at least 8.`
    );
  }

  return films;
}
