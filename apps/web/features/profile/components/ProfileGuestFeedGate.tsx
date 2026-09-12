"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthPrompt } from "@/features/auth/components/AuthPromptProvider";
import { PostCardSkeleton } from "@/features/feed/components/InfinitePostList";
import { cn } from "@/lib/utils/cn";

/**
 * Bottom-of-feed gate shown to signed-out viewers on profile post/repost tabs.
 * The API only returns a short teaser page to guests, so this sits where the
 * infinite-scroll trigger would be and nudges the viewer to sign up.
 *
 * A fixed bottom banner mirrors the CTA while the in-feed gate is off-screen,
 * so the prompt is visible even before the guest scrolls.
 */
export function ProfileGuestFeedGate({
  displayName,
  username,
}: {
  displayName?: string;
  username: string;
}) {
  var { promptLogin } = useAuthPrompt();
  var name = displayName ?? username;
  var gateRef = useRef<HTMLElement>(null);
  var [gateInView, setGateInView] = useState(false);
  var [mounted, setMounted] = useState(false);
  var [columnRect, setColumnRect] = useState<{ left: number; width: number } | null>(null);

  useEffect(function () {
    setMounted(true);
  }, []);

  // Keep the fixed banner aligned with the feed column so it reads as part of
  // the timeline (like X) rather than a full-width app bar.
  useEffect(function () {
    var el = gateRef.current;
    if (!el) return;
    var measure = function () {
      var node = gateRef.current;
      if (!node) return;
      var rect = node.getBoundingClientRect();
      setColumnRect(function (prev) {
        if (prev && prev.left === rect.left && prev.width === rect.width) return prev;
        return { left: rect.left, width: rect.width };
      });
    };
    measure();
    window.addEventListener("resize", measure);
    var resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);
      resizeObserver.observe(document.body);
    }
    return function () {
      window.removeEventListener("resize", measure);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  useEffect(function () {
    var el = gateRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    var observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry) return;
        setGateInView(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return function () {
      observer.disconnect();
    };
  }, []);

  var openSignup = function () {
    promptLogin({
      mode: "signup",
      title: `See ${name}'s full profile`,
      message: "Create a free account to keep reading.",
    });
  };
  var openLogin = function () {
    promptLogin({ mode: "login" });
  };

  var renderContinueCta = function (className: string) {
    return (
      <button
        type="button"
        className={cn(
          "relative inline-flex h-11 items-center justify-center rounded-full bg-fg px-6 text-[14px] font-semibold text-bg transition-colors hover:opacity-90",
          className
        )}
        onClick={openSignup}
      >
        {/*
          Two copies of the label share one centered anchor: the invisible
          in-flow copy sizes the button and hosts the finger (which must
          overflow the pill), while the clipped overlay copy is the visible
          text and hosts the ripples (which must stay inside the pill).
        */}
        <span className="invisible relative" aria-hidden>
          Continue to 35mm
          <span
            className="guest-gate-finger visible pointer-events-none absolute -bottom-[1.2rem] -right-[1.3rem] inline-block text-[30px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
          >
            👆
          </span>
        </span>
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
          <span className="relative">
            Continue to 35mm
            <span
              className="guest-gate-ripple pointer-events-none absolute -right-[7px] bottom-[10px] h-14 w-14 rounded-full bg-bg"
              aria-hidden
            />
            <span
              className="guest-gate-ripple guest-gate-ripple--late pointer-events-none absolute -right-[7px] bottom-[10px] h-9 w-9 rounded-full bg-bg"
              aria-hidden
            />
          </span>
        </span>
      </button>
    );
  };

  return (
    <>
      <section
        ref={gateRef}
        className="relative mt-1 overflow-hidden pb-10"
        aria-label={`Sign up to see ${name}'s full profile`}
        data-testid="profile-guest-feed-gate"
      >
        <div className="pointer-events-none select-none" aria-hidden>
          <PostCardSkeleton className="mb-0 animate-none opacity-90" />
          <PostCardSkeleton showFilm className="mb-0 animate-none opacity-60" />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--color-bg) 62%, var(--color-bg) 100%)",
          }}
          aria-hidden
        />
        <div className="relative -mt-24 flex flex-col items-center px-6 text-center">
          <h3 className="font-display-discover text-[26px] leading-tight text-fg">
            See {name}&rsquo;s full profile
          </h3>
          <p className="mt-2 max-w-[360px] text-[14px] leading-relaxed text-fg-muted">
            Join 35mm to read every post, log films, and follow along.
          </p>
          {renderContinueCta("mt-5 w-full max-w-[420px]")}
          <button
            type="button"
            className="mt-3 text-[13px] font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
            onClick={openLogin}
          >
            Already have an account? Log in
          </button>
        </div>
      </section>

      {mounted
        ? createPortal(
            <div
              role="region"
              aria-label={`See ${name}'s full profile`}
              aria-hidden={gateInView}
              data-testid="profile-guest-sticky-banner"
              className={cn(
                "fixed z-30",
                "bottom-[calc(max(0.625rem,env(safe-area-inset-bottom,0px))+3.75rem)] md:bottom-0",
                "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                gateInView || !columnRect
                  ? "pointer-events-none translate-y-4 opacity-0"
                  : "translate-y-0 opacity-100"
              )}
              style={
                columnRect
                  ? { left: `${columnRect.left}px`, width: `${columnRect.width}px` }
                  : { left: 0, right: 0 }
              }
            >
              <div
                className="pointer-events-none h-16"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%)",
                }}
                aria-hidden
              />
              <div className="flex flex-col items-center bg-bg px-6 pb-5 pt-1 text-center">
                <p className="font-display-discover text-[22px] leading-tight text-fg">
                  See {name}&rsquo;s full profile
                </p>
                {renderContinueCta("mt-3.5 w-full max-w-[420px]")}
                <button
                  type="button"
                  className="mt-2.5 text-[13px] font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                  onClick={openLogin}
                >
                  Already have an account? Log in
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
