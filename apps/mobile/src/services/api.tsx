import { ApiClient } from "@35mm/api-client";
import { useAuth } from "@clerk/expo";
import * as Crypto from "expo-crypto";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Platform } from "react-native";

import type { MobileRuntimeConfig } from "@/config/runtime";
import { reportApiDiagnostic } from "@/services/diagnostics";

const ApiClientContext = createContext<ApiClient | null>(null);

export function MobileApiClientProvider({
  children,
  runtimeConfig,
}: {
  readonly children: ReactNode;
  readonly runtimeConfig: MobileRuntimeConfig;
}) {
  const { getToken } = useAuth();

  const client = useMemo(
    () =>
      new ApiClient({
        baseUrl: runtimeConfig.apiBaseUrl,
        fetch: globalThis.fetch.bind(globalThis),
        createRequestId: () => Crypto.randomUUID(),
        getToken,
        onDiagnostic: reportApiDiagnostic,
        platform: {
          platform:
            Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "unknown",
          appVersion: runtimeConfig.appVersion,
          appVariant: runtimeConfig.appVariant,
        },
      }),
    [getToken, runtimeConfig],
  );

  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("useApiClient must be used within MobileApiClientProvider.");
  return client;
}
