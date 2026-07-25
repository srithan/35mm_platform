"use client";

import { useId, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";
import { Modal, type ModalVariant } from "@/components/Modal/Modal";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  showCloseButton?: boolean;
  variant?: ModalVariant;
  /** Forwarded to Modal — focus first field in the body, not the header close control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  contentClassName,
  containerClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  showCloseButton = true,
  variant = "centered",
  initialFocusRef,
}: DialogProps) {
  const id = useId();
  const titleId = title ? "dialog-title-" + id.replace(/:/g, "") : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant={variant}
      ariaLabel={!title ? "Dialog" : undefined}
      ariaLabelledBy={titleId}
      initialFocusRef={initialFocusRef}
      initialFocusWithinSelector="[data-dialog-body]"
      containerClassName={containerClassName}
      contentClassName={cn(
        "flex w-full max-w-lg flex-col overflow-hidden overscroll-contain",
        variant === "bottomSheet"
          ? "max-h-[min(88dvh,680px)]"
          : "max-h-[calc(100vh-32px)]",
        className
      )}
    >
      {(title || showCloseButton) && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6",
            headerClassName
          )}
        >
          {title && (
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id={titleId}
                className={cn(
                  "text-[15px] font-semibold leading-snug tracking-tight text-fg",
                  titleClassName
                )}
              >
                {title}
              </h2>
              {description && (
                <p
                  className={cn(
                    "mt-1 text-[13px] leading-relaxed text-fg-muted",
                    descriptionClassName
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          )}
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-hover transition-colors shrink-0 -mr-1 -mt-0.5"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
      )}
      <div
        data-dialog-body
        className={cn("min-h-0 overflow-y-auto p-5 sm:p-6", contentClassName)}
      >
        {children}
      </div>
    </Modal>
  );
}
