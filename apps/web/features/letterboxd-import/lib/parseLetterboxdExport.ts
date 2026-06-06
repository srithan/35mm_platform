import JSZip from "jszip";
import type { LetterboxdFilmEntry, LetterboxdImportPreview, LetterboxdImportStats } from "./types";

var DIARY_HEADERS = ["name", "year", "letterboxd uri", "rating", "watched date"];
var RATING_HEADERS = ["name", "year", "letterboxd uri", "rating"];
var WATCHLIST_HEADERS = ["name", "year", "letterboxd uri"];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function parseCsvRows(text: string): string[][] {
  var rows: string[][] = [];
  var row: string[] = [];
  var field = "";
  var inQuotes = false;

  for (var i = 0; i < text.length; i += 1) {
    var char = text[i];
    var next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some(function (cell) { return cell.trim() !== ""; })) {
        rows.push(row);
      }
      row = [];
      if (char === "\r") i += 1;
      continue;
    }

    if (char === "\r") continue;
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(function (cell) { return cell.trim() !== ""; })) {
      rows.push(row);
    }
  }

  return rows;
}

function headerIndex(headers: string[], candidates: string[]) {
  for (var i = 0; i < candidates.length; i += 1) {
    var idx = headers.indexOf(candidates[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseRating(value: string | undefined) {
  if (!value) return null;
  var rating = Number(value.trim());
  return Number.isFinite(rating) && rating > 0 ? rating : null;
}

function parseYear(value: string | undefined) {
  if (!value) return null;
  var year = Number(value.trim());
  return Number.isFinite(year) ? year : null;
}

function rowsToFilms(rows: string[][], headerCandidates: string[]): LetterboxdFilmEntry[] {
  if (rows.length < 2) return [];

  var headers = rows[0].map(normalizeHeader);
  var nameIdx = headerIndex(headers, ["name"]);
  var yearIdx = headerIndex(headers, ["year"]);
  var uriIdx = headerIndex(headers, headerCandidates);
  var ratingIdx = headerIndex(headers, ["rating"]);
  var watchedIdx = headerIndex(headers, ["watched date", "date"]);

  if (nameIdx < 0) return [];

  var films: LetterboxdFilmEntry[] = [];

  for (var r = 1; r < rows.length; r += 1) {
    var row = rows[r];
    var name = (row[nameIdx] ?? "").trim();
    if (!name) continue;

    films.push({
      name: name,
      year: parseYear(row[yearIdx]),
      rating: parseRating(row[ratingIdx]),
      watchedDate: watchedIdx >= 0 ? (row[watchedIdx] ?? "").trim() || null : null,
      letterboxdUri: uriIdx >= 0 ? (row[uriIdx] ?? "").trim() || null : null,
    });
  }

  return films;
}

function uniqueFilmKey(film: LetterboxdFilmEntry) {
  return film.name.toLowerCase() + "::" + String(film.year ?? "");
}

function mergeStats(
  diaryFilms: LetterboxdFilmEntry[],
  ratingFilms: LetterboxdFilmEntry[],
  watchlistFilms: LetterboxdFilmEntry[],
  reviewCount: number,
  listCount: number
): LetterboxdImportStats {
  var unique = new Set<string>();

  function track(films: LetterboxdFilmEntry[]) {
    for (var i = 0; i < films.length; i += 1) {
      unique.add(uniqueFilmKey(films[i]));
    }
  }

  track(diaryFilms);
  track(ratingFilms);
  track(watchlistFilms);

  var ratings = 0;
  for (var d = 0; d < diaryFilms.length; d += 1) {
    if (diaryFilms[d].rating != null) ratings += 1;
  }
  for (var r = 0; r < ratingFilms.length; r += 1) {
    if (ratingFilms[r].rating != null) ratings += 1;
  }

  return {
    diaryEntries: diaryFilms.length,
    ratings: ratings,
    watchlist: watchlistFilms.length,
    reviews: reviewCount,
    lists: listCount,
    uniqueFilms: unique.size,
  };
}

function sampleFilms(
  diaryFilms: LetterboxdFilmEntry[],
  ratingFilms: LetterboxdFilmEntry[],
  limit: number
): LetterboxdFilmEntry[] {
  var seen = new Set<string>();
  var samples: LetterboxdFilmEntry[] = [];

  function push(films: LetterboxdFilmEntry[]) {
    for (var i = 0; i < films.length; i += 1) {
      var key = uniqueFilmKey(films[i]);
      if (seen.has(key)) continue;
      seen.add(key);
      samples.push(films[i]);
      if (samples.length >= limit) return;
    }
  }

  push(diaryFilms);
  if (samples.length < limit) push(ratingFilms);
  return samples;
}

async function readZipCsv(zip: JSZip, path: string) {
  var entry = zip.file(path);
  if (!entry) return "";
  return entry.async("string");
}

function countReviewRows(rows: string[][]) {
  return Math.max(0, rows.length - 1);
}

export async function parseLetterboxdExport(file: File): Promise<LetterboxdImportPreview> {
  var lowerName = file.name.toLowerCase();
  var diaryFilms: LetterboxdFilmEntry[] = [];
  var ratingFilms: LetterboxdFilmEntry[] = [];
  var watchlistFilms: LetterboxdFilmEntry[] = [];
  var reviewCount = 0;
  var listCount = 0;

  if (lowerName.endsWith(".zip")) {
    var zip = await JSZip.loadAsync(file);
    var diaryText = await readZipCsv(zip, "diary.csv");
    var ratingsText = await readZipCsv(zip, "ratings.csv");
    var watchlistText = await readZipCsv(zip, "watchlist.csv");
    var reviewsText = await readZipCsv(zip, "reviews.csv");

    if (diaryText) diaryFilms = rowsToFilms(parseCsvRows(diaryText), DIARY_HEADERS);
    if (ratingsText) ratingFilms = rowsToFilms(parseCsvRows(ratingsText), RATING_HEADERS);
    if (watchlistText) watchlistFilms = rowsToFilms(parseCsvRows(watchlistText), WATCHLIST_HEADERS);
    if (reviewsText) reviewCount = countReviewRows(parseCsvRows(reviewsText));

    zip.forEach(function (relativePath) {
      if (relativePath.indexOf("lists/") === 0 && relativePath.endsWith(".csv")) {
        listCount += 1;
      }
    });
  } else if (lowerName.endsWith(".csv")) {
    var csvText = await file.text();
    var rows = parseCsvRows(csvText);
    var headers = rows[0] ? rows[0].map(normalizeHeader) : [];

    if (headers.indexOf("watched date") >= 0 || headers.indexOf("rewatch") >= 0) {
      diaryFilms = rowsToFilms(rows, DIARY_HEADERS);
    } else if (headers.indexOf("rating") >= 0) {
      ratingFilms = rowsToFilms(rows, RATING_HEADERS);
    } else {
      watchlistFilms = rowsToFilms(rows, WATCHLIST_HEADERS);
    }
  } else {
    throw new Error("Upload your Letterboxd export (.zip) or a diary/ratings CSV.");
  }

  var stats = mergeStats(diaryFilms, ratingFilms, watchlistFilms, reviewCount, listCount);
  var totalRows = stats.diaryEntries + stats.watchlist + ratingFilms.length + reviewCount;

  if (totalRows === 0 && listCount === 0) {
    throw new Error("We couldn't find diary, ratings, or list data in that file.");
  }

  return {
    filename: file.name,
    parsedAt: new Date().toISOString(),
    stats: stats,
    sampleFilms: sampleFilms(diaryFilms, ratingFilms, 6),
  };
}
