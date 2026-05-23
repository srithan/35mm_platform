"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export function TitleCoverBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={function () {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(ROUTES.DISCOVER);
      }}
      className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/35 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm transition-colors hover:bg-black/45 md:left-4 md:top-4"
      aria-label="Back to previous page"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      Back
    </button>
  );
}
