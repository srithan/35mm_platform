import type { PostCardProps } from "./types";

function areStringArraysEqual(a?: string[], b?: string[]) {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (var index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function areFilmCardsEqual(
  prev?: PostCardProps["filmCard"],
  next?: PostCardProps["filmCard"]
) {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.title === next.title &&
    prev.year === next.year &&
    prev.genre === next.genre &&
    prev.posterUrl === next.posterUrl &&
    prev.rating === next.rating
  );
}

function areAttachedFilmsEqual(
  prev?: PostCardProps["attachedFilm"],
  next?: PostCardProps["attachedFilm"]
) {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.id === next.id &&
    prev.tmdbId === next.tmdbId &&
    prev.title === next.title &&
    prev.year === next.year &&
    prev.posterUrl === next.posterUrl &&
    prev.rating === next.rating &&
    areStringArraysEqual(prev.genres, next.genres)
  );
}

function areLinkPreviewsEqual(
  prev?: PostCardProps["linkPreview"],
  next?: PostCardProps["linkPreview"]
) {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.url === next.url &&
    prev.title === next.title &&
    prev.description === next.description &&
    prev.image === next.image &&
    prev.domain === next.domain &&
    prev.provider === next.provider
  );
}

function areReplyPreviewsEqual(
  prev?: PostCardProps["replyPreview"],
  next?: PostCardProps["replyPreview"]
) {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.username === next.username &&
    prev.text === next.text &&
    prev.time === next.time
  );
}

function areMediaItemsEqual(
  prev?: PostCardProps["media"],
  next?: PostCardProps["media"]
) {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;

  for (var index = 0; index < prev.length; index += 1) {
    var a = prev[index];
    var b = next[index];
    if (!a || !b) return false;
    if (a.type !== b.type) return false;
    if (a.url !== b.url) return false;
    if ((a.blurhash ?? null) !== (b.blurhash ?? null)) return false;
    if ((a.variants?.thumb ?? null) !== (b.variants?.thumb ?? null)) return false;
    if ((a.variants?.feed ?? null) !== (b.variants?.feed ?? null)) return false;
    if ((a.variants?.full ?? null) !== (b.variants?.full ?? null)) return false;
  }

  return true;
}

function arePollsEqual(prev?: PostCardProps["poll"], next?: PostCardProps["poll"]) {
  if (prev === next) return true;
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  if (
    prev.id !== next.id ||
    prev.type !== next.type ||
    prev.resultsVisibility !== next.resultsVisibility ||
    prev.endsAt !== next.endsAt ||
    prev.totalVotes !== next.totalVotes ||
    prev.hasVoted !== next.hasVoted ||
    prev.isEnded !== next.isEnded ||
    prev.resultsVisible !== next.resultsVisible ||
    !areStringArraysEqual(prev.selectedOptionIds, next.selectedOptionIds) ||
    prev.options.length !== next.options.length
  ) {
    return false;
  }
  for (var index = 0; index < prev.options.length; index += 1) {
    var a = prev.options[index];
    var b = next.options[index];
    if (!a || !b) return false;
    if (
      a.id !== b.id ||
      a.label !== b.label ||
      a.imageUrl !== b.imageUrl ||
      a.position !== b.position ||
      a.voteCount !== b.voteCount ||
      a.percent !== b.percent
    ) {
      return false;
    }
  }
  return true;
}

export function arePostCardPropsEqual(prev: PostCardProps, next: PostCardProps) {
  return (
    prev.variant === next.variant &&
    prev.sourcePostType === next.sourcePostType &&
    prev.username === next.username &&
    prev.userId === next.userId &&
    prev.handle === next.handle &&
    prev.postId === next.postId &&
    prev.displayName === next.displayName &&
    prev.timestamp === next.timestamp &&
    prev.avatarInitial === next.avatarInitial &&
    prev.avatarUrl === next.avatarUrl &&
    prev.avatarBg === next.avatarBg &&
    prev.avatarColor === next.avatarColor &&
    prev.headline === next.headline &&
    prev.text === next.text &&
    prev.editBody === next.editBody &&
    prev.filmRef === next.filmRef &&
    areFilmCardsEqual(prev.filmCard, next.filmCard) &&
    areAttachedFilmsEqual(prev.attachedFilm, next.attachedFilm) &&
    prev.imageSrc === next.imageSrc &&
    prev.imageCaption === next.imageCaption &&
    prev.prioritizeMedia === next.prioritizeMedia &&
    areMediaItemsEqual(prev.media, next.media) &&
    areStringArraysEqual(prev.mediaUrls, next.mediaUrls) &&
    areStringArraysEqual(prev.viewerMediaUrls, next.viewerMediaUrls) &&
    arePollsEqual(prev.poll, next.poll) &&
    prev.saveData === next.saveData &&
    areLinkPreviewsEqual(prev.linkPreview, next.linkPreview) &&
    prev.likeCount === next.likeCount &&
    prev.liked === next.liked &&
    prev.bookmarked === next.bookmarked &&
    prev.bookmarkFolderId === next.bookmarkFolderId &&
    prev.reposted === next.reposted &&
    prev.commentCount === next.commentCount &&
    areReplyPreviewsEqual(prev.replyPreview, next.replyPreview) &&
    prev.replyCount === next.replyCount &&
    prev.animationDelay === next.animationDelay &&
    prev.disableAnimation === next.disableAnimation &&
    prev.tab === next.tab &&
    prev.role === next.role &&
    prev.roleContext === next.roleContext &&
    prev.filmsLoggedCount === next.filmsLoggedCount
  );
}
