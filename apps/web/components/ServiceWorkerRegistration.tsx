"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update();
        })
        .catch(() => {
          // Registration failed; offline fallback won't work
        });
    }
  }, []);

  return null;
}
