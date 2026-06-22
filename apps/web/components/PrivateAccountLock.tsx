"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function PrivateAccountLock(props: { className?: string }) {
  return (
    <span className={cn("inline-flex align-middle text-fg-muted", props.className)} aria-label="Private account">
      <Lock className="h-[1em] w-[1em]" strokeWidth={1.8} />
    </span>
  );
}
