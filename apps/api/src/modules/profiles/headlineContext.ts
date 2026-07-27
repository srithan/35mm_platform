export type HeadlineContextUpdate =
  | { valid: true; value: string | null }
  | { valid: false };

export function headlineContextUpdate(
  role: string | null | undefined,
  input: string | null
): HeadlineContextUpdate {
  var normalizedRole = role?.trim().toLowerCase() ?? "";
  var context = input?.trim() ?? "";

  if (normalizedRole === "cinephile" && context.length > 0) {
    return { valid: false };
  }

  return {
    valid: true,
    value: context.length > 0 ? context.slice(0, 25) : null,
  };
}
