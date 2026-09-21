import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { render, fireEvent } from "@testing-library/react-native";
import * as Native from "react-native";
import { LoginScreen } from "@/features/auth/login/LoginScreen";
import { BootstrapLoadingSurface } from "@/providers/bootstrapLoading";
import { SignupDateOfBirthField } from "@/features/auth/signup/SignupDateOfBirthField";
import createExpoConfig from "../../app.config";
import type { ConfigContext } from "expo/config";

jest.mock("@clerk/expo", () => ({ isClerkAPIResponseError: () => false }));
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <MobileUIProvider preference="barbie" reduceMotion>
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

afterEach(() => jest.restoreAllMocks());

it.each(["light", "dark"] as const)(
  "matches device %s appearance despite saved account theme",
  async (scheme) => {
    jest.spyOn(Native, "useColorScheme").mockReturnValue(scheme);
    const c =
      scheme === "dark"
        ? { paper: "#000000", ink: "#FFFFFF" }
        : { paper: "#FFFFFF", ink: "#000000" };
    const view = await render(
      <Wrapper>
        <BootstrapLoadingSurface />
        <LoginScreen
          isReady
          onBack={jest.fn()}
          onCreateAccount={jest.fn()}
          onForgotPassword={jest.fn()}
          onResend={jest.fn()}
          onSignIn={jest.fn()}
          onVerify={jest.fn()}
        />
      </Wrapper>,
    );
    expect(view.getByTestId("app-bootstrap-loading")).toHaveStyle({
      backgroundColor: c.paper,
    });
    expect(view.getByTestId("app-bootstrap-wordmark")).toHaveStyle({
      tintColor: c.ink,
    });
    expect(view.getByTestId("login-screen")).toHaveStyle({
      backgroundColor: c.paper,
    });
    expect(view.getByLabelText("Email or username")).toHaveProp(
      "placeholder",
      "Your email or username",
    );
    expect(view.getByLabelText("Password")).toHaveProp(
      "placeholder",
      "Your password",
    );
    expect(view.queryByTestId("login-hero")).toBeNull();
  },
);

it("clamps leap days and future dates, and only commits the sheet on Done", async () => {
  const change = jest.fn();
  const view = await render(
    <Wrapper>
      <SignupDateOfBirthField
        value={{ year: "2000", month: "02", day: "29" }}
        today="2026-07-24"
        locale="en-US"
        onChange={change}
        onSubmit={jest.fn()}
      />
    </Wrapper>,
  );
  await fireEvent.press(view.getByTestId("signup-dob-open"));
  const rowHeight = Math.max(44, 28 * Native.PixelRatio.getFontScale());
  await fireEvent(
    view.getByTestId("signup-dob-year-wheel", { includeHiddenElements: true }),
    "momentumScrollEnd",
    { nativeEvent: { contentOffset: { y: 125 * rowHeight } } },
  );
  expect(
    view.getByRole("adjustable", { name: "Day" }).props.accessibilityValue.text,
  ).toBe("28");
  await fireEvent(
    view.getByRole("adjustable", { name: "Year" }),
    "accessibilityAction",
    { nativeEvent: { actionName: "increment" } },
  );
  await fireEvent(
    view.getByTestId("signup-dob-month-wheel", { includeHiddenElements: true }),
    "momentumScrollEnd",
    { nativeEvent: { contentOffset: { y: 11 * rowHeight } } },
  );
  expect(
    view.getByRole("adjustable", { name: "Month" }).props.accessibilityValue
      .text,
  ).toBe("July");
  expect(
    view.getByRole("adjustable", { name: "Day" }).props.accessibilityValue.text,
  ).toBe("24");
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId("signup-dob-done"));
  expect(change).toHaveBeenCalledWith({ year: "2026", month: "07", day: "24" });
});

it.each(["development", "preview"])(
  "generates adaptive native splash for %s",
  (variant) => {
    const previous = process.env.APP_VARIANT;
    try {
      process.env.APP_VARIANT = variant;
      const config = createExpoConfig({
        config: { name: "35mm", slug: "35mm" },
      } as ConfigContext);
      expect(config.plugins).toContainEqual([
        "expo-splash-screen",
        expect.objectContaining({
          backgroundColor: "#FFFFFF",
          dark: {
            backgroundColor: "#000000",
            image: "./assets/launch/launch-wordmark-dark.png",
          },
        }),
      ]);
    } finally {
      if (previous === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = previous;
    }
  },
);
