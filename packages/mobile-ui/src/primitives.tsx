import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  radius,
  size,
  spacing,
  typography,
  type ThemeColors,
} from "@35mm/design-tokens";
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "./icons";
import { fontFamilyForTypography, type TypographyRole } from "./fonts";
import { elevationStyle, useMobileUI } from "./theme";

export type SemanticColor = keyof ThemeColors;

export interface AppTextProps extends Omit<TextProps, "role"> {
  readonly role?: TypographyRole;
  readonly color?: SemanticColor;
  readonly align?: TextStyle["textAlign"];
}

export function AppText({
  role = "body",
  color = "text",
  align,
  style,
  ...props
}: AppTextProps) {
  const { theme } = useMobileUI();
  const token = typography[role];

  return (
    <Text
      {...props}
      style={[
        {
          color: theme.colors[color],
          fontFamily: fontFamilyForTypography(token),
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
          letterSpacing: token.letterSpacing,
          textAlign: align,
        },
        style,
      ]}
    />
  );
}

export type ScreenSafeAreaEdge = "top" | "right" | "bottom" | "left";

export interface ScreenProps extends ViewProps {
  readonly children: ReactNode;
  readonly safeAreaEdges?: readonly ScreenSafeAreaEdge[];
  readonly padded?: boolean;
  readonly elevated?: boolean;
}

