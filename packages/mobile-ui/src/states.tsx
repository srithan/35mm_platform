import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { radius, spacing } from "@35mm/design-tokens";
import { AppIcon, type AppIconName } from "./icons";
import { AppText, Button } from "./primitives";
import { useMobileUI } from "./theme";

export interface StateAction {
  readonly label: string;
  readonly onPress: () => void;
  readonly accessibilityHint?: string;
}

export type StateSurfaceKind =
  | "empty"
  | "error"
  | "offline"
  | "unauthorized"
  | "private"
  | "deleted"
  | "permissionDenied";

const ICON_BY_KIND: Readonly<Record<StateSurfaceKind, AppIconName>> = {
  empty: "film",
  error: "warning",
  offline: "wifi-off",
  unauthorized: "lock",
  private: "eye-off",
  deleted: "trash",
  permissionDenied: "shield-alert",
};

export interface StateSurfaceProps extends ViewProps {
  readonly kind: StateSurfaceKind;
  readonly title: string;
  readonly message?: string;
  readonly icon?: AppIconName;
  readonly primaryAction?: StateAction;
  readonly secondaryAction?: StateAction;
  readonly compact?: boolean;
}

export function StateSurface({
  kind,
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  compact = false,
  style,
  ...props
}: StateSurfaceProps) {
  const { theme } = useMobileUI();
  const iconName = icon ?? ICON_BY_KIND[kind];
  const iconColor =
    kind === "error" ? theme.colors.destructive : theme.colors.textTertiary;

  return (
    <View
      {...props}
      accessibilityRole={kind === "error" ? "alert" : "summary"}
      style={[
        styles.state,
        compact ? styles.stateCompact : styles.stateRegular,
        style,
      ]}
    >
      <View style={[styles.stateIcon, { backgroundColor: theme.colors.fill }]}>
        <AppIcon name={iconName} size="large" color={iconColor} />
      </View>
      <AppText role={compact ? "sectionTitle" : "screenTitle"} align="center">
        {title}
      </AppText>
      {message ? (
        <AppText
          color="textSecondary"
          align="center"
          style={styles.stateMessage}
        >
          {message}
        </AppText>
      ) : null}
      {primaryAction || secondaryAction ? (
        <View style={styles.stateActions}>
          {primaryAction ? (
            <Button
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              accessibilityHint={primaryAction.accessibilityHint}
              fullWidth
            />
          ) : null}
          {secondaryAction ? (
            <Button
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              accessibilityHint={secondaryAction.accessibilityHint}
              variant="secondary"
              fullWidth
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export interface LoadingStateProps extends ViewProps {
  readonly label: string;
  readonly children?: ReactNode;
  readonly compact?: boolean;
}

export function LoadingState({
  label,
  children,
  compact = false,
  style,
  ...props
}: LoadingStateProps) {
  const { theme } = useMobileUI();
  return (
    <View
      {...props}
      style={[styles.loading, compact && styles.loadingCompact, style]}
    >
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
      >
        <ActivityIndicator
          color={theme.colors.accent}
          size={compact ? "small" : "large"}
        />
      </View>
      {children}
    </View>
  );
}

export type PaginationFooterState = "idle" | "loading" | "error" | "complete";

export interface PaginationFooterProps extends ViewProps {
  readonly state: PaginationFooterState;
  readonly retry?: () => void;
  readonly errorMessage?: string;
  readonly completeMessage?: string;
}

export function PaginationFooter({
  state,
  retry,
  errorMessage = "Couldn’t load more.",
  completeMessage,
  style,
  ...props
}: PaginationFooterProps) {
  const { theme } = useMobileUI();
  if (state === "idle") return null;

  return (
    <View {...props} style={[styles.pagination, style]}>
      {state === "loading" ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading more"
          style={styles.paginationRow}
        >
          <ActivityIndicator color={theme.colors.accent} size="small" />
          <AppText role="metadata" color="textSecondary">
            Loading more
          </AppText>
        </View>
      ) : state === "error" ? (
        <View accessibilityRole="alert" style={styles.paginationRow}>
          <AppText role="metadata" color="destructive">
            {errorMessage}
          </AppText>
          {retry ? (
            <Button
              label="Retry"
              onPress={retry}
              size="compact"
              variant="secondary"
            />
          ) : null}
        </View>
      ) : completeMessage ? (
        <AppText role="metadata" color="textSecondary" align="center">
          {completeMessage}
        </AppText>
      ) : null}
    </View>
  );
}

export interface InlineNoticeProps extends ViewProps {
  readonly tone?: "info" | "success" | "warning" | "error";
  readonly title?: string;
  readonly message: string;
  readonly action?: StateAction;
  readonly containerStyle?: StyleProp<ViewStyle>;
}

export function InlineNotice({
  tone = "info",
  title,
  message,
  action,
  containerStyle,
  ...props
}: InlineNoticeProps) {
  const { theme } = useMobileUI();
  const toneColor =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : tone === "error"
          ? theme.colors.destructive
          : theme.colors.socialAccent;
  return (
    <View
      {...props}
      accessibilityRole={tone === "error" ? "alert" : "summary"}
      style={[
        styles.notice,
        {
          backgroundColor: theme.colors.surfaceSunken,
          borderColor: toneColor,
        },
        containerStyle,
      ]}
    >
      <View style={styles.noticeText}>
        {title ? <AppText role="rowLabelCompact">{title}</AppText> : null}
        <AppText role="metadata" color="textSecondary">
          {message}
        </AppText>
      </View>
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          size="compact"
          variant="ghost"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    maxWidth: 460,
    width: "100%",
  },
  stateRegular: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.huge,
  },
  stateCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  stateIcon: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 64,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 64,
  },
  stateMessage: {
    marginTop: spacing.xs,
  },
  stateActions: {
    gap: spacing.xs,
    marginTop: spacing.lg,
    width: "100%",
  },
  loading: {
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  loadingCompact: {
    flex: 0,
    paddingVertical: spacing.lg,
  },
  pagination: {
    alignItems: "center",
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  paginationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  notice: {
    alignItems: "center",
    borderLeftWidth: 3,
    borderRadius: radius.medium,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  noticeText: {
    flex: 1,
    gap: 2,
  },
});
