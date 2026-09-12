"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as z from "zod/v4";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import {
  clerkResendSignInCode,
  clerkSignIn,
  clerkVerifySignInCode,
} from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

var loginSchema = z.object({
  identifier: z
    .string()
    .min(1, { message: "Please enter your username or email" }),
  password: z.string().min(1, { message: "Please enter your password" }),
});

type LoginValues = z.infer<typeof loginSchema>;

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function completeSessionNavigation(path: string) {
  window.location.assign(path);
}

function isAlreadySignedInMessage(message: string) {
  return message.toLowerCase().includes("already signed in");
}

export interface LoginFormProps {
  /**
   * Post-auth destination. When omitted the form reads `?next=` from the URL
   * (standalone `/login` page). Modal usage passes it explicitly.
   */
  nextPath?: string | null;
  /** Render without the `AuthCard` chrome (used inside `AuthModal`). */
  embedded?: boolean;
  /** When provided, "Sign up" swaps mode in place instead of navigating. */
  onSwitchToSignup?: () => void;
  /** Dialog title id when this form is the active `AuthModal` pane. */
  titleId?: string;
}

export function LoginForm({
  nextPath,
  embedded = false,
  onSwitchToSignup,
  titleId,
}: LoginFormProps = {}) {
  var searchParams = useSearchParams();
  var resolvedNext =
    nextPath !== undefined ? nextPath : safeNextPath(searchParams.get("next"));
  var { isLoaded: authIsLoaded, isSignedIn } = useAuth();
  var { signIn, setActive, isLoaded } = useSignIn();
  var [showPassword, setShowPassword] = useState(false);
  var [isLoading, setIsLoading] = useState(false);
  var [formError, setFormError] = useState<string | null>(null);
  var [needsVerification, setNeedsVerification] = useState(false);
  var [verificationCode, setVerificationCode] = useState("");
  var [verificationTarget, setVerificationTarget] = useState<string | null>(
    null,
  );

  var form = useForm<LoginValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  useEffect(
    function () {
      // Standalone page only: an already-signed-in viewer landing on /login is
      // bounced. Inside the modal the provider never opens for signed-in users.
      if (!embedded && authIsLoaded && isSignedIn) {
        completeSessionNavigation(resolvedNext ?? ROUTES.HOME);
      }
    },
    [embedded, authIsLoaded, isSignedIn, resolvedNext],
  );

  var onSubmit = async function (data: LoginValues) {
    if (!isLoaded || !signIn || !setActive) return;
    setFormError(null);
    setIsLoading(true);

    var result = await clerkSignIn(signIn, {
      identifier: data.identifier.trim(),
      password: data.password,
    });

    setIsLoading(false);
    if (!result.ok) {
      if (isAlreadySignedInMessage(result.message)) {
        completeSessionNavigation(resolvedNext ?? ROUTES.HOME);
        return;
      }
      setFormError(result.message);
      return;
    }

    if (result.data.status === "needs_verification") {
      setNeedsVerification(true);
      setVerificationTarget(result.data.safeIdentifier);
      form.resetField("password");
      return;
    }

    await setActive({ session: signIn.createdSessionId });
    completeSessionNavigation(resolvedNext ?? ROUTES.HOME);
  };

  var onVerifySubmit = async function (event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn || !setActive || !verificationCode.trim()) return;
    setFormError(null);
    setIsLoading(true);
    var result = await clerkVerifySignInCode(signIn, verificationCode);
    setIsLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    await setActive({ session: signIn.createdSessionId });
    completeSessionNavigation(resolvedNext ?? ROUTES.HOME);
  };

  var onResendCode = async function () {
    if (!signIn) return;
    setFormError(null);
    setIsLoading(true);
    var result = await clerkResendSignInCode(signIn);
    setIsLoading(false);
    if (!result.ok) setFormError(result.message);
  };

  var Heading: "h1" | "h2" = embedded ? "h2" : "h1";
  var Wrapper = embedded ? EmbeddedWrapper : AuthCard;

  return (
    <Wrapper>
      <div className={embedded ? "mb-7 text-left" : "mb-8 text-center"}>
        <Heading
          id={titleId}
          className="font-display text-[1.75rem] font-black leading-tight mb-2"
        >
          Welcome{" "}
          <em className="italic text-[var(--auth-accent-bright)]">back.</em>
        </Heading>
        <p className="text-[0.85rem] text-[var(--auth-fg)]/45 leading-relaxed">
          Sign in to your account to continue.
        </p>
      </div>

      <form
        onSubmit={
          needsVerification ? onVerifySubmit : form.handleSubmit(onSubmit)
        }
        className="flex flex-col gap-3"
        data-auth-modal-form
      >
        {formError ? (
          <p
            className="text-red-400 text-[0.8rem] text-center -mt-1 mb-1"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {needsVerification ? (
          <>
            <p className="mb-1 text-center text-[0.85rem] leading-relaxed text-[var(--auth-fg)]/60">
              Enter the code sent to{" "}
              {verificationTarget ?? "your email address"}.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={function (event) {
                setVerificationCode(event.target.value);
              }}
              aria-label="Verification code"
              placeholder="Verification code"
              className="w-full rounded-full border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-4 py-3.5 text-center font-mono text-base tracking-[0.2em] text-[var(--auth-fg)] outline-none transition-[border-color] placeholder:font-sans placeholder:tracking-normal placeholder:text-[var(--auth-fg)]/45 focus:border-[var(--auth-accent)]/50"
            />
          </>
        ) : (
          <>
            <div>
              <input
                type="text"
                autoComplete="username"
                {...form.register("identifier")}
                placeholder="username or email"
                className={`w-full py-3.5 px-4 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-base outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.identifier ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
              />
              {form.formState.errors.identifier ? (
                <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
                  {form.formState.errors.identifier.message}
                </p>
              ) : null}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...form.register("password")}
                  placeholder="Your password"
                  className={`w-full py-3.5 pl-4 pr-12 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-base outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.password ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowPassword(function (p) {
                      return !p;
                    });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--auth-fg)]/45 hover:text-[var(--auth-fg)]/70 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={
            isLoading ||
            !isLoaded ||
            (needsVerification && !verificationCode.trim())
          }
          className="w-full flex justify-center items-center gap-2 bg-[var(--auth-accent)] text-white font-medium text-base py-4 rounded-full border-0 cursor-pointer no-underline transition-all hover:bg-[var(--auth-accent-bright)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-[var(--auth-spinner-track)] border-t-[var(--auth-spinner-tip)] rounded-full animate-spin" />
          ) : (
            <>
              {needsVerification ? "Verify and log in" : "Log in"}{" "}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {needsVerification ? (
        <div className="mt-3 flex items-center justify-center gap-4 text-[0.82rem]">
          <button
            type="button"
            onClick={onResendCode}
            disabled={isLoading}
            className="text-[var(--auth-fg)]/55 transition-colors hover:text-[var(--auth-fg)]/80 disabled:opacity-50"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={function () {
              setNeedsVerification(false);
              setVerificationCode("");
              setVerificationTarget(null);
              setFormError(null);
            }}
            className="text-[var(--auth-fg)]/55 transition-colors hover:text-[var(--auth-fg)]/80"
          >
            Use another account
          </button>
        </div>
      ) : (
        <p className="mt-3 text-center">
          <Link
            href={ROUTES.AUTH_FORGOT}
            className="text-[0.85rem] text-[var(--auth-fg)]/50 hover:text-[var(--auth-fg)]/70 transition-colors no-underline"
          >
            Forgot password?
          </Link>
        </p>
      )}

      <div
        className={`${embedded ? "mt-auto" : "mt-6"} pt-6 border-t border-[var(--auth-divider)] text-center`}
      >
        <p className="text-[0.9rem] text-[var(--auth-fg)]/60">
          Don&apos;t have an account?{" "}
          {onSwitchToSignup ? (
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="bg-transparent border-0 p-0 cursor-pointer font-medium text-[0.9rem] text-[var(--auth-fg)] hover:text-[var(--auth-fg)]/90"
            >
              Sign up
            </button>
          ) : (
            <Link
              href={ROUTES.AUTH_SIGNUP}
              className="text-[var(--auth-fg)] hover:text-[var(--auth-fg)]/90 no-underline font-medium"
            >
              Sign up
            </Link>
          )}
        </p>
      </div>
    </Wrapper>
  );
}

function EmbeddedWrapper({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full flex-col">{children}</div>;
}
