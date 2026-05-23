export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
}

export interface TMDBCredits {
  cast: TMDBPerson[];
  crew: TMDBPerson[];
}

export interface TMDBExternalIds {
  imdb_id: string | null;
  wikidata_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TMDBWatchProviders {
  results: {
    [countryCode: string]: {
      link?: string;
      flatrate?: TMDBWatchProvider[];
      rent?: TMDBWatchProvider[];
      buy?: TMDBWatchProvider[];
    };
  };
}

export interface TMDBReleaseDate {
  certification: string;
  iso_639_1: string;
  note: string;
  release_date: string;
  type: number;
}

export interface TMDBReleaseDates {
  results: {
    iso_3166_1: string;
    release_dates: TMDBReleaseDate[];
  }[];
}

export interface TMDBContentRating {
  descriptors: string[];
  iso_3166_1: string;
  rating: string;
}

export interface TMDBContentRatings {
  results: TMDBContentRating[];
}

export interface TMDBProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
}

export interface TMDBMedia {
  id: number;
  media_type?: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  tagline?: string;
  runtime?: number;
  genres?: TMDBGenre[];
  budget?: number;
  revenue?: number;
  status?: string;
  production_companies?: TMDBProductionCompany[];
  credits?: TMDBCredits;
  external_ids?: TMDBExternalIds;
  "watch/providers"?: TMDBWatchProviders;
  release_dates?: TMDBReleaseDates;
  // TV specific fields
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: TMDBPerson[];
  content_ratings?: TMDBContentRatings; // TMDB uses content_ratings for TV instead of release_dates for certifications
  /** From `append_to_response=videos` on movie/TV details. */
  videos?: { results: TMDBVideo[] };
}

export type TMDBMovie = TMDBMedia;

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count?: number;
}

export interface TMDBSeasonDetail {
  id: number;
  name: string;
  season_number: number;
  overview: string;
  episodes: TMDBEpisode[];
  poster_path: string | null;
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
