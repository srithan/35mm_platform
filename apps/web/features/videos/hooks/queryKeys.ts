export const videoKeys = {
  all: ["videos"] as const,
  films: (owner: string | null, mine: boolean) =>
    ["videos", "films", owner, mine] as const,
  film: (id: string, owner: string | null) =>
    ["videos", "film", id, owner] as const,
  playback: (id: string, owner: string | null) =>
    ["videos", "playback", id, owner] as const,
};
