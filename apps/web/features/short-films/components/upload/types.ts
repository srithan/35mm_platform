export type UploadStep = 1 | 2 | 3 | 4;

export type Visibility = "public" | "unlisted" | "private";

export type ShortFilmUploadForm = {
  videoFile: File | null;
  videoUploadProgress: number;
  videoUploadComplete: boolean;
  title: string;
  tagline: string;
  description: string;
  director: string;
  year: string;
  runtime: string;
  language: string;
  country: string;
  genres: string[];
  contentRating: string;
  tags: string[];
  thumbnailFile: File | null;
  thumbnailPreviewUrl: string | null;
  visibility: Visibility;
  scheduleRelease: string;
  festivalNotes: string;
};

export const INITIAL_UPLOAD_FORM: ShortFilmUploadForm = {
  videoFile: null,
  videoUploadProgress: 0,
  videoUploadComplete: false,
  title: "",
  tagline: "",
  description: "",
  director: "",
  year: "",
  runtime: "",
  language: "",
  country: "",
  genres: [],
  contentRating: "",
  tags: [],
  thumbnailFile: null,
  thumbnailPreviewUrl: null,
  visibility: "public",
  scheduleRelease: "",
  festivalNotes: "",
};
