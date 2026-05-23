/**
 * Film catalog is loaded from `mockShortFilmsCatalog.json`, built by merging several
 * public Vimeo channel RSS feeds (titles, thumbnails, credits, descriptions, durations,
 * signed player URLs):
 * - Staff Picks: https://vimeo.com/channels/staffpicks/videos/rss
 * - Documentary: https://vimeo.com/channels/documentaryfilm/videos/rss
 * - Short of the Week: https://vimeo.com/channels/shortoftheweek/videos/rss
 * - Music video(s): musicvideo, musicvideos
 * - Experimental, Comedy, Drama, Animation channel feeds
 *
 * Each video is tagged with a category (from the source channel plus light keyword hints).
 * Rebuild the JSON by re-running the merge script when you want fresher data.
 */

import rawCatalog from "./mockShortFilmsCatalog.json";

export type ShortFilmCategory =
  | "Narrative"
  | "Documentary"
  | "Animation"
  | "Experimental"
  | "Comedy"
  | "Drama"
  | "Music Video"
  | "Horror"
  | "Thriller"
  | "Sci-Fi"
  | "Romance";

export type ShortFilm = {
  id: string;
  title: string;
  director: string;
  durationLabel: string;
  synopsis: string;
  posterSrc: string;
  /** Not provided in the RSS feed; null hides synthetic view counts in the UI. */
  views: number | null;
  category: ShortFilmCategory;
  year: number;
  staffPick: boolean;
  /** Signed Vimeo player URL (iframe). When set, the watch page embeds the Vimeo player. */
  vimeoPlayerSrc?: string;
  /** Optional direct file URL for non-Vimeo samples. */
  videoUrl?: string;
};

export type ShortFilmShelfFeatured = {
  title: string;
  statsLine: string;
  description: string;
  href: string;
  /** CSS linear-gradient for the tall featured pillar (no thumbnail). */
  gradient: string;
  /** Large faint letter behind copy; optional, UI can derive from title. */
  watermarkLetter?: string;
};

export type ShortFilmShelf = {
  id: string;
  heading: string;
  featured: ShortFilmShelfFeatured;
  items: ShortFilm[];
};

/** Staff Picks channel hero image (Vimeo Staff Picks RSS channel image). */
export const VIMEO_STAFF_PICKS_CHANNEL_COVER =
  "https://i.vimeocdn.com/channel/578363_980?mh=250&sig=6b080883995d8d77f6f439e44a649b79fc1b5f9ea53f2fcf0f93dd730566ee7c&v=1&region=us";

const SHELF_GRADIENT_BY_ID: Record<string, string> = {
  "staff-picks":
    "linear-gradient(145deg,#1e1b4b 0%,#9f1239 48%,#0f172a 100%)",
  documentary:
    "linear-gradient(120deg,#064e3b 0%,#059669 42%,#022c22 100%)",
  animation:
    "linear-gradient(120deg,#4c1d95 0%,#7c3aed 50%,#1e1b4b 100%)",
  "music-videos":
    "linear-gradient(120deg,#831843 0%,#db2777 45%,#312e81 100%)",
  comedy:
    "linear-gradient(120deg,#713f12 0%,#ca8a04 38%,#422006 100%)",
  drama:
    "linear-gradient(120deg,#1e3a5f 0%,#2563eb 42%,#0f172a 100%)",
  experimental:
    "linear-gradient(135deg,#134e4a 0%,#14b8a6 45%,#042f2e 100%)",
  narrative:
    "linear-gradient(120deg,#312e81 0%,#6366f1 40%,#1e1b4b 100%)",
  "short-of-the-week":
    "linear-gradient(120deg,#0c4a6e 0%,#0ea5e9 40%,#082f49 100%)",
  horror:
    "linear-gradient(120deg,#3b0764 0%,#7f1d1d 52%,#18181b 100%)",
  thriller:
    "linear-gradient(120deg,#292524 0%,#57534e 45%,#0c0a09 100%)",
  "sci-fi":
    "linear-gradient(120deg,#172554 0%,#6366f1 42%,#0f172a 100%)",
  romance:
    "linear-gradient(120deg,#500724 0%,#f43f5e 40%,#312e81 100%)",
};

