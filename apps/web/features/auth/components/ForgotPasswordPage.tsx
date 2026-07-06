"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as z from "zod/v4";
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { clerkForgotPassword, clerkVerifyResetCode } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

var emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

var codeSchema = z.object({
  code: z
    .string()
    .min(6, { message: "Please enter the 6-digit code." })
    .max(6, { message: "Code must be 6 digits." })
    .regex(/^\d+$/, { message: "Code must contain only numbers." }),
});

type EmailValues = z.infer<typeof emailSchema>;
type CodeValues = z.infer<typeof codeSchema>;

export function ForgotPasswordPage() {
  var router = useRouter();
  var { signIn, isLoaded } = useSignIn();
  var [step, setStep] = useState<"email" | "code">("email");
  var [isLoading, setIsLoading] = useState(false);
  var [savedEmail, setSavedEmail] = useState("");
  var [formError, setFormError] = useState<string | null>(null);

  var emailForm = useForm<EmailValues>({
    resolver: standardSchemaResolver(emailSchema),
    defaultValues: { email: "" },
  });

  var codeForm = useForm<CodeValues>({
    resolver: standardSchemaResolver(codeSchema),
    defaultValues: { code: "" },
  });

  var onEmailSubmit = async function (data: EmailValues) {
    if (!isLoaded || !signIn) return;
    setFormError(null);
    setIsLoading(true);

    var result = await clerkForgotPassword(signIn, data.email.trim());
    setIsLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setSavedEmail(data.email.trim());
    setStep("code");
  };

  var onCodeSubmit = async function (data: CodeValues) {
    if (!isLoaded || !signIn) return;
    setFormError(null);
    setIsLoading(true);

    var result = await clerkVerifyResetCode(signIn, data.code);
    setIsLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    router.push(ROUTES.AUTH_RESET);
  };

  return (
    <>
      <AuthCard>
        {step === "email" ? (
          <>
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-[var(--auth-icon-bubble-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--auth-icon-bubble-border)]">
                <KeyRound className="w-5 h-5 text-[var(--auth-fg)]/60" />
              </div>
              <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
                Forgot <em className="italic text-[var(--auth-accent-bright)]">password?</em>
              </h1>
              <p className="text-[0.85rem] text-[var(--auth-fg)]/40 leading-relaxed max-w-[280px] mx-auto">
                Enter your email address, and we&apos;ll send you a 6-digit code to reset your password.
              </p>
            </div>

            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex flex-col gap-4">
              {formError ? (
                <p className="text-red-400 text-[0.8rem] text-center -mt-2" role="alert">
                  {formError}
                </p>
              ) : null}
              <div>
                <input
                  type="email"
                  autoComplete="email"
                  {...emailForm.register("email")}
                  placeholder="your@email.com"
                  className="w-full py-3.5 px-5 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/40"
                />
                {emailForm.formState.errors.email ? (
                  <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
                    {emailForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading || !isLoaded}
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
                We sent a 6-digit code to <span className="text-[var(--auth-fg)]">{savedEmail}</span>.
              </p>
            </div>

            <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="flex flex-col gap-4">
              {formError ? (
                <p className="text-red-400 text-[0.8rem] text-center -mt-2" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  {...codeForm.register("code")}
                  placeholder="••••••"
                  className="w-full py-3.5 px-5 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] text-[1.25rem] leading-tight text-center tracking-[0.5em] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/25 placeholder:text-[0.95rem] placeholder:tracking-normal"
                />
                {codeForm.formState.errors.code ? (
                  <p className="text-red-400 text-[0.75rem] text-center mt-2">
                    {codeForm.formState.errors.code.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading || !isLoaded}
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
                  setStep("email");
                  setFormError(null);
                  codeForm.reset();
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
