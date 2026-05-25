/**
 * Clerk-backed auth operations.
 * Each function receives the Clerk signUp / signIn object from the component
 * that calls it (via useSignUp / useSignIn hooks).
 */

export type AuthResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; code: string; message: string };

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    var errors = (err as any).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0].longMessage || errors[0].message || "Something went wrong";
    }
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export async function clerkSignUp(
  signUp: any,
  input: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }
): Promise<AuthResult<{ requiresVerification: boolean }>> {
  try {
    var nameParts = input.fullName.trim().split(/\s+/);
    var firstName = nameParts[0] || "";
    var lastName = nameParts.slice(1).join(" ") || "";

    await signUp.create({
      firstName: firstName,
      lastName: lastName,
      username: input.username.trim().toLowerCase(),
      emailAddress: input.email.trim(),
      password: input.password,
    });

    await signUp.prepareEmailAddressVerification({
      strategy: "email_code",
    });

    return { ok: true, data: { requiresVerification: true } };
  } catch (err) {
    return { ok: false, code: "SIGNUP_FAILED", message: clerkErrorMessage(err) };
  }
}

export async function clerkVerifyEmail(
  signUp: any,
  code: string
): Promise<AuthResult> {
  try {
    var result = await signUp.attemptEmailAddressVerification({ code: code });
    if (result.status === "complete") {
      return { ok: true };
    }
    return { ok: false, code: "VERIFY_INCOMPLETE", message: "Verification not complete. Please try again." };
  } catch (err) {
    return { ok: false, code: "VERIFY_FAILED", message: clerkErrorMessage(err) };
  }
}

export async function clerkSignIn(
  signIn: any,
  input: { identifier: string; password: string }
): Promise<AuthResult> {
  try {
    var result = await signIn.create({
      identifier: input.identifier.trim(),
      password: input.password,
    });
    if (result.status === "complete") {
      return { ok: true };
    }
    return { ok: false, code: "SIGNIN_INCOMPLETE", message: "Sign in not complete." };
  } catch (err) {
    return { ok: false, code: "SIGNIN_FAILED", message: clerkErrorMessage(err) };
  }
}

export async function clerkForgotPassword(
  signIn: any,
  email: string
): Promise<AuthResult> {
  try {
    await signIn.create({
      strategy: "reset_password_email_code",
      identifier: email.trim(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, code: "RESET_FAILED", message: clerkErrorMessage(err) };
  }
}

export async function clerkVerifyResetCode(
  signIn: any,
  code: string
): Promise<AuthResult> {
  try {
    var result = await signIn.attemptFirstFactor({
      strategy: "reset_password_email_code",
      code: code,
    });
    if (result.status === "needs_new_password") {
      return { ok: true };
    }
    return { ok: false, code: "CODE_INVALID", message: "Invalid or expired code." };
  } catch (err) {
    return { ok: false, code: "VERIFY_FAILED", message: clerkErrorMessage(err) };
  }
}

export async function clerkResetPassword(
  signIn: any,
  newPassword: string
): Promise<AuthResult> {
  try {
    var result = await signIn.resetPassword({ password: newPassword });
    if (result.status === "complete") {
      return { ok: true };
    }
    return { ok: false, code: "RESET_INCOMPLETE", message: "Password reset not complete." };
  } catch (err) {
    return { ok: false, code: "RESET_FAILED", message: clerkErrorMessage(err) };
  }
}
