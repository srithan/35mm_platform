"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";
import type { ChatPreview } from "../data/mockChats";
import {
  ChatHeaderMoreMenu,
  type ChatHeaderMenuAction,
} from "./ChatHeaderMoreMenu";
import { ChatSearchInput } from "./ChatSearchInput";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import {
  useSetConversationArchived,
  useDeleteConversation,
} from "../hooks/useChatQueries";

interface ChatMobileHeaderProps {
  chat: ChatPreview;
  conversationArchived?: boolean;
  threadSearchQuery: string;
  onThreadSearchQueryChange: (query: string) => void;
  onThreadSearchPanelOpenChange?: (open: boolean) => void;
}

export function ChatMobileHeader({
  chat,
  conversationArchived = false,
  threadSearchQuery,
  onThreadSearchQueryChange,
  onThreadSearchPanelOpenChange,
}: ChatMobileHeaderProps) {
  const router = useRouter();
  const setArchivedMutation = useSetConversationArchived();
  const deleteConversationMutation = useDeleteConversation();
  const [toast, setToast] = useState<string | null>(null);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [deleteConvoDialogOpen, setDeleteConvoDialogOpen] = useState(false);

  const flash = useCallback(function (text: string): void {
    setToast(text);
    window.setTimeout(function () {
      setToast(null);
    }, 2400);
  }, []);

  const onMenuAction = useCallback(
    function (action: ChatHeaderMenuAction) {
      if (action === "delete") {
        setDeleteConvoDialogOpen(true);
        return;
      }
      if (action === "archive") {
        setArchivedMutation.mutate(
          { chatId: chat.id, archived: true },
          {
            onSuccess: function () {
              flash("Chat archived.");
              router.push(ROUTES.CHAT);
            },
          }
        );
        return;
      }
      if (action === "unarchive") {
        setArchivedMutation.mutate(
          { chatId: chat.id, archived: false },
          {
            onSuccess: function () {
              flash("Chat moved to inbox.");
            },
          }
        );
        return;
      }
      if (action === "report") {
        flash("Thanks — we’ll review this chat.");
        return;
      }
      flash("Thanks — we’ll review this chat.");
    },
    [chat.id, flash, router, setArchivedMutation]
  );

  const profileSlug = chat.username.replace(/^@/, "");
  const handle = "@" + profileSlug;

  return (
    <>
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col bg-bg border-b border-border pt-[max(0.5rem,env(safe-area-inset-top))] select-none"
      role="banner"
    >
      <div className="flex items-center justify-between gap-2 px-2 h-12 min-h-[3rem]">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href={ROUTES.CHAT}
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full active:opacity-80 text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
            aria-label="Back to messages"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2} />
          </Link>
          <Link
            href={ROUTES.PROFILE(profileSlug)}
            className="flex w-fit min-w-0 max-w-[min(17rem,calc(100vw-10.5rem))] items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-black/[0.045] dark:hover:bg-white/[0.06] active:scale-[0.99] transition-[transform,background-color] duration-150"
          >
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-[12px] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
              style={{ background: chat.avatarBg, color: chat.avatarColor }}
            >
              {chat.name.charAt(0)}
            </div>
            <div className="min-w-0 text-left">
              <p className="font-semibold text-[15px] text-fg truncate leading-tight tracking-[-0.02em]">
                {chat.name}
              </p>
              <p className="text-[11px] text-fg-muted truncate leading-tight">
                {handle}
              </p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={function () {
              setThreadSearchOpen(function (o) {
                const next = !o;
                onThreadSearchPanelOpenChange?.(next);
                return next;
              });
            }}
            className={cn(
              "p-2 rounded-xl transition-colors",
              threadSearchOpen || threadSearchQuery.trim()
                ? "text-[#007AFF] bg-[#007AFF]/12 dark:bg-[#007AFF]/20"
                : "text-fg-muted hover:text-fg hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            )}
            aria-label="Search in conversation"
            aria-expanded={threadSearchOpen}
          >
            <Icon name="search" className="w-5 h-5" strokeWidth={2} />
          </button>
          <ChatHeaderMoreMenu
            onAction={onMenuAction}
            align="right"
            conversationArchived={conversationArchived}
          />
        </div>
      </div>
      {threadSearchOpen ? (
        <div className="px-2 pb-2">
          <ChatSearchInput
            value={threadSearchQuery}
            onChange={onThreadSearchQueryChange}
            placeholder="Search in conversation"
            autoFocus
            ariaLabel="Search in conversation"
          />
        </div>
      ) : null}
      {toast ? (
        <div
          className="px-3 py-2 text-center text-[12px] font-medium text-[#007AFF] bg-[#007AFF]/[0.08] border-t border-[#007AFF]/15"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </header>
    <ConfirmDialog
      open={deleteConvoDialogOpen}
      onClose={function () {
        setDeleteConvoDialogOpen(false);
      }}
      onConfirm={function () {
        deleteConversationMutation.mutate(chat.id, {
          onSuccess: function () {
            setDeleteConvoDialogOpen(false);
            flash("Conversation deleted.");
            router.push(ROUTES.CHAT);
          },
        });
      }}
      title={"Delete chat with " + chat.name + "?"}
      description={
        "This can't be undone. All messages in this conversation will be removed."
      }
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      swapButtonOrder
    />
    </>
  );
}
