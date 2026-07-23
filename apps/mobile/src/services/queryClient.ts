import { ApiClientError, isApiClientError } from "@35mm/api-client";
import { QueryClient } from "@tanstack/react-query";

export function shouldRetryMobileQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof ApiClientError || isApiClientError(error)) {
    return error.retryable;
  }
  return false;
}

export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1_000,
        retry: shouldRetryMobileQuery,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}
