"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Film,
  MessageCircle,
  Search,
  Star,
} from "lucide-react";
import { signInWithPassword, signUp } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";

const TAKEN_USERNAMES = new Set([
  "maya",
  "maya.frames",
  "oliver",
  "oliver_cuts",
  "admin",
  "film",
  "cinema",
  "user",
  "srithan",
]);

const signupSchema = z.object({
  fullName: z.string().min(2, { message: "Enter your name" }),
  username: z
    .string()
    .min(2, { message: "Use at least 2 characters" })
    .regex(/^[a-zA-Z0-9._]+$/, { message: "Letters, numbers, dots and underscores only" }),
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(8, { message: "Use at least 8 characters" }),
});

const loginSchema = z.object({
  identifier: z.string().min(1, { message: "Enter your username or email" }),
  password: z.string().min(1, { message: "Enter your password" }),
});

type SignupValues = z.infer<typeof signupSchema>;
type LoginValues = z.infer<typeof loginSchema>;

const trustPoints = [
  "No social login maze",
  "No credit card",
  "Takes under a minute",
];

const featureRows = [
  {
    icon: Film,
    title: "Log films without ceremony",
    description: "Ratings, reviews, rewatches, watchlists and diary entries in one clean flow.",
  },
  {
    icon: MessageCircle,
    title: "Talk to people who care",
    description: "Follow filmmakers, critics, friends and the film people you actually want around.",
  },
  {
    icon: Search,
    title: "Find what to watch next",
    description: "Taste-led discovery, festivals, shorts and recommendations without the noise.",
  },
];

function usernameStatusLabel(status: "" | "checking" | "free" | "taken" | "short") {
  if (status === "checking") return "Checking";
  if (status === "taken") return "Taken";
  if (status === "short") return "Too short";
  if (status === "free") return "Available";
  return "";
}

