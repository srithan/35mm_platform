"use client";

import Link from "next/link";
import { Check, ExternalLink, Upload } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export function UploadSuccess({
  title,
  filmId,
  visibility,
  scheduled,
  onReset,
}: {
  title: string;
  filmId: string;
  visibility: string;
  scheduled: boolean;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-elevated px-6 py-12 text-center shadow-sm sm:px-10 sm:py-14 animate-fade-up">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00e896] to-success text-white shadow-lg shadow-success/30">
        <Check className="h-9 w-9" strokeWidth={2.5} aria-hidden />
      </div>
      <h2 className="font-display text-[clamp(1.75rem,4vw,2rem)] font-semibold tracking-tight text-fg">
        Your film is{" "}
        <em className="not-italic text-accent">{scheduled ? "scheduled!" : "published!"}</em>
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-fg-muted">
        <strong className="font-semibold text-fg">{title}</strong> {scheduled ? "is scheduled for release." : visibility === "private" ? "is private. Only you can watch it." : visibility === "unlisted" ? "is unlisted. Share its link with your audience." : "is ready to watch in Short films."}
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <Link
          href={`${ROUTES.SEVENTY_MM}/${filmId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-sunken px-5 py-3 text-[14px] font-semibold text-fg-muted transition hover:bg-sunken-2 hover:text-fg"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
          View your film
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-fg px-6 py-3 text-[14px] font-bold text-bg shadow-lg shadow-fg/10 transition hover:-translate-y-0.5 hover:opacity-90"
        >
          <Upload className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          Upload another
        </button>
      </div>
    </div>
  );
}
