import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const webRoot = new URL("../", import.meta.url);
const catalogRoot = new URL("features/landing/lib/", webRoot);
const policy = JSON.parse(await readFile(new URL("landingPosterPolicy.json", catalogRoot), "utf8"));

if (!process.env.TMDB_API_KEY) {
  process.loadEnvFile(fileURLToPath(new URL(".env.local", webRoot)));
}
const apiKey = process.env.TMDB_API_KEY;
if (!apiKey) throw new Error("TMDB_API_KEY is required to refresh landing posters.");

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.search = new URLSearchParams({ api_key: apiKey, language: "en-US", ...params });
  // Never include the request URL in errors: it contains the API credential.
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new Error(`TMDB request failed for ${path}.`);
  }
  if (!response.ok) throw new Error(`TMDB ${path} returned HTTP ${response.status}.`);
  return response.json();
}

const excludedPeople = new Set(policy.excludedPeople.map((person) => person.tmdbId));
const excludedFilms = new Set();
for (const person of policy.excludedPeople) {
  const credits = await tmdb(`person/${person.tmdbId}/movie_credits`);
  if (!Array.isArray(credits.cast) || !Array.isArray(credits.crew)) {
    throw new Error(`Missing filmography for excluded person ${person.name}.`);
  }
  for (const film of [...credits.cast, ...credits.crew]) excludedFilms.add(film.id);
}

async function verifiedFilm(tmdbId, group, country, requiredCastPersonId) {
  if (excludedFilms.has(tmdbId)) return null;
  const film = await tmdb(`movie/${tmdbId}`, { append_to_response: "credits" });
  if (!Array.isArray(film.credits?.cast) || !Array.isArray(film.credits?.crew)) {
    throw new Error(`Cannot verify credits for ${tmdbId}.`);
  }
  const castPersonIds = [...new Set(film.credits.cast.map((person) => person.id))];
  const creditedPersonIds = [...new Set([...castPersonIds, ...film.credits.crew.map((person) => person.id)])];
  if (creditedPersonIds.length === 0 || creditedPersonIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error(`Incomplete credit identities for ${tmdbId}.`);
  }
  if (creditedPersonIds.some((id) => excludedPeople.has(id))) return null;
  if (requiredCastPersonId && !castPersonIds.includes(requiredCastPersonId)) return null;
  if (film.original_language !== group.code || !film.poster_path || film.adult) return null;
  const productionCountries = film.production_countries.map((entry) => entry.iso_3166_1);
  if (country && !productionCountries.includes(country)) return null;
  return {
    tmdbId: film.id,
    title: film.title,
    language: film.original_language,
    src: `https://image.tmdb.org/t/p/w342${film.poster_path}`,
    productionCountries,
    castPersonIds,
    creditedPersonIds,
  };
}

