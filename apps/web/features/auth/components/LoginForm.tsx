"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { clerkSignIn } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

var loginSchema = z.object({
  identifier: z.string().min(1, { message: "Please enter your username or email" }),
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

export function LoginForm() {
  var searchParams = useSearchParams();
  var { isLoaded: authIsLoaded, isSignedIn } = useAuth();
  var { signIn, setActive, isLoaded } = useSignIn();
  var [showPassword, setShowPassword] = useState(false);
  var [isLoading, setIsLoading] = useState(false);
  var [formError, setFormError] = useState<string | null>(null);

  var form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  useEffect(
    function () {
      if (authIsLoaded && isSignedIn) {
        completeSessionNavigation(safeNextPath(searchParams.get("next")) ?? ROUTES.HOME);
      }
    },
    [authIsLoaded, isSignedIn, searchParams]
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
        completeSessionNavigation(safeNextPath(searchParams.get("next")) ?? ROUTES.HOME);
        return;
      }
      setFormError(result.message);
      return;
    }

    await setActive({ session: signIn.createdSessionId });

    var next = safeNextPath(searchParams.get("next"));
    completeSessionNavigation(next ?? ROUTES.HOME);
  };

  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
          Welcome <em className="italic text-[var(--auth-accent-bright)]">back.</em>
        </h1>
        <p className="text-[0.85rem] text-[var(--auth-fg)]/45 leading-relaxed">
          Sign in to your account to continue.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        {formError ? (
          <p className="text-red-400 text-[0.8rem] text-center -mt-1 mb-1" role="alert">
            {formError}
          </p>
        ) : null}

        <div>
          <input
            type="text"
            autoComplete="username"
            {...form.register("identifier")}
            placeholder="username or email"
            className={`w-full py-3.5 px-4 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.identifier ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
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
              className={`w-full py-3.5 pl-4 pr-12 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.password ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
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
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.formState.errors.password ? (
            <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isLoaded}
          className="w-full flex justify-center items-center gap-2 bg-[var(--auth-accent)] text-white font-medium text-base py-4 rounded-full border-0 cursor-pointer no-underline transition-all hover:bg-[var(--auth-accent-bright)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-[var(--auth-spinner-track)] border-t-[var(--auth-spinner-tip)] rounded-full animate-spin" />
          ) : (
            <>
              Log in <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-3 text-center">
        <Link
          href={ROUTES.AUTH_FORGOT}
          className="text-[0.85rem] text-[var(--auth-fg)]/50 hover:text-[var(--auth-fg)]/70 transition-colors no-underline"
        >
          Forgot password?
        </Link>
      </p>

      <div className="mt-6 pt-6 border-t border-[var(--auth-divider)] text-center">
        <p className="text-[0.9rem] text-[var(--auth-fg)]/60">
          Don&apos;t have an account?{" "}
          <Link
            href={ROUTES.AUTH_SIGNUP}
            className="text-[var(--auth-fg)] hover:text-[var(--auth-fg)]/90 no-underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
