"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type TextFilterOption = {
  label: string;
  value: string;
};

export function TextFilterMenu({
  align = "start",
  ariaLabel,
  disabled = false,
  onValueChange,
  options,
  triggerClassName,
  triggerLabel,
  value,
}: {
  align?: "start" | "end";
  ariaLabel: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  options: readonly TextFilterOption[];
  triggerClassName?: string;
  triggerLabel: string;
  value: string;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "group relative flex h-9 shrink-0 items-center gap-1.5 rounded-[3px] px-1.5",
          "font-sans text-[12px] font-semibold uppercase leading-none tracking-normal text-fg-muted",
          "outline-none transition-colors duration-150 hover:text-fg focus-visible:text-fg focus-visible:ring-2 focus-visible:ring-accent/35",
          "data-[state=open]:bg-[var(--filter-menu-bg)] data-[state=open]:text-[var(--filter-menu-fg)] disabled:cursor-wait disabled:opacity-50",
          "motion-reduce:transition-none",
          triggerClassName,
        )}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          strokeWidth={2}
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={3}
          collisionPadding={12}
          aria-label={ariaLabel + " options"}
          className={cn(
            "z-50 max-h-[min(430px,var(--radix-dropdown-menu-content-available-height))] min-w-[168px] overflow-y-auto",
            "rounded-[3px] border border-[var(--filter-menu-border)] bg-[var(--filter-menu-bg)] py-1 text-[var(--filter-menu-fg)] shadow-[0_16px_34px_rgba(0,0,0,0.18)]",
          )}
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map(function (option) {
              return (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex min-h-8 cursor-default select-none items-center px-4 py-0.5",
                    "font-sans text-[13px] font-semibold leading-none outline-none",
                    "transition-colors duration-150 focus:bg-[var(--filter-menu-hover)] data-[state=checked]:text-[var(--filter-menu-active-fg)]",
                    "motion-reduce:transition-none",
                  )}
                >
                  <DropdownMenu.ItemIndicator className="absolute left-1.5 flex items-center">
                    <span className="h-1 w-1 rounded-full bg-[var(--filter-menu-active-fg)]" />
                  </DropdownMenu.ItemIndicator>
                  {option.label}
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
