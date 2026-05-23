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
  return e instanceof ChatApiError;
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
