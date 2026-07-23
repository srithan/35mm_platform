import { isThemePreference, type ThemePreference } from "@35mm/design-tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { reportMobileDiagnostic } from "@/services/diagnostics";

export interface ComposerPresentation {
  readonly mode: "discussion" | "log" | "review" | "write";
  readonly quotedPostId: string | null;
}

interface MobileUiState {
  readonly isDrawerOpen: boolean;
  readonly isBottomChromeVisible: boolean;
  readonly composer: ComposerPresentation | null;
  readonly themePreference: ThemePreference;
  readonly hasHydrated: boolean;
  readonly openDrawer: () => void;
  readonly closeDrawer: () => void;
  readonly setBottomChromeVisible: (visible: boolean) => void;
  readonly presentComposer: (presentation?: Partial<ComposerPresentation>) => void;
  readonly dismissComposer: () => void;
  readonly setThemePreference: (preference: ThemePreference) => void;
  readonly resetTransientState: () => void;
  readonly markHydrated: () => void;
}

const TRANSIENT_INITIAL_STATE = {
  isDrawerOpen: false,
  isBottomChromeVisible: true,
  composer: null,
} as const;

export const useMobileUiStore = create<MobileUiState>()(
  persist(
    (set) => ({
      ...TRANSIENT_INITIAL_STATE,
      themePreference: "auto",
      hasHydrated: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setBottomChromeVisible: (isBottomChromeVisible) => set({ isBottomChromeVisible }),
      presentComposer: (presentation) =>
        set({
          composer: {
            mode: presentation?.mode ?? "write",
            quotedPostId: presentation?.quotedPostId ?? null,
          },
        }),
      dismissComposer: () => set({ composer: null }),
      setThemePreference: (themePreference) => set({ themePreference }),
      resetTransientState: () => set(TRANSIENT_INITIAL_STATE),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "@35mm/mobile-ui-preferences/v1",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themePreference: state.themePreference }),
      merge: (persisted, current) => {
        const candidate = (persisted as { themePreference?: unknown } | null)
          ?.themePreference;
        return {
          ...current,
          themePreference: isThemePreference(candidate)
            ? candidate
            : current.themePreference,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          reportMobileDiagnostic({
            source: "persistence",
            code: "UI_PREFERENCE_RESTORE_FAILED",
            operation: "ui-preferences.restore",
          });
        }
        state?.markHydrated();
      },
    },
  ),
);

export function resetMobileUiState(): void {
  useMobileUiStore.getState().resetTransientState();
}
