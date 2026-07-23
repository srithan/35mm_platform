import type { ApiDiagnosticEvent } from "@35mm/api-client";

export interface MobileDiagnosticEvent {
  readonly source: "api" | "error-boundary" | "persistence" | "provider";
  readonly code: string;
  readonly operation: string;
  readonly requestId?: string;
  readonly status?: number | null;
  readonly retryable?: boolean;
}

export function reportMobileDiagnostic(event: MobileDiagnosticEvent): void {
  console.error("[35mm-mobile]", JSON.stringify(event));
}

export function reportApiDiagnostic(event: ApiDiagnosticEvent): void {
  reportMobileDiagnostic({ source: "api", ...event });
}
