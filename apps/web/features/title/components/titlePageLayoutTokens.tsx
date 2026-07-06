import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const MAIN_SECTION_GAP = "flex flex-col gap-12 min-w-0";
export const PANEL = "rounded-sm bg-sunken/80 p-5 md:p-6 dark:bg-sunken/35";

export function TitleSectionTitle(props: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "font-display text-2xl font-semibold leading-none text-fg",
        props.className
      )}
    >
      {props.children}
    </h2>
  );
}
