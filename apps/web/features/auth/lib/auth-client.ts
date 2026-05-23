/**
 * Client-callable auth operations. Replace implementations with real API calls
 * (fetch to your route handlers or SDK) when the backend is ready.
 *
 * All functions return a discriminated result so callers can branch without try/catch.
 */

export type AuthResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; code: string; message: string };

export type SignInSuccess = { userId: string };

export type SignUpSuccess = { userId: string; requiresVerification: boolean };

function delay(ms: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/** POST /api/auth/login — session cookie or token in response. */
export async function signInWithPassword(input: {
  identifier: string;
  password: string;
}): Promise<AuthResult<SignInSuccess>> {
  await delay(500);
  void input;
  // TODO: const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify(input), credentials: "include" });
  return { ok: true, data: { userId: "stub-user" } };
}

/** POST /api/auth/signup */
export async function signUp(input: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}): Promise<AuthResult<SignUpSuccess>> {
  await delay(600);
  void input;
  // TODO: real signup + optional auto sign-in
  return { ok: true, data: { userId: "stub-user", requiresVerification: true } };
}

/** POST /api/auth/forgot-password — sends OTP or magic link. */
export async function requestPasswordReset(input: { identifier: string }): Promise<AuthResult> {
  await delay(600);
  void input;
  // TODO
  return { ok: true };
}

/** POST /api/auth/forgot-password/verify — validates OTP before allowing reset. */
export async function verifyPasswordResetOtp(input: {
  identifier: string;
  otp: string;
}): Promise<AuthResult<{ resetToken: string }>> {
  await delay(500);
  void input;
  // TODO: return short-lived reset token for the next step
  return { ok: true, data: { resetToken: "stub-reset-token" } };
}

/** POST /api/auth/reset-password */
export async function resetPassword(input: {
  token?: string;
  newPassword: string;
}): Promise<AuthResult> {
  await delay(600);
  void input;
  // TODO: Authorization: Bearer <token> or body { token, password }
  return { ok: true };
}

/** POST /api/auth/logout — clear session cookie. */
export async function signOut(): Promise<AuthResult> {
  await delay(200);
  // TODO: await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  return { ok: true };
}

/** POST /api/auth/verify-email — link token from email. */
export async function verifyEmailWithToken(token: string): Promise<AuthResult> {
  await delay(500);
  void token;
  // TODO
  return { ok: true };
}

/** POST /api/auth/resend-verification */
export async function resendVerificationEmail(input: { email: string }): Promise<AuthResult> {
  await delay(500);
  void input;
  // TODO
  return { ok: true };
}
