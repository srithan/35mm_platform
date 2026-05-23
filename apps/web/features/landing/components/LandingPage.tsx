"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signInWithPassword, signUp } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";
import { LandingReveal } from "./LandingReveal";
import { LandingFeedShowcase, LandingProfileShowcase } from "./LandingShowcases";

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

function usernameStatusLabel(status: "" | "checking" | "free" | "taken" | "short") {
  if (status === "checking") return "Checking";
  if (status === "taken") return "Taken";
  if (status === "short") return "Too short";
  if (status === "free") return "Available";
  return "";
}

type LandingPageProps = {
  children?: ReactNode;
};

type AuthPanelProps = {
  mode: "signup" | "login";
  setMode: (mode: "signup" | "login") => void;
  signupForm: ReturnType<typeof useForm<SignupValues>>;
  loginForm: ReturnType<typeof useForm<LoginValues>>;
  signupError: string | null;
  loginError: string | null;
  usernameCheck: "" | "checking" | "free" | "taken" | "short";
  usernameStatus: string;
  usernameIsBlocked: boolean;
  showSignupPassword: boolean;
  showLoginPassword: boolean;
  setShowSignupPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShowLoginPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  isSignupLoading: boolean;
  isLoginLoading: boolean;
  onSignupSubmit: (data: SignupValues) => void;
  onLoginSubmit: (data: LoginValues) => void;
};

