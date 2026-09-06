import { TMDB_IMAGE_BASE } from "@/lib/tmdb/constants";

export const COMPANY_TITLE_LIMIT = 48;
export const COMPANY_REVALIDATE_SECONDS = 86400;
export const TMDB_COMPANY_PAGE = "https://www.themoviedb.org/company/";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export type CompanyParent = {
  id: number;
  name: string;
};

export type CompanyDetail = {
  id: number;
  name: string;
  description: string;
  headquarters: string;
  homepage: string;
  logo_path: string | null;
  origin_country: string;
  parent_company: CompanyParent | null;
};

export type CompanyTitle = {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asHttpUrl(value: unknown): string {
  const raw = asTrimmedString(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function parseCompanyDetail(value: unknown): CompanyDetail | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asFiniteNumber(record.id);
  const name = asTrimmedString(record.name);
  if (id == null || id <= 0 || !name) return null;

  const parentRecord = asRecord(record.parent_company);
  const parentId = parentRecord ? asFiniteNumber(parentRecord.id) : null;
  const parentName = parentRecord ? asTrimmedString(parentRecord.name) : "";
  const parent_company =
    parentId != null && parentId > 0 && parentName
      ? { id: parentId, name: parentName }
      : null;

  const logoPath =
    typeof record.logo_path === "string" && record.logo_path.trim()
      ? record.logo_path
      : null;

  return {
    id: id,
    name: name,
    description: asTrimmedString(record.description),
    headquarters: asTrimmedString(record.headquarters),
    homepage: asHttpUrl(record.homepage),
    logo_path: logoPath,
    origin_country: asTrimmedString(record.origin_country),
    parent_company: parent_company,
  };
}

export function parseCompanyTitles(
  value: unknown,
  mediaType: "movie" | "tv",
): CompanyTitle[] {
  const record = asRecord(value);
  const results = record && Array.isArray(record.results) ? record.results : [];
  const titles: CompanyTitle[] = [];

  for (var i = 0; i < results.length; i++) {
    var item = asRecord(results[i]);
    if (!item) continue;
    var id = asFiniteNumber(item.id);
    if (id == null || id <= 0) continue;
    var title = asTrimmedString(item.title);
    var name = asTrimmedString(item.name);
    if (!title && !name) continue;
    titles.push({
      id: id,
      title: title || undefined,
      name: name || undefined,
      media_type: mediaType,
      poster_path:
        typeof item.poster_path === "string" && item.poster_path
          ? item.poster_path
          : null,
      release_date: asTrimmedString(item.release_date) || undefined,
      first_air_date: asTrimmedString(item.first_air_date) || undefined,
      popularity: asFiniteNumber(item.popularity) ?? 0,
    });
  }

  return titles;
}

export function mergeCompanyTitles(
  movies: CompanyTitle[],
  shows: CompanyTitle[],
  limit: number,
): CompanyTitle[] {
  const combined = movies.concat(shows).slice();
  combined.sort(function (a, b) {
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    return a.id - b.id;
  });

  const seen: Record<string, true> = {};
  const merged: CompanyTitle[] = [];
  for (var i = 0; i < combined.length; i++) {
    var item = combined[i];
    var key = item.media_type + ":" + item.id;
    if (seen[key]) continue;
    seen[key] = true;
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function companyLogoUrl(path: string | null): string | null {
  if (!path) return null;
  return TMDB_IMAGE_BASE + "/w185" + path;
}

export function companyTitleLabel(title: CompanyTitle): string {
  return title.title || title.name || "Untitled";
}

async function tmdbGet(
  path: string,
  apiKey: string,
  search: Record<string, string>,
): Promise<unknown | null> {
  const url = new URL(TMDB_API_BASE + path);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  Object.keys(search).forEach(function (key) {
    url.searchParams.set(key, search[key]);
  });
  const response = await fetch(url.toString(), {
    next: { revalidate: COMPANY_REVALIDATE_SECONDS },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCompanyPageData(id: string): Promise<{
  company: CompanyDetail | null;
  titles: CompanyTitle[];
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const [companyJson, moviesJson, showsJson] = await Promise.all([
    tmdbGet("/company/" + id, apiKey, {}),
    tmdbGet("/discover/movie", apiKey, {
      with_companies: id,
      sort_by: "popularity.desc",
      page: "1",
    }),
    tmdbGet("/discover/tv", apiKey, {
      with_companies: id,
      sort_by: "popularity.desc",
      page: "1",
    }),
  ]);

  const company = parseCompanyDetail(companyJson);
  if (!company) return { company: null, titles: [] };

  return {
    company: company,
    titles: mergeCompanyTitles(
      parseCompanyTitles(moviesJson, "movie"),
      parseCompanyTitles(showsJson, "tv"),
      COMPANY_TITLE_LIMIT,
    ),
  };
}
