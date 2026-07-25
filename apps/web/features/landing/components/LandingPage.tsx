"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as z from "zod/v4";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { clerkSignIn, clerkSignUp } from "@/features/auth/lib/auth-client";
import { ROUTES } from "@/lib/constants/routes";
import { LandingHero } from "./LandingHero";
import styles from "./LandingPage.module.css";

const LANDING_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SOCIAL_PROOF_FACES = [
  "/landing/social-faces/face-01.jpg",
  "/landing/social-faces/face-02.jpg",
  "/landing/social-faces/face-03.jpg",
  "/landing/social-faces/face-04.jpg",
  "/landing/social-faces/face-05.jpg",
  "/landing/social-faces/face-06.jpg",
  "/landing/social-faces/face-07.jpg",
  "/landing/social-faces/face-08.jpg",
  "/landing/social-faces/face-09.jpg",
];

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
type AuthMode = "signup" | "login";
type UsernameCheck = "" | "checking" | "free" | "taken" | "short" | "error";

function usernameStatusLabel(status: UsernameCheck) {
  if (status === "checking") return "Checking…";
  if (status === "taken") return "Taken";
  if (status === "short") return "Too short";
  if (status === "free") return "Available";
  if (status === "error") return "Check failed";
  return "";
}

function completeSessionNavigation(path: string) {
  window.location.assign(path);
}

function isAlreadySignedInMessage(message: string) {
  return message.toLowerCase().includes("already signed in");
}

