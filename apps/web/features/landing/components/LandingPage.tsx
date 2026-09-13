"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AuthModal, type AuthModalMode } from "@/features/auth/components/AuthModal";
import { ROUTES } from "@/lib/constants/routes";
import { LandingHero } from "./LandingHero";
import styles from "./LandingPage.module.css";

type LandingAuthState = {
  open: boolean;
  mode: AuthModalMode;
};

function completeSessionNavigation(path: string) {
  window.location.assign(path);
}

export function LandingPage() {
  const { isLoaded: authIsLoaded, isSignedIn } = useAuth();
  const [auth, setAuth] = useState<LandingAuthState>({
    open: false,
    mode: "signup",
  });

  useEffect(
    function () {
      if (authIsLoaded && isSignedIn) {
        completeSessionNavigation(ROUTES.HOME);
      }
    },
    [authIsLoaded, isSignedIn],
  );

  const showAuth = useCallback(function (mode: AuthModalMode) {
    setAuth({ open: true, mode });
  }, []);

  const closeAuth = useCallback(function () {
    setAuth(function (previous) {
      return { ...previous, open: false };
    });
  }, []);

  return (
    <main className={styles.root}>
      <LandingHero
        onJoin={function () {
          showAuth("signup");
        }}
        onLogin={function () {
          showAuth("login");
        }}
      />

      <AuthModal
        open={auth.open}
        onClose={closeAuth}
        initialMode={auth.mode}
        headline={
          auth.mode === "signup"
            ? "The film ends. Your circle keeps talking."
            : "Welcome back to the conversation."
        }
        message={
          auth.mode === "signup"
            ? "Log films, build lists, and follow the people whose taste you trust."
            : "Pick up where you left off: your watchlist, your people, your takes."
        }
        next={ROUTES.HOME}
      />
    </main>
  );
}
