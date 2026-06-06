export type LetterboxdImportStatus = "idle" | "preview" | "importing" | "queued" | "completed";

export interface LetterboxdFilmEntry {
  name: string;
  year: number | null;
  rating: number | null;
  watchedDate: string | null;
  letterboxdUri: string | null;
}

export interface LetterboxdImportStats {
  diaryEntries: number;
  ratings: number;
  watchlist: number;
  reviews: number;
  lists: number;
  uniqueFilms: number;
}

export interface LetterboxdImportPreview {
  filename: string;
  parsedAt: string;
  stats: LetterboxdImportStats;
  sampleFilms: LetterboxdFilmEntry[];
}

export interface LetterboxdImportRecord {
  status: LetterboxdImportStatus;
  preview: LetterboxdImportPreview | null;
  dismissedAt: string | null;
  queuedAt: string | null;
  completedAt: string | null;
}
