"use client";

import { createContext, useContext } from "react";

interface ShellLayoutContextValue {
  profileRailDisabled: boolean;
  setProfileRailDisabled: (disabled: boolean) => void;
  previousPathname: string | null;
}

export const ShellLayoutContext = createContext<ShellLayoutContextValue>({
  profileRailDisabled: false,
  setProfileRailDisabled: function () {},
  previousPathname: null,
});

export function useShellLayout() {
  return useContext(ShellLayoutContext);
}
