"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChatMessageReaction } from "../types";
import styles from "./ChatReactions.module.css";

interface ChatMessageReactionsProps {
  reactions: ChatMessageReaction[] | undefined;
  isOwn: boolean;
  onToggle: (emoji: string) => void;
}

function visibleReactions(
  reactions: ChatMessageReaction[] | undefined
): ChatMessageReaction[] {
  return (reactions || []).filter(function (reaction) {
    return reaction.count > 0;
  });
}

export function ChatMessageReactions({
  reactions,
  isOwn,
  onToggle,
}: ChatMessageReactionsProps) {
  const list = useMemo(
    function () {
      return visibleReactions(reactions);
    },
    [reactions]
  );
  const countsSignature = useMemo(
    function () {
      return list
        .map(function (reaction) {
          return reaction.emoji + ":" + String(reaction.count);
        })
        .join("|");
    },
    [list]
  );
  const [poppedEmoji, setPoppedEmoji] = useState<string | null>(null);
  const prevCountsRef = useRef<Record<string, number>>({});
  const skipPopRef = useRef(true);

  useEffect(
    function () {
      var nextCounts: Record<string, number> = {};
      list.forEach(function (reaction) {
        nextCounts[reaction.emoji] = reaction.count;
      });

      if (skipPopRef.current) {
        skipPopRef.current = false;
        prevCountsRef.current = nextCounts;
        return;
      }

      var nextPopped: string | null = null;
      list.forEach(function (reaction) {
        var prev = prevCountsRef.current[reaction.emoji] ?? 0;
        if (reaction.count > prev) {
          nextPopped = reaction.emoji;
        }
      });
      prevCountsRef.current = nextCounts;
      if (!nextPopped) {
        return;
      }
      setPoppedEmoji(nextPopped);
      var timer = window.setTimeout(function () {
        setPoppedEmoji(null);
      }, 280);
      return function () {
        window.clearTimeout(timer);
      };
    },
    [countsSignature, list]
  );

  if (list.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        styles.anchor,
        isOwn ? styles.anchorOwn : styles.anchorOther
      )}
    >
      <div
        className={cn(
          styles.pill,
          list.length === 1 && list[0].count <= 1 && styles.pillCircle
        )}
        role="group"
        aria-label="Message reactions"
      >
        {list.map(function (reaction) {
          var label =
            reaction.emoji +
            ", " +
            String(reaction.count) +
            (reaction.count === 1 ? " reaction" : " reactions") +
            (reaction.includesMe ? ", including you" : "");
          return (
            <button
              key={reaction.emoji}
              type="button"
              className={cn(
                styles.chip,
                reaction.includesMe && styles.chipActive
              )}
              aria-label={label}
              aria-pressed={reaction.includesMe}
              onClick={function () {
                onToggle(reaction.emoji);
              }}
            >
              <span
                className={cn(
                  styles.emoji,
                  poppedEmoji === reaction.emoji && styles.emojiPop
                )}
                aria-hidden
              >
                {reaction.emoji}
              </span>
              {reaction.count > 1 ? (
                <span className={styles.count} aria-hidden>
                  {reaction.count > 9 ? "9+" : reaction.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function hasVisibleReactions(
  reactions: ChatMessageReaction[] | undefined
): boolean {
  return visibleReactions(reactions).length > 0;
}
