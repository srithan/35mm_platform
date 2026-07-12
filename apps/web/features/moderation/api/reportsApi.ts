import { ApiRequestError, apiRequest } from "@/features/feed/api/http";
import type {
  ModerationContentType,
  ModerationReportReason,
  ReportDto,
  ReportPage,
} from "@35mm/types";

var API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Mirrors `createReportSchema` in @35mm/validators (validated server-side). */
export interface CreateReportInput {
  contentType: ModerationContentType;
  contentId: string;
  reason: ModerationReportReason;
  details?: string;
}

export interface SubmitReportResult {
  report: ReportDto;
  /** True when the server returned an existing unresolved report (HTTP 200). */
  alreadyReported: boolean;
}

/**
 * POST /v1/reports.
 *
 * The status code carries meaning the body does not: 201 = new report,
 * 200 = an existing unresolved report was returned. `apiRequest` discards the
 * status, so this call reads the response directly while keeping the shared
 * `ApiRequestError` contract for failures.
 */
export async function submitReport(
  input: CreateReportInput,
  token: string | null
): Promise<SubmitReportResult> {
  var headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;

  var res: Response;
  try {
    res = await fetch(API_URL + "/v1/reports", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (_error) {
    throw new ApiRequestError(
      "Could not reach the API. Check your connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  if (!res.ok) {
    var message = "Could not submit your report";
    var code: string | undefined;
    try {
      var errorPayload = await res.json();
      if (errorPayload && typeof errorPayload.message === "string") {
        message = errorPayload.message;
      }
      if (errorPayload && typeof errorPayload.code === "string") {
        code = errorPayload.code;
      }
    } catch (_err) {
      message = res.statusText || message;
    }
    throw new ApiRequestError(message, res.status, code);
  }

  var payload = (await res.json()) as { report: ReportDto };
  return {
    report: payload.report,
    alreadyReported: res.status === 200,
  };
}

export async function fetchMyReports(params: {
  cursor?: string | null;
  limit?: number;
  token: string | null;
}): Promise<ReportPage> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  });
  if (params.cursor) {
    query.set("cursor", params.cursor);
  }

  return apiRequest<ReportPage>(`/v1/me/reports?${query.toString()}`, {
    token: params.token,
  });
}
