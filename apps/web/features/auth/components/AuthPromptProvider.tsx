"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthModal, type AuthModalMode } from "./AuthModal";

export interface AuthPromptOptions {
  /** Which form opens first. Defaults to `login`. */
  mode?: AuthModalMode;
  /** Headline for the decor column. Defaults to per-mode copy. */
  title?: string;
  /** Supporting line for the decor column (e.g. why auth is needed). */
  message?: string;
  /** Path to return to after auth. Defaults to the current location. */
  next?: string;
}

interface AuthPromptContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Opens the auth modal (login by default; pass `mode: "signup"` for sign-up). */
  promptLogin: (options?: AuthPromptOptions) => void;
  /**
   * Runs `action` when the viewer is signed in, otherwise opens the prompt.
   * No-ops while Clerk is still loading to avoid a flash of the modal.
   */
  requireAuth: (action: () => void, options?: AuthPromptOptions) => void;
}

const AuthPromptContext = createContext<AuthPromptContextValue | null>(null);

interface PromptState {
  open: boolean;
  mode: AuthModalMode;
  title: string | null;
  message: string | null;
  next: string;
}

const CLOSED_STATE: PromptState = {
  open: false,
  mode: "login",
  title: null,
  message: null,
  next: "/",
};

function currentLocationPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<PromptState>(CLOSED_STATE);

  const promptLogin = useCallback(function (options?: AuthPromptOptions) {
    setState({
      open: true,
      mode: options?.mode ?? "login",
      title: options?.title ?? null,
      message: options?.message ?? null,
      next: options?.next ?? currentLocationPath(),
    });
  }, []);

  const closePrompt = useCallback(function () {
    setState(function (prev) {
      return { ...prev, open: false };
    });
  }, []);

  const requireAuth = useCallback(
    function (action: () => void, options?: AuthPromptOptions) {
      if (!isLoaded) return;
      if (isSignedIn) {
        action();
        return;
      }
      promptLogin(options);
    },
    [isLoaded, isSignedIn, promptLogin]
  );

  const value = useMemo<AuthPromptContextValue>(
    function () {
      return {
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        promptLogin,
        requireAuth,
      };
    },
    [isLoaded, isSignedIn, promptLogin, requireAuth]
  );

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <AuthModal
        open={state.open}
        onClose={closePrompt}
        initialMode={state.mode}
        headline={state.title}
        message={state.message}
        next={state.next}
      />
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt(): AuthPromptContextValue {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) {
    throw new Error("useAuthPrompt must be used within an AuthPromptProvider");
  }
  return ctx;
}
