import type { Comment } from "@/features/feed/types/feed";

function author(
  id: string,
  username: string,
  displayName: string
): Comment["author"] {
  return {
    id: id,
    username: username,
    displayName: displayName,
    avatarUrl: null,
    isFollowing: false,
  };
}

function shortFilmPostId(filmId: string): string {
  return "short-film:" + filmId;
}

/** Deterministic mock thread for the watch page until comments are loaded from the API. */
export function getMockCommentsForShortFilm(filmId: string): Comment[] {
  const postId = shortFilmPostId(filmId);
  const reply1: Comment = {
    id: "r-" + filmId + "-1",
    postId: postId,
    author: author("a-r1", "celluloid_fan", "Maya R."),
    body: "The sound design in the last third is unreal. Watched twice.",
    likeCount: 8,
    isLiked: false,
    createdAt: "2h ago",
    replies: [],
    parentId: "c-" + filmId + "-1",
    depth: 1,
  };

  return [
    {
      id: "c-" + filmId + "-1",
      postId: postId,
      author: author("a1", "projectionbooth", "Jordan K."),
      body:
        "This is exactly the kind of short I wish more festivals programmed — confident pacing and no wasted frames.",
      likeCount: 24,
      isLiked: false,
      createdAt: "5h ago",
      replies: [reply1],
      parentId: null,
      depth: 0,
    },
    {
      id: "c-" + filmId + "-2",
      postId: postId,
      author: author("a2", "nitrateDreams", "Sam V."),
      body: "Does anyone know if the director has other work online? Loved the color grade.",
      likeCount: 11,
      isLiked: true,
      createdAt: "1d ago",
      replies: [],
      parentId: null,
      depth: 0,
    },
    {
      id: "c-" + filmId + "-3",
      postId: postId,
      author: author("a3", "festival_notes", "Alex T."),
      body: "Shown at our student slate last year — still think about the opening shot.",
      likeCount: 3,
      isLiked: false,
      createdAt: "3d ago",
      replies: [],
      parentId: null,
      depth: 0,
    },
  ];
}
