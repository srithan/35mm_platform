"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { requestPasswordReset, verifyPasswordResetOtp } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

const checkUserSchema = z.object({
  identifier: z.string().min(1, { message: "Please enter your email or username." }),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(4, { message: "OTP must be exactly 4 digits." })
    .regex(/^\d+$/, { message: "OTP must contain only numbers." }),
});

type CheckUserValues = z.infer<typeof checkUserSchema>;
type OtpValues = z.infer<typeof otpSchema>;

export function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"check" | "otp">("check");
  const [isLoading, setIsLoading] = useState(false);
  const [savedIdentifier, setSavedIdentifier] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const checkForm = useForm<CheckUserValues>({
    resolver: zodResolver(checkUserSchema),
    defaultValues: { identifier: "" },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const onCheckSubmit = async function (data: CheckUserValues) {
    setFormError(null);
    setIsLoading(true);
    const result = await requestPasswordReset({ identifier: data.identifier.trim() });
    setIsLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setSavedIdentifier(data.identifier.trim());
    setStep("otp");
  };

  const onOtpSubmit = async function (data: OtpValues) {
    setFormError(null);
    setIsLoading(true);
    const result = await verifyPasswordResetOtp({
      identifier: savedIdentifier,
      otp: data.otp,
    });
    setIsLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    const q = new URLSearchParams();
    q.set("token", result.data.resetToken);
    router.push(`${ROUTES.AUTH_RESET}?${q.toString()}`);
  };

  return (
    <>
      <AuthCard>
        {step === "check" ? (
          <>
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-[var(--auth-icon-bubble-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--auth-icon-bubble-border)]">
                <KeyRound className="w-5 h-5 text-[var(--auth-fg)]/60" />
              </div>
              <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
                Forgot <em className="italic text-[var(--auth-accent-bright)]">password?</em>
              </h1>
              <p className="text-[0.85rem] text-[var(--auth-fg)]/40 leading-relaxed max-w-[280px] mx-auto">
                Enter your email or username, and we&apos;ll send you a 4-digit code to reset your password.
              </p>
            </div>

            <form onSubmit={checkForm.handleSubmit(onCheckSubmit)} className="flex flex-col gap-4">
              {formError ? (
                <p className="text-red-400 text-[0.8rem] text-center -mt-2" role="alert">
                  {formError}
                </p>
              ) : null}
              <div>
                <input
                  type="text"
                  {...checkForm.register("identifier")}
                  placeholder="email or username"
                  className="w-full py-3.5 px-5 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/40"
                />
                {checkForm.formState.errors.identifier ? (
                  <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
                    {checkForm.formState.errors.identifier.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 bg-[var(--auth-accent)] text-white font-medium text-base py-3.5 mt-2 rounded-full border-0 cursor-pointer no-underline transition-all hover:bg-[var(--auth-accent-bright)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-[var(--auth-spinner-track)] border-t-[var(--auth-spinner-tip)] rounded-full animate-spin" />
                ) : (
                  <>
                    Send code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-[var(--auth-icon-bubble-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--auth-icon-bubble-border)]">
                <Mail className="w-5 h-5 text-[var(--auth-fg)]/60" />
              </div>
              <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
                Check your <em className="italic text-[var(--auth-accent-bright)]">inbox.</em>
              </h1>
              <p className="text-[0.85rem] text-[var(--auth-fg)]/40 leading-relaxed max-w-[280px] mx-auto">
                We sent a 4-digit code to <span className="text-[var(--auth-fg)]">{savedIdentifier}</span>.
              </p>
            </div>

            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="flex flex-col gap-4">
              {formError ? (
                <p className="text-red-400 text-[0.8rem] text-center -mt-2" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  {...otpForm.register("otp")}
                  placeholder="••••"
                  className="w-full py-3.5 px-5 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] text-[1.25rem] leading-tight text-center tracking-[0.75em] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/25 placeholder:text-[0.95rem] placeholder:tracking-normal"
                />
                {otpForm.formState.errors.otp ? (
                  <p className="text-red-400 text-[0.75rem] text-center mt-2">
                    {otpForm.formState.errors.otp.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 bg-[var(--auth-accent)] text-white font-medium text-base py-3.5 mt-4 rounded-full border-0 cursor-pointer no-underline transition-all hover:bg-[var(--auth-accent-bright)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-[var(--auth-spinner-track)] border-t-[var(--auth-spinner-tip)] rounded-full animate-spin" />
                ) : (
                  "Verify code"
                )}
              </button>

              <button
                type="button"
                onClick={function () {
                  setStep("check");
                  setFormError(null);
                  otpForm.reset();
                }}
                className="mt-2 text-[0.85rem] text-[var(--auth-fg)]/40 hover:text-[var(--auth-fg)]/70 transition-colors flex items-center justify-center gap-1.5 bg-transparent border-0 cursor-pointer font-inherit w-full"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </form>
          </div>
        )}
      </AuthCard>

      <div className="mt-8 text-center flex flex-col gap-3">
        <Link
          href={ROUTES.AUTH_LOGIN}
          className="text-[0.85rem] text-[var(--auth-fg)]/40 hover:text-[var(--auth-fg)]/70 transition-colors no-underline"
        >
          Remember your password? Log in
        </Link>
        <p className="text-[0.75rem] text-[var(--auth-fg)]/20 tracking-wide">Secure password recovery</p>
      </div>
    </>
  );
}
