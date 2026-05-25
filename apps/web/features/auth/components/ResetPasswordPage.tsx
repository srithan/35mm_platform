"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { clerkResetPassword } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

var resetSchema = z
  .object({
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine(function (data) {
    return data.newPassword === data.confirmPassword;
  }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

function completeSessionNavigation(path: string) {
  window.location.assign(path);
}

export function ResetPasswordPage() {
  var { signIn, setActive, isLoaded } = useSignIn();
  var [isSuccess, setIsSuccess] = useState(false);
  var [isLoading, setIsLoading] = useState(false);
  var [formError, setFormError] = useState<string | null>(null);
  var [showNewPassword, setShowNewPassword] = useState(false);
  var [showConfirmPassword, setShowConfirmPassword] = useState(false);

  var form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  var onSubmit = async function (data: ResetValues) {
    if (!isLoaded || !signIn || !setActive) return;
    setFormError(null);
    setIsLoading(true);

    var result = await clerkResetPassword(signIn, data.newPassword);
    setIsLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    await setActive({ session: signIn.createdSessionId });
    setIsSuccess(true);
    window.setTimeout(function () {
      completeSessionNavigation(ROUTES.HOME);
    }, 2000);
  };

  return (
    <>
      <AuthCard>
        {isSuccess ? (
          <div className="animate-in zoom-in-95 duration-500 text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="font-display text-[1.75rem] font-black leading-tight mb-3">
              Password <em className="italic text-[var(--auth-accent-bright)]">updated.</em>
            </h1>
            <p className="text-[0.9rem] text-[var(--auth-fg)]/60 leading-relaxed mb-6">
              Your password has been reset. Redirecting...
            </p>
            <div className="w-full h-1 bg-[var(--auth-progress-track)] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500/50 rounded-full animate-[auth-progress_2s_ease-in-out_forwards]" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center fade-in">
              <div className="w-12 h-12 bg-[var(--auth-icon-bubble-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--auth-icon-bubble-border)]">
                <Lock className="w-5 h-5 text-[var(--auth-fg)]/60" />
              </div>
              <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
                Reset <em className="italic text-[var(--auth-accent-bright)]">password.</em>
              </h1>
              <p className="text-[0.85rem] text-[var(--auth-fg)]/40 leading-relaxed max-w-[280px] mx-auto">
                Choose a new password for your account.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {formError ? (
                <p className="text-red-400 text-[0.8rem] text-center -mt-2" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...form.register("newPassword")}
                  placeholder="New password"
                  className="w-full py-3.5 pl-5 pr-12 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/40"
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowNewPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--auth-fg)]/40 hover:text-[var(--auth-fg)]/70 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {form.formState.errors.newPassword ? (
                  <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
                    {form.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                  placeholder="Re-enter new password"
                  className="w-full py-3.5 pl-5 pr-12 bg-[var(--auth-input-bg)] border border-[var(--auth-input-border)] rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/40"
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowConfirmPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--auth-fg)]/40 hover:text-[var(--auth-fg)]/70 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {form.formState.errors.confirmPassword ? (
                  <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
                    {form.formState.errors.confirmPassword.message}
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
                    Update password <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </AuthCard>

      {!isSuccess ? (
        <div className="mt-8 text-center">
          <p className="text-[0.75rem] text-[var(--auth-fg)]/20 tracking-wide">Secure password recovery</p>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes auth-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
