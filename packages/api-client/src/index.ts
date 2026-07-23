export type ApiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiRequestClass = "read" | "mutation" | "upload";
export type ApiAuthMode = "none" | "optional" | "required";
export type ApiErrorKind =
  | "aborted"
  | "auth"
  | "configuration"
  | "decoding"
  | "http"
  | "network"
  | "timeout";

export interface ApiPlatformMetadata {
  readonly platform: "android" | "ios" | "web" | "unknown";
  readonly appVersion: string;
  readonly appVariant: string;
}

export interface ApiDiagnosticEvent {
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly operation: string;
  readonly requestId: string;
  readonly status: number | null;
  readonly retryable: boolean;
}

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly status: number | null;
  readonly requestId: string;
  readonly operation: string;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    options: {
      readonly kind: ApiErrorKind;
      readonly code: string;
      readonly status?: number;
      readonly requestId: string;
      readonly operation: string;
      readonly retryable?: boolean;
      readonly retryAfterMs?: number;
      readonly cause?: unknown;
    },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApiClientError";
    this.kind = options.kind;
    this.code = options.code;
    this.status = options.status ?? null;
    this.requestId = options.requestId;
    this.operation = options.operation;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return (
    value instanceof ApiClientError ||
    (typeof value === "object" &&
      value !== null &&
      (value as { name?: unknown }).name === "ApiClientError" &&
      typeof (value as { code?: unknown }).code === "string" &&
      typeof (value as { kind?: unknown }).kind === "string")
  );
}

export interface ApiRequestOptions<T> {
  readonly method?: ApiHttpMethod;
  readonly auth?: ApiAuthMode;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly idempotencyKey?: string;
  readonly operation: string;
  readonly parser?: (value: unknown) => T;
  readonly requestClass?: ApiRequestClass;
  readonly signal?: AbortSignal;
  readonly maxAttempts?: number;
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly getToken?: () => Promise<string | null> | string | null;
  readonly fetch: typeof globalThis.fetch;
  readonly createRequestId: () => string;
  readonly platform: ApiPlatformMetadata;
  readonly timeoutsMs?: Partial<Record<ApiRequestClass, number>>;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly random?: () => number;
  readonly onDiagnostic?: (event: ApiDiagnosticEvent) => void;
}

const DEFAULT_TIMEOUTS: Readonly<Record<ApiRequestClass, number>> = {
  read: 15_000,
  mutation: 20_000,
  upload: 120_000,
};
const MAX_RESPONSE_TEXT_LENGTH = 1_048_576;
const MAX_ATTEMPTS = 3;

function configurationError(message: string, operation = "client.configure") {
  return new ApiClientError(message, {
    kind: "configuration",
    code: "CLIENT_CONFIGURATION_ERROR",
    operation,
    requestId: "not-started",
  });
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw configurationError("API base URL is required.");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw configurationError("API base URL must be an absolute HTTP(S) URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw configurationError("API base URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw configurationError("API base URL cannot contain credentials, query, or fragment.");
  }
  return url.toString().replace(/\/$/, "");
}

function requestUrl(baseUrl: string, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw configurationError("API request path must be an absolute path, not a URL.");
  }
  return `${baseUrl}${path}`;
}

function requestClassFor(method: ApiHttpMethod, explicit?: ApiRequestClass): ApiRequestClass {
  return explicit ?? (method === "GET" ? "read" : "mutation");
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30_000);
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, Math.min(date - Date.now(), 30_000));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function apiErrorPayload(value: unknown): { code?: string; message?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return {
    ...(typeof (value as Record<string, unknown>).code === "string"
      ? { code: (value as Record<string, string>).code }
      : {}),
    ...(typeof (value as Record<string, unknown>).message === "string"
      ? { message: (value as Record<string, string>).message }
      : {}),
  };
}

