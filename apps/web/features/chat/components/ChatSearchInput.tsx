"use client";

import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";

interface ChatSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export function ChatSearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
  inputClassName,
  autoFocus = false,
  ariaLabel = "Search",
}: ChatSearchInputProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-sunken px-3 py-2 focus-within:ring-2 focus-within:ring-[#007AFF]/25 focus-within:border-[#007AFF]/35 transition-shadow",
        className
      )}
    >
      <Icon name="search" className="w-4 h-4 text-fg-muted shrink-0" strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={function (e) {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={cn(
          "flex-1 min-w-0 bg-transparent text-[16px] text-fg placeholder:text-fg-muted focus:outline-none select-text",
          inputClassName
        )}
        aria-label={ariaLabel}
      />
    </div>
  );
}
