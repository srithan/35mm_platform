import { render } from "@testing-library/react-native";
import { Slot } from "expo-router";

import RootLayout from "@/app/_layout";

jest.mock("expo-router", () => ({
  Slot: jest.fn(() => null),
}));
jest.mock("@/providers", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => children,
}));

describe("root layout", () => {
  it("delegates route rendering to Expo Router", async () => {
    const view = await render(<RootLayout />);

    expect(Slot).toHaveBeenCalledTimes(1);
    expect(view.toJSON()).toBeNull();
  });
});
