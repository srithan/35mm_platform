import type { SiteSearchResponse } from "@35mm/types";
import { apiRequest } from "@/features/feed/api/http";

export async function fetchSiteSearch(
  query: string,
  token: string | null,
  limit = 5
): Promise<SiteSearchResponse> {
  var params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });
  return apiRequest<SiteSearchResponse>("/v1/search?" + params.toString(), {
    token,
  });
}
