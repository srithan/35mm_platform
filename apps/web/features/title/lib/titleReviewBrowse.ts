import type { MockTitleReview } from "../data/mockTitleReviews";

export type ReviewSortId = "popular" | "newest" | "oldest" | "highest" | "lowest";
export type ReviewStarPreset = "all" | "4plus" | "3plus" | "below3";

export type TitleReviewBrowseInput = {
  query: string;
  sort: ReviewSortId;
  stars: ReviewStarPreset;
  /** Single keyword; must appear in the searchable text. */
  keyword: string | null;
  hideSpoilers: boolean;
};

function textBlob(r: MockTitleReview): string {
  return (r.userName + " " + r.userHandle + " " + r.body).toLowerCase();
}

function matchesStar(r: MockTitleReview, stars: ReviewStarPreset): boolean {
  if (stars === "all") return true;
  if (stars === "4plus") return r.rating >= 4;
  if (stars === "3plus") return r.rating >= 3;
  if (stars === "below3") return r.rating < 3;
  return true;
}

/**
 * Client-side browse pass (search, stars, keyword, spoiler filter, then sort).
 * With a real API, the same options become query params.
 */
export function applyTitleReviewFilters(
  pool: readonly MockTitleReview[],
  input: TitleReviewBrowseInput
): MockTitleReview[] {
  const q = input.query.trim().toLowerCase();
  const kw = input.keyword ? input.keyword.trim().toLowerCase() : "";

  const out = pool.filter(function (r) {
    if (input.hideSpoilers && r.hasSpoiler) return false;
    if (!matchesStar(r, input.stars)) return false;
    if (kw && textBlob(r).indexOf(kw) === -1) return false;
    if (q && textBlob(r).indexOf(q) === -1) return false;
    return true;
  });

  out.sort(function (a, b) {
    if (input.sort === "popular") {
      if (b.likes !== a.likes) return b.likes - a.likes;
      return b.postedAtMs - a.postedAtMs;
    }
    if (input.sort === "newest") {
      return b.postedAtMs - a.postedAtMs;
    }
    if (input.sort === "oldest") {
      return a.postedAtMs - b.postedAtMs;
    }
    if (input.sort === "highest") {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.likes - a.likes;
    }
    if (input.sort === "lowest") {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return b.likes - a.likes;
    }
    return 0;
  });

  return out;
}

export function countKeywordInReviews(
  pool: readonly MockTitleReview[],
  keyword: string
): number {
  const k = keyword.trim().toLowerCase();
  if (!k) return 0;
  let n = 0;
  for (let i = 0; i < pool.length; i += 1) {
    if (textBlob(pool[i]).indexOf(k) !== -1) n += 1;
  }
  return n;
}
