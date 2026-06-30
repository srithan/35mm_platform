/**
 * Normalized API errors for chat — map HTTP + transport failures once in the client.
 */

export class ChatApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    opts: {
      code: string;
      status: number;
      requestId?: string;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = "ChatApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.details = opts.details;
  }
}

export function isChatApiError(e: unknown): e is ChatApiError {
  if (e instanceof ChatApiError) {
    return true;
  }
  return (
    e != null &&
    typeof e === "object" &&
    (e as ChatApiError).name === "ChatApiError" &&
    typeof (e as ChatApiError).code === "string" &&
    typeof (e as ChatApiError).status === "number"
  );
}

export function getChatErrorMessage(
  e: unknown,
  fallback = "Could not send message. Try again."
): string {
  if (isChatApiError(e)) {
    if (e.code === "KEYSPACES_UNAVAILABLE") {
      return "Messaging storage is unavailable right now.";
    }
    if (e.message) {
      return e.message;
    }
  }
  if (e instanceof Error && e.message.trim().length > 0) {
    return e.message;
  }
  return fallback;
}

/** Safe to retry with backoff (network blips, 429, 502–504). */
export function isRetryableChatError(e: unknown): boolean {
  if (!isChatApiError(e)) {
    return true;
  }
  if (e.status === 429) {
    return true;
  }
  if (e.status >= 500 && e.status <= 599) {
    return true;
  }
  if (e.status === 0) {
    return true;
  }
  return false;
}