const SHELF_GRADIENT_FALLBACKS: string[] = [
  "linear-gradient(120deg,#111827,#374151,#0f172a)",
  "linear-gradient(120deg,#14532d,#15803d,#064e3b)",
  "linear-gradient(120deg,#450a0a,#b91c1c,#18181b)",
];

export function shelfFeaturedGradient(shelfId: string): string {
  const preset = SHELF_GRADIENT_BY_ID[shelfId];
  if (preset) return preset;
  let h = 0;
  for (let i = 0; i < shelfId.length; i++) {
    h = (h * 31 + shelfId.charCodeAt(i)) | 0;
  }
  return SHELF_GRADIENT_FALLBACKS[Math.abs(h) % SHELF_GRADIENT_FALLBACKS.length];
}

function shelfWatermarkFromHeading(heading: string): string {
  for (let i = 0; i < heading.length; i++) {
    const c = heading.charAt(i);
    if (/[A-Za-z0-9]/.test(c)) {
      return c.toUpperCase();
    }
  }
  return "·";
}

export const MOCK_SHORT_FILMS: ShortFilm[] = rawCatalog as ShortFilm[];

function byCategory(cat: ShortFilmCategory): ShortFilm[] {
  return MOCK_SHORT_FILMS.filter(function (f) {
    return f.category === cat;
  });
}

function staffPicks(): ShortFilm[] {
  return MOCK_SHORT_FILMS.filter(function (f) {
    return f.staffPick;
  });
}

function withShelfPadding(core: ShortFilm[], min: number): ShortFilm[] {
  const ids: Record<string, boolean> = {};
  const merged: ShortFilm[] = [];
  for (let j = 0; j < core.length; j++) {
    const f = core[j];
    if (!ids[f.id]) {
      ids[f.id] = true;
      merged.push(f);
    }
  }
  for (let k = 0; k < MOCK_SHORT_FILMS.length && merged.length < min; k++) {
    const f = MOCK_SHORT_FILMS[k];
    if (!ids[f.id]) {
      ids[f.id] = true;
      merged.push(f);
    }
  }
  return merged;
}

type CategoryShelfBlueprint = {
  id: string;
  heading: string;
  category: ShortFilmCategory;
  description: string;
  statsHint: string;
  minItems: number;
};

const CATEGORY_SHELF_BLUEPRINTS: CategoryShelfBlueprint[] = [
  {
    id: "documentary",
    heading: "Documentary",
    category: "Documentary",
    description:
      "Nonfiction portraits, essays, and vérité moments from Vimeo’s documentary channel and Staff Picks.",
    statsHint: "Real stories · Multiple Vimeo channels",
    minItems: 10,
  },
  {
    id: "animation",
    heading: "Animation",
    category: "Animation",
    description:
      "Hand-drawn, CG, and stop-motion shorts — including picks from the animation and Staff Picks feeds.",
    statsHint: "Animated shorts · Curated channels",
    minItems: 10,
  },
  {
    id: "music-videos",
    heading: "Music videos",
    category: "Music Video",
    description:
      "Official promos and experimental music films from Vimeo’s music video channels.",
    statsHint: "Promos & visual albums",
    minItems: 10,
  },
  {
    id: "comedy",
    heading: "Comedy",
    category: "Comedy",
    description: "Funny, awkward, and sharp — straight from Vimeo’s comedy channel.",
    statsHint: "Laugh-focused shorts",
    minItems: 10,
  },
  {
    id: "drama",
    heading: "Drama",
    category: "Drama",
    description: "Character-driven tension and emotional payoff from the drama channel.",
    statsHint: "Performance-forward storytelling",
    minItems: 10,
  },
  {
    id: "experimental",
    heading: "Experimental",
    category: "Experimental",
    description: "Form-breaking visuals and sound from the experimental channel.",
    statsHint: "Bold form & sound",
    minItems: 10,
  },
  {
    id: "narrative",
    heading: "Narrative shorts",
    category: "Narrative",
    description:
      "Story-first work from Staff Picks, Short of the Week, and other narrative-heavy feeds.",
    statsHint: "Plot, character, payoff",
    minItems: 10,
  },
  {
    id: "short-of-the-week",
    heading: "Short of the Week",
    category: "Narrative",
    description:
      "A rotating spotlight in the spirit of Vimeo’s Short of the Week channel — festival-ready fiction.",
    statsHint: "From the Short of the Week channel",
    minItems: 10,
  },
  {
    id: "horror",
    heading: "Horror & late night",
    category: "Horror",
    description: "Creeps and dread from genre-tagged picks; row fills out with adjacent thrillers from the catalog.",
    statsHint: "Genre picks · Padded row",
    minItems: 8,
  },
];