export function Screen({
  children,
  safeAreaEdges = ["top", "right", "bottom", "left"],
  padded = false,
  elevated = false,
  style,
  ...props
}: ScreenProps) {
  const { theme } = useMobileUI();
  const insets = useSafeAreaInsets();
  const includes = (edge: ScreenSafeAreaEdge) => safeAreaEdges.includes(edge);

  return (
    <View
      {...props}
      style={[
        styles.screen,
        {
          backgroundColor: elevated
            ? theme.colors.surfaceElevated
            : theme.colors.surface,
          paddingTop: includes("top") ? insets.top : 0,
          paddingRight:
            (includes("right") ? insets.right : 0) +
            (padded ? spacing.screenHorizontal : 0),
          paddingBottom: includes("bottom") ? insets.bottom : 0,
          paddingLeft:
            (includes("left") ? insets.left : 0) +
            (padded ? spacing.screenHorizontal : 0),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface CardProps extends ViewProps {
  readonly children: ReactNode;
  readonly variant?: "elevated" | "sunken" | "outlined";
}

export function Card({
  children,
  variant = "elevated",
  style,
  ...props
}: CardProps) {
  const { theme } = useMobileUI();

  const variantStyle: ViewStyle =
    variant === "sunken"
      ? { backgroundColor: theme.colors.surfaceSunken }
      : variant === "outlined"
        ? {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
          }
        : {
            backgroundColor: theme.colors.surfaceElevated,
            ...elevationStyle("raised"),
          };

  return (
    <View {...props} style={[styles.card, variantStyle, style]}>
      {children}
    </View>
  );
}

export interface DividerProps extends ViewProps {
  readonly inset?: number;
  readonly strong?: boolean;
}

export function Divider({
  inset = 0,
  strong = false,
  style,
  ...props
}: DividerProps) {
  const { theme } = useMobileUI();
  return (
    <View
      {...props}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          backgroundColor: strong
            ? theme.colors.borderStrong
            : theme.colors.border,
          height: StyleSheet.hairlineWidth,
          marginHorizontal: inset,
        },
        style,
      ]}
    />
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "compact" | "regular" | "large";

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: AppIconName;
  readonly iconPosition?: "leading" | "trailing";
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

function buttonHeight(buttonSize: ButtonSize): number {
  switch (buttonSize) {
    case "compact":
      return size.touchTarget.minimum;
    case "regular":
      return size.touchTarget.comfortable;
    case "large":
      return 52;
  }
}

function buttonPalette(
  colors: ThemeColors,
  variant: ButtonVariant,
  pressed: boolean,
): {
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly color: string;
} {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: pressed ? colors.accentPressed : colors.accent,
        borderColor: pressed ? colors.accentPressed : colors.accent,
        color: colors.onAccent,
      };
    case "secondary":
      return {
        backgroundColor: pressed ? colors.surfacePressed : "transparent",
        borderColor: colors.borderStrong,
        color: colors.text,
      };
    case "ghost":
      return {
        backgroundColor: pressed ? colors.surfacePressed : "transparent",
        borderColor: "transparent",
        color: colors.textSecondary,
      };
    case "danger":
      return {
        backgroundColor: pressed ? colors.surfacePressed : "transparent",
        borderColor: colors.destructive,
        color: colors.destructive,
      };
  }
}

export function Button({
  label,
  variant = "primary",
  size: buttonSize = "regular",
  icon,
  iconPosition = "leading",
  loading = false,
  fullWidth = false,
  disabled = false,
  style,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const { theme } = useMobileUI();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => {
        const palette = buttonPalette(theme.colors, variant, pressed);
        return [
          styles.button,
          {
            minHeight: buttonHeight(buttonSize),
            alignSelf: fullWidth ? "stretch" : "flex-start",
            opacity: isDisabled ? 0.48 : 1,
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const palette = buttonPalette(theme.colors, variant, pressed);
        return (
          <>
            {loading ? (
              <ActivityIndicator color={palette.color} size="small" />
            ) : icon && iconPosition === "leading" ? (
              <AppIcon name={icon} size="small" color={palette.color} />
            ) : null}
            <AppText
              role="rowLabelCompact"
              style={{ color: palette.color }}
              numberOfLines={1}
            >
              {label}
            </AppText>
            {!loading && icon && iconPosition === "trailing" ? (
              <AppIcon name={icon} size="small" color={palette.color} />
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

export interface IconButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  readonly icon: AppIconName;
  readonly label: string;
  readonly selected?: boolean;
  readonly destructive?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  label,
  selected = false,
  destructive = false,
  disabled = false,
  style,
  ...props
}: IconButtonProps) {
  const { theme } = useMobileUI();
  const isDisabled = disabled === true;
  const color = destructive
    ? theme.colors.destructive
    : selected
      ? theme.colors.accent
      : theme.colors.text;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, selected }}
      disabled={isDisabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: pressed
            ? theme.colors.surfacePressed
            : "transparent",
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <AppIcon name={icon} color={color} filled={selected} />
    </Pressable>
  );
}

export interface BadgeProps extends ViewProps {
  readonly label?: string;
  readonly count?: number;
  readonly maximum?: number;
  readonly tone?: "default" | "accent" | "destructive" | "success";
}

export function Badge({
  label,
  count,
  maximum = 99,
  tone = "default",
  style,
  ...props
}: BadgeProps) {
  const { theme } = useMobileUI();
  const visibleLabel =
    count === undefined
      ? label
      : count > maximum
        ? `${maximum}+`
        : String(count);
  if (!visibleLabel) return null;

  const backgroundColor =
    tone === "accent"
      ? theme.colors.unreadBadge
      : tone === "destructive"
        ? theme.colors.destructive
        : tone === "success"
          ? theme.colors.success
          : theme.colors.fill;
  const color =
    tone === "accent"
      ? theme.colors.onUnreadBadge
      : tone === "destructive"
        ? theme.colors.onDestructive
        : tone === "default"
          ? theme.colors.text
          : theme.colors.surface;

  return (
    <View
      {...props}
      accessibilityLabel={
        count === undefined ? visibleLabel : `${count} notifications`
      }
      style={[styles.badge, { backgroundColor }, style]}
    >
      <AppText role="counter" style={{ color, fontSize: 11, lineHeight: 14 }}>
        {visibleLabel}
      </AppText>
    </View>
  );
}

export interface ChipProps extends Omit<PressableProps, "children" | "style"> {
  readonly label: string;
  readonly selected?: boolean;
  readonly icon?: AppIconName;
  readonly style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  icon,
  disabled = false,
  accessibilityRole = "button",
  style,
  ...props
}: ChipProps) {
  const { theme } = useMobileUI();
  const isDisabled = disabled === true;
  const foreground = selected ? theme.colors.onAccent : theme.colors.text;
  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? pressed
              ? theme.colors.accentPressed
              : theme.colors.accent
            : pressed
              ? theme.colors.surfacePressed
              : theme.colors.surfaceSunken,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <AppIcon name={icon} size="extraSmall" color={foreground} />
      ) : null}
      <AppText role="metadata" style={{ color: foreground }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export interface CounterProps extends ViewProps {
  readonly icon?: AppIconName;
  readonly value: number | string;
  readonly label: string;
  readonly active?: boolean;
  readonly activeColor?: SemanticColor;
}

export function Counter({
  icon,
  value,
  label,
  active = false,
  activeColor = "accent",
  style,
  ...props
}: CounterProps) {
  const { theme } = useMobileUI();
  const color = active ? theme.colors[activeColor] : theme.colors.textSecondary;
  return (
    <View
      {...props}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.counter, style]}
    >
      {icon ? (
        <AppIcon name={icon} size="extraSmall" color={color} filled={active} />
      ) : null}
      <AppText role="counter" style={{ color }}>
        {value}
      </AppText>
    </View>
  );
}

export interface TextFieldProps extends TextInputProps {
  readonly label: string;
  readonly message?: string;
  readonly errorMessage?: string;
  readonly leadingIcon?: AppIconName;
  readonly trailing?: ReactNode;
  readonly containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  message,
  errorMessage,
  leadingIcon,
  trailing,
  editable = true,
  multiline = false,
  style,
  containerStyle,
  ...props
}: TextFieldProps) {
  const { theme } = useMobileUI();
  const hasError = Boolean(errorMessage);

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      <AppText
        role="metadata"
        color={hasError ? "destructive" : "textSecondary"}
      >
        {label}
      </AppText>
      <View
        style={[
          styles.fieldSurface,
          multiline && styles.fieldSurfaceMultiline,
          {
            backgroundColor: theme.colors.surfaceSunken,
            borderColor: hasError
              ? theme.colors.destructive
              : theme.colors.borderStrong,
            opacity: editable ? 1 : 0.52,
          },
        ]}
      >
        {leadingIcon ? (
          <AppIcon
            name={leadingIcon}
            size="small"
            color={theme.colors.textSecondary}
          />
        ) : null}
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.focus}
          style={[
            styles.fieldInput,
            multiline && styles.fieldInputMultiline,
            {
              color: theme.colors.text,
              fontFamily: fontFamilyForTypography(typography.bodyLarge),
            },
            style,
          ]}
        />
        {trailing}
      </View>
      {errorMessage || message ? (
        <AppText
          role="metadata"
          color={errorMessage ? "destructive" : "textSecondary"}
          accessibilityLiveRegion={errorMessage ? "polite" : "none"}
        >
          {errorMessage ?? message}
        </AppText>
      ) : null}
    </View>
  );
}

