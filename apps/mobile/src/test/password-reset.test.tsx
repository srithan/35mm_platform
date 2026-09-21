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
  completePasswordReset,
  resendPasswordResetCode,
  startPasswordReset,
  verifyPasswordResetCode,
} from "@/features/auth/password/clerk";
import { ForgotPasswordScreen } from "@/features/auth/password/ForgotPasswordScreen";
import { NewPasswordScreen } from "@/features/auth/password/NewPasswordScreen";
import { VerifyPasswordResetScreen } from "@/features/auth/password/VerifyPasswordResetScreen";

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

describe("mobile password reset", () => {
  it("submits a normalized email without exposing password reset internals", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <Providers>
        <ForgotPasswordScreen
          isReady
          onBack={jest.fn()}
          onSubmit={onSubmit}
        />
      </Providers>,
    );

    await fireEvent.changeText(
      view.getByTestId("forgot-password-email"),
      " USER@EXAMPLE.COM ",
    );
    await fireEvent.press(view.getByTestId("forgot-password-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("user@example.com");
    });
  });

  it("keeps reset code numeric and routes only after six digits", async () => {
    const onVerify = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <Providers>
        <VerifyPasswordResetScreen
          isReady
          now={() => 1_000}
          onBack={jest.fn()}
          onResend={jest.fn()}
          onVerify={onVerify}
          target="u***@example.com"
        />
      </Providers>,
    );

    await fireEvent.changeText(
      view.getByTestId("verify-password-reset-code"),
      "12x34567",
    );
    await fireEvent.press(view.getByTestId("verify-password-reset-submit"));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("123456"));
  });

  it("requires matching new passwords before submit", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <Providers>
        <NewPasswordScreen
          isReady
          onBack={jest.fn()}
          onSubmit={onSubmit}
        />
      </Providers>,
    );

    await fireEvent.changeText(
      view.getByTestId("new-password-input"),
      "new-password",
    );
    await fireEvent.changeText(
      view.getByTestId("new-password-confirmation-input"),
      "new-password",
    );
    await fireEvent.press(view.getByTestId("new-password-submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("new-password"));
  });

  it("starts and resends Clerk reset-password email-code factors", async () => {
    const prepared = {
      status: "needs_first_factor",
      supportedFirstFactors: [
        {
          strategy: "reset_password_email_code",
          emailAddressId: "idn_email",
          safeIdentifier: "f***@example.com",
        },
      ],
    } as unknown as SignInResource;
    const signIn = {
      create: jest.fn().mockResolvedValue(prepared),
      prepareFirstFactor: jest.fn().mockResolvedValue(prepared),
      supportedFirstFactors: [
        {
          strategy: "reset_password_email_code",
          emailAddressId: "idn_email",
          safeIdentifier: "f***@example.com",
        },
      ],
    } as unknown as SignInResource;

    await expect(
      startPasswordReset(signIn, "fan@example.com"),
    ).resolves.toEqual({ safeIdentifier: "f***@example.com" });
    await expect(
      resendPasswordResetCode(signIn, "fan@example.com"),
    ).resolves.toEqual({ safeIdentifier: "f***@example.com" });

    expect(signIn.create).toHaveBeenCalledWith({
      strategy: "reset_password_email_code",
      identifier: "fan@example.com",
    });
    expect(signIn.prepareFirstFactor).toHaveBeenCalledWith({
      strategy: "reset_password_email_code",
      emailAddressId: "idn_email",
    });
  });

  it("verifies reset codes and completes the new password challenge", async () => {
    const signIn = {
      attemptFirstFactor: jest.fn().mockResolvedValue({
        status: "needs_new_password",
      }),
      resetPassword: jest.fn().mockResolvedValue({
        status: "complete",
        createdSessionId: "sess_reset",
      }),
    } as unknown as SignInResource;

    await expect(verifyPasswordResetCode(signIn, "123456")).resolves.toEqual({
      status: "needs_new_password",
    });
    await expect(
      completePasswordReset(signIn, "new-password"),
    ).resolves.toEqual({ sessionId: "sess_reset" });

    expect(signIn.attemptFirstFactor).toHaveBeenCalledWith({
      strategy: "reset_password_email_code",
      code: "123456",
    });
    expect(signIn.resetPassword).toHaveBeenCalledWith({
      password: "new-password",
      signOutOfOtherSessions: true,
    });
  });
});
