import { describe, expect, it } from "vitest";
import audit from "./landingPosterAudit.json";
import policy from "./landingPosterPolicy.json";
import { landingPosters } from "./landingPosters";

describe("landing poster curation", () => {
  it("excludes the requested actors by identity from all verified cast and crew credits", () => {
    expect(policy.excludedPeople.map((person) => person.tmdbId)).toEqual([91547, 148360, 587982]);
    const people = new Set(policy.excludedPeople.map((person) => person.tmdbId));
    const films = new Set(audit.excludedFilmIds);

    for (const film of audit.films) {
      expect(film.creditedPersonIds.length, `Missing credits: ${film.title}`).toBeGreaterThan(0);
      expect(films.has(film.tmdbId), `Excluded film: ${film.title}`).toBe(false);
      expect(film.creditedPersonIds.some((id) => people.has(id)), `Excluded person in ${film.title}`).toBe(false);
    }
  });

  it("only renders the credit-verified selection, without duplicate films or posters", () => {
    expect(landingPosters).toEqual(audit.films.map(({ tmdbId, title, language, src }) => ({ tmdbId, title, language, src })));
    expect(new Set(landingPosters.map((film) => film.tmdbId)).size).toBe(landingPosters.length);
    expect(new Set(landingPosters.map((film) => film.src)).size).toBe(landingPosters.length);
  });

  it("gives Hollywood more presence while retaining four films from every other language", () => {
    expect(policy.featuredLanguage).toEqual({ code: "en", films: 24 });
    expect(landingPosters).toHaveLength((policy.languages.length - 1) * policy.filmsPerLanguage + policy.featuredLanguage.films);
    for (const group of policy.languages) {
      const quota = group.code === policy.featuredLanguage.code ? policy.featuredLanguage.films : policy.filmsPerLanguage;
      expect(landingPosters.filter((film) => film.language === group.code), group.label).toHaveLength(quota);
    }
    const englishPositions = landingPosters.flatMap((film, index) => film.language === "en" ? [index] : []);
    englishPositions.forEach((position, index) => {
      const next = englishPositions[(index + 1) % englishPositions.length];
      const gap = (next - position + landingPosters.length) % landingPosters.length;
      expect(gap).toBeGreaterThanOrEqual(4);
      expect(gap).toBeLessThanOrEqual(5);
    });
    expect(audit.films.filter((film) => film.language === "en" && film.productionCountries.includes("US")).length).toBeGreaterThanOrEqual(21);
    const international = landingPosters.filter((film) => film.language !== policy.featuredLanguage.code);
    const groups = policy.languages.filter((group) => group.code !== policy.featuredLanguage.code);
    international.forEach((film, index) => {
      expect(film.language).toBe(groups[index % groups.length].code);
    });
  });

  it("includes US, British, Australian, and Nigerian productions in the English selection", () => {
    const english = audit.films.filter((film) => film.language === "en");
    policy.countryRotation.en.forEach((country, index) => {
      expect(english[index].productionCountries).toContain(country);
    });
  });

  it("keeps the four requested Suriya films evenly spaced in the Tamil slots", () => {
    const pinned = policy.pinnedFilms.ta;
    expect(pinned.tmdbIds).toEqual([38637, 368006, 855400, 1408162]);
    expect(pinned.requiredCastPersonId).toBe(85720);
    const tamilPositions = landingPosters.flatMap((film, index) => film.language === "ta" ? [index] : []);
    expect(tamilPositions).toHaveLength(4);
    pinned.tmdbIds.forEach((tmdbId, round) => {
      const index = tamilPositions[round];
      const next = tamilPositions[(round + 1) % tamilPositions.length];
      expect((next - index + landingPosters.length) % landingPosters.length).toBe(landingPosters.length / 4);
      expect(landingPosters[index].tmdbId).toBe(tmdbId);
      expect(audit.films[index].castPersonIds).toContain(pinned.requiredCastPersonId);
    });
  });
});
