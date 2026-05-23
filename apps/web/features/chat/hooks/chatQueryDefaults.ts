"use client";

import type { DefaultOptions } from "@tanstack/react-query";
import { CHAT_QUERY_POLICY } from "../config/runtimeConfig";
import { isRetryableChatError } from "../api/errors";

export function chatQueryClientDefaults(): DefaultOptions {
  return {
    queries: {
      staleTime: CHAT_QUERY_POLICY.staleTimeMs,
      gcTime: CHAT_QUERY_POLICY.gcTimeMs,
      retry: function (failureCount, error) {
        if (failureCount >= CHAT_QUERY_POLICY.maxRetries) {
          return false;
        }
        return isRetryableChatError(error);
      },
      retryDelay: function (attempt) {
        return Math.min(
          CHAT_QUERY_POLICY.retryDelayMaxMs,
          1000 * Math.pow(2, attempt)
        );
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: function (failureCount, error) {
        if (failureCount >= 1) {
          return false;
        }
        return isRetryableChatError(error);
      },
    },
  };
}
