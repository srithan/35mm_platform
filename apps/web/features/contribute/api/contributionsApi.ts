import type {
  ContributionSubmission,
  ContributionSubmissionPage,
} from "@35mm/types";
import type { ContributionSubmissionInput } from "@35mm/validators";
import { apiRequest } from "@/features/feed/api/http";

export async function createContributionSubmission(
  input: ContributionSubmissionInput,
  token: string | null,
  idempotencyKey: string
): Promise<ContributionSubmission> {
  var response = await apiRequest<{ submission: ContributionSubmission }>(
    "/v1/contributions/submissions",
    {
      method: "POST",
      token,
      body: input,
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    }
  );
  return response.submission;
}

export async function fetchContributionSubmissions(params: {
  token: string | null;
  cursor?: string;
  limit?: number;
}): Promise<ContributionSubmissionPage> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  });
  if (params.cursor) query.set("cursor", params.cursor);

  return apiRequest<ContributionSubmissionPage>(
    `/v1/contributions/submissions?${query.toString()}`,
    { token: params.token }
  );
}
