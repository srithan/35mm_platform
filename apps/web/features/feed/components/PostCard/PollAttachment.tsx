"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { LazyR2Image } from "@/components/LazyR2Image";
import { cn } from "@/lib/utils/cn";
import { useVotePoll } from "../../hooks/usePostMutations";
import {
  applyOptimisticPollVote,
  formatPollTimeRemaining,
  pollCountdownIntervalMs,
} from "../../utils/pollUtils";
import type { PostCardPoll } from "./types";

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("blob:")) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

interface PollAttachmentProps {
  postId?: string;
  poll: PostCardPoll;
}

function PollAttachmentInner({ postId, poll }: PollAttachmentProps) {
  var voteMutation = useVotePoll();
  var [optimisticOptionId, setOptimisticOptionId] = useState<string | null>(null);
  var [timeLabel, setTimeLabel] = useState(function () {
    return formatPollTimeRemaining(poll.endsAt, poll.isEnded);
  });

  var displayPoll = useMemo(function () {
    if (poll.hasVoted || !optimisticOptionId) return poll;
    return applyOptimisticPollVote(poll, [optimisticOptionId]);
  }, [poll, optimisticOptionId]);

  var selectedId = displayPoll.selectedOptionIds[0] ?? null;
  var hasVoted = displayPoll.hasVoted;
  var isEnded = displayPoll.isEnded;
  var showResults = displayPoll.resultsVisible;
  var isImagePoll = displayPoll.type === "image";

  useEffect(function () {
    if (poll.hasVoted) {
      setOptimisticOptionId(null);
    }
  }, [poll.hasVoted]);

  useEffect(function () {
    if (!voteMutation.isError) return;
    setOptimisticOptionId(null);
  }, [voteMutation.isError]);

  useEffect(function () {
    setTimeLabel(formatPollTimeRemaining(displayPoll.endsAt, displayPoll.isEnded));
    if (displayPoll.isEnded) return;

    var intervalMs = pollCountdownIntervalMs(displayPoll.endsAt);
    var timer = window.setInterval(function () {
      setTimeLabel(formatPollTimeRemaining(displayPoll.endsAt, displayPoll.isEnded));
    }, intervalMs);

    return function () {
      window.clearInterval(timer);
    };
  }, [displayPoll.endsAt, displayPoll.isEnded]);

  var handleVote = useCallback(
    function (optionId: string) {
      if (hasVoted || isEnded || optimisticOptionId) return;
      setOptimisticOptionId(optionId);
      if (postId) {
        voteMutation.mutate({ postId: postId, optionIds: [optionId] });
      }
    },
    [hasVoted, isEnded, optimisticOptionId, postId, voteMutation]
  );

  var winningPercent = 0;
  displayPoll.options.forEach(function (opt) {
    if (opt.percent != null && opt.percent > winningPercent) {
      winningPercent = opt.percent;
    }
  });

  var leaderCount = 0;
  if (winningPercent > 0) {
    displayPoll.options.forEach(function (opt) {
      if (opt.percent === winningPercent) {
        leaderCount += 1;
      }
    });
  }
  var hasUniqueWinner = leaderCount === 1;

  function isOptionWinning(percent: number): boolean {
    return showResults && hasUniqueWinner && percent === winningPercent && percent > 0;
  }

  // Image poll layout
  if (isImagePoll) {
    var canVote = !hasVoted && !isEnded;
    
    return (
      <div
        className="mt-3"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        {/* Poll container with clear styling */}
        <div className="rounded-2xl border border-border bg-sunken/50 p-3">
          {/* Poll header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border border-border bg-elevated flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h2v8H3v-8zm6-4h2v12H9V9zm6-4h2v16h-2V5zm6-4h2v20h-2V1z"/>
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-fg">Poll</span>
            </div>
            {!canVote ? (
              <span className="text-[12px] font-medium text-fg-muted">
                {displayPoll.totalVotes.toLocaleString()} votes
              </span>
            ) : null}
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3">
            {displayPoll.options.map(function (option, index) {
              var isSelected = option.id === selectedId;
              var percent = option.percent ?? 0;
              var isWinning = isOptionWinning(percent);
              var label = option.label?.trim() || "Option " + (index + 1);

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={hasVoted || isEnded}
                  onClick={function () {
                    handleVote(option.id);
                  }}
                  className={cn(
                    "group relative rounded-xl overflow-hidden border border-border",
                    "transition-[transform,box-shadow,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    canVote && [
                      "cursor-pointer",
                      "hover:border-border-strong hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
                      "active:scale-[0.98] active:translate-y-0 active:shadow-none",
                    ],
                    isSelected && "border-border-strong ring-2 ring-border-strong"
                  )}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-sunken">
                    {isValidImageUrl(option.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={option.imageUrl!}
                        alt={label}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-sunken text-fg-muted">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}

                    {/* "VOTE" overlay before voting */}
                    {canVote && !isSelected ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <span className="text-white font-bold text-[14px] tracking-wide">VOTE</span>
                      </div>
                    ) : null}

                    {/* Selected indicator */}
                    {isSelected && !showResults ? (
                      <div className="absolute inset-0 bg-fg/10 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-fg flex items-center justify-center shadow-lg">
                          <svg className="w-7 h-7 text-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    ) : null}

                    {/* Results badges — corner overlays, image stays visible */}
                    {showResults ? (
                      <>
                        {isSelected ? (
                          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg shadow-md">
                            <svg className="h-3.5 w-3.5 text-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : null}
                        <div
                          className={cn(
                            "absolute bottom-2 right-2 rounded-lg px-2 py-1 shadow-md backdrop-blur-[2px]",
                            isWinning
                              ? "poll-winner-gradient-bg poll-winner-on-gradient"
                              : "bg-black/70 text-white"
                          )}
                        >
                          <span className={cn(
                            "text-[13px] font-bold tabular-nums leading-none block",
                            !isWinning && "text-white"
                          )}>
                            {percent.toFixed(0)}%
                          </span>
                          {isWinning ? (
                            <span className="text-[9px] font-semibold uppercase tracking-[0.06em] leading-none mt-0.5 block">
                              Winner
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>

                  {/* Label */}
                  <div
                    className={cn(
                      "px-3 py-2 text-center border-t border-border",
                      showResults && isWinning
                        ? "poll-winner-gradient-bg poll-winner-on-gradient"
                        : "bg-elevated text-fg"
                    )}
                  >
                    <span className="text-[13px] font-medium block truncate">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[12px]">
            <span className="text-fg-muted">{timeLabel}</span>
            {hasVoted ? (
              <span className="font-medium text-accent">Your vote</span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Text poll layout
  return (
    <div
      className="mt-3"
      onClick={function (e) {
        e.stopPropagation();
      }}
    >
      <div className="space-y-2">
        {displayPoll.options.map(function (option) {
          var isSelected = option.id === selectedId;
          var percent = option.percent ?? 0;
          var isWinning = isOptionWinning(percent);
          var label = option.label?.trim() || "Option";

          if (showResults) {
            return (
              <div key={option.id} className="relative overflow-hidden rounded-full">
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: "var(--color-poll-track)" }}
                />

                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                  style={{
                    width: percent + "%",
                    background: isWinning ? "var(--gradient-macha)" : "var(--gradient-poll-bar)",
                  }}
                />

                <div className="relative flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <svg
                        className={cn(
                          "w-[18px] h-[18px] shrink-0",
                          isWinning ? "poll-winner-on-gradient" : "text-[var(--color-poll-winner)]"
                        )}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    ) : null}
                    <span
                      className={cn(
                        "text-[15px] truncate",
                        isWinning ? "font-semibold poll-winner-on-gradient" : "text-fg"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[15px] tabular-nums shrink-0 ml-3",
                      isWinning
                        ? cn(
                            "font-semibold",
                            percent >= 88 ? "poll-winner-on-gradient" : "text-fg"
                          )
                        : "text-fg-muted"
                    )}
                  >
                    {percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          }

          var canInteract = !hasVoted && !isEnded;

          return (
            <button
              key={option.id}
              type="button"
              disabled={!canInteract}
              onClick={function () {
                handleVote(option.id);
              }}
              className={cn(
                "group w-full rounded-full border-2 px-4 py-2.5 text-left",
                "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isSelected
                  ? "border-accent bg-accent/[0.08] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                  : "border-border-strong bg-bg",
                canInteract && [
                  "cursor-pointer",
                  "hover:border-accent/45 hover:bg-accent/[0.06] hover:shadow-[0_2px_10px_rgba(0,0,0,0.07)] hover:-translate-y-px",
                  "active:scale-[0.985] active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]",
                ]
              )}
            >
              <span
                className={cn(
                  "text-[15px] transition-colors duration-150",
                  isSelected ? "font-medium text-accent" : "text-fg group-hover:text-fg"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 text-[13px] text-fg-muted">
        {displayPoll.totalVotes.toLocaleString()} vote{displayPoll.totalVotes === 1 ? "" : "s"}
        {timeLabel ? " · " + timeLabel : ""}
        {hasVoted ? " · Your vote" : ""}
      </div>
    </div>
  );
}

export var PollAttachment = memo(PollAttachmentInner, function (prev, next) {
  if (prev.postId !== next.postId) return false;
  if (prev.poll === next.poll) return true;

  var a = prev.poll;
  var b = next.poll;
  return (
    a.id === b.id &&
    a.type === b.type &&
    a.resultsVisibility === b.resultsVisibility &&
    a.endsAt === b.endsAt &&
    a.totalVotes === b.totalVotes &&
    a.hasVoted === b.hasVoted &&
    a.isEnded === b.isEnded &&
    a.resultsVisible === b.resultsVisible &&
    a.selectedOptionIds.join(",") === b.selectedOptionIds.join(",") &&
    a.options.length === b.options.length &&
    a.options.every(function (option, index) {
      var other = b.options[index];
      return (
        option.id === other.id &&
        option.label === other.label &&
        option.imageUrl === other.imageUrl &&
        option.percent === other.percent &&
        option.voteCount === other.voteCount
      );
    })
  );
});
