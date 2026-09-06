export type PersonCredit = {
  id: number;
  title?: string;
  name?: string;
  media_type?: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  department?: string;
  job?: string;
  character?: string;
  vote_count?: number;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
};

type CreditCollection = {
  cast?: PersonCredit[];
  crew?: PersonCredit[];
};

type FilmographyInput = {
  knownForDepartment?: string | null;
  movieCredits?: CreditCollection;
  tvCredits?: CreditCollection;
};

export type FilmographyCredit = PersonCredit & {
  media_type: "movie" | "tv";
  roles: string[];
};

export type FilmographyDepartment = {
  label: string;
  slug: string;
  items: FilmographyCredit[];
};

export type FilmographyMediaFilter = "all" | "movie" | "tv";
export type FilmographySort = "newest" | "oldest" | "rating" | "popularity";

export type FilmographyFilters = {
  media: FilmographyMediaFilter;
  decade: string;
  genre: string;
  sort: FilmographySort;
};

export type FilmographyGenreOption = {
  id: number;
  name: string;
};

export const DEFAULT_FILMOGRAPHY_FILTERS: FilmographyFilters = {
  media: "all",
  decade: "all",
  genre: "all",
  sort: "newest",
};

const GENRE_NAMES: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Science Fiction",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  10770: "TV Movie",
};

const FILMOGRAPHY_HEADING_PREFIXES: Record<string, string> = {
  Acting: "Films starring",
  Directing: "Films directed by",
  Writing: "Films written by",
  Production: "Films produced by",
  Editing: "Films edited by",
  Camera: "Films photographed by",
  Sound: "Films with sound by",
  Art: "Films with art direction by",
  "Costume & Make-Up": "Films with costume and makeup by",
  "Visual Effects": "Films with visual effects by",
  Lighting: "Films lit by",
  Crew: "Films featuring work by",
};

const FILMOGRAPHY_ROLE_LABELS: Record<string, string> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
  Editing: "Editor",
};

export function filmographyRoleLabel(department: string): string {
  return FILMOGRAPHY_ROLE_LABELS[department] || department;
}

export function filmographyHeadingPrefix(department: string): string {
  return FILMOGRAPHY_HEADING_PREFIXES[department] || "Films featuring work by";
}

export function filmographyPageTitle(
  department: string,
  personName: string,
): string {
  return filmographyHeadingPrefix(department) + " " + personName;
}

const DEPARTMENT_ORDER = [
  "Acting",
  "Directing",
  "Writing",
  "Production",
  "Editing",
  "Camera",
  "Sound",
  "Art",
  "Costume & Make-Up",
  "Visual Effects",
  "Lighting",
  "Crew",
];

