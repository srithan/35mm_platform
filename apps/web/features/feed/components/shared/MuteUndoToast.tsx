"use client";

import { flashToastSurfaceClass } from "@/components/FlashToast";
import { cn } from "@/lib/utils/cn";

interface MuteUndoToastProps {
  handle: string;
  onUndo: () => void;
}

export function MuteUndoToast({ handle, onUndo }: MuteUndoToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4">
      <div className={cn("pointer-events-auto flex items-center gap-3", flashToastSurfaceClass())}>
        <span className="relative z-[1]">{handle} muted</span>
        <button
          type="button"
          className="relative z-[1] border-none bg-transparent p-0 font-semibold text-fg underline underline-offset-2 opacity-90 transition-opacity hover:opacity-100"
          onClick={onUndo}
        >
          Undo
        </button>
      </div>
    </div>
  );
}
