export type FollowSuggestion = {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    avatarUrlLg?: string | null;
    bio: string | null;
  };
  score: number;
  signalType:
    | "fof"
    | "content_affinity"
    | "letterboxd_import_match"
    | "onboarding_seed";
  signalLabel: string;
};

export type SuggestionsResponse = {
  suggestions: FollowSuggestion[];
  nextCursor: string | null;
  computing: boolean;
};