export interface AvatarProps extends ViewProps {
  readonly label: string;
  readonly source?: ImageSourcePropType;
  readonly avatarSize?: keyof typeof size.avatar | number;
  readonly fallbackIcon?: AppIconName;
  readonly imageStyle?: StyleProp<ImageStyle>;
}

export function Avatar({
  label,
  source,
  avatarSize = "medium",
  fallbackIcon = "user",
  imageStyle,
  style,
  ...props
}: AvatarProps) {
  const { theme } = useMobileUI();
  const resolvedSize =
    typeof avatarSize === "number" ? avatarSize : size.avatar[avatarSize];
  return (
    <View
      {...props}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.avatar,
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: resolvedSize / 2,
          backgroundColor: theme.colors.fill,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          resizeMode="cover"
          style={[
            {
              width: resolvedSize,
              height: resolvedSize,
              borderRadius: resolvedSize / 2,
            },
            imageStyle,
          ]}
        />
      ) : (
        <AppIcon
          name={fallbackIcon}
          size={Math.max(16, resolvedSize * 0.46)}
          color={theme.colors.textTertiary}
          filled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  card: {
    borderRadius: radius.large,
    padding: spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: size.touchTarget.minimum,
    justifyContent: "center",
    width: size.touchTarget.minimum,
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: size.touchTarget.minimum,
    paddingHorizontal: spacing.sm,
  },
  counter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldSurface: {
    alignItems: "center",
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: size.touchTarget.comfortable,
    paddingHorizontal: spacing.sm,
  },
  fieldSurfaceMultiline: {
    alignItems: "flex-start",
    minHeight: 112,
    paddingVertical: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: typography.bodyLarge.fontSize,
    lineHeight: typography.bodyLarge.lineHeight,
    minHeight: size.touchTarget.minimum,
    paddingVertical: 0,
  },
  fieldInputMultiline: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
