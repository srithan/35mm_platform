import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { motion, radius, spacing } from "@35mm/design-tokens";
import { AppIcon, type AppIconName } from "./icons";
import { AppText } from "./primitives";
import { elevationStyle, useMobileUI } from "./theme";

export type ToastTone = "info" | "success" | "error";

export interface ToastInput {
  readonly message: string;
  readonly tone?: ToastTone;
  readonly durationMs?: number;
  readonly action?: {
    readonly label: string;
    readonly onPress: () => void;
  };
}

interface ToastRecord {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly durationMs: number;
  readonly action?: ToastInput["action"];
}

export interface ToastController {
  readonly showToast: (input: ToastInput) => number;
  readonly dismissToast: (id?: number) => void;
}

const ToastContext = createContext<ToastController | null>(null);
const DEFAULT_TOAST_DURATION_MS = 2_600;
const MAX_TOAST_QUEUE = 4;

export interface ToastProviderProps {
  readonly children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [queue, setQueue] = useState<readonly ToastRecord[]>([]);
  const nextId = useRef(1);
  const active = queue[0];

  const showToast = useCallback((input: ToastInput): number => {
    const message = input.message.trim();
    if (!message) {
      throw new Error("Toast message must not be empty.");
    }

    const id = nextId.current;
    nextId.current += 1;
    const record: ToastRecord = {
      id,
      message,
      tone: input.tone ?? "info",
      durationMs: Math.max(
        1_000,
        Math.min(10_000, input.durationMs ?? DEFAULT_TOAST_DURATION_MS),
      ),
      ...(input.action ? { action: input.action } : {}),
    };

    setQueue((current) => {
      const currentActive = current[0];
      if (
        currentActive &&
        currentActive.message === record.message &&
        currentActive.tone === record.tone
      ) {
        return current;
      }

      const pending = current
        .slice(1)
        .filter(
          (toast) =>
            toast.message !== record.message || toast.tone !== record.tone,
        );
      return currentActive
        ? [currentActive, ...[...pending, record].slice(-(MAX_TOAST_QUEUE - 1))]
        : [record];
    });

    return id;
  }, []);

  const dismissToast = useCallback((id?: number) => {
    setQueue((current) =>
      id === undefined
        ? current.slice(1)
        : current.filter((toast) => toast.id !== id),
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => dismissToast(active.id), active.durationMs);
    return () => clearTimeout(timer);
  }, [active, dismissToast]);

  const controller = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={controller}>
      {children}
      <ToastViewport toast={active} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastController {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider.");
  return value;
}

function iconForTone(tone: ToastTone): AppIconName {
  switch (tone) {
    case "info":
      return "film";
    case "success":
      return "check";
    case "error":
      return "warning";
  }
}

interface ToastViewportProps extends ViewProps {
  readonly toast: ToastRecord | undefined;
  readonly onDismiss: (id?: number) => void;
}

function ToastViewport({ toast, onDismiss }: ToastViewportProps) {
  const { theme, reduceMotion } = useMobileUI();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!toast) return;
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
    } else {
      opacity.setValue(0);
      translateY.setValue(12);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.fade.duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.fade.duration,
          useNativeDriver: true,
        }),
      ]).start();
    }
    AccessibilityInfo.announceForAccessibility(toast.message);
  }, [opacity, reduceMotion, toast, translateY]);

  if (!toast) return null;

  const toneColor =
    toast.tone === "success"
      ? theme.colors.success
      : toast.tone === "error"
        ? theme.colors.destructive
        : theme.colors.socialAccent;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        { bottom: Math.max(insets.bottom, spacing.md) + 64 },
      ]}
    >
      <Animated.View
        accessibilityRole={toast.tone === "error" ? "alert" : "summary"}
        accessibilityLiveRegion={
          toast.tone === "error" ? "assertive" : "polite"
        }
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.borderStrong,
            opacity,
            transform: [{ translateY }],
          },
          elevationStyle("floating"),
        ]}
      >
        <AppIcon
          name={iconForTone(toast.tone)}
          size="small"
          color={toneColor}
        />
        <AppText role="metadata" style={styles.message} numberOfLines={3}>
          {toast.message}
        </AppText>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            onPress={() => {
              onDismiss(toast.id);
              toast.action?.onPress();
            }}
            style={({ pressed }) => [
              styles.toastAction,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <AppText role="rowLabelCompact" style={{ color: toneColor }}>
              {toast.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    alignItems: "center",
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    zIndex: 10_000,
  },
  toast: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 480,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  message: {
    flexShrink: 1,
  },
  toastAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.xs,
  },
});
