"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Modal } from "@/components/Modal/Modal";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  swapButtonOrder?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  swapButtonOrder = false,
}: ConfirmDialogProps) {
  const rid = useId();
  const titleId = "confirm-dialog-title-" + rid.replace(/:/g, "");
  const descId = "confirm-dialog-desc-" + rid.replace(/:/g, "");
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirmButton = (
    <button
      key="confirm"
      type="button"
      onClick={function () {
        onConfirm();
        onClose();
      }}
      className={cn(
        "w-full py-3 px-4 rounded-full text-[13.5px] font-semibold tracking-[0.01em] border-none cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated",
        variant === "danger"
          ? "bg-[#ba181b] text-white hover:opacity-90 focus-visible:ring-[#ba181b]/40"
          : "bg-fg text-bg hover:opacity-90 focus-visible:ring-fg/20"
      )}
    >
      {confirmLabel}
    </button>
  );

  const cancelButton = (
    <button
      key="cancel"
      ref={cancelRef}
      type="button"
      onClick={onClose}
      className="w-full py-3 px-4 rounded-full bg-transparent text-fg-muted text-[13.5px] font-semibold tracking-[0.01em] border border-border-strong cursor-pointer transition-all hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/10 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
    >
      {cancelLabel}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      variant="centered"
      animated={false}
      ariaLabelledBy={titleId}
      ariaDescribedBy={description ? descId : undefined}
      initialFocusRef={cancelRef}
      contentClassName="w-[92vw] max-w-[380px] rounded-2xl border border-border bg-elevated shadow-[0_24px_80px_rgba(0,0,0,0.25),0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="px-8 pt-10 pb-4 text-center">
        <h2
          id={titleId}
          className="text-[20px] font-sans font-semibold text-fg leading-snug"
        >
          {title}
        </h2>
        {description && (
          <p
            id={descId}
            className="mt-2 text-[13px] text-fg-muted leading-relaxed font-normal"
          >
            {description}
          </p>
        )}
      </div>

      <div className="px-8 pt-5 pb-8 flex flex-col gap-3">
        {swapButtonOrder ? [cancelButton, confirmButton] : [confirmButton, cancelButton]}
      </div>
    </Modal>
  );
}
