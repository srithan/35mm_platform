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
          "group relative flex h-12 shrink-0 items-center gap-1.5 px-1",
          "font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted",
          "outline-none transition-colors duration-150 hover:text-fg focus-visible:text-fg",
          "data-[state=open]:text-fg disabled:cursor-wait disabled:opacity-50",
          "after:absolute after:inset-x-1 after:bottom-[-1px] after:h-0.5 after:origin-left after:scale-x-0 after:bg-film-red after:transition-transform after:duration-150",
          "data-[state=open]:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none",
          triggerClassName,
        )}
      >
        <span>{triggerLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
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
            "z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] min-w-[190px] overflow-y-auto",
            "rounded-sm border border-border-strong bg-elevated p-1 text-fg shadow-lg",
          )}
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map(function (option) {
              return (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex min-h-10 cursor-default select-none items-center rounded-[2px] py-1.5 pl-7 pr-3 md:min-h-8 md:py-1",
                    "font-sans text-[13px] font-medium text-fg-muted outline-none",
                    "transition-colors duration-150 focus:bg-hover focus:text-fg data-[state=checked]:text-fg",
                    "motion-reduce:transition-none",
                  )}
                >
                  <DropdownMenu.ItemIndicator className="absolute left-3 flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-film-red" />
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
