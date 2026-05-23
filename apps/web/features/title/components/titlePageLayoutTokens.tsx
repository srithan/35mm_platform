import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const MAIN_SECTION_GAP = "flex flex-col gap-12 min-w-0";
export const PANEL = "rounded-2xl bg-sunken/50 p-5 md:p-6 dark:bg-sunken/35";

export function TitleSectionTitle(props: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-lg font-bold tracking-[-0.02em] text-fg",
        props.className
      )}
    >
      {props.children}
    </h2>
  );
}
