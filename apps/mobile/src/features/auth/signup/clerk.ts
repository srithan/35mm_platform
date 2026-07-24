import {
  isClerkAPIResponseError,
} from "@clerk/expo";
import type { SignUpResource } from "@clerk/expo/types";

export interface SignupAccountInput {
  readonly displayName: string;
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly dateOfBirth: string;
}

export interface VerifiedSignupSession {
  readonly sessionId: string;
  readonly userId: string;
}

export class SignupFlowError extends Error {
  readonly code: string;
  readonly userMessage: string;

  constructor(code: string, userMessage: string, cause?: unknown) {
    super(userMessage, cause === undefined ? undefined : { cause });
    this.name = "SignupFlowError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

function nameParts(displayName: string): {
  readonly firstName: string;
  readonly lastName: string;
} {
  const parts = displayName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function normalized(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

export function canResumeEmailCodeSignUp(
  signUp: SignUpResource,
  input: Omit<SignupAccountInput, "password" | "dateOfBirth">,
): boolean {
  const names = nameParts(input.displayName);
  return (
    signUp.status === "missing_requirements" &&
    signUp.hasPassword &&
    normalized(signUp.emailAddress) === normalized(input.email) &&
    normalized(signUp.username) === normalized(input.username) &&
    normalized(signUp.firstName) === normalized(names.firstName) &&
    normalized(signUp.lastName) === normalized(names.lastName) &&
    signUp.unverifiedFields.includes("email_address")
  );
}

function clerkSignupError(error: unknown): SignupFlowError {
  if (isClerkAPIResponseError(error)) {
    const codes = error.errors.map((item) => item.code);
    if (
      codes.some((code) =>
        [
          "form_identifier_exists",
          "form_param_nil",
          "form_username_invalid",
        ].includes(code),
      )
    ) {
      return new SignupFlowError(
        "SIGNUP_IDENTITY_REJECTED",
        "That email or username can’t be used. Review your details and try again.",
        error,
      );
    }
    if (
      codes.some((code) =>
        [
          "form_password_pwned",
          "form_password_not_strong_enough",
          "form_password_length_too_short",
        ].includes(code),
      )
    ) {
      return new SignupFlowError(
        "SIGNUP_PASSWORD_REJECTED",
        "Choose a stronger password, then try again.",
        error,
      );
    }
    if (codes.some((code) => code.includes("rate_limit"))) {
      return new SignupFlowError(
        "SIGNUP_RATE_LIMITED",
        "Too many attempts. Wait a moment, then try again.",
        error,
      );
    }
  }
  return new SignupFlowError(
    "SIGNUP_START_FAILED",
    "We couldn’t create your account. Check your connection and try again.",
    error,
  );
}

function clerkVerificationError(error: unknown): SignupFlowError {
  if (isClerkAPIResponseError(error)) {
    const codes = error.errors.map((item) => item.code);
    if (codes.some((code) => code === "form_code_incorrect")) {
      return new SignupFlowError(
        "SIGNUP_CODE_INCORRECT",
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
      return new SignupFlowError(
        "SIGNUP_CODE_EXPIRED",
        "That code has expired. Send a new code and try again.",
        error,
      );
    }
    if (
      codes.some((code) =>
        [
          "form_identifier_exists",
          "form_param_format_invalid",
          "form_param_nil",
        ].includes(code),
      )
    ) {
      return new SignupFlowError(
        "SIGNUP_EMAIL_REJECTED",
        "That email can’t be used. Check it and try again.",
        error,
      );
    }
    if (
      codes.some(
        (code) =>
          code.includes("rate_limit") ||
          code === "too_many_requests",
      )
    ) {
      return new SignupFlowError(
        "SIGNUP_VERIFICATION_RATE_LIMITED",
        "Too many attempts. Wait before trying again.",
        error,
      );
    }
  }
  return new SignupFlowError(
    "SIGNUP_VERIFICATION_FAILED",
    "We couldn’t verify that email. Check your connection and try again.",
    error,
  );
}

function requireEmailCodeAttempt(signUp: SignUpResource): void {
  if (
    signUp.status !== "missing_requirements" ||
    !signUp.unverifiedFields.includes("email_address")
  ) {
    throw new SignupFlowError(
      "SIGNUP_VERIFICATION_UNAVAILABLE",
      "This verification attempt is no longer available. Return to account creation and try again.",
    );
  }
}

export async function startEmailCodeSignUp(
  signUp: SignUpResource,
  input: SignupAccountInput,
  onAccountCreated: () => void,
): Promise<void> {
  try {
    let attempt = signUp;
    const canResume = canResumeEmailCodeSignUp(signUp, input);
    if (!canResume) {
      if (!input.password) {
        throw new SignupFlowError(
          "SIGNUP_PASSWORD_REQUIRED",
          "Return to Password and re-enter your password to continue.",
        );
      }
      const names = nameParts(input.displayName);
      attempt = await signUp.create({
        emailAddress: input.email,
        firstName: names.firstName,
        lastName: names.lastName,
        password: input.password,
        username: input.username,
      });
      onAccountCreated();
    } else {
      onAccountCreated();
    }

    if (
      attempt.status !== "missing_requirements" ||
      !attempt.unverifiedFields.includes("email_address")
    ) {
      throw new SignupFlowError(
        "SIGNUP_UNEXPECTED_STATE",
        "Account setup needs another authentication step. Try again or return to Welcome.",
      );
    }
    await attempt.prepareEmailAddressVerification({
      strategy: "email_code",
    });
  } catch (error) {
    if (error instanceof SignupFlowError) throw error;
    throw clerkSignupError(error);
  }
}

export async function verifyEmailCodeSignUp(
  signUp: SignUpResource,
  code: string,
): Promise<VerifiedSignupSession> {
  try {
    requireEmailCodeAttempt(signUp);
    const result = await signUp.attemptEmailAddressVerification({ code });
    if (
      result.status !== "complete" ||
      !result.createdSessionId ||
      !result.createdUserId
    ) {
      throw new SignupFlowError(
        "SIGNUP_VERIFICATION_INCOMPLETE",
        "Email verification needs another step. Try again or return to Welcome.",
      );
    }
    return {
      sessionId: result.createdSessionId,
      userId: result.createdUserId,
    };
  } catch (error) {
    if (error instanceof SignupFlowError) throw error;
    throw clerkVerificationError(error);
  }
}

export async function resendEmailCodeSignUp(
  signUp: SignUpResource,
): Promise<void> {
  try {
    requireEmailCodeAttempt(signUp);
    await signUp.prepareEmailAddressVerification({
      strategy: "email_code",
    });
  } catch (error) {
    if (error instanceof SignupFlowError) throw error;
    throw clerkVerificationError(error);
  }
}

export async function changeSignupEmailAddress(
  signUp: SignUpResource,
  email: string,
  onEmailChanged: () => void,
): Promise<void> {
  try {
    requireEmailCodeAttempt(signUp);
    const updated = await signUp.update({ emailAddress: email });
    if (
      updated.status !== "missing_requirements" ||
      normalized(updated.emailAddress) !== normalized(email) ||
      !updated.unverifiedFields.includes("email_address")
    ) {
      throw new SignupFlowError(
        "SIGNUP_EMAIL_CHANGE_INCOMPLETE",
        "We couldn’t update that email. Check it and try again.",
      );
    }
    onEmailChanged();
    await updated.prepareEmailAddressVerification({
      strategy: "email_code",
    });
  } catch (error) {
    if (error instanceof SignupFlowError) throw error;
    throw clerkVerificationError(error);
  }
}

export function signupFlowErrorMessage(error: unknown): string {
  return error instanceof SignupFlowError
    ? error.userMessage
    : "We couldn’t create your account. Check your connection and try again.";
}
