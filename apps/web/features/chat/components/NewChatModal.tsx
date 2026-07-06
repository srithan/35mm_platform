"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/Dialog/Dialog";
import { Avatar } from "@/components/Avatar";
import { initialForName } from "@/features/profile/hooks/useCurrentUserProfile";
import { ROUTES } from "@/lib/constants/routes";
import type { ProfileConnectionUser } from "@/features/profile/api/profileApi";
import { useChatContactCandidates } from "../hooks/useChatContactCandidates";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: ProfileConnectionUser) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export function NewChatModal({
  open,
  onClose,
  onSelect,
  isSubmitting = false,
  errorMessage = null,
}: NewChatModalProps) {
  var [search, setSearch] = useState("");
  var searchRef = useRef<HTMLInputElement>(null);
  var { candidates, isLoading, isError, refetch } = useChatContactCandidates(
    search,
    open
  );

  useEffect(
    function () {
      if (!open) {
        setSearch("");
      }
    },
    [open]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New message"
      description="Choose someone you follow or who follows you."
      className="max-w-md"
      contentClassName="p-0 flex flex-col max-h-[min(520px,85vh)]"
      initialFocusRef={searchRef}
    >
      <div className="shrink-0 border-b border-border px-5 py-3 sm:px-6" data-dialog-body>
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={function (event) {
            setSearch(event.target.value);
          }}
          placeholder="Search by name or @username"
          className="w-full rounded-xl border border-[var(--chat-search-border)] bg-[var(--chat-search-bg)] px-3 py-2.5 font-sans text-[16px] text-fg outline-none placeholder:text-fg-muted focus-visible:border-[var(--chat-search-border-focus)] focus-visible:bg-[var(--chat-search-bg-focus)] focus-visible:ring-2 focus-visible:ring-[var(--chat-focus-ring)] md:text-sm"
          aria-label="Search people"
          disabled={isSubmitting}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
        {errorMessage ? (
          <p className="px-3 py-2 text-[13px] text-red-600 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <div className="px-3 py-8 text-center text-[13px] text-fg-muted">Loading people…</div>
        ) : isError ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[13px] text-fg-muted mb-3">Could not load your connections.</p>
            <button
              type="button"
              onClick={function () {
                refetch();
              }}
              className="text-[13px] font-semibold text-[var(--chat-accent)]"
            >
              Try again
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[14px] font-medium text-fg">
              {search.trim() ? "No matches found" : "No connections yet"}
            </p>
            <p className="text-[13px] text-fg-muted mt-1.5 max-w-[260px] mx-auto leading-relaxed">
              {search.trim()
                ? "Try a different name or username."
                : "Follow filmmakers to message them here."}
            </p>
            {!search.trim() ? (
              <Link
                href={ROUTES.SUGGESTIONS_PEOPLE}
                onClick={onClose}
                className="inline-block mt-4 text-[13px] font-semibold text-[var(--chat-accent)] no-underline hover:opacity-80"
              >
                Find people to follow
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-0.5" role="listbox" aria-label="People you can message">
            {candidates.map(function (contact) {
              return (
                <li key={contact.userId}>
                  <button
                    type="button"
                    role="option"
                    disabled={isSubmitting}
                    onClick={function () {
                      onSelect(contact);
                    }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-hover disabled:opacity-60"
                  >
                    <Avatar
                      initial={initialForName(contact.displayName || contact.username)}
                      src={contact.avatarUrl}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-fg">
                        {contact.displayName}
                      </span>
                      <span className="block truncate text-[12px] text-fg-muted">
                        @{contact.username}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
