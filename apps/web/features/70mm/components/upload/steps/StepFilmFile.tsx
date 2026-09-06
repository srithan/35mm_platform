"use client";

import { ArrowRight } from "lucide-react";
import { VideoDropZone } from "../VideoDropZone";
import type { ShortFilmUploadFormApi } from "../useShortFilmUploadForm";

export function StepFilmFile({ upload }: { upload: ShortFilmUploadFormApi }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-6 shadow-sm sm:p-7">
      <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-faint">
        Step 1 — Your film file
      </p>
      <VideoDropZone upload={upload} />
      <div className="mt-6 flex justify-end border-t border-border pt-5">
        <button
          type="button"
          disabled={!upload.step1Valid}
          onClick={function () {
            upload.goToStep(2);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-[14px] font-bold text-bg shadow-md transition enabled:hover:bg-accent enabled:hover:shadow-lg enabled:hover:shadow-accent/25 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
        >
          Continue
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
