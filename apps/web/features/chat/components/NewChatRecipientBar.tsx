"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, CirclePlus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { initialForName } from "@/features/profile/hooks/useCurrentUserProfile";
import { cn } from "@/lib/utils/cn";
import { useNewChat } from "../context/NewChatContext";
import { useChatContactCandidates } from "../hooks/useChatContactCandidates";

export function NewChatRecipientBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    recipientQuery,
    setRecipientQuery,
    startConversationWithContact,
    isCreatingConversation,
    createErrorMessage,
  } = useNewChat();
  const { candidates, isLoading, isError, refetch } = useChatContactCandidates(
    recipientQuery,
    true
  );
  const trimmedQuery = recipientQuery.trim();
  const visibleCandidates = trimmedQuery ? candidates.slice(0, 8) : [];

  useEffect(function () {
    inputRef.current?.focus();
  }, []);

  return (
    <header className="relative shrink-0 border-b border-black/[0.06] bg-bg/95 px-3 py-3 backdrop-blur-md dark:border-white/[0.08]">
      <div className="flex min-h-[48px] items-center gap-2 rounded-full border border-border bg-sunken px-4 shadow-sm">
        <label
          htmlFor="new-chat-recipient"
          className="shrink-0 text-[15px] font-semibold text-fg-muted"
        >
          To:
        </label>
        <input
          ref={inputRef}
          id="new-chat-recipient"
          type="search"
          value={recipientQuery}
          onChange={function (event) {
            setRecipientQuery(event.target.value);
          }}
          placeholder=""
          className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-medium text-fg outline-none placeholder:text-fg-muted"
          aria-label="Search people to message"
          disabled={isCreatingConversation}
        />
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated text-fg-muted transition-colors hover:bg-hover hover:text-fg"
          aria-label="Add people"
          title="Add people"
        >
          <CirclePlus className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {trimmedQuery ? (
        <div className="absolute left-8 top-[calc(100%-0.25rem)] z-20 w-[min(31rem,calc(100%-4rem))] overflow-hidden rounded-2xl border border-border bg-elevated shadow-xl">
          {createErrorMessage ? (
            <p className="border-b border-border px-4 py-2 text-[13px] text-red-600 dark:text-red-400" role="alert">
              {createErrorMessage}
            </p>
          ) : null}
          {isLoading ? (
            <div className="px-4 py-4 text-[13px] text-fg-muted">Loading people...</div>
          ) : isError ? (
            <div className="px-4 py-4">
              <p className="mb-2 text-[13px] text-fg-muted">Could not load your connections.</p>
              <button
                type="button"
                onClick={function () {
                  refetch();
                }}
                className="text-[13px] font-semibold text-[#007AFF]"
              >
                Try again
              </button>
            </div>
          ) : visibleCandidates.length === 0 ? (
            <div className="px-4 py-4 text-[13px] text-fg-muted">No matches.</div>
          ) : (
            <ul className="py-2" role="listbox" aria-label="People you can message">
              {visibleCandidates.map(function (contact, index) {
                return (
                  <li key={contact.userId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === 0}
                      disabled={isCreatingConversation}
                      onClick={function () {
                        startConversationWithContact(contact);
                      }}
                      className={cn(
                        "mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                        index === 0
                          ? "bg-[#007AFF] text-white"
                          : "text-fg hover:bg-hover"
                      )}
                    >
                      <Avatar
                        initial={initialForName(contact.displayName || contact.username)}
                        src={contact.avatarUrl}
                        size="md"
                        className={index === 0 ? "ring-1 ring-white/30" : undefined}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">
                          {contact.displayName}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-[13px]",
                            index === 0 ? "text-white/90" : "text-fg-muted"
                          )}
                        >
                          @{contact.username}
                        </span>
                      </span>
                      {index === 0 ? (
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                          <ChevronRight className="h-5 w-5" strokeWidth={2.4} aria-hidden />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </header>
  );
}
