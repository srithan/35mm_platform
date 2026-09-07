const POST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePostRouteId(
  value: string | readonly string[] | undefined,
): string | null {
  if (typeof value !== "string" || !POST_ID_PATTERN.test(value)) return null;
  return value.toLowerCase();
}
