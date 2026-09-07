import {
  MobileUIProvider,
  SafeAreaProvider,
} from "@35mm/mobile-ui";
import type { SignInResource } from "@clerk/expo/types";
import {
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  resendLoginEmailCode,
  startPasswordLogin,
  verifyLoginEmailCode,
} from "@/features/auth/login/clerk";
import { LoginScreen } from "@/features/auth/login/LoginScreen";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider
        preference="light"
        reduceMotion
        systemColorScheme="light"
      >
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

describe("mobile Login", () => {
  it("submits trimmed credentials and never mutates the password", async () => {
    const onSignIn = jest.fn().mockResolvedValue({
      status: "complete",
      sessionId: "sess_complete",
    });
    const view = await render(
      <Providers>
        <LoginScreen
          isReady
          onBack={jest.fn()}
          onCreateAccount={jest.fn()}
          onResend={jest.fn()}
          onSignIn={onSignIn}
          onVerify={jest.fn()}
        />
      </Providers>,
    );

    await fireEvent.changeText(
      view.getByTestId("login-identifier"),
      " user@example.com ",
    );
    await fireEvent.changeText(
      view.getByTestId("login-password"),
      " Secret Password ",
    );
    await fireEvent.press(view.getByTestId("login-submit"));

    await waitFor(() => {
      expect(onSignIn).toHaveBeenCalledWith({
        identifier: "user@example.com",
        password: " Secret Password ",
      });
    });
  });

  it("moves to email-code verification and submits six numeric digits", async () => {
    const onVerify = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <Providers>
        <LoginScreen
          isReady
          now={() => 1_000}
          onBack={jest.fn()}
          onCreateAccount={jest.fn()}
          onResend={jest.fn()}
          onSignIn={jest.fn().mockResolvedValue({
            status: "needs_verification",
            safeIdentifier: "u***@example.com",
          })}
          onVerify={onVerify}
        />
      </Providers>,
    );

    await fireEvent.changeText(
      view.getByTestId("login-identifier"),
      "user@example.com",
    );
    await fireEvent.changeText(view.getByTestId("login-password"), "secret");
    await fireEvent.press(view.getByTestId("login-submit"));

    await waitFor(() => {
      expect(view.getByTestId("login-code")).toBeOnTheScreen();
    });
    await fireEvent.changeText(view.getByTestId("login-code"), "12x34567");
    await fireEvent.press(view.getByTestId("login-verify"));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("123456"));
  });

  it("requires a created session for a completed Clerk sign-in", async () => {
    const signIn = {
      create: jest.fn().mockResolvedValue({
        status: "complete",
        createdSessionId: null,
      }),
    } as unknown as SignInResource;

    await expect(
      startPasswordLogin(signIn, {
        identifier: "filmfan",
        password: "secret",
      }),
    ).rejects.toMatchObject({ code: "LOGIN_SESSION_MISSING" });
  });

  it("prepares, verifies, and resends supported email-code challenges", async () => {
    const prepareSecondFactor = jest.fn().mockResolvedValue(undefined);
    const attemptSecondFactor = jest.fn().mockResolvedValue({
      status: "complete",
      createdSessionId: "sess_verified",
    });
    const challenge = {
      status: "needs_second_factor",
      supportedSecondFactors: [
        {
          strategy: "email_code",
          emailAddressId: "idn_email",
          safeIdentifier: "f***@example.com",
        },
      ],
      prepareSecondFactor,
      attemptSecondFactor,
    } as unknown as SignInResource;
    const signIn = {
      create: jest.fn().mockResolvedValue(challenge),
    } as unknown as SignInResource;

    await expect(
      startPasswordLogin(signIn, {
        identifier: "filmfan",
        password: "secret",
      }),
    ).resolves.toEqual({
      status: "needs_verification",
      safeIdentifier: "f***@example.com",
    });
    await expect(verifyLoginEmailCode(challenge, "123456")).resolves.toBe(
      "sess_verified",
    );
    await resendLoginEmailCode(challenge);

    expect(prepareSecondFactor).toHaveBeenCalledTimes(2);
    expect(prepareSecondFactor).toHaveBeenLastCalledWith({
      strategy: "email_code",
      emailAddressId: "idn_email",
    });
    expect(attemptSecondFactor).toHaveBeenCalledWith({
      strategy: "email_code",
      code: "123456",
    });
  });

  it("rejects account challenges without a supported verification factor", async () => {
    const signIn = {
      create: jest.fn().mockResolvedValue({
        status: "needs_second_factor",
        supportedSecondFactors: [{ strategy: "totp" }],
      }),
    } as unknown as SignInResource;

    await expect(
      startPasswordLogin(signIn, {
        identifier: "filmfan",
        password: "secret",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "LOGIN_FACTOR_UNSUPPORTED",
      }),
    );
  });
});
