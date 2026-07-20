"use client";

import { cn } from "@/lib/utils/cn";
import { RichTextRenderer } from "@/lib/utils/RichTextRenderer";
import { isStoredRichText } from "@/lib/utils/richContent";
import { RichPostBodyWithFilmRef, RichPostInline } from "@/lib/utils/richPostText";
import { ROUTES } from "@/lib/constants/routes";
import { useRouter } from "next/navigation";
import type { PostVariant } from "./types";

interface PostCardBodyTextProps {
  variant: PostVariant;
  headline?: string;
  cleanedText: string;
  filmRef?: string;
  stopRichLinkBubble: boolean;
  postBodyTextClassName: string;
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
  postBodyTextClassName,
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
            <p className={postBodyTextClassName}>
              {isStoredRichText(cleanedText) && truncatedText == null ? (
                <RichTextRenderer
                  stored={cleanedText}
                  stopLinkPropagation={stopRichLinkBubble}
                />
              ) : (
                <RichPostBodyWithFilmRef
                  text={truncatedText ?? cleanedText}
                  filmRef={filmRef}
                  stopLinkPropagation={stopRichLinkBubble}
                />
              )}
              {truncatedText != null && isOverflowing ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="inline border-none bg-transparent p-0 font-[inherit] font-bold text-social-accent transition-colors hover:text-social-accent-hover"
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
