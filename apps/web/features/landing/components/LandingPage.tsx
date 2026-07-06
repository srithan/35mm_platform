"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as z from "zod/v4";
import {
  ArrowRight,
  Clapperboard,
  Eye,
  EyeOff,
  MessagesSquare,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useSignUp, useSignIn } from "@clerk/nextjs/legacy";
import { clerkSignUp, clerkSignIn } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";
import { Modal } from "@/components/Modal/Modal";
import { LandingReveal } from "./LandingReveal";
import { LandingHero } from "./LandingHero";

const LANDING_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

function completeSessionNavigation(path: string) {
  window.location.assign(path);
}

function isAlreadySignedInMessage(message: string) {
  return message.toLowerCase().includes("already signed in");
}

type LandingPageProps = {
  children?: ReactNode;
};

type AuthPanelProps = {
  mode: "signup" | "login";
  setMode: (mode: "signup" | "login") => void;
  onClose: () => void;
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
    onClose,
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
      <div className="landing-auth-panel__header">
        <p className="landing-auth-panel__title">
          {mode === "signup" ? "Join 35mm" : "Login to 35mm"}
        </p>
        <button type="button" onClick={onClose} className="landing-auth-panel__close" aria-label="Close auth form">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="landing-auth-panel__tabs">
        <button
          type="button"
          onClick={function () {
            setMode("signup");
          }}
          className={
            mode === "signup"
              ? "landing-auth-panel__tab landing-auth-panel__tab--active"
              : "landing-auth-panel__tab"
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
              ? "landing-auth-panel__tab landing-auth-panel__tab--active"
              : "landing-auth-panel__tab"
          }
        >
          Log in
        </button>
      </div>

      {mode === "signup" ? (
        <div className="landing-auth-panel__body" data-landing-auth-body>
          <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="landing-auth-panel__form">
            {signupError ? (
              <p className="landing-auth-panel__alert" role="alert">
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
                <span className="landing-input-prefix">35mm/</span>
                <input
                  type="text"
                  autoComplete="username"
                  {...signupForm.register("username")}
                  placeholder="username"
                  className="landing-input-inline"
                />
                {usernameStatus ? (
                  <span
                    className={
                      "landing-input-badge " +
                      (usernameCheck === "free"
                        ? "landing-input-badge--ok"
                        : usernameIsBlocked
                          ? "landing-input-badge--bad"
                          : "landing-input-badge--neutral")
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
              <div className="landing-input-password">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...signupForm.register("password")}
                  placeholder="Password"
                  className={
                    "landing-input landing-input--password" +
                    (signupForm.formState.errors.password ? " landing-input-error" : "")
                  }
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowSignupPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="landing-input-toggle"
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
              className="landing-auth-panel__submit"
            >
              {isSignupLoading ? (
                <span className="landing-auth-panel__spinner" />
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="landing-auth-panel__body" data-landing-auth-body>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="landing-auth-panel__form">
            {loginError ? (
              <p className="landing-auth-panel__alert" role="alert">
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
              <div className="landing-input-password">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...loginForm.register("password")}
                  placeholder="Password"
                  className={
                    "landing-input landing-input--password" +
                    (loginForm.formState.errors.password ? " landing-input-error" : "")
                  }
                />
                <button
                  type="button"
                  onClick={function () {
                    setShowLoginPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  className="landing-input-toggle"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password ? (
                <p className="landing-error">{loginForm.formState.errors.password.message}</p>
              ) : null}
            </div>

            <button type="submit" disabled={isLoginLoading} className="landing-auth-panel__submit">
              {isLoginLoading ? (
                <span className="landing-auth-panel__spinner" />
              ) : (
                <>
                  Log in <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </form>

          <div className="landing-auth-panel__footer">
            <Link href={ROUTES.AUTH_FORGOT} className="landing-auth-panel__link">
              Forgot password?
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingPage({ children }: LandingPageProps) {
  const router = useRouter();
  const { isLoaded: authIsLoaded, isSignedIn } = useAuth();
  const { signUp: clerkSignUpObj, isLoaded: signUpLoaded } = useSignUp();
  const { signIn: clerkSignInObj, setActive, isLoaded: signInLoaded } = useSignIn();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<"" | "checking" | "free" | "taken" | "short">("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signupForm = useForm<SignupValues>({
    resolver: standardSchemaResolver(signupSchema),
    defaultValues: { fullName: "", username: "", email: "", password: "" },
  });

  const loginForm = useForm<LoginValues>({
    resolver: standardSchemaResolver(loginSchema),
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
    if (trimmed.length < 2) {
      setUsernameCheck("short");
      return;
    }
    setUsernameCheck("checking");
    usernameTimerRef.current = setTimeout(async function () {
      try {
        const res = await fetch(LANDING_API_URL + "/v1/usernames/" + encodeURIComponent(trimmed) + "/available");
        const data = await res.json();
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

  useEffect(
    function () {
      if (authIsLoaded && isSignedIn) {
        completeSessionNavigation(ROUTES.HOME);
      }
    },
    [authIsLoaded, isSignedIn]
  );

  const openAuthModal = useCallback(function (nextMode: "signup" | "login") {
    setMode(nextMode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(function () {
    setAuthModalOpen(false);
  }, []);

  const onSignupSubmit = async function (data: SignupValues) {
    if (!signUpLoaded || !clerkSignUpObj) return;
    if (usernameCheck === "taken" || usernameCheck === "short") return;
    setSignupError(null);
    setIsSignupLoading(true);
    const result = await clerkSignUp(clerkSignUpObj, {
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
    const q = new URLSearchParams();
    q.set("email", data.email.trim());
    router.push(ROUTES.AUTH_VERIFY + "?" + q.toString());
  };

  const onLoginSubmit = async function (data: LoginValues) {
    if (!signInLoaded || !clerkSignInObj || !setActive) return;
    setLoginError(null);
    setIsLoginLoading(true);
    const result = await clerkSignIn(clerkSignInObj, {
      identifier: data.identifier.trim(),
      password: data.password,
    });
    setIsLoginLoading(false);
    if (!result.ok) {
      if (isAlreadySignedInMessage(result.message)) {
        completeSessionNavigation(ROUTES.HOME);
        return;
      }
      setLoginError(result.message);
      return;
    }
    await setActive({ session: clerkSignInObj.createdSessionId });
    completeSessionNavigation(ROUTES.HOME);
  };

  const authPanelProps: AuthPanelProps = {
    mode: mode,
    setMode: setMode,
    onClose: closeAuthModal,
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
    <main className="landing-root">
      <div className="landing-hero__ambient" aria-hidden />

      <div className="landing-shell">
        <LandingHero
          onJoin={function () {
            openAuthModal("signup");
          }}
          onLogin={function () {
            openAuthModal("login");
          }}
        />

        <div className="landing-below">
          {children ? (
            <LandingReveal className="landing-block">
              <h2 className="landing-block__title">Films in conversation</h2>
              <p className="landing-block__text">
                A rotating look at what people in the community are logging and arguing about right now —
                new releases, repertory screenings, deep cuts, and everything in between.
              </p>
              {children}
            </LandingReveal>
          ) : null}

          <LandingReveal className="landing-after-carousel">
            <section className="landing-after-carousel__grid" aria-labelledby="landing-after-carousel-title">
              <div className="landing-after-carousel__intro">
                <p className="landing-section-kicker">What happens next</p>
                <h2 id="landing-after-carousel-title">A public record for the films that stay with you.</h2>
                <p>
                  35mm turns watching into a living profile: logs, ratings, reviews, and conversations that travel
                  through the people you actually follow.
                </p>
              </div>

              <div className="landing-feature-grid">
                <article className="landing-feature-card">
                  <span className="landing-feature-card__icon" aria-hidden>
                    <Clapperboard className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="landing-feature-card__label">Logs</p>
                    <h3>Every post can carry a film.</h3>
                    <p>
                      First watches, rewatches, half-star ratings, festival notes, and long reviews all connect
                      back to the title being discussed.
                    </p>
                  </div>
                </article>

                <article className="landing-feature-card">
                  <span className="landing-feature-card__icon" aria-hidden>
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="landing-feature-card__label">Profiles</p>
                    <h3>Your taste becomes legible.</h3>
                    <p>
                      Favorites, diary entries, ratings, lists, and the films you defend build a profile that says
                      more than a bio ever could.
                    </p>
                  </div>
                </article>

                <article className="landing-feature-card">
                  <span className="landing-feature-card__icon" aria-hidden>
                    <MessagesSquare className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="landing-feature-card__label">Feed</p>
                    <h3>The timeline starts with your follows.</h3>
                    <p>
                      Follow filmmakers, critics, friends, programmers, and people with impossible watchlists.
                      Their film activity becomes your home feed.
                    </p>
                  </div>
                </article>
              </div>
            </section>
          </LandingReveal>

          <LandingReveal className="landing-audience" delay={0.04}>
            <div className="landing-audience__header">
              <UsersRound className="h-5 w-5" aria-hidden />
              <h2>Made for the people who keep cinema moving.</h2>
            </div>
            <div className="landing-audience__list">
              <p>Directors and DPs sharing work, influences, and festival notes.</p>
              <p>Critics and programmers writing in public without leaving the conversation.</p>
              <p>Students, collectors, and casual viewers building a record one film at a time.</p>
            </div>
          </LandingReveal>

          <LandingReveal className="landing-cta-strip" delay={0.06}>
            <div>
              <p className="landing-section-kicker">Start with one film</p>
              <h2>Claim your username and build the feed from there.</h2>
            </div>
            <div className="landing-cta-strip__actions">
              <button
                type="button"
                onClick={function () {
                  openAuthModal("signup");
                }}
                className="landing-cta-strip__button landing-cta-strip__button--primary"
              >
                Join 35mm <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={function () {
                  openAuthModal("login");
                }}
                className="landing-cta-strip__button landing-cta-strip__button--secondary"
              >
                Login
              </button>
            </div>
          </LandingReveal>

          <footer className="landing-footer">
            <p>© 35mm.in</p>
          </footer>
        </div>
      </div>

      <Modal
        open={authModalOpen}
        onClose={closeAuthModal}
        variant="bare"
        ariaLabel={mode === "signup" ? "Join 35mm" : "Login to 35mm"}
        containerClassName="landing-auth-modal__container"
        contentClassName="landing-auth-modal"
        initialFocusWithinSelector="[data-landing-auth-body]"
      >
        <LandingAuthPanel {...authPanelProps} />
      </Modal>
    </main>
  );
}
