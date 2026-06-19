"use client";

import { Check, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FILMMAKER_TIPS, UPLOAD_STEPS } from "./constants";
import type { UploadStep } from "./types";

export function UploadSidebar({
  currentStep,
  checklist,
}: {
  currentStep: UploadStep;
  checklist: boolean[];
}) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--site-header-sticky-offset,4.5rem)+1.5rem)]">
      <div className="rounded-2xl border border-border bg-elevated p-5 shadow-sm">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-faint">
          Progress
        </p>
        <ul className="space-y-0">
          {UPLOAD_STEPS.map(function (s, index) {
            var done = checklist[index] === true;
            var active = s.id === currentStep && !done;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex gap-3 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0",
                  active ? "opacity-100" : "opacity-90"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-accent text-white ring-4 ring-accent/10"
                        : "bg-sunken text-fg-faint"
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  ) : (
                    s.id
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">{s.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-fg-faint">{s.hint}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-elevated p-5 shadow-sm">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-faint">
          Filmmaker tips
        </p>
        <ul className="space-y-3">
          {FILMMAKER_TIPS.map(function (tip) {
            return (
              <li key={tip} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10">
                  <Check className="h-2.5 w-2.5 text-accent" strokeWidth={3} aria-hidden />
                </span>
                {tip}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.08] to-accent/[0.03] p-5">
        <div
          className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-accent/10"
          aria-hidden
        />
        <p className="relative text-[14px] font-bold text-accent">Need help?</p>
        <p className="relative mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">
          Our creator support team typically responds within a few hours. Full upload
          guides and walkthroughs are coming soon.
        </p>
        <button
          type="button"
          className="relative mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-elevated/80 px-3.5 py-2 text-[13px] font-semibold text-accent transition hover:bg-elevated hover:shadow-sm"
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
          Creator help center
        </button>
      </div>
    </aside>
  );
}
