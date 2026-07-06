"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as z from "zod/v4";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { clerkSignUp } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

var API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

var signupSchema = z
  .object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
    username: z
      .string()
      .min(2, { message: "Username must be at least 2 characters" })
      .regex(/^[a-zA-Z0-9._]+$/, { message: "Letters, numbers, dots and underscores only" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine(function (d) {
    return d.password === d.confirmPassword;
  }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function SignupForm() {
  var router = useRouter();
  var searchParams = useSearchParams();
  var { signUp, isLoaded } = useSignUp();
  var [usernameCheck, setUsernameCheck] = useState<"" | "checking" | "free" | "taken" | "short">("");
  var usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var [showPassword, setShowPassword] = useState(false);
  var [showConfirm, setShowConfirm] = useState(false);
  var [isLoading, setIsLoading] = useState(false);
  var [formError, setFormError] = useState<string | null>(null);

  var form = useForm<SignupValues>({
    resolver: standardSchemaResolver(signupSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  var watchUsername = form.watch("username");

  var checkUsername = useCallback(function (val: string) {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    var trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      setUsernameCheck("");
      return;
    }
    if (trimmed.length < 2) {
      setUsernameCheck("short");
      return;
    }
    setUsernameCheck("checking");
    usernameTimerRef.current = setTimeout(async function () {
      try {
        var res = await fetch(API_URL + "/v1/usernames/" + encodeURIComponent(trimmed) + "/available");
        var data = await res.json();
        setUsernameCheck(data.available ? "free" : "taken");
      } catch (_err) {
        setUsernameCheck("free");
      }
      usernameTimerRef.current = null;
    }, 500);
  }, []);

  useEffect(
    function () {
      checkUsername(watchUsername);
    },
    [watchUsername, checkUsername]
  );

  var onSubmit = async function (data: SignupValues) {
    if (!isLoaded || !signUp) return;
    if (usernameCheck === "taken" || usernameCheck === "short") return;
    setFormError(null);
    setIsLoading(true);

    var result = await clerkSignUp(signUp, {
      fullName: data.fullName.trim(),
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
    });

    setIsLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    var next = safeNextPath(searchParams.get("next"));
    var q = new URLSearchParams();
    q.set("email", data.email.trim());
    if (next) q.set("next", next);
    router.push(ROUTES.AUTH_VERIFY + "?" + q.toString());
  };

  return (
    <AuthCard>
      <div className="mb-8 text-center">
        <h1 className="font-display text-[1.75rem] font-black leading-tight mb-2">
          Create your <em className="italic text-[var(--auth-accent-bright)]">account.</em>
        </h1>
        <p className="text-[0.85rem] text-[var(--auth-fg)]/40 leading-relaxed">
          Join filmmakers and film lovers on 35mm.
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
            autoComplete="name"
            {...form.register("fullName")}
            placeholder="Full name"
            className={`w-full py-3.5 px-4 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.fullName ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
          />
          {form.formState.errors.fullName ? (
            <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
              {form.formState.errors.fullName.message}
            </p>
          ) : null}
        </div>

        <div>
          <div
            className={`flex items-center bg-[var(--auth-input-bg)] border rounded-full overflow-hidden transition-[border-color] focus-within:border-[var(--auth-accent)]/50 ${form.formState.errors.username ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
          >
            <span className="py-3 pl-4 pr-1 text-[var(--auth-fg)]/35 text-[0.95rem] whitespace-nowrap select-none">
              35mm/
            </span>
            <input
              type="text"
              autoComplete="username"
              {...form.register("username")}
              placeholder="username"
              className="flex-1 py-3.5 pl-0 pr-2 bg-transparent border-0 text-[var(--auth-fg)] text-[0.95rem] outline-none min-w-0 placeholder:text-[var(--auth-fg)]/45"
            />
            <div
              className={`pr-4 flex items-center transition-all duration-300 ${usernameCheck ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
            >
              <span
                className={`text-[0.65rem] px-2 py-0.5 rounded-md border whitespace-nowrap tracking-tight ${
                  usernameCheck === "free"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : usernameCheck === "taken" || usernameCheck === "short"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-[var(--auth-chip-bg)] border-[var(--auth-chip-border)] text-[var(--auth-fg)]/50"
                }`}
              >
                {usernameCheck === "checking"
                  ? "Checking..."
                  : usernameCheck === "taken"
                    ? "Unavailable"
                    : usernameCheck === "short"
                      ? "Too short"
                      : usernameCheck === "free"
                        ? "Available"
                        : ""}
              </span>
            </div>
          </div>
          {form.formState.errors.username ? (
            <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
              {form.formState.errors.username.message}
            </p>
          ) : null}
        </div>

        <div>
          <input
            type="email"
            autoComplete="email"
            {...form.register("email")}
            placeholder="your@email.com"
            className={`w-full py-3.5 px-4 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.email ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
          />
          {form.formState.errors.email ? (
            <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...form.register("password")}
              placeholder="Password (8+ characters)"
              className={`w-full py-3.5 pl-4 pr-12 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.password ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
            />
            <button
              type="button"
              onClick={function () {
                setShowPassword(function (p) {
                  return !p;
                });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--auth-fg)]/40 hover:text-[var(--auth-fg)]/70 transition-colors"
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

        <div>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              placeholder="Confirm password"
              className={`w-full py-3.5 pl-4 pr-12 bg-[var(--auth-input-bg)] border rounded-full text-[var(--auth-fg)] font-sans text-[0.95rem] outline-none transition-[border-color] focus:border-[var(--auth-accent)]/50 placeholder:text-[var(--auth-fg)]/45 ${form.formState.errors.confirmPassword ? "border-red-500/50" : "border-[var(--auth-input-border)]"}`}
            />
            <button
              type="button"
              onClick={function () {
                setShowConfirm(function (p) {
                  return !p;
                });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--auth-fg)]/40 hover:text-[var(--auth-fg)]/70 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.formState.errors.confirmPassword ? (
            <p className="text-red-400 text-[0.75rem] ml-4 mt-1.5">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isLoaded || usernameCheck === "taken" || usernameCheck === "short"}
          className="w-full flex justify-center items-center gap-2 bg-[var(--auth-accent)] text-white font-medium text-base py-4 rounded-full border-0 cursor-pointer no-underline transition-all hover:bg-[var(--auth-accent-bright)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-[var(--auth-spinner-track)] border-t-[var(--auth-spinner-tip)] rounded-full animate-spin" />
          ) : (
            <>
              Create account <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-[0.7rem] text-[var(--auth-fg)]/20 tracking-wide text-center">
        FREE &middot; NO CREDIT CARD &middot; NO ADS
      </p>

      <div className="mt-6 pt-6 border-t border-[var(--auth-divider)] text-center">
        <p className="text-[0.9rem] text-[var(--auth-fg)]/60">
          Already have an account?{" "}
          <Link
            href={ROUTES.AUTH_LOGIN}
            className="text-[var(--auth-fg)] hover:text-[var(--auth-fg)]/90 no-underline font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
