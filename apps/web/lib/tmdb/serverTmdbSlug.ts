import type { CatalogPersonDetail, CatalogTitleDetail } from "@35mm/types";
import { isUrlSlug, toUrlSlug } from "@/lib/routing/slugs";
import type { PersonRoleSlug } from "@/lib/routing/personRoles";
import { resolvePersonIdentities } from "./personIdentity";
import type { TitleMedia } from "@/lib/title/paths";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TMDB_BASE = "https://api.themoviedb.org/3";
const REVALIDATE_SECONDS = 86400;
const CATALOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ResolvedTitleSlug = {
  id: string;
  tmdbId: string;
  title: string;
  description: string | null;
};

type ResolvedPersonSlug = {
  id: string;
  name: string;
};

function titleTypeMatchesMedia(type: CatalogTitleDetail["type"], media: TitleMedia): boolean {
  if (media === "movie") {
    return type === "movie" || type === "short_film" || type === "documentary";
  }
  return type === "tv_series" || type === "web_series" || type === "tv_special";
}

function tmdbExternalId(
  detail: Pick<CatalogTitleDetail | CatalogPersonDetail, "externalIds">,
): string | null {
  const value = detail.externalIds.find(function (externalId) {
    return externalId.provider === "tmdb" && /^\d+$/.test(externalId.externalId);
  })?.externalId;
  return value || null;
}

async function catalogTitle(slug: string): Promise<CatalogTitleDetail | null> {
  try {
    const response = await fetch(
      API_URL + "/v1/catalog/titles/by-slug/" + encodeURIComponent(slug),
      { next: { revalidate: 300 } },
    );
    if (response.ok) return (await response.json()) as CatalogTitleDetail;
    if (response.status !== 404) {
      console.error("[title-slug] catalog lookup failed", { slug, status: response.status });
    }
    return null;
  } catch (error) {
    console.error("[title-slug] catalog lookup unavailable", {
      slug,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function catalogPerson(slug: string): Promise<CatalogPersonDetail | null> {
    const response = await fetch(
      API_URL + "/v1/catalog/people/by-slug/" + encodeURIComponent(slug),
      { cache: "no-store" },
    );
    if (response.ok) return (await response.json()) as CatalogPersonDetail;
    if (response.status !== 404) {
      throw new Error("Person catalog lookup failed: " + response.status);
    }
    return null;
}

async function legacyFilmTmdbId(filmId: string): Promise<string | null> {
  try {
    const response = await fetch(
      API_URL + "/v1/films/" + encodeURIComponent(filmId),
      { next: { revalidate: 300 } },
    );
    if (!response.ok) {
      if (response.status !== 404) {
        console.error("[title-slug] legacy film lookup failed", {
          filmId,
          status: response.status,
        });
      }
      return null;
    }
    const film = (await response.json()) as { tmdbId?: unknown };
    return typeof film.tmdbId === "number" && film.tmdbId > 0
      ? String(film.tmdbId)
      : null;
  } catch (error) {
    console.error("[title-slug] legacy film lookup unavailable", {
      filmId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function tmdbSearch(path: string, slug: string): Promise<Record<string, unknown>[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("query", slug.replace(/-/g, " "));
  url.searchParams.set("include_adult", "false");
  const response = await fetch(url.toString(), {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    console.error("[slug-resolver] TMDB search failed", {
      path,
      slug,
      status: response.status,
    });
    return [];
  }
  const body = (await response.json()) as { results?: unknown };
  return Array.isArray(body.results)
    ? body.results.filter(function (item): item is Record<string, unknown> {
        return Boolean(item) && typeof item === "object";
      })
    : [];
}

export async function resolveTmdbTitleSlug(
  media: TitleMedia,
  slug: string,
): Promise<ResolvedTitleSlug | null> {
  if (!isUrlSlug(slug)) return null;

  const local = CATALOG_SLUG_RE.test(slug) ? await catalogTitle(slug) : null;
  if (local && titleTypeMatchesMedia(local.type, media)) {
    const tmdbId = tmdbExternalId(local) ||
      (local.legacyFilmId ? await legacyFilmTmdbId(local.legacyFilmId) : null);
    if (tmdbId) {
      return {
        id: local.legacyFilmId || tmdbId,
        tmdbId,
        title: local.primaryTitle,
        description: local.synopsis,
      };
    }
  }

  const results = await tmdbSearch("/search/" + media, slug);
  const match = results.find(function (result) {
    const title = media === "movie" ? result.title : result.name;
    return typeof title === "string" && toUrlSlug(title) === slug;
  });
  if (!match || typeof match.id !== "number") return null;
  const title = media === "movie" ? match.title : match.name;
  if (typeof title !== "string") return null;
  return {
    id: String(match.id),
    tmdbId: String(match.id),
    title,
    description: typeof match.overview === "string" && match.overview.length > 0
      ? match.overview
      : null,
  };
}

export async function resolveTmdbPersonSlug(
  slug: string,
  _expectedRole?: PersonRoleSlug,
): Promise<ResolvedPersonSlug | null> {
  if (!isUrlSlug(slug)) return null;
  const local = CATALOG_SLUG_RE.test(slug) ? await catalogPerson(slug) : null;
  const id = local ? tmdbExternalId(local) : null;
  if (local && id) return { id, name: local.primaryName };
  // Legacy bare links may bootstrap the catalog once. Role never changes ownership.
  const people = await resolvePersonIdentities({ kind: "search", query: slug.replace(/-/g, " ") });
  const match = people.find(person => person.slug === slug);
  return match ? { id: String(match.tmdbId), name: match.name } : null;
}
