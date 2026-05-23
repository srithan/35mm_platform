"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Check } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

const OFFLINE_MSG = "You're offline";
const OFFLINE_SUBTEXT = "Some features may be limited until you reconnect.";
const BACK_ONLINE_MSG = "Back online";
const BACK_ONLINE_DURATION_MS = 3500;

export function OfflineStatus() {
  const { isOnline } = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBackOnline(false);
      return;
    }
    if (wasOffline) {
      setShowBackOnline(true);
      const t = setTimeout(() => {
        setShowBackOnline(false);
        setWasOffline(false);
      }, BACK_ONLINE_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOnline && (
          <motion.div
            key="offline"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4 pt-4 pb-3"
          >
            <div
              className="flex w-full max-w-[min(100%,24rem)] items-center gap-3 rounded-lg border border-[#d4a574]/40 bg-[#f5ebe0] px-4 py-3 shadow-[0_4px_12px_rgba(26,25,23,0.08)]"
              style={{
                boxShadow:
                  "0 4px 12px rgba(26,25,23,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d4a574]/30">
                <WifiOff className="h-4.5 w-4.5 text-[#8b6914]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#4a4039]">{OFFLINE_MSG}</p>
                <p className="text-xs text-[#7a7268]">{OFFLINE_SUBTEXT}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackOnline && (
          <motion.div
            key="back-online"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
              mass: 0.6,
            }}
            className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4 pt-4 pb-3"
          >
            <div
              className="flex w-full max-w-[min(100%,20rem)] items-center gap-3 rounded-lg border border-[#9ec99e]/50 bg-[#e8f0e6] px-4 py-2.5 shadow-[0_4px_12px_rgba(26,25,23,0.06)]"
              style={{
                boxShadow:
                  "0 4px 12px rgba(26,25,23,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7fb37f]/40">
                <Check className="h-4 w-4 text-[#2d5a2d]" strokeWidth={2.5} />
              </span>
              <p className="text-sm font-medium text-[#2d4a2d]">{BACK_ONLINE_MSG}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