export function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [usernameCheck, setUsernameCheck] = useState<"" | "checking" | "free" | "taken" | "short">("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const watchUsername = signupForm.watch("username");

  const checkUsername = useCallback(function (val: string) {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      setUsernameCheck("");
      return;
    }
    setUsernameCheck("checking");
    usernameTimerRef.current = setTimeout(function () {
      if (TAKEN_USERNAMES.has(trimmed)) {
        setUsernameCheck("taken");
      } else if (trimmed.length < 2) {
        setUsernameCheck("short");
      } else {
        setUsernameCheck("free");
      }
      usernameTimerRef.current = null;
    }, 350);
  }, []);

  useEffect(
    function () {
      checkUsername(watchUsername);
    },
    [watchUsername, checkUsername]
  );

  const onSignupSubmit = async function (data: SignupValues) {
    if (usernameCheck === "taken" || usernameCheck === "short") return;
    setSignupError(null);
    setIsSignupLoading(true);
    const result = await signUp({
      fullName: data.fullName.trim(),
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
    });
    setIsSignupLoading(false);

    if (!result.ok) {
      setSignupError(result.message);
      return;
    }

    if (result.data.requiresVerification) {
      const q = new URLSearchParams();
      q.set("email", data.email.trim());
      router.push(`${ROUTES.AUTH_VERIFY}?${q.toString()}`);
      return;
    }

    router.push(ROUTES.HOME);
    router.refresh();
  };

  const onLoginSubmit = async function (data: LoginValues) {
    setLoginError(null);
    setIsLoginLoading(true);
    const result = await signInWithPassword({
      identifier: data.identifier.trim(),
      password: data.password,
    });
    setIsLoginLoading(false);

    if (!result.ok) {
      setLoginError(result.message);
      return;
    }

    router.push(ROUTES.HOME);
    router.refresh();
  };

  const usernameStatus = usernameStatusLabel(usernameCheck);
  const usernameIsBlocked = usernameCheck === "taken" || usernameCheck === "short";

  return (
    <main className="landing-root min-h-screen bg-white text-[#171717]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-[1.35rem] font-semibold tracking-tight text-[#171717] no-underline">
          35<span className="text-[#c8432a]">mm</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={function () {
              setMode("login");
            }}
            className="rounded-full px-4 py-2 font-medium text-[#555] transition-colors hover:bg-[#f5f5f3] hover:text-[#171717]"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={function () {
              setMode("signup");
            }}
            className="rounded-full bg-[#171717] px-4 py-2 font-medium text-white transition-colors hover:bg-[#303030]"
          >
            Sign up
          </button>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-6xl items-center gap-12 px-5 pb-14 pt-6 sm:px-8 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e8e5df] bg-[#fbfaf8] px-3 py-1.5 text-xs font-medium text-[#6f655b]">
            <Star className="h-3.5 w-3.5 text-[#c8432a]" aria-hidden />
            Built for filmmakers and film lovers
          </p>
          <h1 className="max-w-[720px] text-[3.4rem] font-semibold leading-[0.95] tracking-tight text-[#111] sm:text-[5rem] lg:text-[5.9rem]">
            Your film life, in one quiet place.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#5d5a55]">
            35mm brings film logging, thoughtful reviews, people to follow, shorts and festival discovery into a
            fast social home that respects your taste.
          </p>

          <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 text-sm font-medium text-[#383531]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eef8f0] text-[#257a3f]">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                {point}
              </div>
            ))}
          </div>

          <div className="mt-12 grid max-w-3xl gap-3">
            {featureRows.map((feature) => (
              <div key={feature.title} className="grid grid-cols-[36px_1fr] gap-4 border-t border-[#ece9e3] pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6f4ef] text-[#2f2d2a]">
                  <feature.icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-[0.98rem] font-semibold tracking-tight text-[#171717]">{feature.title}</h2>
                  <p className="mt-1 max-w-lg text-sm leading-6 text-[#69645d]">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="w-full rounded-[24px] border border-[#e9e4dc] bg-[#fffdfb] p-4 shadow-[0_24px_80px_rgba(35,31,26,0.08)]">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f2f0eb] p-1">
            <button
              type="button"
              onClick={function () {
                setMode("signup");
              }}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                mode === "signup" ? "bg-white text-[#171717] shadow-sm" : "text-[#6a655f] hover:text-[#171717]"
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={function () {
                setMode("login");
              }}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-white text-[#171717] shadow-sm" : "text-[#6a655f] hover:text-[#171717]"
              }`}
            >
              Log in
            </button>
          </div>

          {mode === "signup" ? (
            <div className="px-2 pb-2 pt-6">
              <h2 className="text-2xl font-semibold tracking-tight text-[#171717]">Create your account</h2>
              <p className="mt-2 text-sm leading-6 text-[#6a655f]">Email, username, password. That is it.</p>

              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="mt-6 flex flex-col gap-3">
                {signupError ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {signupError}
                  </p>
                ) : null}

                <div>
                  <input
                    type="text"
                    autoComplete="name"
                    {...signupForm.register("fullName")}
                    placeholder="Full name"
                    className={`landing-input ${signupForm.formState.errors.fullName ? "landing-input-error" : ""}`}
                  />
                  {signupForm.formState.errors.fullName ? (
                    <p className="landing-error">{signupForm.formState.errors.fullName.message}</p>
                  ) : null}
                </div>

                <div>
                  <div className={`landing-input-wrap ${signupForm.formState.errors.username ? "landing-input-error" : ""}`}>
                    <span className="shrink-0 text-sm text-[#8b8379]">35mm/</span>
                    <input
                      type="text"
                      autoComplete="username"
                      {...signupForm.register("username")}
                      placeholder="username"
                      className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-[#171717] outline-none placeholder:text-[#aaa39a]"
                    />
                    {usernameStatus ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[0.68rem] font-semibold ${
                          usernameCheck === "free"
                            ? "bg-[#edf8ef] text-[#23783c]"
                            : usernameIsBlocked
                              ? "bg-red-50 text-red-700"
                              : "bg-[#f3f1ed] text-[#756f68]"
                        }`}
                      >
                        {usernameStatus}
                      </span>
                    ) : null}
                  </div>
                  {signupForm.formState.errors.username ? (
                    <p className="landing-error">{signupForm.formState.errors.username.message}</p>
                  ) : null}
                </div>

                <div>
                  <input
                    type="email"
                    autoComplete="email"
                    {...signupForm.register("email")}
                    placeholder="Email"
                    className={`landing-input ${signupForm.formState.errors.email ? "landing-input-error" : ""}`}
                  />
                  {signupForm.formState.errors.email ? (
                    <p className="landing-error">{signupForm.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...signupForm.register("password")}
                      placeholder="Password"
                      className={`landing-input pr-12 ${signupForm.formState.errors.password ? "landing-input-error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={function () {
                        setShowSignupPassword(function (prev) {
                          return !prev;
                        });
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716a] transition-colors hover:text-[#171717]"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupForm.formState.errors.password ? (
                    <p className="landing-error">{signupForm.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isSignupLoading || usernameIsBlocked}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#171717] px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSignupLoading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      Create free account <ArrowRight className="h-4 w-4" aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-[#77716a]">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={function () {
                    setMode("login");
                  }}
                  className="font-semibold text-[#171717] underline-offset-4 hover:underline"
                >
                  Log in
                </button>
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2 pt-6">
              <h2 className="text-2xl font-semibold tracking-tight text-[#171717]">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-[#6a655f]">Use your username or email. No social detours.</p>

              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="mt-6 flex flex-col gap-3">
                {loginError ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {loginError}
                  </p>
                ) : null}

                <div>
                  <input
                    type="text"
                    autoComplete="username"
                    {...loginForm.register("identifier")}
                    placeholder="Username or email"
                    className={`landing-input ${loginForm.formState.errors.identifier ? "landing-input-error" : ""}`}
                  />
                  {loginForm.formState.errors.identifier ? (
                    <p className="landing-error">{loginForm.formState.errors.identifier.message}</p>
                  ) : null}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      {...loginForm.register("password")}
                      placeholder="Password"
                      className={`landing-input pr-12 ${loginForm.formState.errors.password ? "landing-input-error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={function () {
                        setShowLoginPassword(function (prev) {
                          return !prev;
                        });
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716a] transition-colors hover:text-[#171717]"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password ? (
                    <p className="landing-error">{loginForm.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#171717] px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoginLoading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      Log in <ArrowRight className="h-4 w-4" aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                <Link href={ROUTES.AUTH_FORGOT} className="font-medium text-[#6a655f] no-underline hover:text-[#171717]">
                  Forgot password?
                </Link>
                <button
                  type="button"
                  onClick={function () {
                    setMode("signup");
                  }}
                  className="font-semibold text-[#171717] underline-offset-4 hover:underline"
                >
                  Create account
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="border-t border-[#ece9e3] bg-[#fbfaf8] px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_1.2fr] md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a8178]">Why 35mm converts</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-[#171717]">
              The promise is simple and the first action is obvious.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Claim a username"],
              ["2", "Follow film people"],
              ["3", "Start logging"],
            ].map(([num, label]) => (
              <div key={num} className="rounded-2xl border border-[#e8e3dc] bg-white p-5">
                <div className="text-sm font-semibold text-[#c8432a]">{num}</div>
                <div className="mt-8 text-lg font-semibold tracking-tight text-[#171717]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}