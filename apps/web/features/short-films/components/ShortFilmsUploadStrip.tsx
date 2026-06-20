"use client";

import Link from "next/link";
import { Clapperboard, Upload } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

export function ShortFilmsUploadStrip() {
  return (
    <section className="mb-0" aria-labelledby="short-films-upload-heading">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-sunken/60",
          "ring-1 ring-black/[0.03]"
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/[0.07] blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <div
            className={cn(
              "relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-[148px]",
              "bg-[#0d0806] ring-1 ring-black/10",
              "shadow-[0_10px_28px_-14px_rgba(0,0,0,0.55)]"
            )}
            aria-hidden
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(194,71,58,0.32),transparent_58%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(80,35,25,0.45),transparent_50%)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <Clapperboard className="h-6 w-6 text-[#faf9f7]/35" strokeWidth={1.5} />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#faf9f7]/30">
                Your film
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
              For filmmakers
            </p>
            <h2
              id="short-films-upload-heading"
              className="mt-1 font-display text-[1.2rem] leading-[1.15] tracking-tight text-fg sm:text-[1.35rem]"
            >
              Share your short film
            </h2>
            <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-fg-muted">
              Upload once, reach cinephiles who actually watch — free on 35mm.
            </p>
          </div>

          <div className="shrink-0 sm:self-center">
            <Link
              href={ROUTES.SHORT_FILMS_UPLOAD}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-5 sm:w-auto",
                "bg-accent text-[13px] font-semibold tracking-[0.01em] text-white no-underline",
                "shadow-[0_6px_20px_-8px_rgba(194,71,58,0.65)]",
                "transition-[transform,filter] duration-150 ease-out",
                "hover:brightness-[1.04] active:scale-[0.97]"
              )}
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              Upload film
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
