function publicBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

export const BROWSE_RAIL_ENABLED = publicBooleanFlag(
  process.env.NEXT_PUBLIC_BROWSE_RAIL,
  true
);

export const SIMPLIFIED_POST_COMPOSER_TRIGGER_ENABLED = publicBooleanFlag(
  process.env.NEXT_PUBLIC_SIMPLIFIED_POST_COMPOSER_TRIGGER,
  false
);
