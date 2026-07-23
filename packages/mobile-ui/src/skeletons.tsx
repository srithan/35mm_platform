import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useEffect, useRef } from "react";
import { motion, radius, size, spacing } from "@35mm/design-tokens";
import { useMobileUI } from "./theme";

export interface SkeletonBlockProps extends ViewProps {
  readonly width?: ViewStyle["width"];
  readonly height?: ViewStyle["height"];
  readonly borderRadius?: number;
  readonly strong?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  borderRadius = radius.extraSmall,
  strong = false,
  style,
  ...props
}: SkeletonBlockProps) {
  const { theme, reduceMotion } = useMobileUI();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: motion.skeletonPulse.duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.skeletonPulse.duration / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      {...props}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: strong
            ? theme.colors.skeletonStrong
            : theme.colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

export interface SkeletonTextProps extends ViewProps {
  readonly lines?: number;
  readonly lineHeight?: number;
  readonly lastLineWidth?: ViewStyle["width"];
}

export function SkeletonText({
  lines = 1,
  lineHeight = 14,
  lastLineWidth = "72%",
  style,
  ...props
}: SkeletonTextProps) {
  const boundedLines = Math.min(8, Math.max(1, Math.floor(lines)));
  return (
    <View {...props} style={[styles.textStack, style]}>
      {Array.from({ length: boundedLines }, (_, index) => (
        <SkeletonBlock
          key={index}
          height={lineHeight}
          width={
            index === boundedLines - 1 && boundedLines > 1
              ? lastLineWidth
              : "100%"
          }
        />
      ))}
    </View>
  );
}

export interface SkeletonAvatarProps extends ViewProps {
  readonly avatarSize?: keyof typeof size.avatar | number;
}

export function SkeletonAvatar({
  avatarSize = "large",
  style,
  ...props
}: SkeletonAvatarProps) {
  const resolvedSize =
    typeof avatarSize === "number" ? avatarSize : size.avatar[avatarSize];
  return (
    <SkeletonBlock
      {...props}
      width={resolvedSize}
      height={resolvedSize}
      borderRadius={resolvedSize / 2}
      strong
      style={style}
    />
  );
}

export interface SkeletonPosterProps extends ViewProps {
  readonly posterSize?: keyof typeof size.poster;
}

export function SkeletonPoster({
  posterSize = "medium",
  style,
  ...props
}: SkeletonPosterProps) {
  const dimensions = size.poster[posterSize];
  return (
    <SkeletonBlock
      {...props}
      width={dimensions.width}
      height={dimensions.height}
      borderRadius={radius.medium}
      strong
      style={style}
    />
  );
}

export interface SkeletonMediaProps extends ViewProps {
  readonly aspectRatio?: number;
  readonly minHeight?: number;
}

export function SkeletonMedia({
  aspectRatio = size.media.landscapeAspectRatio,
  minHeight = size.media.cardMinimumHeight,
  style,
  ...props
}: SkeletonMediaProps) {
  return (
    <SkeletonBlock
      {...props}
      width="100%"
      borderRadius={radius.medium}
      strong
      style={[{ aspectRatio, height: undefined, minHeight }, style]}
    />
  );
}

export interface SkeletonRowProps extends ViewProps {
  readonly showAvatar?: boolean;
  readonly trailing?: "none" | "thumbnail" | "badge";
  readonly textLines?: number;
}

export function SkeletonRow({
  showAvatar = true,
  trailing = "none",
  textLines = 2,
  style,
  ...props
}: SkeletonRowProps) {
  return (
    <View
      {...props}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, style]}
    >
      {showAvatar ? <SkeletonAvatar /> : null}
      <SkeletonText lines={textLines} style={styles.rowText} />
      {trailing === "thumbnail" ? (
        <SkeletonBlock
          width={56}
          height={56}
          borderRadius={radius.small}
          strong
        />
      ) : trailing === "badge" ? (
        <SkeletonBlock
          width={32}
          height={20}
          borderRadius={radius.pill}
          strong
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  textStack: {
    gap: spacing.xs,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 72,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
});
