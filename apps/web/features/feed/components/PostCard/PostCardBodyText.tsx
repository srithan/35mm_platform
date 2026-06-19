"use client";

import { cn } from "@/lib/utils/cn";
import { RichPostBodyWithFilmRef, RichPostInline } from "@/lib/utils/richPostText";
import { ROUTES } from "@/lib/constants/routes";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import type { PostVariant } from "./types";

interface PostCardBodyTextProps {
  variant: PostVariant;
  headline?: string;
  cleanedText: string;
  filmRef?: string;
  stopRichLinkBubble: boolean;
  shouldClamp: boolean;
  postBodyTextClassName: string;
  bodyRef: RefObject<HTMLParagraphElement>;
  measureRef: RefObject<HTMLDivElement>;
  truncatedText: string | null;
  isOverflowing: boolean;
  postId?: string;
  username: string;
}

export function PostCardBodyText({
  variant,
  headline,
  cleanedText,
  filmRef,
  stopRichLinkBubble,
  shouldClamp,
  postBodyTextClassName,
  bodyRef,
  measureRef,
  truncatedText,
  isOverflowing,
  postId,
  username,
}: PostCardBodyTextProps) {
  const router = useRouter();

  return (
    <>
      {headline && headline.length > 0 && (
        <h2
          className={cn(
            "text-[17px] sm:text-[18px] font-bold text-fg leading-snug tracking-tight",
            variant === "discussion" ? "mt-2" : "mt-1"
          )}
        >
          <RichPostInline text={headline} stopLinkPropagation={stopRichLinkBubble} />
        </h2>
      )}
      {cleanedText.length > 0 && (
        <div
          className={cn(
            "relative",
            !headline ? "mt-1" : variant === "discussion" ? "mt-1" : "mt-2"
          )}
        >
          <div className="relative">
            {shouldClamp ? (
              <div
                ref={measureRef}
                aria-hidden
                className={cn(
                  "pointer-events-none invisible absolute left-0 top-0 -z-10",
                  postBodyTextClassName
                )}
              />
            ) : null}
            <p
              ref={bodyRef}
              className={cn(postBodyTextClassName, shouldClamp && "overflow-hidden")}
            >
              <RichPostBodyWithFilmRef
                text={truncatedText ?? cleanedText}
                filmRef={filmRef}
                stopLinkPropagation={stopRichLinkBubble}
              />
              {truncatedText != null && isOverflowing ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="inline border-none bg-transparent p-0 font-[inherit] font-bold text-[#0095f6] transition-colors hover:text-[#1877f2]"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!postId) return;
                      router.push(ROUTES.POST(username, postId));
                    }}
                  >
                    more
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
