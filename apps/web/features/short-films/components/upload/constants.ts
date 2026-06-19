export const UPLOAD_STEPS = [
  { id: 1, label: "Film file", hint: "MP4, MOV, or WebM" },
  { id: 2, label: "Details", hint: "Title & synopsis" },
  { id: 3, label: "Genre", hint: "Category & tags" },
  { id: 4, label: "Publish", hint: "Thumbnail & visibility" },
] as const;

export const SHORT_FILM_GENRES = [
  "Drama",
  "Comedy",
  "Thriller",
  "Horror",
  "Sci-Fi",
  "Romance",
  "Documentary",
  "Animation",
  "Fantasy",
  "Action",
  "Mystery",
  "Experimental",
  "Biography",
  "Musical",
] as const;

export const CONTENT_RATINGS = [
  { code: "G", label: "All ages" },
  { code: "PG", label: "Parental guidance" },
  { code: "PG-13", label: "Teens+" },
  { code: "R", label: "18+" },
] as const;

export const VISIBILITY_OPTIONS = [
  {
    value: "public" as const,
    label: "Public",
    description: "Anyone can discover and watch",
  },
  {
    value: "unlisted" as const,
    label: "Unlisted",
    description: "Only people with the link",
  },
  {
    value: "private" as const,
    label: "Private",
    description: "Only you can view",
  },
];

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Mandarin",
  "Hindi",
  "Arabic",
  "Portuguese",
  "Korean",
  "Italian",
] as const;

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
];

export const ACCEPTED_VIDEO_EXTENSIONS = ["MP4", "MOV", "WebM", "AVI", "MKV"];

export const MAX_VIDEO_SIZE_GB = 10;
export const MAX_RUNTIME_MINUTES = 40;
export const MAX_GENRES = 3;
export const MAX_TAGS = 10;

export const FILMMAKER_TIPS = [
  "Export at 1080p minimum for crisp playback on large screens.",
  "A strong custom thumbnail can significantly boost click-through.",
  "Use specific tags — genre, mood, and theme — to improve discovery.",
  "Captions and subtitles help international audiences find your work.",
];
