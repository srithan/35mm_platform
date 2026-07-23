export const brandColors = {
  warmRed: "#C2473A",
  crimson: "#C93535",
  socialBlue: "#0095F6",
} as const;

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  screenHorizontal: 16,
} as const;

export const radius = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  actionGroup: 22,
  sheet: 32,
  pill: 9999,
} as const;

export const sheetGeometry = {
  cornerRadius: radius.sheet,
  actionGroupRadius: radius.actionGroup,
  rowHeight: 58,
  iconSlot: 24,
  horizontalInset: spacing.md,
  bottomSpacing: spacing.md,
  backdropOpacity: 0.38,
  dragDismissThreshold: 80,
} as const;

export const size = {
  touchTarget: {
    minimum: 44,
    comfortable: 48,
  },
  avatar: {
    extraSmall: 28,
    small: 36,
    medium: 40,
    large: 48,
    extraLarge: 88,
  },
  icon: {
    extraSmall: 16,
    small: 20,
    medium: 24,
    large: 28,
    extraLarge: 32,
  },
  poster: {
    extraSmall: { width: 48, height: 72 },
    small: { width: 64, height: 96 },
    medium: { width: 96, height: 144 },
    large: { width: 128, height: 192 },
  },
  media: {
    thumbnail: 64,
    compact: 120,
    cardMinimumHeight: 180,
    heroMinimumHeight: 240,
    squareAspectRatio: 1,
    landscapeAspectRatio: 16 / 9,
  },
} as const;

export const fontFamily = {
  display: "DM Serif Display",
  body: "DM Sans",
  mono: "DM Mono",
} as const;

export type FontFamilyRole = keyof typeof fontFamily;
export type FontWeight = "400" | "500" | "600" | "700";

export interface TypographyToken {
  readonly family: FontFamilyRole;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: FontWeight;
  readonly letterSpacing: number;
}

export const typography = {
  wordmark: {
    family: "display",
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
  display: {
    family: "display",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
  screenTitle: {
    family: "body",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionTitle: {
    family: "body",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  rowLabel: {
    family: "body",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: 0,
  },
  rowLabelCompact: {
    family: "body",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0,
  },
  authorName: {
    family: "body",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
  authorHandle: {
    family: "body",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: 0,
  },
  body: {
    family: "body",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
    letterSpacing: 0,
  },
  bodyLarge: {
    family: "body",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: 0,
  },
  metadata: {
    family: "body",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    letterSpacing: 0,
  },
  counter: {
    family: "mono",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    letterSpacing: 0,
  },
  code: {
    family: "mono",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: 0,
  },
} as const satisfies Record<string, TypographyToken>;

export type CubicBezier = readonly [number, number, number, number];

export const easing = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.2, 0.8, 0.2, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  linear: [0, 0, 1, 1],
} as const satisfies Record<string, CubicBezier>;

export interface MotionToken {
  readonly duration: number;
  readonly easing: CubicBezier;
  readonly reducedMotionDuration: number;
}

export const motion = {
  immediate: { duration: 0, easing: easing.linear, reducedMotionDuration: 0 },
  feedback: { duration: 120, easing: easing.standard, reducedMotionDuration: 0 },
  fade: { duration: 180, easing: easing.standard, reducedMotionDuration: 120 },
  standard: { duration: 200, easing: easing.standard, reducedMotionDuration: 0 },
  sheet: { duration: 300, easing: easing.emphasized, reducedMotionDuration: 0 },
  drawer: { duration: 300, easing: easing.emphasized, reducedMotionDuration: 0 },
  skeletonPulse: { duration: 1200, easing: easing.standard, reducedMotionDuration: 0 },
} as const satisfies Record<string, MotionToken>;

export type MotionName = keyof typeof motion;

export function resolveMotion(name: MotionName, reduceMotion: boolean): MotionToken {
  const token = motion[name];
  if (!reduceMotion) return token;

  return {
    duration: token.reducedMotionDuration,
    easing: token.easing,
    reducedMotionDuration: token.reducedMotionDuration,
  };
}

export interface ShadowLayer {
  readonly color: string;
  readonly opacity: number;
  readonly radius: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface ElevationToken {
  readonly ios: ShadowLayer;
  readonly android: { readonly elevation: number };
}

export const elevation = {
  none: {
    ios: { color: "#000000", opacity: 0, radius: 0, offsetX: 0, offsetY: 0 },
    android: { elevation: 0 },
  },
  raised: {
    ios: { color: "#000000", opacity: 0.08, radius: 6, offsetX: 0, offsetY: 2 },
    android: { elevation: 2 },
  },
  floating: {
    ios: { color: "#000000", opacity: 0.12, radius: 12, offsetX: 0, offsetY: 4 },
    android: { elevation: 6 },
  },
  overlay: {
    ios: { color: "#000000", opacity: 0.18, radius: 24, offsetX: 0, offsetY: 10 },
    android: { elevation: 12 },
  },
} as const satisfies Record<string, ElevationToken>;
