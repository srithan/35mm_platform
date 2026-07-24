import {
  MobileUIProvider,
  SafeAreaProvider,
} from "@35mm/mobile-ui";
import { useRouter } from "expo-router";
import {
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import { WelcomeScreen } from "@/features/auth/welcome/WelcomeScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider
        preference="dark"
        reduceMotion
        systemColorScheme="dark"
      >
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

describe("WelcomeScreen", () => {
  const push = jest.fn();
  const mockedUseRouter = jest.mocked(useRouter);
  let openUrl: jest.SpiedFunction<typeof Linking.openURL>;

  beforeEach(() => {
    push.mockReset();
    mockedUseRouter.mockReturnValue({ push } as never);
    openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    openUrl.mockRestore();
  });

  it("renders the local cinematic welcome content accessibly", async () => {
    const view = await render(
      <Providers>
        <WelcomeScreen />
      </Providers>,
    );

    expect(view.getByTestId("welcome-screen")).toBeOnTheScreen();
    expect(
      view.getByRole("header", { name: "Your life, in film." }),
    ).toBeOnTheScreen();
    expect(
      view.getByText("35mm", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(view.getByTestId("welcome-hero", {
      includeHiddenElements: true,
    })).toHaveProp("accessible", false);
    expect(
      view.getByRole("button", { name: "Start your journey" }),
    ).toBeOnTheScreen();
    expect(view.getByRole("link", { name: "Log in" })).toBeOnTheScreen();
    expect(view.getByRole("link", { name: "Terms of Service" })).toBeOnTheScreen();
    expect(view.getByRole("link", { name: "Privacy Policy" })).toBeOnTheScreen();
  });

  it("routes account actions without starting a network request", async () => {
    const view = await render(
      <Providers>
        <WelcomeScreen />
      </Providers>,
    );

    await fireEvent.press(view.getByTestId("welcome-start"));
    await fireEvent.press(view.getByTestId("welcome-login"));

    expect(push).toHaveBeenNthCalledWith(1, "./signup/name");
    expect(push).toHaveBeenNthCalledWith(2, "./login");
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("opens only fixed legal URLs and reports failures accessibly", async () => {
    openUrl.mockRejectedValueOnce(new Error("browser unavailable"));
    const view = await render(
      <Providers>
        <WelcomeScreen />
      </Providers>,
    );

    await fireEvent.press(view.getByTestId("welcome-terms"));
    await waitFor(() => {
      expect(view.getByTestId("welcome-legal-error")).toHaveTextContent(
        "35mm couldn’t open that page. Please try again.",
      );
    });
    await fireEvent.press(view.getByTestId("welcome-privacy"));

    expect(openUrl).toHaveBeenNthCalledWith(1, "https://35mm.in/terms");
    expect(openUrl).toHaveBeenNthCalledWith(2, "https://35mm.in/privacy");
  });
});
