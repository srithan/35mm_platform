"use client";

import { createContext, useContext } from "react";

interface ShellLayoutContextValue {
  profileRailDisabled: boolean;
  setProfileRailDisabled: (disabled: boolean) => void;
}

export const ShellLayoutContext = createContext<ShellLayoutContextValue>({
  profileRailDisabled: false,
  setProfileRailDisabled: function () {},
});

export function useShellLayout() {
  return useContext(ShellLayoutContext);
}
