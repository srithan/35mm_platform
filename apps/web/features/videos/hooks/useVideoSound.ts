"use client";

import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSettingsQuery } from "@/features/settings/hooks/useSettings";
import { useVideoSoundStore } from "@/stores/useVideoSoundStore";

export function useVideoSound() {
  const { userId } = useAuth();
  const settings = useSettingsQuery();
  const startWithSound = settings.data?.media?.startWithSound ?? false;
  const quietMode = settings.data?.media?.quietMode ?? false;
  const volume = quietMode ? 0.3 : 1;
  // Changing accounts or the saved default discards the previous playback override.
  const scope = JSON.stringify([userId ?? null, startWithSound, quietMode]);
  const muted = useVideoSoundStore((state) =>
    state.scope === scope ? state.muted : !startWithSound);
  const getMuted = useCallback(() => {
    const state = useVideoSoundStore.getState();
    return state.scope === scope ? state.muted : !startWithSound;
  }, [scope, startWithSound]);
  const setMuted = useCallback((value: boolean) => {
    useVideoSoundStore.getState().setMuted(value, scope);
  }, [scope]);
  return { muted, getMuted, setMuted, volume };
}
