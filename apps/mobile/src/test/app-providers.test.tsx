/* eslint-disable @typescript-eslint/no-require-imports */
import { Text } from "react-native";
import { render, within } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { MobileRuntimeConfig } from "@/config/runtime";
import { AppProviders } from "@/providers/AppProviders";

jest.mock("@clerk/expo", () => {
  const { View } = require("react-native");
  return {
    ClerkProvider: ({ children, publishableKey, tokenCache }: {
      children: ReactNode;
      publishableKey: string;
      tokenCache: unknown;
    }) => (
      <View
        testID="clerk-provider"
        publishableKey={publishableKey}
        secureCachePresent={Boolean(tokenCache)}
      >
        {children}
      </View>
    ),
  };
});
jest.mock("@clerk/expo/token-cache", () => ({ tokenCache: { secure: true } }));
jest.mock("@/providers/query", () => {
  const { View } = require("react-native");
  return {
    MobileQueryProvider: ({ appVersion, children }: {
      appVersion: string;
      children: ReactNode;
    }) => (
      <View testID="query-provider" appVersion={appVersion}>
        {children}
      </View>
    ),
  };
});
jest.mock("@/services/api", () => {
  const { View } = require("react-native");
  return {
    MobileApiClientProvider: ({ children }: { children: ReactNode }) => (
      <View testID="api-provider">{children}</View>
    ),
  };
});
jest.mock("@/providers/ui", () => {
  const { View } = require("react-native");
  return {
    MobileUiBootstrapProvider: ({ children }: { children: ReactNode }) => (
      <View testID="ui-provider">{children}</View>
    ),
  };
});

const runtimeConfig: MobileRuntimeConfig = {
  apiBaseUrl: "https://api.example.test",
  appVariant: "preview",
  appVersion: "0.1.0",
  clerkPublishableKey: "pk_test_test",
};

describe("AppProviders", () => {
  it("composes secure auth, query, API, and UI boundaries in order", async () => {
    const view = await render(
      <AppProviders runtimeConfig={runtimeConfig}>
        <Text>Route content</Text>
      </AppProviders>,
    );

    const clerk = view.getByTestId("clerk-provider");
    expect(clerk).toHaveProp("publishableKey", runtimeConfig.clerkPublishableKey);
    expect(clerk).toHaveProp("secureCachePresent", true);
    expect(within(clerk).getByTestId("query-provider")).toBeTruthy();
    expect(view.getByTestId("query-provider")).toHaveProp(
      "appVersion",
      runtimeConfig.appVersion,
    );
    expect(view.getByTestId("api-provider")).toBeTruthy();
    expect(view.getByTestId("ui-provider")).toBeTruthy();
    expect(view.getByText("Route content")).toBeOnTheScreen();
  });
});
