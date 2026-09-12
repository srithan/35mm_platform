"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { AUTH_LAYOUT_USE_LIGHT_THEME } from "@/lib/constants/authLayout";
import { cn } from "@/lib/utils/cn";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { VerifyEmailForm } from "./VerifyEmailForm";
import styles from "./AuthModal.module.css";

export type AuthModalMode = "login" | "signup";

type Step =
  | { kind: "login" }
  | { kind: "signup" }
  | { kind: "verify"; email: string };

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** Which form is shown when the modal opens. */
  initialMode: AuthModalMode;
  /** Optional headline for the decor column; falls back to per-mode copy. */
  headline?: string | null;
  /** Optional supporting line for the decor column (e.g. why auth is needed). */
  message?: string | null;
  /** Path to return to after auth completes. */
  next: string;
}

const TITLE_ID = "auth-modal-title";

const MODE_HEADLINE: Record<Step["kind"], string> = {
  login: "Welcome back to the conversation.",
  signup: "The film ends. Your circle keeps talking.",
  verify: "One last frame before you're in.",
};

const MODE_MESSAGE: Record<Step["kind"], string> = {
  login: "Pick up where you left off: your watchlist, your people, your takes.",
  signup: "Log films, share takes, and follow the people whose taste you trust.",
  verify: "Enter the code we emailed you and we'll take you right back.",
};

function safeNext(next: string): string | null {
  const trimmed = next.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  return trimmed;
}

export function AuthModal({
  open,
  onClose,
  initialMode,
  headline,
  message,
  next,
}: AuthModalProps) {
  const [step, setStep] = useState<Step>({ kind: initialMode });

  // Re-sync the visible form each time the modal is (re)opened so a previous
  // session's mode/verification step never leaks into the next open.
  useEffect(
    function () {
      if (open) setStep({ kind: initialMode });
    },
    [open, initialMode]
  );

  const authTheme = AUTH_LAYOUT_USE_LIGHT_THEME ? "light" : "dark";
  const nextPath = safeNext(next);
  const visualHeadline = headline || MODE_HEADLINE[step.kind];
  const visualMessage = message || MODE_MESSAGE[step.kind];

  function showLogin() {
    setStep({ kind: "login" });
  }

  function showSignup() {
    setStep({ kind: "signup" });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="centered"
      ariaLabelledBy={TITLE_ID}
      initialFocusWithinSelector="[data-auth-modal-form]"
      contentClassName={cn(
        "w-full max-w-[56rem] rounded-[1.25rem] border-0 bg-transparent p-0",
        "shadow-[0_36px_100px_rgba(0,0,0,0.42),0_8px_24px_rgba(0,0,0,0.16)]"
      )}
    >
      <div className={cn("auth-shell", styles.panel)} data-auth-theme={authTheme}>
        <section className={styles.visual} aria-hidden>
          <Image
            src="/landing/cinema-after-screening.webp"
            alt=""
            fill
            sizes="(max-width: 767px) 0px, 28rem"
            className={styles.visualImage}
          />
          <div className={styles.visualShade} />
          <div className={styles.visualSprockets} />

          <span className={styles.visualBrand}>
            35mm<span className={styles.visualBrandDot}>.</span>
          </span>

          <div className={styles.visualCopy}>
            <p className={styles.visualHeadline}>{visualHeadline}</p>
            <p className={styles.visualMessage}>{visualMessage}</p>
          </div>
        </section>

        <aside className={styles.aside}>
          <button
            type="button"
            onClick={onClose}
            className={styles.close}
            aria-label="Close"
          >
            <X strokeWidth={2.25} aria-hidden />
          </button>

          <div className={styles.asideBody}>
            {step.kind === "login" ? (
              <LoginForm
                embedded
                nextPath={nextPath}
                titleId={TITLE_ID}
                onSwitchToSignup={showSignup}
              />
            ) : step.kind === "signup" ? (
              <SignupForm
                embedded
                nextPath={nextPath}
                titleId={TITLE_ID}
                onSwitchToLogin={showLogin}
                onNeedsVerification={function (email) {
                  setStep({ kind: "verify", email: email });
                }}
              />
            ) : (
              <VerifyEmailForm
                embedded
                email={step.email}
                nextPath={nextPath}
                titleId={TITLE_ID}
                onBackToLogin={showLogin}
              />
            )}

            <p className={styles.legal}>
              By continuing you agree to our{" "}
              <Link href="/terms" onClick={onClose}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" onClick={onClose}>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
