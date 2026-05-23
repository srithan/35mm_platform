/**
 * Client-safe: avoids `SyntaxError` when `/api/tmdb/*` returns HTML.
 */
export function parseTmdbJsonObject<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed[0] !== "{") {
    return null;
  }
  try {
    const data = JSON.parse(trimmed) as T & {
      success?: boolean;
      error?: string;
    };
    if (!data || typeof data !== "object") {
      return null;
    }
    if (data && typeof data === "object" && (data as { success?: boolean }).success === false) {
      return null;
    }
    if (
      typeof (data as { error?: string }).error === "string" &&
      (data as { id?: number }).id === undefined
    ) {
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}
