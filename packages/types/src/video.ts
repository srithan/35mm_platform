export type VideoState =
  "creating" | "uploading" | "processing" | "ready" | "failed";
export interface VideoAssetStatus {
  id: string;
  state: VideoState;
  failureReason: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  filmId: string | null;
  postId: string | null;
}
export interface VideoUploadCredentials extends VideoAssetStatus {
  endpoint: string;
  libraryId: string;
  videoId: string;
  expires: number;
  signature: string;
}
export interface VideoPlayback {
  posterUrl: string;
  width: number | null;
  height: number | null;
  embedUrl: string;
  expires: number;
}
export type VideoPlaybackResult = VideoPlayback | {
  state: "processing" | "failed";
  message: string;
  width: number | null;
  height: number | null;
};
export interface UploadedFilm {
  id: string;
  assetId: string;
  title: string;
  description: string;
  tagline: string;
  director: string;
  year: number | null;
  language: string;
  country: string;
  genres: string[];
  contentRating: string;
  tags: string[];
  festivalNotes: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  visibility: "public" | "unlisted" | "private";
  releaseAt: string;
  author: { id: string; username: string; displayName: string };
  isOwner: boolean;
}
export interface UploadedFilmPage {
  items: UploadedFilm[];
  nextCursor: string | null;
  hasMore: boolean;
}
