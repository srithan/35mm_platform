"use client";

import { create } from "zustand";

/** Playback controls are session-only; the saved default stays in React Query. */
export const useVideoSoundStore = create<{
  muted: boolean;
  scope: string | null;
  setMuted: (muted: boolean, scope?: string) => void;
}>((set) => ({
  muted: true,
  scope: null,
  setMuted: (muted, scope) => set((state) =>
    state.muted === muted && state.scope === (scope ?? state.scope)
      ? state : { muted, scope: scope ?? state.scope }),
}));
