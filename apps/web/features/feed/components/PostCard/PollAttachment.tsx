"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useVotePoll } from "../../hooks/usePostMutations";
import type { PostCardPoll } from "./types";

interface PollAttachmentProps {
  postId?: string;
  poll: PostCardPoll;
}

function formatPollTime(endsAt: string, isEnded: boolean): string {
  if (isEnded) return "Ended";
  var end = Date.parse(endsAt);
  if (Number.isNaN(end)) return "Live";
  var remaining = Math.max(0, end - Date.now());
  if (remaining < 60_000) return "Ends soon";
  if (remaining < 3_600_000) return `${Math.ceil(remaining / 60_000)}m left`;
  if (remaining < 86_400_000) return `${Math.ceil(remaining / 3_600_000)}h left`;
  return `${Math.ceil(remaining / 86_400_000)}d left`;
}

export function PollAttachment({ postId, poll }: PollAttachmentProps) {
  var voteMutation = useVotePoll();
  var [selectedIds, setSelectedIds] = useState<string[]>(poll.selectedOptionIds);
  var isClosed = poll.isEnded || poll.hasVoted;
  var canVote = Boolean(postId) && !isClosed && selectedIds.length > 0 && !voteMutation.isPending;
  var timeLabel = useMemo(function () {
    return formatPollTime(poll.endsAt, poll.isEnded);
  }, [poll.endsAt, poll.isEnded]);

  function toggleOption(optionId: string) {
    if (isClosed) return;
    if (poll.type === "image") {
      setSelectedIds([optionId]);
      return;
    }
    setSelectedIds(function (current) {
      if (current.includes(optionId)) {
        return current.filter(function (id) {
          return id !== optionId;
        });
      }
      return [...current, optionId].slice(0, poll.options.length);
    });
  }

  function submitVote() {
    if (!postId || !canVote) return;
    voteMutation.mutate({ postId, optionIds: selectedIds });
  }

  return (
    <div
      className="mt-3 rounded-lg border border-border bg-sunken p-3"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-[12px] font-medium text-fg-muted">
        <span>{poll.type === "ranking" ? "Ranking poll" : "Image poll"}</span>
        <span>{poll.totalVotes.toLocaleString()} votes · {timeLabel}</span>
      </div>

      <div
        className={cn(
          "grid gap-2",
          poll.type === "image" && "grid-cols-2"
        )}
      >
        {poll.options.map(function (option) {
          var selectedIndex = selectedIds.indexOf(option.id);
          var isSelected = selectedIndex >= 0;
          var percent = poll.resultsVisible ? option.percent ?? 0 : null;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed}
              onClick={() => toggleOption(option.id)}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-md border border-border bg-bg text-left transition-colors",
                isSelected && "border-accent bg-accent/[0.06]",
                !isClosed && "hover:border-accent/60",
                poll.type === "image" ? "p-2" : "px-3 py-2.5"
              )}
            >
              {poll.resultsVisible && percent != null ? (
                <span
                  className="absolute inset-y-0 left-0 bg-accent/10"
                  style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                  aria-hidden
                />
              ) : null}
              <span className="relative z-10 flex min-w-0 gap-2">
                {poll.type === "image" && option.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="h-24 w-full rounded-[4px] object-cover"
                  />
                ) : null}
              </span>
              <span className="relative z-10 mt-2 flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-fg">
                  {poll.type === "ranking" && isSelected ? `${selectedIndex + 1}. ` : ""}
                  {option.label || "Option"}
                </span>
                {poll.resultsVisible && percent != null ? (
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-fg">
                    {percent.toFixed(percent % 1 === 0 ? 0 : 1)}%
                  </span>
                ) : isSelected ? (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                    {poll.type === "ranking" ? selectedIndex + 1 : "✓"}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {!poll.resultsVisible ? (
        <p className="mt-2 text-[12px] text-fg-muted">
          {poll.resultsVisibility === "after_end" ? "Results after poll ends." : "Vote to see results."}
        </p>
      ) : null}

      {!isClosed ? (
        <button
          type="button"
          disabled={!canVote}
          onClick={submitVote}
          className={cn(
            "mt-3 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
            canVote
              ? "bg-fg text-bg hover:opacity-90"
              : "cursor-not-allowed bg-sunken-2 text-fg-faint"
          )}
        >
          {voteMutation.isPending ? "Voting" : "Vote"}
        </button>
      ) : null}
    </div>
  );
}
