type Player = { play: () => void; pause: () => void; eligible: boolean };

/** One owner per browser tab; pause the previous player before starting its successor. */
export function createVideoPlaybackCoordinator() {
  const players = new Map<symbol, Player>();
  let owner: symbol | undefined;
  const select = (next: symbol | undefined, start: boolean) => {
    if (next === owner) return;
    const previous = owner;
    owner = next;
    if (previous) players.get(previous)?.pause();
    if (next && start) players.get(next)?.play();
  };
  const advance = () => {
    if (owner && players.get(owner)?.eligible) return;
    select([...players].find(([, player]) => player.eligible)?.[0], true);
  };
  return {
    register(id: symbol, player: Player) {
      players.set(id, player);
      advance();
      return () => {
        if (owner === id) select(undefined, false);
        players.delete(id);
        advance();
      };
    },
    update(id: symbol, eligible: boolean) {
      const player = players.get(id);
      if (!player || player.eligible === eligible) return;
      player.eligible = eligible;
      advance();
    },
    claim(id: symbol) {
      if (players.has(id)) select(id, false);
    },
  };
}

export const videoPlaybackCoordinator = createVideoPlaybackCoordinator();
