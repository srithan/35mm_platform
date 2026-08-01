"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Modal } from "@/components/Modal/Modal";

interface AvatarViewerProps {
  open: boolean;
  onClose: () => void;
  src?: string | null;
  initial?: string;
  displayName?: string;
}

export function AvatarViewer({
  open,
  onClose,
  src,
  initial,
  displayName,
}: AvatarViewerProps) {
  const label = displayName ? displayName + "'s profile photo" : "Profile photo";

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="lightbox"
      animated={false}
      ariaLabel={label}
      contentClassName="max-w-none border-0 bg-transparent shadow-none overflow-visible"
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-4 top-4 z-[calc(var(--z-modal-lightbox)+1)] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-black/60 sm:right-6 sm:top-6"
        aria-label="Close"
      >
        <X className="w-5 h-5" strokeWidth={2} />
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative flex flex-col items-center gap-4 pt-12"
      >
        <div
          className={cn(
            "w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl",
            !src && "bg-white/15 flex items-center justify-center"
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={label}
              width={320}
              height={320}
              className="w-full h-full object-cover"
              priority
            />
          ) : (
            <span className="text-white font-display font-semibold text-[72px] sm:text-[80px] md:text-[96px] select-none">
              {initial || "?"}
            </span>
          )}
        </div>
        {displayName && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-white/70 text-[14px] font-display font-medium tracking-wide"
          >
            {displayName}
          </motion.p>
        )}
      </motion.div>
    </Modal>
  );
}
