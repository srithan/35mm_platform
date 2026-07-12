"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ModerationReportReason } from "@35mm/types";
import { REPORT_REASONS } from "../../data/reportReasons";

interface ReasonStepProps {
  selected: ModerationReportReason | null;
  onSelect: (reason: ModerationReportReason) => void;
  targetLabel: string;
}

export function ReasonStep({ selected, onSelect, targetLabel }: ReasonStepProps) {
  return (
    <div>
      <p className="text-[13px] leading-relaxed text-fg-muted">
        Tell us what&apos;s wrong with {targetLabel}. Your report is anonymous.
      </p>

      <ul
        role="radiogroup"
        aria-label="Report reason"
        className="mt-4 overflow-hidden rounded-xl border border-border"
      >
        {REPORT_REASONS.map(function (option, index) {
          var isSelected = selected === option.value;
          var ReasonIcon = option.icon;
          return (
            <li key={option.value}>
              <motion.button
                type="button"
                role="radio"
                aria-checked={isSelected}
                title={option.description}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 460, damping: 32 }}
                onClick={function () {
                  onSelect(option.value);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60",
                  index > 0 && "border-t border-border",
                  isSelected ? "bg-sunken" : "hover:bg-hover"
                )}
              >
                <ReasonIcon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                    isSelected ? "text-accent" : "text-fg-muted"
                  )}
                  strokeWidth={1.8}
                />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">
                  {option.label}
                </span>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {isSelected ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 28 }}
                        className="text-accent"
                      >
                        <Check className="h-[15px] w-[15px]" strokeWidth={2.6} />
                      </motion.span>
                    ) : (
                      <ChevronRight
                        key="chevron"
                        className="h-[15px] w-[15px] text-fg-faint"
                        strokeWidth={2}
                      />
                    )}
                  </AnimatePresence>
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
