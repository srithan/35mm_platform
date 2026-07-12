"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ConfirmationStepProps {
  alreadyReported: boolean;
  onClose: () => void;
}

export function ConfirmationStep({ alreadyReported, onClose }: ConfirmationStepProps) {
  var title = alreadyReported ? "You've already reported this" : "Report submitted";
  var body = alreadyReported
    ? "We're on it — our team is already reviewing this. Thanks for looking out for the community."
    : "Thanks for flagging this. We'll review it and let you know if we take action.";

  return (
    <div className="flex flex-col items-center px-2 py-4 text-center">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-success)_14%,var(--elevated))]"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 500, damping: 24 }}
          className="text-success"
        >
          <Check className="h-8 w-8" strokeWidth={2.6} />
        </motion.span>
      </motion.div>

      <h3 className="mt-4 text-[17px] font-semibold text-fg">{title}</h3>
      <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-fg-muted">
        {body}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 h-10 rounded-full border border-border-strong bg-transparent px-6 text-[13px] font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
      >
        Done
      </button>
    </div>
  );
}
