"use client";

import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContributionSubmissionInput } from "@35mm/validators";
import {
  createContributionSubmission,
  fetchContributionSubmissions,
} from "../api/contributionsApi";
import { contributionKeys } from "./queryKeys";

export function useContributionSubmissions() {
  var { getToken, isLoaded, isSignedIn } = useAuth();

  return useInfiniteQuery({
    queryKey: contributionKeys.submissions(),
    queryFn: async function ({ pageParam }) {
      return fetchContributionSubmissions({
        token: await getToken(),
        cursor: pageParam as string | undefined,
        limit: 20,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 30_000,
  });
}

export function useCreateContributionSubmission() {
  var { getToken } = useAuth();
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (input: {
      submission: ContributionSubmissionInput;
      idempotencyKey: string;
    }) {
      return createContributionSubmission(
        input.submission,
        await getToken(),
        input.idempotencyKey
      );
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: contributionKeys.submissions() });
    },
  });
}
