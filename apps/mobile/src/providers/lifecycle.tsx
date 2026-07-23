import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function isForegroundAppState(status: AppStateStatus): boolean {
  return status === "active";
}

export function isOnlineNetInfoState(
  state: Pick<NetInfoState, "isConnected" | "isInternetReachable">,
): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function ReactQueryLifecycleProvider({ children }: { readonly children: ReactNode }) {
  useEffect(() => {
    focusManager.setEventListener((setFocused) => {
      setFocused(isForegroundAppState(AppState.currentState));
      const subscription = AppState.addEventListener("change", (status) => {
        setFocused(isForegroundAppState(status));
      });
      return () => subscription.remove();
    });

    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => setOnline(isOnlineNetInfoState(state))),
    );

    return () => {
      focusManager.setEventListener(() => () => undefined);
      onlineManager.setEventListener(() => () => undefined);
    };
  }, []);

  return children;
}
