"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { LazyR2Image } from "@/components/LazyR2Image";
import { cn } from "@/lib/utils/cn";
import { useVotePoll } from "../../hooks/usePostMutations";
import { formatPollTimeRemaining, pollCountdownIntervalMs } from "../../utils/pollUtils";
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
  var [selectedId, setSelectedId] = useState<string | null>(
    poll.selectedOptionIds[0] ?? null
  );
  var [timeLabel, setTimeLabel] = useState(function () {
    return formatPollTimeRemaining(poll.endsAt, poll.isEnded);
  });

  var hasVoted = poll.hasVoted;
  var isEnded = poll.isEnded;
  var showResults = poll.resultsVisible;
  var isImagePoll = poll.type === "image";

  useEffect(function () {
    setSelectedId(poll.selectedOptionIds[0] ?? null);
  }, [poll.selectedOptionIds]);

  useEffect(function () {
    setTimeLabel(formatPollTimeRemaining(poll.endsAt, poll.isEnded));
    if (poll.isEnded) return;

    var intervalMs = pollCountdownIntervalMs(poll.endsAt);
    var timer = window.setInterval(function () {
      setTimeLabel(formatPollTimeRemaining(poll.endsAt, poll.isEnded));
    }, intervalMs);

    return function () {
      window.clearInterval(timer);
    };
  }, [poll.endsAt, poll.isEnded]);

  var handleVote = useCallback(
    function (optionId: string) {
      if (hasVoted || isEnded || voteMutation.isPending) return;
      setSelectedId(optionId);
      if (postId) {
        voteMutation.mutate({ postId: postId, optionIds: [optionId] });
      }
    },
    [hasVoted, isEnded, postId, voteMutation]
  );

  var winningPercent = 0;
  poll.options.forEach(function (opt) {
    if (opt.percent != null && opt.percent > winningPercent) {
      winningPercent = opt.percent;
    }
  });

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
        <div className="rounded-2xl border-2 border-accent/30 bg-accent/[0.03] p-3">
          {/* Poll header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h2v8H3v-8zm6-4h2v12H9V9zm6-4h2v16h-2V5zm6-4h2v20h-2V1z"/>
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-fg">Poll</span>
            </div>
            {canVote ? (
              <span className="text-[12px] font-medium text-accent">Pick one</span>
            ) : (
              <span className="text-[12px] font-medium text-fg-muted">
                {poll.totalVotes.toLocaleString()} votes
              </span>
            )}
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3">
            {poll.options.map(function (option, index) {
              var isSelected = option.id === selectedId;
              var percent = option.percent ?? 0;
              var isWinning = showResults && percent === winningPercent && percent > 0;
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
                    "relative rounded-xl overflow-hidden transition-all",
                    canVote && "cursor-pointer hover:ring-2 hover:ring-accent/50 active:scale-[0.98]",
                    isSelected && canVote && "ring-2 ring-accent"
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
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white font-bold text-[14px] tracking-wide">VOTE</span>
                      </div>
                    ) : null}

                    {/* Selected indicator */}
                    {isSelected && canVote ? (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg">
                          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    ) : null}

                    {/* Results overlay */}
                    {showResults ? (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-2">
                        {isSelected ? (
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center mb-2">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : null}
                        <span className={cn(
                          "text-[28px] tabular-nums font-bold",
                          isWinning ? "text-[#88ce02]" : "text-white"
                        )}>
                          {percent.toFixed(0)}%
                        </span>
                        {isWinning ? (
                          <span className="text-[11px] font-semibold text-[#88ce02] mt-1">WINNER</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Label */}
                  <div className={cn(
                    "px-3 py-2 text-center",
                    showResults && isWinning ? "bg-[#88ce02]/15" : "bg-bg"
                  )}>
                    <span className={cn(
                      "text-[13px] font-medium block truncate",
                      showResults && isWinning ? "text-[#88ce02]" : "text-fg"
                    )}>
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-accent/20 flex items-center justify-between text-[12px]">
            <span className="text-fg-muted">
              {timeLabel}
            </span>
            {voteMutation.isPending ? (
              <span className="text-accent font-medium">Submitting vote...</span>
            ) : canVote && selectedId ? (
              <span className="text-accent font-medium">Tap again to confirm</span>
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
        {poll.options.map(function (option) {
          var isSelected = option.id === selectedId;
          var percent = option.percent ?? 0;
          var isWinning = showResults && percent === winningPercent && percent > 0;
          var label = option.label?.trim() || "Option";

          if (showResults) {
            return (
              <div key={option.id} className="relative overflow-hidden rounded-full">
                {/* Full background bar (grey) */}
                <div 
                  className="absolute inset-0"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.06)" }}
                />
                
                {/* Progress fill */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                  style={{ 
                    width: percent + "%",
                    backgroundColor: isWinning ? "rgba(136, 206, 2, 0.5)" : "rgba(96, 165, 250, 0.4)"
                  }}
                />
                
                {/* Content */}
                <div className="relative flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="#88ce02">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    ) : null}
                    <span className={cn(
                      "text-[15px] truncate",
                      isWinning ? "font-semibold text-fg" : "text-fg"
                    )}>
                      {label}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[15px] tabular-nums shrink-0 ml-3",
                    isWinning ? "font-semibold text-fg" : "text-fg-muted"
                  )}>
                    {percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              type="button"
              disabled={hasVoted || isEnded}
              onClick={function () {
                handleVote(option.id);
              }}
              className={cn(
                "w-full rounded-full border-2 px-4 py-2.5 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-[#cfd9de] dark:border-[#536471] hover:bg-accent/5",
                !hasVoted && !isEnded && "cursor-pointer active:scale-[0.98]"
              )}
            >
              <span className={cn(
                "text-[15px]",
                isSelected ? "font-medium text-accent" : "text-fg"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 text-[13px] text-fg-muted">
        {poll.totalVotes.toLocaleString()} vote{poll.totalVotes === 1 ? "" : "s"}
        {timeLabel ? " · " + timeLabel : ""}
        {voteMutation.isPending ? " · Voting..." : ""}
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