async function responseJson(
  response: Response,
  context: { operation: string; requestId: string },
): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_RESPONSE_TEXT_LENGTH) {
    throw new ApiClientError("API response exceeded the supported size.", {
      kind: "decoding",
      code: "RESPONSE_TOO_LARGE",
      operation: context.operation,
      requestId: context.requestId,
      status: response.status,
    });
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_TEXT_LENGTH) {
    throw new ApiClientError("API response exceeded the supported size.", {
      kind: "decoding",
      code: "RESPONSE_TOO_LARGE",
      operation: context.operation,
      requestId: context.requestId,
      status: response.status,
    });
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new ApiClientError("API returned an invalid JSON response.", {
      kind: "decoding",
      code: "INVALID_JSON_RESPONSE",
      operation: context.operation,
      requestId: context.requestId,
      status: response.status,
      cause: error,
    });
  }
}

function boundedAttempts(value: number | undefined): number {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || value < 1 || value > MAX_ATTEMPTS) {
    throw configurationError(`maxAttempts must be an integer from 1 to ${MAX_ATTEMPTS}.`);
  }
  return value;
}

function retryDelay(error: ApiClientError, attempt: number, random: () => number): number {
  if (error.retryAfterMs !== null) return error.retryAfterMs;
  const base = Math.min(250 * 2 ** (attempt - 1), 2_000);
  return Math.round(base * (0.75 + random() * 0.5));
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken: ApiClientOptions["getToken"];
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly createRequestId: () => string;
  private readonly platform: ApiPlatformMetadata;
  private readonly timeouts: Readonly<Record<ApiRequestClass, number>>;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;
  private readonly onDiagnostic: ApiClientOptions["onDiagnostic"];

  constructor(options: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.getToken = options.getToken;
    this.fetchImpl = options.fetch;
    this.createRequestId = options.createRequestId;
    this.platform = options.platform;
    this.sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.random = options.random ?? Math.random;
    this.onDiagnostic = options.onDiagnostic;
    this.timeouts = {
      read: options.timeoutsMs?.read ?? DEFAULT_TIMEOUTS.read,
      mutation: options.timeoutsMs?.mutation ?? DEFAULT_TIMEOUTS.mutation,
      upload: options.timeoutsMs?.upload ?? DEFAULT_TIMEOUTS.upload,
    };
    for (const timeout of Object.values(this.timeouts)) {
      if (!Number.isFinite(timeout) || timeout < 1_000 || timeout > 300_000) {
        throw configurationError("API timeouts must be between 1,000 and 300,000 ms.");
      }
    }
  }

  async request<T>(path: string, options: ApiRequestOptions<T>): Promise<T> {
    const method = options.method ?? "GET";
    const maxAttempts = boundedAttempts(options.maxAttempts);
    if (maxAttempts > 1 && method !== "GET" && !options.idempotencyKey) {
      throw configurationError("Mutation retries require an idempotency key.", options.operation);
    }

    let lastError: ApiClientError | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.perform(path, { ...options, method });
      } catch (error) {
        const apiError = isApiClientError(error)
          ? error
          : new ApiClientError("API request failed.", {
              kind: "network",
              code: "NETWORK_ERROR",
              operation: options.operation,
              requestId: "unknown",
              retryable: true,
              cause: error,
            });
        lastError = apiError;
        if (attempt >= maxAttempts || !apiError.retryable) {
          this.emitDiagnostic(apiError);
          throw apiError;
        }
        await this.sleep(retryDelay(apiError, attempt, this.random));
        if (options.signal?.aborted) {
          const aborted = new ApiClientError("Request was cancelled.", {
            kind: "aborted",
            code: "REQUEST_ABORTED",
            operation: options.operation,
            requestId: apiError.requestId,
          });
          this.emitDiagnostic(aborted);
          throw aborted;
        }
      }
    }
    throw lastError ?? configurationError("API request did not execute.", options.operation);
  }

  private async perform<T>(
    path: string,
    options: ApiRequestOptions<T> & { method: ApiHttpMethod },
  ): Promise<T> {
    const url = requestUrl(this.baseUrl, path);
    const requestId = this.createRequestId().trim();
    if (!requestId) {
      throw configurationError("Request ID generator returned an empty value.", options.operation);
    }
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeouts[requestClassFor(options.method, options.requestClass)]);
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });

    try {
      if (options.signal?.aborted) abort();
      const headers = new Headers(options.headers);
      headers.set("Accept", "application/json");
      headers.set("X-Request-ID", requestId);
      headers.set("X-35mm-Platform", this.platform.platform);
      headers.set("X-35mm-App-Version", this.platform.appVersion);
      headers.set("X-35mm-App-Variant", this.platform.appVariant);
      if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
      if (options.body !== undefined) headers.set("Content-Type", "application/json");

      const authMode = options.auth ?? "optional";
      if (authMode !== "none" && this.getToken) {
        let token: string | null;
        try {
          token = await this.getToken();
        } catch (error) {
          throw new ApiClientError("Unable to access the current session.", {
            kind: "auth",
            code: "TOKEN_ACCESS_FAILED",
            operation: options.operation,
            requestId,
            cause: error,
          });
        }
        if (token) headers.set("Authorization", `Bearer ${token}`);
        if (!token && authMode === "required") {
          throw new ApiClientError("You must be signed in.", {
            kind: "auth",
            code: "AUTH_REQUIRED",
            operation: options.operation,
            requestId,
            status: 401,
          });
        }
      } else if (authMode === "required") {
        throw new ApiClientError("You must be signed in.", {
          kind: "auth",
          code: "AUTH_REQUIRED",
          operation: options.operation,
          requestId,
          status: 401,
        });
      }

      let body: string | undefined;
      if (options.body !== undefined) {
        try {
          body = JSON.stringify(options.body);
        } catch (error) {
          throw new ApiClientError("Request body is not JSON serializable.", {
            kind: "configuration",
            code: "INVALID_REQUEST_BODY",
            operation: options.operation,
            requestId,
            cause: error,
          });
        }
      }

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: options.method,
          headers,
          ...(body === undefined ? {} : { body }),
          signal: controller.signal,
        });
      } catch (error) {
        const retryable = options.method === "GET" || Boolean(options.idempotencyKey);
        if (timedOut) {
          throw new ApiClientError("Request timed out.", {
            kind: "timeout",
            code: "REQUEST_TIMEOUT",
            operation: options.operation,
            requestId,
            retryable,
            cause: error,
          });
        }
        if (controller.signal.aborted) {
          throw new ApiClientError("Request was cancelled.", {
            kind: "aborted",
            code: "REQUEST_ABORTED",
            operation: options.operation,
            requestId,
            cause: error,
          });
        }
        throw new ApiClientError("Could not reach the API. Check your connection and try again.", {
          kind: "network",
          code: "NETWORK_ERROR",
          operation: options.operation,
          requestId,
          retryable,
          cause: error,
        });
      }

      const responseRequestId =
        response.headers.get("x-request-id") ?? response.headers.get("cf-ray") ?? requestId;
      if (response.status === 204) return undefined as T;
      const value = await responseJson(response, {
        operation: options.operation,
        requestId: responseRequestId,
      });
      if (!response.ok) {
        const payload = apiErrorPayload(value);
        const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
        throw new ApiClientError(
          (payload.message ?? response.statusText) || "Request failed.",
          {
            kind: response.status === 401 ? "auth" : "http",
            code: payload.code ?? `HTTP_${response.status}`,
            operation: options.operation,
            requestId: responseRequestId,
            status: response.status,
            retryable: isRetryableStatus(response.status),
            ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
          },
        );
      }
      if (!options.parser) return value as T;
      try {
        return options.parser(value);
      } catch (error) {
        throw new ApiClientError("API response did not match the expected contract.", {
          kind: "decoding",
          code: "INVALID_RESPONSE_CONTRACT",
          operation: options.operation,
          requestId: responseRequestId,
          status: response.status,
          cause: error,
        });
      }
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  private emitDiagnostic(error: ApiClientError): void {
    if (!this.onDiagnostic) return;
    this.onDiagnostic({
      kind: error.kind,
      code: error.code,
      operation: error.operation,
      requestId: error.requestId,
      status: error.status,
      retryable: error.retryable,
    });
  }
}
