"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

const SCROLL_KEY = "postBackScrollPosition";
const RESTORE_FLAG_KEY = "postBackScrollRestore";
const FROM_PATH_KEY = "postBackFromPath";

export function PostPageBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RESTORE_FLAG_KEY, "1");
      const fromPath = sessionStorage.getItem(FROM_PATH_KEY) || ROUTES.HOME;
      router.push(fromPath);
    } else {
      router.push(ROUTES.HOME);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-2 text-[13px] text-fg-muted hover:text-fg hover:bg-hover active:bg-active border border-border rounded-md px-3 py-2 font-medium transition-colors mt-2 mb-2 w-fit"
      aria-label="Back to feed"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

export function saveScrollPositionForBack() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  sessionStorage.setItem(FROM_PATH_KEY, window.location.pathname);
}

export { SCROLL_KEY, RESTORE_FLAG_KEY, FROM_PATH_KEY };
