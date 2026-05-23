"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renders children into `document.body` after mount (SSR-safe). */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(function () {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}