type AuthPanelProps = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  signupForm: ReturnType<typeof useForm<SignupValues>>;
  loginForm: ReturnType<typeof useForm<LoginValues>>;
  signupError: string | null;
  loginError: string | null;
  usernameCheck: UsernameCheck;
  usernameStatus: string;
  usernameIsBlocked: boolean;
  showSignupPassword: boolean;
  showLoginPassword: boolean;
  setShowSignupPassword: (value: boolean | ((previous: boolean) => boolean)) => void;
  setShowLoginPassword: (value: boolean | ((previous: boolean) => boolean)) => void;
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
    <div className={styles.authPanel}>
      <div className={styles.authHeader}>
        <h2>{mode === "signup" ? "Join 35mm" : "Log in to 35mm"}</h2>
        <p>
          {mode === "signup"
            ? "Create your account, then choose the first voices in your film circle."
            : "Return to the films, lists, and conversations your circle is building."}
        </p>
      </div>

      {mode === "signup" ? (
        <div className={styles.authProof} aria-label="What happens after joining">
          <div className={styles.authProofFaces} aria-hidden>
            {SOCIAL_PROOF_FACES.map(function (src, index) {
              return (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={48}
                  height={48}
                  className={styles.authProofFace}
                  priority={index < 4}
                />
              );
            })}
          </div>
          <p>Join these and 11,183 other film lovers.</p>
        </div>
      ) : null}

      {mode === "signup" ? (
        <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className={styles.authForm} noValidate>
          {signupError ? (
            <p className={styles.formAlert} role="alert">
              {signupError}
            </p>
          ) : null}

          <div className={styles.field}>
            <input
              id="landing-full-name"
              type="text"
              autoComplete="name"
              {...signupForm.register("fullName")}
              aria-label="Full name"
              placeholder="Agnès Varda"
              className={signupForm.formState.errors.fullName ? styles.inputError : undefined}
              aria-invalid={Boolean(signupForm.formState.errors.fullName)}
            />
            {signupForm.formState.errors.fullName ? (
              <p className={styles.fieldError}>{signupForm.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className={styles.field}>
            <div
              className={
                styles.usernameField +
                (signupForm.formState.errors.username ? " " + styles.inputError : "")
              }
            >
              <span className={styles.usernamePrefix}>35mm.in/</span>
              <input
                id="landing-username"
                type="text"
                autoComplete="username"
                {...signupForm.register("username")}
                aria-label="Username"
                placeholder="agnes"
                aria-invalid={Boolean(signupForm.formState.errors.username) || usernameCheck === "taken"}
              />
              {usernameStatus ? (
                <span
                  className={
                    styles.usernameStatus +
                    " " +
                    (usernameCheck === "free"
                      ? styles.usernameStatusFree
                      : usernameCheck === "taken" || usernameCheck === "short" || usernameCheck === "error"
                        ? styles.usernameStatusBad
                        : styles.usernameStatusNeutral)
                  }
                  aria-live="polite"
                >
                  {usernameCheck === "free" ? <Check size={12} aria-hidden /> : null}
                  {usernameStatus}
                </span>
              ) : null}
            </div>
            {signupForm.formState.errors.username ? (
              <p className={styles.fieldError}>{signupForm.formState.errors.username.message}</p>
            ) : usernameCheck === "error" ? (
              <p className={styles.fieldError}>Couldn’t check this username. Try editing it again.</p>
            ) : null}
          </div>

          <div className={styles.field}>
            <input
              id="landing-email"
              type="email"
              autoComplete="email"
              {...signupForm.register("email")}
              aria-label="Email"
              placeholder="agnes@example.com"
              className={signupForm.formState.errors.email ? styles.inputError : undefined}
              aria-invalid={Boolean(signupForm.formState.errors.email)}
            />
            {signupForm.formState.errors.email ? (
              <p className={styles.fieldError}>{signupForm.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className={styles.field}>
            <div className={styles.passwordField}>
              <input
                id="landing-signup-password"
                type={showSignupPassword ? "text" : "password"}
                autoComplete="new-password"
                {...signupForm.register("password")}
                aria-label="Password"
                placeholder="At least 8 characters"
                className={signupForm.formState.errors.password ? styles.inputError : undefined}
                aria-invalid={Boolean(signupForm.formState.errors.password)}
              />
              <button
                type="button"
                onClick={function () {
                  setShowSignupPassword(function (previous) {
                    return !previous;
                  });
                }}
                className={styles.passwordToggle}
                aria-label={showSignupPassword ? "Hide password" : "Show password"}
              >
                {showSignupPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {signupForm.formState.errors.password ? (
              <p className={styles.fieldError}>{signupForm.formState.errors.password.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSignupLoading || usernameIsBlocked}
            className={styles.submitButton}
          >
            {isSignupLoading ? (
              <span className={styles.spinner} aria-label="Creating account" />
            ) : (
              <>
                Join 35mm <ArrowRight size={17} aria-hidden />
              </>
            )}
          </button>

          <p className={styles.legalCopy}>
            By joining, you agree to the <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      ) : (
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className={styles.authForm} noValidate>
          {loginError ? (
            <p className={styles.formAlert} role="alert">
              {loginError}
            </p>
          ) : null}

          <div className={styles.field}>
            <input
              id="landing-identifier"
              type="text"
              autoComplete="username"
              {...loginForm.register("identifier")}
              aria-label="Username or email"
              placeholder="agnes or agnes@example.com"
              className={loginForm.formState.errors.identifier ? styles.inputError : undefined}
              aria-invalid={Boolean(loginForm.formState.errors.identifier)}
            />
            {loginForm.formState.errors.identifier ? (
              <p className={styles.fieldError}>{loginForm.formState.errors.identifier.message}</p>
            ) : null}
          </div>

          <div className={styles.field}>
            <div className={styles.forgotRow}>
              <Link href={ROUTES.AUTH_FORGOT}>Forgot password?</Link>
            </div>
            <div className={styles.passwordField}>
              <input
                id="landing-login-password"
                type={showLoginPassword ? "text" : "password"}
                autoComplete="current-password"
                {...loginForm.register("password")}
                aria-label="Password"
                placeholder="Your password"
                className={loginForm.formState.errors.password ? styles.inputError : undefined}
                aria-invalid={Boolean(loginForm.formState.errors.password)}
              />
              <button
                type="button"
                onClick={function () {
                  setShowLoginPassword(function (previous) {
                    return !previous;
                  });
                }}
                className={styles.passwordToggle}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {loginForm.formState.errors.password ? (
              <p className={styles.fieldError}>{loginForm.formState.errors.password.message}</p>
            ) : null}
          </div>

          <button type="submit" disabled={isLoginLoading} className={styles.submitButton}>
            {isLoginLoading ? (
              <span className={styles.spinner} aria-label="Logging in" />
            ) : (
              <>
                Log in <ArrowRight size={17} aria-hidden />
              </>
            )}
          </button>
        </form>
      )}

      <div className={styles.modeSwitch}>
        <span>{mode === "signup" ? "Already a member?" : "New to 35mm?"}</span>
        <button
          type="button"
          onClick={function () {
            setMode(mode === "signup" ? "login" : "signup");
          }}
        >
          {mode === "signup" ? "Log in" : "Create an account"}
        </button>
      </div>
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { isLoaded: authIsLoaded, isSignedIn } = useAuth();
  const { signUp: clerkSignUpObject, isLoaded: signUpLoaded } = useSignUp();
  const { signIn: clerkSignInObject, setActive, isLoaded: signInLoaded } = useSignIn();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const authAsideRef = useRef<HTMLElement | null>(null);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRequestRef = useRef<AbortController | null>(null);
  const usernameCheckSequenceRef = useRef(0);

  const signupForm = useForm<SignupValues>({
    resolver: standardSchemaResolver(signupSchema),
    defaultValues: { fullName: "", username: "", email: "", password: "" },
  });

  const loginForm = useForm<LoginValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const watchedUsername = signupForm.watch("username");

  const checkUsername = useCallback(function (value: string) {
    const requestSequence = usernameCheckSequenceRef.current + 1;
    usernameCheckSequenceRef.current = requestSequence;
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    usernameRequestRef.current?.abort();

    const trimmed = value.trim().toLowerCase();
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
      if (requestSequence !== usernameCheckSequenceRef.current) return;
      usernameTimerRef.current = null;

      const controller = new AbortController();
      usernameRequestRef.current = controller;

      try {
        const response = await fetch(
          LANDING_API_URL + "/v1/usernames/" + encodeURIComponent(trimmed) + "/available",
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Username check returned " + response.status);
        }
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("available" in data) || typeof data.available !== "boolean") {
          throw new Error("Username check returned an invalid response");
        }
        if (requestSequence !== usernameCheckSequenceRef.current) return;
        setUsernameCheck(data.available ? "free" : "taken");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestSequence !== usernameCheckSequenceRef.current) return;
        console.error("[LandingPage] Username availability check failed", error);
        setUsernameCheck("error");
      } finally {
        if (usernameRequestRef.current === controller) {
          usernameRequestRef.current = null;
        }
      }
    }, 500);
  }, []);

  useEffect(
    function () {
      checkUsername(watchedUsername);
    },
    [watchedUsername, checkUsername]
  );

  useEffect(function () {
    return function () {
      usernameCheckSequenceRef.current += 1;
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
      usernameRequestRef.current?.abort();
    };
  }, []);

  useEffect(
    function () {
      if (authIsLoaded && isSignedIn) {
        completeSessionNavigation(ROUTES.HOME);
      }
    },
    [authIsLoaded, isSignedIn]
  );

  const showAuth = useCallback(function (nextMode: AuthMode) {
    setMode(nextMode);
    window.requestAnimationFrame(function () {
      authAsideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const onSignupSubmit = async function (data: SignupValues) {
    if (!signUpLoaded || !clerkSignUpObject) return;
    if (usernameCheck !== "free") {
      setSignupError("Choose an available username before creating your account.");
      return;
    }

    setSignupError(null);
    setIsSignupLoading(true);
    const result = await clerkSignUp(clerkSignUpObject, {
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

    const query = new URLSearchParams();
    query.set("email", data.email.trim());
    router.push(ROUTES.AUTH_VERIFY + "?" + query.toString());
  };

  const onLoginSubmit = async function (data: LoginValues) {
    if (!signInLoaded || !clerkSignInObject || !setActive) return;

    setLoginError(null);
    setIsLoginLoading(true);
    const result = await clerkSignIn(clerkSignInObject, {
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

    await setActive({ session: clerkSignInObject.createdSessionId });
    completeSessionNavigation(ROUTES.HOME);
  };

  const usernameIsBlocked =
    usernameCheck === "checking" ||
    usernameCheck === "taken" ||
    usernameCheck === "short" ||
    usernameCheck === "error";

  return (
    <main className={styles.root}>
      <div className={styles.backdropTexture} aria-hidden />
      <div className={styles.shell}>
        <LandingHero
          onJoin={function () {
            showAuth("signup");
          }}
          onLogin={function () {
            showAuth("login");
          }}
        />

        <aside ref={authAsideRef} id="landing-auth" className={styles.authAside} aria-label="Account access">
          <LandingAuthPanel
            mode={mode}
            setMode={setMode}
            signupForm={signupForm}
            loginForm={loginForm}
            signupError={signupError}
            loginError={loginError}
            usernameCheck={usernameCheck}
            usernameStatus={usernameStatusLabel(usernameCheck)}
            usernameIsBlocked={usernameIsBlocked}
            showSignupPassword={showSignupPassword}
            showLoginPassword={showLoginPassword}
            setShowSignupPassword={setShowSignupPassword}
            setShowLoginPassword={setShowLoginPassword}
            isSignupLoading={isSignupLoading}
            isLoginLoading={isLoginLoading}
            onSignupSubmit={onSignupSubmit}
            onLoginSubmit={onLoginSubmit}
          />

          <footer className={styles.footer}>
            <span>© 35mm.in</span>
            <nav aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/help">Help</Link>
            </nav>
          </footer>
        </aside>
      </div>
    </main>
  );
}
