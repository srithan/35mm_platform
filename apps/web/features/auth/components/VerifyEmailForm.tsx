"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Mail, CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { clerkVerifyEmail } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function completeSessionNavigation(path: string) {
  window.location.assign(path);
}

export function VerifyEmailForm() {
  var searchParams = useSearchParams();
  var { signUp, setActive, isLoaded } = useSignUp();
  var emailFromUrl = searchParams.get("email");
  var nextParam = searchParams.get("next");

  var [code, setCode] = useState("");
  var [isLoading, setIsLoading] = useState(false);
  var [isVerified, setIsVerified] = useState(false);
  var [formError, setFormError] = useState<string | null>(null);
  var [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent">("idle");

  var onVerify = async function () {
    if (!isLoaded || !signUp || !setActive) return;
    var trimmed = code.trim();
    if (trimmed.length < 6) {
      setFormError("Please enter the 6-digit code from your email.");
      return;
    }
    setFormError(null);
    setIsLoading(true);

    var result = await clerkVerifyEmail(signUp, trimmed);
    setIsLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    await setActive({ session: signUp.createdSessionId });
    setIsVerified(true);
    var next = safeNextPath(nextParam);
    window.setTimeout(function () {
      completeSessionNavigation(next ?? ROUTES.HOME);
    }, 1200);
  };

  var onResend = async function () {
    if (!isLoaded || !signUp) return;
    setResendStatus("loading");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendStatus("sent");
    } catch (_err) {
      setResendStatus("idle");
    }
  };

  if (isVerified) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center py-4 gap-4">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="font-display text-[1.5rem] font-black">You&apos;re verified</h1>
          <p className="text-[0.9rem] text-[var(--auth-fg)]/60">Your email is verified. Redirecting...</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-[var(--auth-icon-bubble-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--auth-icon-bubble-border)]">
          <Mail className="w-5 h-5 text-[var(--auth-fg)]/60" />
        </div>
        <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
          Check your <em className="italic text-[var(--auth-accent-bright)]">inbox.</em>
        </h1>
        <p className="text-[0.85rem] text-[var(--auth-fg)]/40 leading-relaxed max-w-[300px] mx-auto">
          {emailFromUrl ? (
            <>
              We sent a 6-digit code to <span className="text-[var(--auth-fg)]">{emailFromUrl}</span>.
            </>
          ) : (
            "We sent a 6-digit verification code to your email."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {formError ? (
          <p className="text-red-400 text-[0.8rem] text-center" role="alert">
            {formError}
          </p>
        ) : null}

        <input
          type="text"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={function (e) {
            setCode(e.target.value);
          }}
          placeholder="••••••"
          className="w-full py-3.5 px-5 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] text-[1.25rem] leading-tight text-center tracking-[0.5em] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/25 placeholder:text-[0.95rem] placeholder:tracking-normal"
        />

        <button
          type="button"
          onClick={onVerify}
          disabled={isLoading || !isLoaded}
          className="w-full flex justify-center items-center gap-2 bg-[var(--auth-accent)] text-white font-medium text-base py-3.5 rounded-full border-0 cursor-pointer no-underline transition-all hover:bg-[var(--auth-accent-bright)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-[var(--auth-spinner-track)] border-t-[var(--auth-spinner-tip)] rounded-full animate-spin" />
          ) : (
            "Verify code"
          )}
        </button>

        <p className="text-[0.8rem] text-[var(--auth-fg)]/45 text-center">
          Didn&apos;t get it? Check spam or{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resendStatus === "loading"}
            className="text-[var(--auth-fg)]/70 hover:text-[var(--auth-fg)] underline underline-offset-2 bg-transparent border-0 cursor-pointer font-inherit text-[0.8rem] p-0"
          >
            {resendStatus === "loading" ? "sending..." : resendStatus === "sent" ? "sent!" : "resend"}
          </button>
        </p>
      </div>

      <p className="mt-8 text-center text-[0.9rem] text-[var(--auth-fg)]/60">
        <Link href={ROUTES.AUTH_LOGIN} className="text-[var(--auth-fg)] hover:text-[var(--auth-fg)]/90 no-underline font-medium">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}