const EXTRA_CATEGORY_SHELVES: ShortFilmCategory[] = [
  "Thriller",
  "Sci-Fi",
  "Romance",
];

function buildCategoryShelf(bp: CategoryShelfBlueprint): ShortFilmShelf | null {
  let core = byCategory(bp.category);
  if (bp.id === "short-of-the-week") {
    core = core.filter(function (f) {
      return !f.staffPick;
    });
    if (core.length < 4) {
      core = byCategory("Narrative");
    }
  }
  if (core.length === 0) {
    return null;
  }
  const items = withShelfPadding(core, bp.minItems);
  const lead = items[0];
  return {
    id: bp.id,
    heading: bp.heading,
    featured: {
      title: bp.heading,
      statsLine: items.length + " films · " + bp.statsHint,
      description: bp.description,
      gradient: shelfFeaturedGradient(bp.id),
      watermarkLetter: shelfWatermarkFromHeading(bp.heading),
      href: "/short-films/" + lead.id,
    },
    items: items,
  };
}

function buildExtraCategoryShelf(category: ShortFilmCategory): ShortFilmShelf | null {
  const core = byCategory(category);
  if (core.length === 0) {
    return null;
  }
  const items = withShelfPadding(core, 8);
  const lead = items[0];
  const headings: Partial<Record<ShortFilmCategory, string>> = {
    Thriller: "Thrillers",
    "Sci-Fi": "Sci‑Fi & fantasy",
    Romance: "Romance",
  };
  const heading = headings[category] || category;
  const sid = category.toLowerCase().replace(/\s+/g, "-");
  return {
    id: sid,
    heading: heading,
    featured: {
      title: heading,
      statsLine: items.length + " films · " + category + " picks",
      description:
        "Genre-tagged shorts from the merged Vimeo feeds. Row may include similar films to keep the shelf full.",
      gradient: shelfFeaturedGradient(sid),
      watermarkLetter: shelfWatermarkFromHeading(heading),
      href: "/short-films/" + lead.id,
    },
    items: items,
  };
}

export const SHORT_FILMS_HERO_SLIDES: ShortFilm[] = (function () {
  const picks = staffPicks();
  return picks.slice(0, 6);
})();

export const MOCK_SHORT_FILM_SHELVES: ShortFilmShelf[] = (function () {
  const staff = staffPicks();
  const staffItems = withShelfPadding(staff, 12);
  const staffLead = staffItems[0];
  const shelves: ShortFilmShelf[] = [
    {
      id: "staff-picks",
      heading: "Watch human-curated Staff Picks",
      featured: {
        title: "Staff Picks",
        statsLine: staffItems.length + " films · Vimeo Staff Picks channel",
        description:
          "The flagship short-film row — handpicked Staff Picks plus nearby highlights from the same catalog.",
        gradient: shelfFeaturedGradient("staff-picks"),
        watermarkLetter: "S",
        href: "/short-films/" + (staffLead ? staffLead.id : "1181253306"),
      },
      items: staffItems,
    },
  ];

  for (let i = 0; i < CATEGORY_SHELF_BLUEPRINTS.length; i++) {
    const s = buildCategoryShelf(CATEGORY_SHELF_BLUEPRINTS[i]);
    if (s) {
      shelves.push(s);
    }
  }

  for (let j = 0; j < EXTRA_CATEGORY_SHELVES.length; j++) {
    const ex = buildExtraCategoryShelf(EXTRA_CATEGORY_SHELVES[j]);
    if (ex) {
      shelves.push(ex);
    }
  }

  return shelves;
})();

export function directorAvatarSrc(filmId: string): string {
  return "https://picsum.photos/seed/vimeo-credit-" + filmId + "/96/96";
}

export function getShortFilmById(id: string): ShortFilm | undefined {
  return MOCK_SHORT_FILMS.find(function (f) {
    return f.id === id;
  });
}
