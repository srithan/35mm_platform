export type ComposerMode = "write" | "discussion" | "log";

export type PostType =
  | "text"
  | "review"
  | "log"
  | "discussion"
  | "image";

export interface FilmResult {
  id: number;
  title: string;
  year: string;
  language: string;
  genres: string[];
  posterPath: string | null;
}

export interface ComposerState {
  mode: ComposerMode;
  text: string;
  headline: string;
  selectedFilm: FilmResult | null;
  starRating: number;
  isRewatch: boolean;
  images: File[];
  youtubeUrl: string | null;
  youtubeTitle: string | null;
}
