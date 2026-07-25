export type FilmLogCounterPost = {
  type: string;
  filmId: string | null;
  isRepost: boolean;
};

export function countsAsFilmLog(post: FilmLogCounterPost): boolean {
  return (
    post.filmId !== null &&
    !post.isRepost &&
    (post.type === "log" || post.type === "review")
  );
}

export function filmsLoggedCountDelta(
  before: FilmLogCounterPost | null,
  after: FilmLogCounterPost | null
): number {
  return Number(after !== null && countsAsFilmLog(after)) -
    Number(before !== null && countsAsFilmLog(before));
}
