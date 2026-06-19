"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { UploadSidebar } from "./UploadSidebar";
import { UploadStepIndicator } from "./UploadStepIndicator";
import { UploadSuccess } from "./UploadSuccess";
import { StepFilmDetails } from "./steps/StepFilmDetails";
import { StepFilmFile } from "./steps/StepFilmFile";
import { StepGenreAudience } from "./steps/StepGenreAudience";
import { StepPublish } from "./steps/StepPublish";
import { useShortFilmUploadForm } from "./useShortFilmUploadForm";

export function ShortFilmUploadContent() {
  var upload = useShortFilmUploadForm();

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-6 sm:px-6 md:pb-20 md:pt-10 animate-fade-up">
      <nav
        className="mb-6 flex items-center gap-1.5 text-[13px] text-fg-faint"
        aria-label="Breadcrumb"
      >
        <Link
          href={ROUTES.SHORT_FILMS}
          className="transition hover:text-fg"
        >
          Short films
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="font-medium text-accent">Upload</span>
      </nav>

      <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-[1.1] tracking-tight text-fg">
            Upload your{" "}
            <em className="not-italic text-accent">short film</em>
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
            Share your story with a community of film lovers. Follow the steps
            below — your upload will be ready when we connect the backend.
          </p>
        </div>
        {!upload.isPublished ? (
          <UploadStepIndicator
            currentStep={upload.step}
            checklist={upload.checklist}
          />
        ) : null}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {upload.isPublished ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <UploadSuccess
                  title={upload.form.title}
                  onReset={upload.reset}
                />
              </motion.div>
            ) : upload.step === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <StepFilmFile upload={upload} />
              </motion.div>
            ) : upload.step === 2 ? (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <StepFilmDetails upload={upload} />
              </motion.div>
            ) : upload.step === 3 ? (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <StepGenreAudience upload={upload} />
              </motion.div>
            ) : (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <StepPublish upload={upload} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!upload.isPublished ? (
          <UploadSidebar
            currentStep={upload.step}
            checklist={upload.checklist}
          />
        ) : null}
      </div>
    </div>
  );
}
