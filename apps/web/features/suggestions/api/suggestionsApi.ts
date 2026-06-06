import { apiRequest } from "@/features/feed/api/http";
import type { SuggestionsResponse } from "@35mm/types";

export async function fetchPeopleSuggestions(
  token: string | null,
  options: {
    limit?: number;
    cursor?: string | null;
    context?: string;
  } = {}
): Promise<SuggestionsResponse> {
  var query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 20));
  if (options.cursor) {
    query.set("cursor", options.cursor);
  }
  if (options.context) {
    query.set("context", options.context);
  }

  return apiRequest<SuggestionsResponse>("/v1/suggestions/users?" + query.toString(), {
    token,
  });
}
