"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
}

export function ImageViewer({ open, onClose, src, alt }: ImageViewerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="lightbox"
      animated={false}
      ariaLabel={alt || "Full-size image"}
      contentClassName="max-w-4xl max-h-[80vh] overflow-hidden"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute -top-2 -right-2 sm:top-0 sm:right-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer border-none"
        aria-label="Close"
      >
        <X className="w-5 h-5" strokeWidth={2} />
      </button>

      <div className="relative w-full rounded-lg overflow-hidden shadow-2xl border border-white/10 mt-2">
        <Image
          src={src}
          alt={alt || "Full-size image"}
          width={1200}
          height={600}
          className="w-full h-full object-contain bg-black"
          unoptimized={shouldLoadRemoteImageUnoptimized(src)}
          priority
        />
      </div>
    </Modal>
  );
}
