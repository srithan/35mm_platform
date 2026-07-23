import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  findNodeHandle,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { motion, radius, sheetGeometry, spacing } from "@35mm/design-tokens";
import { AppIcon, type AppIconName } from "./icons";
import { AppText, Button, Divider, IconButton } from "./primitives";
import { elevationStyle, useMobileUI } from "./theme";

export type ModalSurfaceVariant = "centered" | "fullScreen";

export interface ModalSurfaceProps {
  readonly visible: boolean;
  readonly onRequestClose: () => void;
  readonly accessibilityLabel: string;
  readonly children: ReactNode;
  readonly variant?: ModalSurfaceVariant;
  readonly closeOnBackdrop?: boolean;
  readonly showCloseButton?: boolean;
  readonly closeButtonLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export function ModalSurface({
  visible,
  onRequestClose,
  accessibilityLabel,
  children,
  variant = "centered",
  closeOnBackdrop = true,
  showCloseButton = false,
  closeButtonLabel = "Close",
  style,
  testID,
}: ModalSurfaceProps) {
  const { theme, reduceMotion } = useMobileUI();
  const panelRef = useRef<View>(null);
  const insets = useSafeAreaInsets();

  const focusPanel = useCallback(() => {
    const handle = findNodeHandle(panelRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduceMotion ? "none" : "fade"}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onRequestClose}
      onShow={focusPanel}
    >
      <View
        style={[
          styles.modalViewport,
          variant === "fullScreen" && {
            paddingTop: insets.top,
            paddingRight: insets.right,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
          },
        ]}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={[styles.backdrop, { backgroundColor: "rgba(15,15,15,0.52)" }]}
          onPress={closeOnBackdrop ? onRequestClose : undefined}
        />
        <View
          ref={panelRef}
          testID={testID}
          accessible
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[
            variant === "centered"
              ? styles.centeredPanel
              : styles.fullScreenPanel,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
            variant === "centered" && elevationStyle("overlay"),
            style,
          ]}
        >
          {showCloseButton ? (
            <View style={styles.modalCloseButton}>
              <IconButton
                icon="close"
                label={closeButtonLabel}
                onPress={onRequestClose}
              />
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export interface ConfirmationDialogProps {
  readonly visible: boolean;
  readonly title: string;
  readonly message?: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly destructive?: boolean;
  readonly loading?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <ModalSurface
      visible={visible}
      onRequestClose={loading ? () => undefined : onCancel}
      accessibilityLabel={title}
      closeOnBackdrop={!loading}
      style={styles.confirmationPanel}
    >
      <View style={styles.confirmationCopy}>
        <AppText role="screenTitle" align="center">
          {title}
        </AppText>
        {message ? (
          <AppText color="textSecondary" align="center">
            {message}
          </AppText>
        ) : null}
      </View>
      <View style={styles.confirmationActions}>
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          variant={destructive ? "danger" : "primary"}
          loading={loading}
          fullWidth
        />
        <Button
          label={cancelLabel}
          onPress={onCancel}
          variant="secondary"
          disabled={loading}
          fullWidth
        />
      </View>
    </ModalSurface>
  );
}

export interface ActionSheetAction {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: AppIconName;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}

export interface ActionSheetSection {
  readonly id: string;
  readonly actions: readonly ActionSheetAction[];
}

export interface ActionSheetProps {
  readonly visible: boolean;
  readonly accessibilityLabel: string;
  readonly sections: readonly ActionSheetSection[];
  readonly onRequestClose: () => void;
  readonly testID?: string;
}

export function ActionSheet({
  visible,
  accessibilityLabel,
  sections,
  onRequestClose,
  testID,
}: ActionSheetProps) {
  const { theme, reduceMotion } = useMobileUI();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const hiddenOffset = Math.max(480, windowHeight);
  const translateY = useSharedValue(hiddenOffset);
  const [mounted, setMounted] = useState(visible);
  const dismissingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationDuration = reduceMotion ? 0 : motion.sheet.duration;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (visible) {
      dismissingRef.current = false;
      setMounted(true);
      translateY.value = reduceMotion ? 0 : hiddenOffset;
      if (!reduceMotion) {
        translateY.value = withTiming(0, { duration: animationDuration });
      }
      return;
    }

    if (!mounted) return;
    translateY.value = reduceMotion
      ? hiddenOffset
      : withTiming(hiddenOffset, { duration: animationDuration });
    timerRef.current = setTimeout(() => {
      setMounted(false);
      timerRef.current = null;
    }, animationDuration);
  }, [
    animationDuration,
    hiddenOffset,
    mounted,
    reduceMotion,
    translateY,
    visible,
  ]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    onRequestClose();
  }, [onRequestClose]);