function LandingAuthPanel(props: AuthPanelProps) {
  const {
    mode,
    setMode,
    signupForm,
    loginForm,
    signupError,
    loginError,
    usernameCheck,
    usernameStatus,
    usernameIsBlocked,
    showSignupPassword,
    showLoginPassword,
    setShowSignupPassword,
    setShowLoginPassword,
    isSignupLoading,
    isLoginLoading,
    onSignupSubmit,
    onLoginSubmit,
  } = props;

  return (
    <div className="landing-auth-panel">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f5f5f7] p-1">
        <button
          type="button"
          onClick={function () {
            setMode("signup");
          }}
          className={
            mode === "signup"
              ? "rounded-full bg-white px-4 py-2.5 text-sm font-medium text-fg shadow-sm"
              : "rounded-full px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          }
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={function () {
            setMode("login");
          }}
          className={
            mode === "login"
              ? "rounded-full bg-white px-4 py-2.5 text-sm font-medium text-fg shadow-sm"
              : "rounded-full px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          }
        >
          Log in
        </button>
      </div>

      {mode === "signup" ? (
        <div className="pt-6">
          <h2 className="text-xl font-semibold tracking-tight text-fg">Create your account</h2>
          <p className="mt-1.5 text-sm leading-6 text-fg-muted">Email, username, password. That is it.</p>

          <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="mt-5 flex flex-col gap-3">
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
                className={"landing-input" + (signupForm.formState.errors.fullName ? " landing-input-error" : "")}
              />
              {signupForm.formState.errors.fullName ? (
                <p className="landing-error">{signupForm.formState.errors.fullName.message}</p>
              ) : null}
            </div>

            <div>
              <div
                className={
                  "landing-input-wrap" + (signupForm.formState.errors.username ? " landing-input-error" : "")
                }
              >
                <span className="shrink-0 text-sm text-fg-muted">35mm/</span>
                <input
                  type="text"
                  autoComplete="username"
                  {...signupForm.register("username")}
                  placeholder="username"
                  className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-fg outline-none placeholder:text-fg-muted/70"
                />
                {usernameStatus ? (
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-1 text-[0.68rem] font-semibold " +
                      (usernameCheck === "free"
                        ? "bg-[#f0fdf4] text-[#15803d]"
                        : usernameIsBlocked
                          ? "bg-red-50 text-red-700"
                          : "bg-[#f5f5f7] text-fg-muted")
                    }
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
                className={"landing-input" + (signupForm.formState.errors.email ? " landing-input-error" : "")}
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
                  className={
                    "landing-input pr-12" + (signupForm.formState.errors.password ? " landing-input-error" : "")
                  }
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowSignupPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted transition-colors hover:text-fg"
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
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-fg px-5 py-3.5 text-[0.9375rem] font-medium text-bg transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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

          <p className="mt-4 text-center text-sm text-fg-muted">
            Already have an account?{" "}
            <button
              type="button"
              onClick={function () {
                setMode("login");
              }}
              className="font-medium text-fg underline-offset-4 hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      ) : (
        <div className="pt-6">
          <h2 className="text-xl font-semibold tracking-tight text-fg">Welcome back</h2>
          <p className="mt-1.5 text-sm leading-6 text-fg-muted">Use your username or email. No social detours.</p>

          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="mt-5 flex flex-col gap-3">
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
                className={"landing-input" + (loginForm.formState.errors.identifier ? " landing-input-error" : "")}
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
                  className={"landing-input pr-12" + (loginForm.formState.errors.password ? " landing-input-error" : "")}
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowLoginPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted transition-colors hover:text-fg"
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
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-fg px-5 py-3.5 text-[0.9375rem] font-medium text-bg transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="mt-4 flex items-center justify-between gap-4 text-sm">
            <Link href={ROUTES.AUTH_FORGOT} className="font-medium text-fg-muted no-underline hover:text-fg">
              Forgot password?
            </Link>
            <button
              type="button"
              onClick={function () {
                setMode("signup");
              }}
              className="font-medium text-fg underline-offset-4 hover:underline"
            >
              Create account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingPage({ children }: LandingPageProps) {
  const router = useRouter();
  const authRef = useRef<HTMLDivElement | null>(null);
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
    defaultValues: { fullName: "", username: "", email: "", password: "" },
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

  const scrollToAuth = useCallback(function (nextMode: "signup" | "login") {
    setMode(nextMode);
    if (authRef.current) {
      authRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
      router.push(ROUTES.AUTH_VERIFY + "?" + q.toString());
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

  const authPanelProps: AuthPanelProps = {
    mode: mode,
    setMode: setMode,
    signupForm: signupForm,
    loginForm: loginForm,
    signupError: signupError,
    loginError: loginError,
    usernameCheck: usernameCheck,
    usernameStatus: usernameStatusLabel(usernameCheck),
    usernameIsBlocked: usernameCheck === "taken" || usernameCheck === "short",
    showSignupPassword: showSignupPassword,
    showLoginPassword: showLoginPassword,
    setShowSignupPassword: setShowSignupPassword,
    setShowLoginPassword: setShowLoginPassword,
    isSignupLoading: isSignupLoading,
    isLoginLoading: isLoginLoading,
    onSignupSubmit: onSignupSubmit,
    onLoginSubmit: onLoginSubmit,
  };

  return (
    <main className="landing-root min-h-screen bg-white text-fg">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-28 pt-2 sm:px-8">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="font-mono text-[1.05rem] font-medium tracking-[-0.02em] text-fg no-underline">
            35<span className="text-accent">mm</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm lg:hidden">
            <button
              type="button"
              onClick={function () {
                scrollToAuth("login");
              }}
              className="rounded-full px-3.5 py-2 font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={function () {
                scrollToAuth("signup");
              }}
              className="rounded-full bg-fg px-3.5 py-2 font-medium text-bg transition-colors hover:bg-neutral-800"
            >
              Sign up
            </button>
          </nav>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-16 xl:gap-x-20">
          <div className="min-w-0">
            <LandingReveal>
              <section className="max-w-[640px] pt-4 lg:pt-8">
                <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-fg-muted">Social network</p>
                <h1 className="mt-4 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-fg sm:text-[3.5rem] lg:text-[3.75rem]">
                  Follow filmmakers.
                  <br />
                  Log what you watch.
                  <br />
                  <span className="font-display italic font-normal text-accent">Talk film.</span>
                </h1>
                <p className="mt-6 text-[1.0625rem] leading-[1.7] text-fg-muted sm:text-[1.125rem]">
                  35mm is a home for directors, critics, programmers, and obsessive viewers — a feed of real posts,
                  real ratings, and real arguments about movies. Not a tracker bolted onto Twitter. A social network
                  built for cinema.
                </p>
              </section>
            </LandingReveal>

            <LandingReveal className="mt-12 sm:mt-16" delay={0.06}>
              <LandingFeedShowcase />
            </LandingReveal>

            <div ref={authRef} className="mt-12 lg:hidden">
              <LandingAuthPanel {...authPanelProps} />
            </div>

            {children ? (
              <LandingReveal className="mt-20 overflow-hidden sm:mt-24" delay={0.04}>
                <div className="mb-6 max-w-xl">
                  <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-fg-muted">Now screening</p>
                  <h2 className="mt-3 text-[1.875rem] font-semibold tracking-[-0.02em] text-fg sm:text-[2.125rem]">
                    Films people are talking about.
                  </h2>
                </div>
                {children}
              </LandingReveal>
            ) : null}

            <div className="mt-24 grid gap-16 sm:mt-32 sm:gap-24">
              <LandingReveal>
                <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
                  <div className="max-w-md">
                    <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-fg-muted">Profiles</p>
                    <h2 className="mt-3 text-[1.875rem] font-semibold leading-[1.12] tracking-[-0.02em] text-fg sm:text-[2.125rem]">
                      Your taste is the whole point.
                    </h2>
                    <p className="mt-4 text-[1.0625rem] leading-[1.7] text-fg-muted">
                      Every film you log builds a profile other people actually want to follow. Favourites on display.
                      Diary entries with ratings. A record of what cinema means to you — not a résumé with a movie
                      poster pasted on.
                    </p>
                  </div>
                  <LandingProfileShowcase />
                </section>
              </LandingReveal>

              <LandingReveal delay={0.05}>
                <section className="grid items-start gap-10 border-t border-border pt-16 lg:grid-cols-2 lg:gap-14">
                  <div>
                    <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-fg-muted">Community</p>
                    <h2 className="mt-3 text-[1.875rem] font-semibold leading-[1.12] tracking-[-0.02em] text-fg sm:text-[2.125rem]">
                      Built around people you choose.
                    </h2>
                    <p className="mt-4 max-w-md text-[1.0625rem] leading-[1.7] text-fg-muted">
                      Follow a DP whose colour work you steal. Follow a critic who hates the same franchises you do.
                      Your feed is assembled from those relationships — film logs, hot takes, festival dispatches,
                      and threads that go long after midnight.
                    </p>
                    <ul className="mt-8 space-y-4 border-t border-border pt-8">
                      {[
                        ["Post logs and reviews", "Share what you watched, rated, and rewatched — with the film attached."],
                        ["Follow by taste", "Build a feed from filmmakers, critics, friends, and programmers."],
                        ["Discover through people", "Festivals, shorts, and deep cuts from voices you trust."],
                      ].map(function (item) {
                        return (
                          <li key={item[0]} className="grid grid-cols-[8rem_1fr] gap-4 sm:grid-cols-[9rem_1fr]">
                            <span className="text-sm font-semibold text-fg">{item[0]}</span>
                            <span className="text-sm leading-relaxed text-fg-muted">{item[1]}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-[1.75rem] border border-border bg-sunken p-6 sm:p-8">
                    <p className="font-display text-[2rem] italic leading-snug text-fg sm:text-[2.25rem]">
                      &ldquo;Finally — a place where posting about Jeanne Dielman doesn&apos;t feel like shouting into
                      the void.&rdquo;
                    </p>
                    <p className="mt-5 text-sm text-fg-muted">— early member, Berlin</p>
                  </div>
                </section>
              </LandingReveal>

              <LandingReveal delay={0.04}>
                <section className="border-t border-border pt-16">
                  <div className="max-w-xl">
                    <h2 className="text-[1.875rem] font-semibold tracking-[-0.02em] text-fg sm:text-[2.125rem]">
                      Claim your username. Follow a few people. Your feed starts there.
                    </h2>
                    <p className="mt-4 text-[1.0625rem] leading-[1.7] text-fg-muted">
                      Free to join. No credit card. Under a minute to get in.
                    </p>
                  </div>
                </section>
              </LandingReveal>
            </div>

            <footer className="mt-24 border-t border-border pt-8">
              <p className="text-sm text-fg-muted">© 35mm.in</p>
            </footer>
          </div>

          <div className="hidden min-w-0 lg:block">
            <div className="sticky top-8 pt-8">
              <LandingAuthPanel {...authPanelProps} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