function creditDate(credit: PersonCredit): string {
  return credit.release_date || credit.first_air_date || "";
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilmographyFilters(query: {
  media?: string | string[];
  decade?: string | string[];
  genre?: string | string[];
  sort?: string | string[];
}): FilmographyFilters {
  const media = firstQueryValue(query.media);
  const decade = firstQueryValue(query.decade);
  const genre = firstQueryValue(query.genre);
  const sort = firstQueryValue(query.sort);

  return {
    media: media === "movie" || media === "tv" ? media : "all",
    decade: decade && /^\d{3}0$/.test(decade) ? decade : "all",
    genre: genre && /^\d+$/.test(genre) ? genre : "all",
    sort:
      sort === "oldest" || sort === "rating" || sort === "popularity"
        ? sort
        : "newest",
  };
}

export function buildFilmographyDecades(
  credits: FilmographyCredit[],
): string[] {
  const decades = new Set<number>();
  for (const credit of credits) {
    const year = Number(creditDate(credit).slice(0, 4));
    if (Number.isInteger(year) && year > 0) {
      decades.add(Math.floor(year / 10) * 10);
    }
  }
  return Array.from(decades)
    .sort((a, b) => b - a)
    .map(String);
}

export function buildFilmographyGenres(
  credits: FilmographyCredit[],
): FilmographyGenreOption[] {
  const genreIds = new Set<number>();
  for (const credit of credits) {
    for (const genreId of credit.genre_ids ?? []) {
      if (GENRE_NAMES[genreId]) genreIds.add(genreId);
    }
  }
  return Array.from(genreIds)
    .map((id) => ({ id, name: GENRE_NAMES[id] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function constrainFilmographyFilters(
  filters: FilmographyFilters,
  decades: string[],
  genres: FilmographyGenreOption[],
): FilmographyFilters {
  return {
    ...filters,
    decade:
      filters.decade === "all" || decades.includes(filters.decade)
        ? filters.decade
        : "all",
    genre:
      filters.genre === "all" ||
      genres.some((genre) => String(genre.id) === filters.genre)
        ? filters.genre
        : "all",
  };
}

function stableCreditTitle(credit: FilmographyCredit): string {
  return credit.title || credit.name || "";
}

export function filterAndSortFilmographyCredits(
  credits: FilmographyCredit[],
  filters: FilmographyFilters,
): FilmographyCredit[] {
  const decadeStart = filters.decade === "all" ? null : Number(filters.decade);
  const genreId = filters.genre === "all" ? null : Number(filters.genre);

  const filtered = credits.filter(function (credit) {
    if (filters.media !== "all" && credit.media_type !== filters.media) {
      return false;
    }
    if (decadeStart !== null) {
      const year = Number(creditDate(credit).slice(0, 4));
      if (year < decadeStart || year >= decadeStart + 10) return false;
    }
    if (genreId !== null && !(credit.genre_ids ?? []).includes(genreId)) {
      return false;
    }
    return true;
  });

  return filtered.sort(function (a, b) {
    if (filters.sort === "oldest") {
      return (
        creditDate(a).localeCompare(creditDate(b)) ||
        stableCreditTitle(a).localeCompare(stableCreditTitle(b))
      );
    }
    if (filters.sort === "rating") {
      return (
        (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0) ||
        creditDate(b).localeCompare(creditDate(a))
      );
    }
    if (filters.sort === "popularity") {
      return (
        (b.popularity ?? 0) - (a.popularity ?? 0) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0) ||
        creditDate(b).localeCompare(creditDate(a))
      );
    }
    return (
      creditDate(b).localeCompare(creditDate(a)) ||
      stableCreditTitle(a).localeCompare(stableCreditTitle(b))
    );
  });
}

function departmentSlug(department: string): string {
  const roleSlugs: Record<string, string> = {
    Acting: "actor",
    Directing: "director",
    Writing: "writer",
    Production: "producer",
    Editing: "editor",
    Camera: "camera",
    Sound: "sound",
    Art: "art",
    "Costume & Make-Up": "costume-and-makeup",
    "Visual Effects": "visual-effects",
    Lighting: "lighting",
    Crew: "crew",
  };
  if (roleSlugs[department]) return roleSlugs[department];
  return department
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sortedDepartments(
  labels: string[],
  knownForDepartment?: string | null,
): string[] {
  const preferred = knownForDepartment?.trim();
  return labels.sort(function (a, b) {
    if (preferred && a === preferred) return -1;
    if (preferred && b === preferred) return 1;
    const aIndex = DEPARTMENT_ORDER.indexOf(a);
    const bIndex = DEPARTMENT_ORDER.indexOf(b);
    const aRank = aIndex === -1 ? DEPARTMENT_ORDER.length : aIndex;
    const bRank = bIndex === -1 ? DEPARTMENT_ORDER.length : bIndex;
    return aRank - bRank || a.localeCompare(b);
  });
}

export function buildFilmographyDepartments(
  input: FilmographyInput,
): FilmographyDepartment[] {
  const grouped = new Map<string, Map<string, FilmographyCredit>>();

  function addCredits(
    credits: PersonCredit[] | undefined,
    mediaType: "movie" | "tv",
    castDepartment?: "Acting",
  ) {
    for (const credit of credits ?? []) {
      const department = castDepartment || credit.department?.trim() || "Crew";
      const role =
        (castDepartment ? credit.character : credit.job)?.trim() || department;
      const departmentCredits =
        grouped.get(department) ?? new Map<string, FilmographyCredit>();
      const key = mediaType + ":" + credit.id;
      const existing = departmentCredits.get(key);

      if (existing) {
        if (!existing.roles.includes(role)) existing.roles.push(role);
        if (!existing.poster_path && credit.poster_path)
          existing.poster_path = credit.poster_path;
      } else {
        departmentCredits.set(key, {
          ...credit,
          media_type: mediaType,
          roles: [role],
        });
      }
      grouped.set(department, departmentCredits);
    }
  }

  addCredits(input.movieCredits?.cast, "movie", "Acting");
  addCredits(input.movieCredits?.crew, "movie");
  addCredits(input.tvCredits?.cast, "tv", "Acting");
  addCredits(input.tvCredits?.crew, "tv");

  return sortedDepartments(
    Array.from(grouped.keys()),
    input.knownForDepartment,
  ).map(function (label) {
    const items = Array.from(grouped.get(label)?.values() ?? []).sort(
      function (a, b) {
        return (
          creditDate(b).localeCompare(creditDate(a)) ||
          (b.vote_count ?? 0) - (a.vote_count ?? 0)
        );
      },
    );
    return { label, slug: departmentSlug(label), items };
  });
}
