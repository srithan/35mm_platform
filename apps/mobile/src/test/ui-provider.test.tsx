/* eslint-disable @typescript-eslint/no-require-imports */
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ReactNode } from "react";

import { MobileUiBootstrapProvider } from "@/providers/ui";

const mockUseFonts = jest.fn();
const mockUiState = {
  themePreference: "auto",
  hasHydrated: false,
};

jest.mock("expo-font", () => ({
  useFonts: (...args: unknown[]) => mockUseFonts(...args),
}));

jest.mock("@/state/ui", () => ({
  useMobileUiStore: (selector: (state: typeof mockUiState) => unknown) =>
    selector(mockUiState),
}));

jest.mock("@35mm/mobile-ui", () => {
  const { View } = require("react-native");
  return {
    mobileFontAssets: { TestFont: 1 },
    MobileUIProvider: ({ children }: { children: ReactNode }) => (
      <View testID="mobile-ui-provider">{children}</View>
    ),
    SafeAreaProvider: ({ children }: { children: ReactNode }) => (
      <View testID="safe-area-provider">{children}</View>
    ),
    ToastProvider: ({ children }: { children: ReactNode }) => (
      <View testID="toast-provider">{children}</View>
    ),
  };
});

describe("MobileUiBootstrapProvider", () => {
  beforeEach(() => {
    mockUseFonts.mockReset();
  });

  it("renders an explicit loading surface while fonts load", async () => {
    mockUseFonts.mockReturnValue([false, null]);

    const view = await render(
      <MobileUiBootstrapProvider>
        <Text>Route content</Text>
      </MobileUiBootstrapProvider>,
    );

    expect(view.getByTestId("app-bootstrap-loading")).toBeOnTheScreen();
    expect(view.getByText("35mm")).toBeOnTheScreen();
    expect(view.queryByText("Route content")).not.toBeOnTheScreen();
  });

  it("renders routes without blocking on non-critical theme hydration", async () => {
    mockUseFonts.mockReturnValue([true, null]);

    const view = await render(
      <MobileUiBootstrapProvider>
        <Text>Route content</Text>
      </MobileUiBootstrapProvider>,
    );

    expect(view.getByTestId("mobile-ui-provider")).toBeOnTheScreen();
    expect(view.getByText("Route content")).toBeOnTheScreen();
  });
});
