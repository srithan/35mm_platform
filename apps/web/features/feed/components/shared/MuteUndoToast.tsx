"use client";

interface MuteUndoToastProps {
  handle: string;
  onUndo: () => void;
}

export function MuteUndoToast({ handle, onUndo }: MuteUndoToastProps) {
  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-3 rounded-full bg-fg px-4 py-2 text-xs font-medium text-bg shadow-lg">
      <span>{handle} muted</span>
      <button
        type="button"
        className="border-none bg-transparent p-0 font-semibold text-bg underline underline-offset-2"
        onClick={onUndo}
      >
        Undo
      </button>
    </div>
  );
}
