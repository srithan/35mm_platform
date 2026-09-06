import { describe, expect, it, vi } from "vitest";
import {
  clerkResendSignInCode,
  clerkSignIn,
  clerkVerifySignInCode,
} from "./auth-client";

describe("clerkSignIn", function () {
  it("submits credentials through Clerk's password strategy", async function () {
    var create = vi.fn().mockResolvedValue({ status: "complete" });

    var result = await clerkSignIn(
      { create: create },
      { identifier: "  srithan  ", password: "correct-password" },
    );

    expect(create).toHaveBeenCalledWith({
      identifier: "srithan",
      password: "correct-password",
    });
    expect(result).toEqual({ ok: true, data: { status: "complete" } });
  });

  it("returns Clerk's credential error", async function () {
    var create = vi.fn().mockRejectedValue({
      errors: [{ longMessage: "Password is incorrect." }],
    });

    var result = await clerkSignIn(
      { create: create },
      { identifier: "srithan", password: "wrong-password" },
    );

    expect(result).toEqual({
      ok: false,
      code: "SIGNIN_FAILED",
      message: "Password is incorrect.",
    });
  });

  it("prepares email verification when Clerk requires a second factor", async function () {
    var prepareSecondFactor = vi.fn().mockResolvedValue(undefined);
    var create = vi.fn().mockResolvedValue({
      status: "needs_second_factor",
      supportedSecondFactors: [
        {
          strategy: "email_code",
          emailAddressId: "email_123",
          safeIdentifier: "k***@example.com",
        },
      ],
    });

    var result = await clerkSignIn(
      { create: create, prepareSecondFactor: prepareSecondFactor },
      { identifier: "kubrick", password: "correct-password" },
    );

    expect(prepareSecondFactor).toHaveBeenCalledWith({
      strategy: "email_code",
      emailAddressId: "email_123",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        status: "needs_verification",
        safeIdentifier: "k***@example.com",
      },
    });
  });

  it("verifies an emailed second-factor code", async function () {
    var attemptSecondFactor = vi.fn().mockResolvedValue({ status: "complete" });

    var result = await clerkVerifySignInCode(
      { attemptSecondFactor: attemptSecondFactor },
      " 123456 ",
    );

    expect(attemptSecondFactor).toHaveBeenCalledWith({
      strategy: "email_code",
      code: "123456",
    });
    expect(result).toEqual({ ok: true });
  });

  it("resends the email verification code", async function () {
    var prepareSecondFactor = vi.fn().mockResolvedValue(undefined);

    var result = await clerkResendSignInCode({
      supportedSecondFactors: [
        {
          strategy: "email_code",
          emailAddressId: "email_123",
          safeIdentifier: "k***@example.com",
        },
      ],
      prepareSecondFactor: prepareSecondFactor,
    });

    expect(prepareSecondFactor).toHaveBeenCalledWith({
      strategy: "email_code",
      emailAddressId: "email_123",
    });
    expect(result).toEqual({ ok: true });
  });
});
