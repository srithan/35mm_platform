import { isClerkAPIResponseError } from "@clerk/expo";
import type { SignInResource } from "@clerk/expo/types";

export type PasswordResetCodeStep =
  | { readonly status: "needs_new_password" }
  | { readonly status: "complete"; readonly sessionId: string | null };

export class PasswordResetFlowError extends Error {
  readonly code: string;
  readonly userMessage: string;

  constructor(code: string, userMessage: string, cause?: unknown) {
    super(userMessage, cause === undefined ? undefined : { cause });
    this.name = "PasswordResetFlowError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

function clerkCodes(error: unknown): readonly string[] {
  return isClerkAPIResponseError(error)
    ? error.errors.map((item) => item.code)
    : [];
}

function isRateLimited(codes: readonly string[]): boolean {
  return codes.some(
    (code) => code.includes("rate_limit") || code === "too_many_requests",
  );
}

function passwordResetStartError(error: unknown): PasswordResetFlowError {
  const codes = clerkCodes(error);
  if (
    codes.some((code) =>
      [
        "form_identifier_not_found",
        "form_param_format_invalid",
        "form_param_nil",
      ].includes(code),
    )
  ) {
    return new PasswordResetFlowError(
      "PASSWORD_RESET_REQUEST_ACCEPTED",
      "If that email belongs to a 35mm account, we’ll send a reset code.",
      error,
    );
  }
  if (isRateLimited(codes)) {
    return new PasswordResetFlowError(
      "PASSWORD_RESET_RATE_LIMITED",
      "Too many reset attempts. Wait a moment, then try again.",
      error,
    );
  }
  return new PasswordResetFlowError(
    "PASSWORD_RESET_START_FAILED",
    "We couldn’t start password reset. Check your connection and try again.",
    error,
  );
}

function passwordResetCodeError(error: unknown): PasswordResetFlowError {
  const codes = clerkCodes(error);
  if (codes.some((code) => code === "form_code_incorrect")) {
    return new PasswordResetFlowError(
      "PASSWORD_RESET_CODE_INCORRECT",
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
    return new PasswordResetFlowError(
      "PASSWORD_RESET_CODE_EXPIRED",
      "That code has expired. Send a new code and try again.",
      error,
    );
  }
  if (isRateLimited(codes)) {
    return new PasswordResetFlowError(
      "PASSWORD_RESET_CODE_RATE_LIMITED",
      "Too many attempts. Wait before trying again.",
      error,
    );
  }
  return new PasswordResetFlowError(
    "PASSWORD_RESET_CODE_FAILED",
    "We couldn’t verify that code. Check your connection and try again.",
    error,
  );
}

function passwordResetPasswordError(error: unknown): PasswordResetFlowError {
  const codes = clerkCodes(error);
  if (
    codes.some((code) =>
      [
        "form_password_pwned",
        "form_password_not_strong_enough",
        "form_password_length_too_short",
        "form_password_validation_failed",
      ].includes(code),
    )
  ) {
    return new PasswordResetFlowError(
      "PASSWORD_RESET_PASSWORD_REJECTED",
      "Choose a stronger password, then try again.",
      error,
    );
  }
  if (isRateLimited(codes)) {
    return new PasswordResetFlowError(
      "PASSWORD_RESET_PASSWORD_RATE_LIMITED",
      "Too many attempts. Wait before trying again.",
      error,
    );
  }
  return new PasswordResetFlowError(
    "PASSWORD_RESET_PASSWORD_FAILED",
    "We couldn’t update your password. Check your connection and try again.",
    error,
  );
}

function resetEmailFactor(signIn: SignInResource) {
  return signIn.supportedFirstFactors?.find(
    (factor) => factor.strategy === "reset_password_email_code",
  );
}

export async function startPasswordReset(
  signIn: SignInResource,
  identifier: string,
): Promise<{ readonly safeIdentifier: string | null }> {
  try {
    const result = await signIn.create({
      strategy: "reset_password_email_code",
      identifier: identifier.trim(),
    });
    const factor = resetEmailFactor(result);
    return { safeIdentifier: factor?.safeIdentifier ?? null };
  } catch (error) {
    const mapped = passwordResetStartError(error);
    if (mapped.code === "PASSWORD_RESET_REQUEST_ACCEPTED") {
      return { safeIdentifier: null };
    }
    throw mapped;
  }
}

export async function resendPasswordResetCode(
  signIn: SignInResource,
  identifier: string,
): Promise<{ readonly safeIdentifier: string | null }> {
  try {
    const factor = resetEmailFactor(signIn);
    if (factor) {
      const result = await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: factor.emailAddressId,
      });
      return {
        safeIdentifier:
          resetEmailFactor(result)?.safeIdentifier ?? factor.safeIdentifier,
      };
    }
    return startPasswordReset(signIn, identifier);
  } catch (error) {
    if (error instanceof PasswordResetFlowError) throw error;
    throw passwordResetCodeError(error);
  }
}

export async function verifyPasswordResetCode(
  signIn: SignInResource,
  code: string,
): Promise<PasswordResetCodeStep> {
  try {
    const result = await signIn.attemptFirstFactor({
      strategy: "reset_password_email_code",
      code,
    });
    if (result.status === "needs_new_password") {
      return { status: "needs_new_password" };
    }
    if (result.status === "complete") {
      return {
        status: "complete",
        sessionId: result.createdSessionId ?? null,
      };
    }
    throw new PasswordResetFlowError(
      "PASSWORD_RESET_CODE_INCOMPLETE",
      "Password reset needs another step. Send a new code and try again.",
    );
  } catch (error) {
    if (error instanceof PasswordResetFlowError) throw error;
    throw passwordResetCodeError(error);
  }
}

export async function completePasswordReset(
  signIn: SignInResource,
  password: string,
): Promise<{ readonly sessionId: string | null }> {
  try {
    const result = await signIn.resetPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (result.status !== "complete") {
      throw new PasswordResetFlowError(
        "PASSWORD_RESET_PASSWORD_INCOMPLETE",
        "Password reset needs another step. Send a new code and try again.",
      );
    }
    return { sessionId: result.createdSessionId ?? null };
  } catch (error) {
    if (error instanceof PasswordResetFlowError) throw error;
    throw passwordResetPasswordError(error);
  }
}

export function passwordResetFlowErrorMessage(error: unknown): string {
  return error instanceof PasswordResetFlowError
    ? error.userMessage
    : "We couldn’t reset your password. Check your connection and try again.";
}
