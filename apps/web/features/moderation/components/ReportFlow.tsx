"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { ApiRequestError } from "@/features/feed/api/http";
import { cn } from "@/lib/utils/cn";
import type { ModerationContentType, ModerationReportReason } from "@35mm/types";
import { reasonLabel } from "../data/reportReasons";
import { useReportContent } from "../hooks/useReportContent";
import { ReasonStep } from "./steps/ReasonStep";
import { ContextStep } from "./steps/ContextStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";

type FlowStep = "reason" | "context" | "done";

interface ReportFlowProps {
  open: boolean;
  onClose: () => void;
  contentType: ModerationContentType;
  contentId: string;
  /** Short human target name for the reason-step subtitle, e.g. "post", "@ava". */
  targetLabel: string;
}

/** Beat before sliding to context so the row's selected state registers. */
var ADVANCE_DELAY_MS = 190;
/** Confirmation dwell before auto-dismiss. */
var AUTO_CLOSE_MS = 2800;

function messageForError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 429) {
      return "You're reporting too quickly. Please try again in a little while.";
    }
    if (error.status === 404) {
      return "This content is no longer available.";
    }
    if (error.status === 401) {
      return "Please sign in to report content.";
    }
    if (error.status === 503) {
      return "We're a bit busy right now. Please try again in a moment.";
    }
    if (error.status === 0) {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    if (error.message) {
      return error.message;
    }
  }
  return "Something went wrong. Please try again.";
}

export function ReportFlow({
  open,
  onClose,
  contentType,
  contentId,
  targetLabel,
}: ReportFlowProps) {
  var [step, setStep] = useState<FlowStep>("reason");
  var [direction, setDirection] = useState(1);
  var [reason, setReason] = useState<ModerationReportReason | null>(null);
  var [details, setDetails] = useState("");
  var [errorMessage, setErrorMessage] = useState<string | null>(null);
  var [alreadyReported, setAlreadyReported] = useState(false);

  var reportMutation = useReportContent();
  var advanceTimer = useRef<number | null>(null);
  var closeTimer = useRef<number | null>(null);

  function clearTimers() {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  useEffect(
    function () {
      if (open) {
        setStep("reason");
        setDirection(1);
        setReason(null);
        setDetails("");
        setErrorMessage(null);
        setAlreadyReported(false);
        reportMutation.reset();
      }
      return clearTimers;
    },
    // Reset only when the modal transitions open; mutation ref is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  function handleSelectReason(next: ModerationReportReason) {
    setReason(next);
    setErrorMessage(null);
    setDirection(1);
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
    }
    advanceTimer.current = window.setTimeout(function () {
      setStep("context");
      advanceTimer.current = null;
    }, ADVANCE_DELAY_MS);
  }

  function handleBack() {
    setDirection(-1);
    setErrorMessage(null);
    setStep("reason");
  }

  async function handleSubmit() {
    if (!reason || reportMutation.isPending) return;
    setErrorMessage(null);
    var trimmed = details.trim();
    try {
      var result = await reportMutation.mutateAsync({
        contentType: contentType,
        contentId: contentId,
        reason: reason,
        details: trimmed.length > 0 ? trimmed : undefined,
      });
      setAlreadyReported(result.alreadyReported);
      setDirection(1);
      setStep("done");
      closeTimer.current = window.setTimeout(function () {
        onClose();
      }, AUTO_CLOSE_MS);
    } catch (error) {
      setErrorMessage(messageForError(error));
    }
  }

  var headerTitle = step === "context" ? "Add context" : "Report";
  var showHeader = step !== "done";

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="dialog"
      variant="centered"
      ariaLabel="Report content"
      initialFocusWithinSelector="[data-report-body]"
      contentClassName="w-[92vw] max-w-[420px] rounded-2xl border border-border bg-elevated shadow-[0_24px_80px_rgba(0,0,0,0.25),0_8px_24px_rgba(0,0,0,0.12)]"
    >
      {showHeader ? (
        <div className="flex items-center gap-2 px-5 pt-4 pb-1">
          {step === "context" ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to reasons"
              className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          ) : (
            <span className="h-8 w-8" aria-hidden />
          )}
          <h2 className="flex-1 text-center text-[15px] font-semibold text-fg">
            {headerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div
        data-report-body
        className={cn(
          "max-h-[calc(100vh-140px)] overflow-y-auto overflow-x-hidden px-5 pb-5",
          showHeader ? "pt-2" : "pt-6"
        )}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === "reason" ? (
              <ReasonStep
                selected={reason}
                onSelect={handleSelectReason}
                targetLabel={targetLabel}
              />
            ) : null}
            {step === "context" ? (
              <ContextStep
                reasonLabel={reason ? reasonLabel(reason) : "this content"}
                details={details}
                onDetailsChange={setDetails}
                onSubmit={handleSubmit}
                isSubmitting={reportMutation.isPending}
                errorMessage={errorMessage}
              />
            ) : null}
            {step === "done" ? (
              <ConfirmationStep alreadyReported={alreadyReported} onClose={onClose} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}
