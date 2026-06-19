"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UPLOAD_STEPS } from "./constants";
import type { UploadStep } from "./types";

export function UploadStepIndicator({
  currentStep,
  checklist,
}: {
  currentStep: UploadStep;
  checklist: boolean[];
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2 py-1.5 shadow-sm"
      aria-label={"Upload step " + currentStep + " of 4"}
    >
      {UPLOAD_STEPS.map(function (s, index) {
        var stepNum = s.id as UploadStep;
        var isDone = checklist[index] === true;
        var isActive = stepNum === currentStep && !isDone;
        var sepDone = checklist[index] === true;

        return (
          <div key={s.id} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span
                className={cn(
                  "h-0.5 w-4 rounded-full transition-colors",
                  sepDone ? "bg-success" : "bg-border"
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200",
                isDone
                  ? "bg-success text-white"
                  : isActive
                    ? "bg-accent text-white ring-[3px] ring-accent/15"
                    : "bg-sunken text-fg-faint"
              )}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              ) : (
                stepNum
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
