const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

function toNetworkError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;

  var message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Could not reach the API. Check your connection and try again.";

  if (message === "Failed to fetch" || message === "fetch failed") {
    message = "Could not reach the API. Check your connection and try again.";
  }

  return new ApiRequestError(message, 0, "NETWORK_ERROR");
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = "Bearer " + options.token;

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch (error) {
    throw toNetworkError(error);
  }

  if (!res.ok) {
    let message = "Request failed";
    let code: string | undefined;
    try {
      const payload = await res.json();
      if (payload && typeof payload.message === "string") message = payload.message;
      if (payload && typeof payload.code === "string") code = payload.code;
    } catch (_err) {
      message = res.statusText || message;
    }
    throw new ApiRequestError(message, res.status, code);
  }

  return (await res.json()) as T;
}
