import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  submitReport,
  type CreateReportInput,
  type SubmitReportResult,
} from "../api/reportsApi";
import { moderationKeys } from "./queryKeys";

/**
 * Files a content report. Resolves with `alreadyReported` so the flow can show
 * the "we're on it" state distinctly from a failure. Invalidates the caller's
 * report history so the My Reports page reflects the new entry.
 */
export function useReportContent() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation<SubmitReportResult, unknown, CreateReportInput>({
    mutationFn: async function (input: CreateReportInput) {
      return submitReport(input, await getToken());
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: moderationKeys.myReports() });
    },
  });
}
