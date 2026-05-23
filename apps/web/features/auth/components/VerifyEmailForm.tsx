"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { resendVerificationEmail, verifyEmailWithToken } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

type VerifyState = "idle" | "verifying" | "verified" | "verify_error";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");
  const nextParam = searchParams.get("next");

  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const attemptedTokenRef = useRef<string | null>(null);

  const [resendEmail, setResendEmail] = useState(emailFromUrl ?? "");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(
    function () {
      if (!tokenFromUrl || attemptedTokenRef.current === tokenFromUrl) return;
      attemptedTokenRef.current = tokenFromUrl;
      setVerifyState("verifying");
      setVerifyMessage(null);
      verifyEmailWithToken(tokenFromUrl).then(function (result) {
        if (result.ok) {
          setVerifyState("verified");
          setVerifyMessage("Your email is verified. You can continue.");
          const next = safeNextPath(nextParam);
          window.setTimeout(function () {
            router.push(next ?? ROUTES.HOME);
            router.refresh();
          }, 1200);
        } else {
          setVerifyState("verify_error");
          setVerifyMessage(result.message);
        }
      });
    },
    [tokenFromUrl, nextParam, router]
  );

  const onResend = async function () {
    const email = resendEmail.trim();
    if (!email) {
      setResendMessage("Enter the email you signed up with.");
      setResendStatus("error");
      return;
    }
    setResendStatus("loading");
    setResendMessage(null);
    const result = await resendVerificationEmail({ email });
    if (result.ok) {
      setResendStatus("sent");
      setResendMessage("If an account exists for that address, we sent a new link.");
    } else {
      setResendStatus("error");
      setResendMessage(result.message);
    }
  };

  if (tokenFromUrl && verifyState === "verifying") {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center py-6 gap-4">
          <Loader2 className="w-10 h-10 text-[var(--auth-fg)]/50 animate-spin" aria-hidden />
          <p className="text-[0.95rem] text-[var(--auth-fg)]/70">Verifying your email…</p>
        </div>
      </AuthCard>
    );
  }

  if (tokenFromUrl && verifyState === "verified") {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center py-4 gap-4">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="font-display text-[1.5rem] font-black">You&apos;re verified</h1>
          <p className="text-[0.9rem] text-[var(--auth-fg)]/60">{verifyMessage}</p>
        </div>
      </AuthCard>
    );
  }

  if (tokenFromUrl && verifyState === "verify_error") {
    return (
      <AuthCard>
        <div className="text-center mb-6">
          <h1 className="font-display text-[1.5rem] font-black mb-2">Link invalid or expired</h1>
          <p className="text-[0.85rem] text-red-400/90">{verifyMessage ?? "Request a new verification email below."}</p>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="email"
            value={resendEmail}
            onChange={function (e) {
              setResendEmail(e.target.value);
            }}
            placeholder="your@email.com"
            className="w-full py-3.5 px-4 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] text-[0.95rem] outline-none focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45"
          />
          <button
            type="button"
            onClick={onResend}
            disabled={resendStatus === "loading"}
            className="w-full py-3.5 rounded-full bg-[var(--auth-accent)] text-white font-medium border-0 cursor-pointer hover:bg-[var(--auth-accent-bright)] transition-colors disabled:opacity-60"
          >
            {resendStatus === "loading" ? "Sending…" : "Resend verification email"}
          </button>
          {resendMessage ? (
            <p
              className={`text-[0.8rem] text-center ${resendStatus === "error" ? "text-red-400" : "text-[var(--auth-fg)]/55"}`}
            >
              {resendMessage}
            </p>
          ) : null}
        </div>
        <p className="mt-6 text-center text-[0.85rem] text-[var(--auth-fg)]/50">
          <Link href={ROUTES.AUTH_LOGIN} className="text-[var(--auth-fg)]/70 hover:text-[var(--auth-fg)] no-underline">
            Back to login
          </Link>
        </p>
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
              We sent a verification link to <span className="text-[var(--auth-fg)]">{emailFromUrl}</span>.
              Open it on this device to activate your account.
            </>
          ) : (
            "We sent a verification link to your email. Open it to finish signing up."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[0.8rem] text-[var(--auth-fg)]/45 text-center">
          Didn&apos;t get it? Check spam or resend.
        </p>
        <input
          type="email"
          value={resendEmail}
          onChange={function (e) {
            setResendEmail(e.target.value);
          }}
          placeholder="your@email.com"
          className="w-full py-3.5 px-4 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] text-[0.95rem] outline-none focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45"
        />
        <button
          type="button"
          onClick={onResend}
          disabled={resendStatus === "loading"}
          className="w-full py-3.5 rounded-full bg-[var(--auth-accent)] text-white font-medium border-0 cursor-pointer hover:bg-[var(--auth-accent-bright)] transition-colors disabled:opacity-60"
        >
          {resendStatus === "loading" ? "Sending…" : "Resend email"}
        </button>
        {resendMessage ? (
          <p
            className={`text-[0.8rem] text-center ${resendStatus === "error" ? "text-red-400" : "text-[var(--auth-fg)]/55"}`}
          >
            {resendMessage}
          </p>
        ) : null}
      </div>

      <p className="mt-8 text-center text-[0.9rem] text-[var(--auth-fg)]/60">
        <Link href={ROUTES.AUTH_LOGIN} className="text-[var(--auth-fg)] hover:text-[var(--auth-fg)]/90 no-underline font-medium">
          Back to login
        </Link>
      </p>
    </AuthCard>
  );
}
