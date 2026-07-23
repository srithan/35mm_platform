import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import type { ReactNode } from "react";

import { getMobileRuntimeConfig, type MobileRuntimeConfig } from "@/config/runtime";
import { RootErrorBoundary } from "@/providers/errorBoundary";
import { MobileQueryProvider } from "@/providers/query";
import { MobileUiBootstrapProvider } from "@/providers/ui";
import { MobileApiClientProvider } from "@/services/api";
import { resetMobileUiState } from "@/state/ui";

export function AppProviders({
  children,
  runtimeConfig,
}: {
  readonly children: ReactNode;
  readonly runtimeConfig?: MobileRuntimeConfig;
}) {
  return (
    <RootErrorBoundary onReset={resetMobileUiState}>
      <ConfiguredProviders {...(runtimeConfig ? { runtimeConfig } : {})}>
        {children}
      </ConfiguredProviders>
    </RootErrorBoundary>
  );
}

function ConfiguredProviders({
  children,
  runtimeConfig = getMobileRuntimeConfig(),
}: {
  readonly children: ReactNode;
  readonly runtimeConfig?: MobileRuntimeConfig;
}) {
  if (!tokenCache) {
    throw new Error("Clerk secure token cache is unavailable on this platform.");
  }
  return (
      <ClerkProvider
        publishableKey={runtimeConfig.clerkPublishableKey}
        tokenCache={tokenCache}
      >
        <MobileQueryProvider appVersion={runtimeConfig.appVersion}>
          <MobileApiClientProvider runtimeConfig={runtimeConfig}>
            <MobileUiBootstrapProvider>{children}</MobileUiBootstrapProvider>
          </MobileApiClientProvider>
        </MobileQueryProvider>
      </ClerkProvider>
  );
}
