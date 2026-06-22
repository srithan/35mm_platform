import { apiRequest } from "./http";

export type MentionSuggestion = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing?: boolean;
  isPrivate?: boolean;
  followState?: "none" | "requested" | "following" | "self";
};

export async function searchMentionSuggestions(
  query: string,
  token: string | null
): Promise<MentionSuggestion[]> {
  var params = new URLSearchParams({
    q: query,
    limit: "8",
  });
  var response = await apiRequest<{ users: MentionSuggestion[] }>(
    `/v1/profiles/search?${params.toString()}`,
    { token }
  );
  return response.users;
}
