/**
 * Shared sample reviews for all title pages until backend wiring exists.
 * Letterboxd-style: member rating (½★ steps) + written review.
 *
 * Pagination: the UI loads a page at a time (see MOCK_TITLE_REVIEWS_PAGE_SIZE).
 * MOCK_TITLE_REVIEW_TOTAL simulates how many exist for this title in production.
 */

export interface MockTitleReview {
  id: string;
  userName: string;
  userHandle: string;
  /** Tailwind background class for avatar circle. */
  avatarClass: string;
  /** 0.5 – 5 stars (same scale as site). */
  rating: number;
  body: string;
  dateLabel: string;
  likes: number;
  /** For sorting and filters (date shown in UI stays human-readable). */
  postedAtMs: number;
  /** When true, hidden if “hide spoilers” is on (mock; production would be NLP/crowd). */
  hasSpoiler: boolean;
}

/** Simulated total count for this title (like a server `total_count`). */
export const MOCK_TITLE_REVIEW_TOTAL = 1247;

export const MOCK_TITLE_REVIEWS_PAGE_SIZE = 8;

const AVATAR_CLASSES = [
  "bg-[#3d4a5c]",
  "bg-[#5c3d3d]",
  "bg-[#2f4a3c]",
  "bg-[#4a3d5c]",
  "bg-[#5c4a3d]",
  "bg-[#3d5c4a]",
];

const FIRST_NAMES = [
  "Maya",
  "Jordan",
  "Sam",
  "Riley",
  "Casey",
  "Quinn",
  "Avery",
  "Noor",
  "Diego",
  "Min",
  "Priya",
  "Tom",
  "Elena",
  "Chris",
  "Zoe",
];

const SNIPPETS = [
  "Rewatched this weekend and noticed new details in the sound mix.",
  "The pacing lost me in act two but the ending lands hard.",
  "Not for everyone, but exactly my kind of messy character work.",
  "Would pair with the director’s earlier short—same DNA.",
  "Saw it in a packed theater; crowd energy helped a lot.",
  "Streaming at home didn’t do the score justice—see it loud if you can.",
  "Performs better on a rewatch once you know the twist isn’t the point.",
  "A few scenes run long, but I never checked my watch.",
  "Instant add to my top ten for the year.",
  "Respectfully disagree with the hot takes—this is rock solid.",
  "Gave it three stars last year; bumping to four after another pass.",
  "The supporting cast steals every scene they’re in.",
  "Beautifully shot. Wished the script had one more pass on the B plot.",
  "Emotional whiplash in a good way.",
  "Will be thinking about the last shot for a while.",
];

const EXTRA_TAILS = [
  " Hope they release a commentary track.",
  " Curious what the deleted scenes add.",
  " Still processing the final ten minutes.",
  " Already recommended to my film group.",
];

function hashTo01(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function ratingFromIndex(i: number): number {
  const h = hashTo01(i * 13 + 7);
  const raw = 0.5 + h * 4.5;
  return Math.round(raw * 2) / 2;
}

function likesFromIndex(i: number): number {
  return 3 + Math.floor(hashTo01(i * 31 + 2) * 120);
}

function monthDayFromIndex(i: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = i % 12;
  const d = 1 + (i * 7) % 28;
  const y = 2024 + (i % 3);
  return months[m] + " " + d + ", " + y;
}

function reviewBodyAt(i: number): string {
  const a = SNIPPETS[i % SNIPPETS.length];
  const b = SNIPPETS[(i + 11) % SNIPPETS.length];
  const tail = EXTRA_TAILS[i % EXTRA_TAILS.length];
  if (i % 3 === 0) return a;
  if (i % 3 === 1) return a + " " + b;
  return a + " " + tail;
}

function reviewAtIndex(i: number): MockTitleReview {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length];
  const dup = i >= FIRST_NAMES.length ? " " + (1 + Math.floor((i - FIRST_NAMES.length) / FIRST_NAMES.length)) : "";
  const postedAtMs = 1767225600000 - i * 36 * 60 * 60 * 1000;
  return {
    id: "mock-" + i,
    userName: fn + dup,
    userHandle: "filmbuff_" + (4200 + i),
    avatarClass: AVATAR_CLASSES[i % AVATAR_CLASSES.length],
    rating: ratingFromIndex(i),
    body: reviewBodyAt(i),
    dateLabel: monthDayFromIndex(i),
    likes: likesFromIndex(i),
    postedAtMs: postedAtMs,
    hasSpoiler: hashTo01(i * 7 + 3) < 0.12,
  };
}

