"use client";

import { cn } from "@/lib/utils/cn";

export function UploadFormField({
  label,
  required,
  optional,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 last:mb-0", className)}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="text-[13px] font-semibold text-fg">
          {label}
          {required ? <span className="text-accent ml-0.5">*</span> : null}
        </label>
        {optional ? (
          <span className="text-[11px] font-medium text-fg-faint">Optional</span>
        ) : null}
        {hint && !optional ? (
          <span className="text-[11px] font-medium text-fg-faint">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function uploadInputClass(hasError?: boolean) {
  return cn(
    "w-full text-[14px] text-fg bg-sunken border border-transparent rounded-xl px-3.5 py-3",
    "placeholder:text-fg-faint transition-all duration-200",
    "focus:outline-none focus:border-accent/40 focus:bg-elevated focus:ring-[3px] focus:ring-accent/10",
    hasError ? "border-accent/50" : ""
  );
}

export function CharCount({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  return (
    <p className="mt-1.5 text-[11px] text-fg-faint text-right tabular-nums">
      {current}/{max}
    </p>
  );
}
