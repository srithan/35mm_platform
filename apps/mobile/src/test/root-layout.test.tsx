import { fireEvent, render } from "@testing-library/react-native";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import RootLayout from "@/app/_layout";

jest.mock("expo-router", () => ({
  Slot: jest.fn(() => null),
}));
jest.mock("expo-splash-screen", () => ({
  hide: jest.fn(),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@/providers", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => children,
}));

describe("root layout", () => {
  beforeEach(() => {
    jest.mocked(SplashScreen.hide).mockClear();
  });

  it("delegates route rendering to Expo Router", async () => {
    const view = await render(<RootLayout />);

    expect(Slot).toHaveBeenCalledTimes(1);
    expect(view.toJSON()).not.toBeNull();
  });

  it("hides the native splash once the first React frame is laid out", async () => {
    const view = await render(<RootLayout />);
    const root = view.getByTestId("native-splash-root");

    await fireEvent(root, "layout");
    await fireEvent(root, "layout");

    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});