async function selectLanguage(group) {
  const quota = group.code === policy.featuredLanguage.code
    ? policy.featuredLanguage.films
    : policy.filmsPerLanguage;
  const countryRotation = policy.countryRotation[group.code];
  if (countryRotation && countryRotation.length !== quota) {
    throw new Error(`Country rotation must fill exactly ${quota} slots for ${group.label}.`);
  }
  const pinned = policy.pinnedFilms?.[group.code];
  if (pinned) {
    if (pinned.tmdbIds.length !== quota) {
      throw new Error(`Pinned films must fill exactly ${quota} slots for ${group.label}.`);
    }
    const films = [];
    for (let index = 0; index < pinned.tmdbIds.length; index++) {
      const tmdbId = pinned.tmdbIds[index];
      const country = policy.countryRotation[group.code]?.[index];
      const film = await verifiedFilm(tmdbId, group, country, pinned.requiredCastPersonId);
      if (!film) throw new Error(`Pinned film ${tmdbId} failed curation checks for ${group.label}.`);
      films.push(film);
    }
    return films;
  }
  const films = [];
  const seen = new Set();
  const countries = countryRotation ?? [undefined];
  for (const country of countries) {
    const target = countryRotation ? films.length + 1 : quota;
    // Bounded, offline metadata collection; never run on a landing-page request.
    for (let page = 1; page <= 5 && films.length < target; page++) {
      const result = await tmdb("discover/movie", {
        with_original_language: group.code,
        ...(country ? { with_origin_country: country } : {}),
        include_adult: "false",
        sort_by: "vote_count.desc",
        page: String(page),
      });
      if (!Array.isArray(result.results)) throw new Error(`Missing results for ${group.label}.`);
      for (const candidate of result.results) {
        if (films.length === target) break;
        if (!candidate.poster_path || candidate.adult || excludedFilms.has(candidate.id) || seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        const film = await verifiedFilm(candidate.id, group, country);
        if (film) films.push(film);
      }
      if (page >= result.total_pages) break;
    }
    if (films.length !== target) throw new Error(`Insufficient verified posters for ${group.label}${country ? ` (${country})` : ""}.`);
  }
  return films;
}

// Four workers bound metadata request concurrency and preserve policy ordering.
const selections = new Array(policy.languages.length);
let nextGroup = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (nextGroup < policy.languages.length) {
    const index = nextGroup++;
    selections[index] = await selectLanguage(policy.languages[index]);
  }
}));

const featuredIndex = policy.languages.findIndex((group) => group.code === policy.featuredLanguage.code);
if (featuredIndex < 0) throw new Error("Featured language is not in the curation policy.");
const featured = selections[featuredIndex];
const otherSelections = selections.filter((_, index) => index !== featuredIndex);
const international = [];
for (let round = 0; round < policy.filmsPerLanguage; round++) {
  for (const selection of otherSelections) international.push(selection[round]);
}
const totalFilms = featured.length + international.length;
const featuredSlots = new Map(featured.map((film, index) => [Math.floor(index * totalFilms / featured.length), film]));
let nextInternational = 0;
// Space the featured language uniformly, keeping every other language in round-robin order.
const auditFilms = Array.from({ length: totalFilms }, (_, index) =>
  featuredSlots.get(index) ?? international[nextInternational++]);
if (new Set(auditFilms.map((film) => film.tmdbId)).size !== auditFilms.length ||
    new Set(auditFilms.map((film) => film.src)).size !== auditFilms.length) {
  throw new Error("Duplicate films or poster assets in landing selection.");
}

const posters = auditFilms.map(({ tmdbId, title, language, src }) => ({ tmdbId, title, language, src }));
const verifiedAt = new Date().toISOString();
// Validate the complete selection before updating either output. Audit data is not imported by the client.
const auditContents = [
  "{",
  `  "verifiedAt": ${JSON.stringify(verifiedAt)},`,
  `  "excludedFilmIds": ${JSON.stringify([...excludedFilms].sort((a, b) => a - b))},`,
  '  "films": [',
  auditFilms.map((film) => `    ${JSON.stringify(film)}`).join(",\n"),
  "  ]",
  "}",
  "",
].join("\n");
await writeFile(new URL("landingPosterAudit.json", catalogRoot), auditContents);
await writeFile(new URL("landingPosters.ts", catalogRoot),
  `// Generated by scripts/refresh-landing-posters.mjs. Edit landingPosterPolicy.json, then regenerate.\n` +
  `// Credits verified ${verifiedAt.slice(0, 10)}; no runtime metadata requests.\n` +
  `export const landingPosters = ${JSON.stringify(posters, null, 2)} as const;\n`);
console.log(`Verified ${posters.length} distinct posters: ${policy.featuredLanguage.films} ${policy.featuredLanguage.code} films plus ${policy.filmsPerLanguage} each for the other ${policy.languages.length - 1} languages. Excluded all cast/crew credits for ${policy.excludedPeople.map((person) => person.name).join(", ")}.`);
