import { isClerkAPIResponseError } from "@clerk/expo";
import type { SignInResource } from "@clerk/expo/types";

export type LoginStep =
  | { readonly status: "complete"; readonly sessionId: string }
  | {
      readonly status: "needs_verification";
      readonly safeIdentifier: string | null;
    };

export class LoginFlowError extends Error {
  readonly code: string;
  readonly userMessage: string;

  constructor(code: string, userMessage: string, cause?: unknown) {
    super(userMessage, cause === undefined ? undefined : { cause });
    this.name = "LoginFlowError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

function clerkLoginError(error: unknown): LoginFlowError {
  if (isClerkAPIResponseError(error)) {
    const codes = error.errors.map((item) => item.code);
    if (
      codes.some((code) =>
        [
          "form_identifier_not_found",
          "form_password_incorrect",
          "form_param_format_invalid",
        ].includes(code),
      )
    ) {
      return new LoginFlowError(
        "LOGIN_CREDENTIALS_REJECTED",
        "Your email, username, or password is incorrect.",
        error,
      );
    }
    if (
      codes.some(
        (code) => code.includes("rate_limit") || code === "too_many_requests",
      )
    ) {
      return new LoginFlowError(
        "LOGIN_RATE_LIMITED",
        "Too many attempts. Wait a moment, then try again.",
        error,
      );
    }
  }

  return new LoginFlowError(
    "LOGIN_FAILED",
    "We couldn’t sign you in. Check your connection and try again.",
    error,
  );
}

function clerkLoginCodeError(error: unknown): LoginFlowError {
  if (isClerkAPIResponseError(error)) {
    const codes = error.errors.map((item) => item.code);
    if (codes.some((code) => code === "form_code_incorrect")) {
      return new LoginFlowError(
        "LOGIN_CODE_INCORRECT",
        "That code is incorrect. Check the email and try again.",
        error,
      );
    }
    if (
      codes.some(
        (code) =>
          code.includes("expired") ||
          code === "verification_failed" ||
          code === "form_code_past_expiration",
      )
    ) {
      return new LoginFlowError(
        "LOGIN_CODE_EXPIRED",
        "That code has expired. Send a new code and try again.",
        error,
      );
    }
    if (
      codes.some(
        (code) => code.includes("rate_limit") || code === "too_many_requests",
      )
    ) {
      return new LoginFlowError(
        "LOGIN_CODE_RATE_LIMITED",
        "Too many attempts. Wait before trying again.",
        error,
      );
    }
  }

  return new LoginFlowError(
    "LOGIN_VERIFICATION_FAILED",
    "We couldn’t verify that code. Check your connection and try again.",
    error,
  );
}

function emailCodeFactor(signIn: SignInResource) {
  return signIn.supportedSecondFactors?.find(
    (factor) => factor.strategy === "email_code",
  );
}

export async function startPasswordLogin(
  signIn: SignInResource,
  input: { readonly identifier: string; readonly password: string },
): Promise<LoginStep> {
  try {
    const result = await signIn.create({
      identifier: input.identifier.trim(),
      password: input.password,
    });

    if (result.status === "complete") {
      if (!result.createdSessionId) {
        throw new LoginFlowError(
          "LOGIN_SESSION_MISSING",
          "Your sign-in completed without a session. Try again.",
        );
      }
      return { status: "complete", sessionId: result.createdSessionId };
    }

    if (
      result.status === "needs_second_factor" ||
      result.status === "needs_client_trust"
    ) {
      const factor = emailCodeFactor(result);
      if (!factor) {
        throw new LoginFlowError(
          "LOGIN_FACTOR_UNSUPPORTED",
          "This account requires a sign-in method that 35mm doesn’t support yet.",
        );
      }
      await result.prepareSecondFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      return {
        status: "needs_verification",
        safeIdentifier: factor.safeIdentifier ?? null,
      };
    }

    throw new LoginFlowError(
      "LOGIN_INCOMPLETE",
      "Your account needs another sign-in step. Try again or contact support.",
    );
  } catch (error) {
    if (error instanceof LoginFlowError) throw error;
    throw clerkLoginError(error);
  }
}

export async function verifyLoginEmailCode(
  signIn: SignInResource,
  code: string,
): Promise<string> {
  try {
    const result = await signIn.attemptSecondFactor({
      strategy: "email_code",
      code,
    });
    if (result.status !== "complete" || !result.createdSessionId) {
      throw new LoginFlowError(
        "LOGIN_VERIFICATION_INCOMPLETE",
        "Verification needs another step. Try again or contact support.",
      );
    }
    return result.createdSessionId;
  } catch (error) {
    if (error instanceof LoginFlowError) throw error;
    throw clerkLoginCodeError(error);
  }
}

export async function resendLoginEmailCode(
  signIn: SignInResource,
): Promise<void> {
  try {
    const factor = emailCodeFactor(signIn);
    if (!factor) {
      throw new LoginFlowError(
        "LOGIN_FACTOR_UNAVAILABLE",
        "Email verification is no longer available. Return to Login and try again.",
      );
    }
    await signIn.prepareSecondFactor({
      strategy: "email_code",
      emailAddressId: factor.emailAddressId,
    });
  } catch (error) {
    if (error instanceof LoginFlowError) throw error;
    throw clerkLoginCodeError(error);
  }
}

export function loginFlowErrorMessage(error: unknown): string {
  return error instanceof LoginFlowError
    ? error.userMessage
    : "We couldn’t sign you in. Check your connection and try again.";
}
