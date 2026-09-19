export function publicBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  const normalized = value?.trim();
  if (!normalized) return defaultValue;
  return !["0", "false", "no", "off"].includes(normalized.toLowerCase());
}

export const POST_MEDIA_CAROUSEL_ENABLED = publicBooleanFlag(
  process.env.EXPO_PUBLIC_POST_MEDIA_CAROUSEL,
  false,
);