  const selectAction = useCallback(
    (action: ActionSheetAction) => {
      if (action.disabled || dismissingRef.current) return;
      dismissingRef.current = true;
      onRequestClose();
      setTimeout(action.onPress, animationDuration);
    },
    [animationDuration, onRequestClose],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!reduceMotion && visible)
        .onUpdate((event) => {
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY >= sheetGeometry.dragDismissThreshold ||
            event.velocityY > 900;
          if (shouldDismiss) {
            translateY.value = withTiming(hiddenOffset, {
              duration: animationDuration,
            });
            runOnJS(requestClose)();
          } else {
            translateY.value = withTiming(0, { duration: animationDuration });
          }
        }),
    [
      animationDuration,
      hiddenOffset,
      reduceMotion,
      requestClose,
      translateY,
      visible,
    ],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, hiddenOffset], [1, 0]),
  }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={requestClose}
    >
      <View style={styles.sheetViewport}>
        <Animated.View
          style={[
            styles.sheetBackdrop,
            {
              backgroundColor: `rgba(15,15,15,${sheetGeometry.backdropOpacity})`,
            },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss actions"
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
          />
        </Animated.View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            testID={testID}
            accessible
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
            style={[
              styles.sheetPanel,
              {
                backgroundColor: theme.colors.surfaceSunken,
                paddingBottom: Math.max(
                  insets.bottom,
                  sheetGeometry.bottomSpacing,
                ),
                maxHeight: windowHeight * 0.88,
              },
              elevationStyle("overlay"),
              panelStyle,
            ]}
          >
            <View style={styles.sheetHandleArea} accessible={false}>
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: theme.colors.borderStrong },
                ]}
              />
            </View>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {sections.map((section) => (
                <View
                  key={section.id}
                  style={[
                    styles.sheetGroup,
                    { backgroundColor: theme.colors.surfaceElevated },
                  ]}
                >
                  {section.actions.map((action, index) => {
                    const color = action.destructive
                      ? theme.colors.destructive
                      : theme.colors.text;
                    return (
                      <View key={action.id}>
                        {index > 0 ? <Divider inset={spacing.lg} /> : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={action.label}
                          accessibilityHint={action.description}
                          accessibilityState={{
                            disabled: action.disabled ?? false,
                          }}
                          disabled={action.disabled}
                          onPress={() => selectAction(action)}
                          style={({ pressed }) => [
                            styles.sheetAction,
                            {
                              backgroundColor: pressed
                                ? theme.colors.surfacePressed
                                : "transparent",
                              opacity: action.disabled ? 0.45 : 1,
                            },
                          ]}
                        >
                          <View style={styles.sheetActionCopy}>
                            <AppText
                              role="rowLabelCompact"
                              style={{ color }}
                              numberOfLines={1}
                            >
                              {action.label}
                            </AppText>
                            {action.description ? (
                              <AppText
                                role="metadata"
                                color="textSecondary"
                                numberOfLines={2}
                              >
                                {action.description}
                              </AppText>
                            ) : null}
                          </View>
                          {action.icon ? (
                            <AppIcon
                              name={action.icon}
                              color={color}
                              size="medium"
                            />
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalViewport: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  centeredPanel: {
    borderRadius: radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "92%",
    maxWidth: 560,
    overflow: "hidden",
    width: "100%",
  },
  fullScreenPanel: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    borderWidth: 0,
  },
  modalCloseButton: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  confirmationPanel: {
    maxWidth: 380,
  },
  confirmationCopy: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  confirmationActions: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sheetViewport: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheetPanel: {
    borderTopLeftRadius: sheetGeometry.cornerRadius,
    borderTopRightRadius: sheetGeometry.cornerRadius,
    overflow: "hidden",
  },
  sheetHandleArea: {
    alignItems: "center",
    minHeight: 34,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  sheetHandle: {
    borderRadius: radius.pill,
    height: 5,
    width: 40,
  },
  sheetContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: sheetGeometry.horizontalInset,
  },
  sheetGroup: {
    borderRadius: sheetGeometry.actionGroupRadius,
    overflow: "hidden",
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    minHeight: sheetGeometry.rowHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sheetActionCopy: {
    flex: 1,
  },
});