/** Hand-tuned first reviews (shown as part of the pool at indices 0–2). */
const SEED: MockTitleReview[] = [
  {
    id: "seed-1",
    userName: "Maya K.",
    userHandle: "mayaonfilm",
    avatarClass: "bg-[#3d4a5c]",
    rating: 4.5,
    body:
      "Saw this again in a good theater and the sound design is even better than I remembered. " +
      "Third act doesn’t over-explain, which I appreciate. Will be thinking about the last scene for a while.",
    dateLabel: "Mar 2, 2026",
    likes: 24,
    postedAtMs: 1772400000000,
    hasSpoiler: false,
  },
  {
    id: "seed-2",
    userName: "Jordan",
    userHandle: "jordanlogsit",
    avatarClass: "bg-[#5c3d3d]",
    rating: 4,
    body:
      "A bit long in the middle but the performances sell every beat. Pairs well with a rewatch of the director’s last film.",
    dateLabel: "Feb 19, 2026",
    likes: 11,
    postedAtMs: 1769900000000,
    hasSpoiler: false,
  },
  {
    id: "seed-3",
    userName: "Sam Rivera",
    userHandle: "samr",
    avatarClass: "bg-[#2f4a3c]",
    rating: 5,
    body:
      "Instant favorite of the year so far. Not sure what else to say without spoiling—just go in clean.",
    dateLabel: "Jan 8, 2026",
    likes: 42,
    postedAtMs: 1767840000000,
    hasSpoiler: true,
  },
];

const POOL_LEN = 48;
const pool: MockTitleReview[] = [];
for (let i = 0; i < POOL_LEN; i += 1) {
  if (i < SEED.length) {
    pool.push(SEED[i]);
  } else {
    pool.push(reviewAtIndex(i));
  }
}

/** Full in-memory set for the preview; server would search/filter across the full count. */
export function getMockTitleReviewsPool(): MockTitleReview[] {
  return pool.slice();
}

/** Top reviews by like count (for the Overview tab teaser). */
export function getPopularMockTitleReviews(count: number): MockTitleReview[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  const p = getMockTitleReviewsPool().slice();
  p.sort(function (a, b) {
    if (b.likes !== a.likes) return b.likes - a.likes;
    return b.postedAtMs - a.postedAtMs;
  });
  return p.slice(0, n);
}

/**
 * One page of reviews for the mock client. In production this would be `GET /titles/.../reviews?offset=&limit=`.
 */
export function fetchMockTitleReviewsPage(
  offset: number,
  limit: number
): { items: MockTitleReview[]; hasMoreInPool: boolean } {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, limit);
  const items = pool.slice(safeOffset, safeOffset + safeLimit);
  const hasMoreInPool = safeOffset + items.length < pool.length;
  return { items, hasMoreInPool };
}

/** Full pool length (all reviews we can show in the preview build). */
export function getMockTitleReviewsPoolLength(): number {
  return pool.length;
}

/** Suggested keyword chips (IMDb/Letterboxd-style). Counts are computed in the client from the pool. */
export const TITLE_REVIEW_KEYWORD_SUGGESTIONS: string[] = [
  "theater",
  "sound",
  "ending",
  "director",
  "rewatch",
  "pacing",
  "performances",
  "spoil",
];
