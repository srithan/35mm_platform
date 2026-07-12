"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { REPORT_DETAILS_MAX } from "../../data/reportReasons";

/** Counter stays hidden until the user nears the cap, then fades in. */
var COUNTER_REVEAL_AT = REPORT_DETAILS_MAX - 200;

interface ContextStepProps {
  reasonLabel: string;
  details: string;
  onDetailsChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function ContextStep({
  reasonLabel,
  details,
  onDetailsChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: ContextStepProps) {
  var textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(function () {
    var node = textareaRef.current;
    if (node) {
      node.focus({ preventScroll: true });
    }
  }, []);

  var remaining = REPORT_DETAILS_MAX - details.length;
  var showCounter = details.length >= COUNTER_REVEAL_AT;

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-fg-muted">
        Reporting for{" "}
        <span className="font-semibold text-fg">{reasonLabel}</span>. Add anything that
        helps our team understand the problem.
      </p>

      <div className="mt-4">
        <label htmlFor="report-details" className="sr-only">
          Give us more context
        </label>
        <textarea
          id="report-details"
          ref={textareaRef}
          value={details}
          maxLength={REPORT_DETAILS_MAX}
          onChange={function (event) {
            onDetailsChange(event.target.value);
          }}
          rows={4}
          placeholder="Give us more context (optional)"
          className={cn(
            "w-full resize-none rounded-xl border border-border bg-sunken px-3.5 py-3 text-[14px] leading-relaxed text-fg",
            "placeholder:text-fg-faint",
            "transition-colors duration-150",
            "focus:border-accent focus:bg-elevated focus-visible:outline-none"
          )}
        />
        <div className="mt-1.5 flex min-h-[16px] items-center justify-end">
          {showCounter ? (
            <span
              className={cn(
                "text-[11px] font-medium tabular-nums transition-colors",
                remaining <= 0 ? "text-warning" : "text-fg-faint"
              )}
            >
              {remaining} characters left
            </span>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-1 rounded-lg border border-[color-mix(in_srgb,var(--color-warning)_45%,var(--border))] bg-[color-mix(in_srgb,var(--color-warning)_10%,var(--elevated))] px-3 py-2 text-[12.5px] leading-snug text-fg"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className={cn(
          "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-bg",
          "transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated",
          "disabled:cursor-not-allowed disabled:opacity-70"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
            <span>Submitting</span>
          </>
        ) : (
          <span>Submit report</span>
        )}
      </button>
    </div>
  );
}
