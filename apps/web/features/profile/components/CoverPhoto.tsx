"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { cn } from "@/lib/utils/cn";

/** Wide cinematic crop (reference ProfileFullHeader__cover: plane · window-seat aerial). */
var COVER_SRC =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1680&q=82";

export function CoverPhoto(props: { isOwnProfile?: boolean }) {
  var isOwnProfile = props.isOwnProfile === true;
  var [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border bg-sunken-2",
          "shadow-[0_1px_2px_rgb(15_23_42/6%)]",
          "min-h-[176px] h-[clamp(11rem,32vw,20.75rem)]",
          isOwnProfile ? null : "cursor-pointer"
        )}
        role={isOwnProfile ? undefined : "button"}
        tabIndex={isOwnProfile ? undefined : 0}
        onClick={
          isOwnProfile
            ? undefined
            : function () {
                setViewerOpen(true);
              }
        }
        onKeyDown={
          isOwnProfile
            ? undefined
            : function (e) {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewerOpen(true);
                }
              }
        }
        aria-label={isOwnProfile ? undefined : "View cover photo"}
      >
        <Image
          src={COVER_SRC}
          alt="Cover"
          fill
          className="object-cover object-[50%_40%]"
          sizes="(min-width: 1280px) min(1348px, 92vw), (min-width: 768px) 92vw, 100vw"
        />
        {isOwnProfile ? (
          <button
            type="button"
            className={
              "absolute bottom-3 right-3 bg-fg/80 border border-white/25 z-[1] " +
              "text-white text-[11px] font-medium px-3 py-1.5 cursor-pointer rounded-lg " +
              "backdrop-blur-[6px] transition-colors hover:bg-fg hover:border-white/35 tracking-[0.02em]"
            }
          >
            Edit cover
          </button>
        ) : null}
      </div>

      <ImageViewer
        open={viewerOpen}
        onClose={function () {
          setViewerOpen(false);
        }}
        src={COVER_SRC}
        alt="Cover photo"
      />
    </>
  );
}
