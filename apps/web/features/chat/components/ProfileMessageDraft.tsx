"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useAuthPrompt } from "@/features/auth/components/AuthPromptProvider";
import { usePublicProfile } from "@/features/profile/hooks/useProfile";
import { ROUTES } from "@/lib/constants/routes";
import { ChatComposer } from "./ChatComposer";
import { ChatList } from "./ChatList";
import { getChatErrorMessage } from "../api/errors";
import { useCreateConversation, useSendMessage } from "../hooks/useChatQueries";
import type { ChatSendPayload } from "../types";

function describePendingMessage(payload: ChatSendPayload): string {
  if (payload.text.trim()) return payload.text.trim();
  if (payload.gifUrl) return "GIF";
  if (payload.imageDataUrl) return "Photo";
  if (payload.file) return payload.file.name;
  return "Message";
}

export function ProfileMessageDraft({ username }: { username: string }) {
  const router = useRouter();
  const { requireAuth } = useAuthPrompt();
  const profileQuery = usePublicProfile(username);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const [pendingPayload, setPendingPayload] = useState<ChatSendPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const isSending = createConversation.isPending || sendMessage.isPending;
  const profile = profileQuery.data;

  const deliver = useCallback(
    async function (payload: ChatSendPayload) {
      if (!profile || isSending) return;
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "profile-message-" + String(Date.now());
      }
      setPendingPayload(payload);
      setErrorMessage(null);
      try {
        const thread = await createConversation.mutateAsync({
          type: "dm",
          memberIds: [profile.userId],
          member: {
            username: profile.username,
            displayName: profile.displayName,
          },
        });
        await sendMessage.mutateAsync({
          chatId: thread.id,
          idempotencyKey: idempotencyKeyRef.current,
          ...payload,
        });
        router.replace(ROUTES.CHAT_WITH(thread.id));
      } catch (error) {
        setErrorMessage(getChatErrorMessage(error, "Could not send message. Try again."));
      }
    },
    [createConversation, isSending, profile, router, sendMessage]
  );

  function handleSend(payload: ChatSendPayload) {
    requireAuth(
      function () {
        void deliver(payload);
      },
      { message: "Log in to send a message." }
    );
  }

  if (profileQuery.isPending && !profile) {
    return <div className="h-full min-h-[50vh] w-full bg-bg" aria-busy="true" />;
  }

  if (!profile || profileQuery.isError) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center bg-bg px-6 text-center">
        <div>
          <p className="text-[15px] font-semibold text-fg">Profile unavailable</p>
          <Link href={ROUTES.CHAT} className="mt-3 inline-block text-[13px] font-semibold text-accent">
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-bg md:grid-cols-[400px_1fr]">
      <div className="hidden min-w-0 overflow-hidden border-r border-border md:block">
        <ChatList />
      </div>

      <section className="flex min-w-0 flex-col overflow-hidden bg-bg" aria-label={`Message ${profile.displayName}`}>
        <header className="flex min-h-[4rem] shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-2 py-2.5 backdrop-blur-md sm:px-3">
          <Link
            href={ROUTES.CHAT}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg md:hidden"
            aria-label="Back to messages"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </Link>
          <Link
            href={ROUTES.PROFILE(profile.username)}
            className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-hover"
          >
            <Avatar
              initial={profile.displayName.charAt(0)}
              src={profile.avatarUrl}
              className="h-10 w-10 text-[14px] shadow-sm ring-1 ring-border"
              loading="eager"
            />
            <span className="min-w-0 text-left">
              <span className="block truncate text-[15px] font-semibold text-fg">
                {profile.displayName}
              </span>
              <span className="block truncate text-[12px] text-fg-muted">
                @{profile.username}
              </span>
            </span>
          </Link>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-4 py-5 sm:px-6">
          {pendingPayload ? (
            <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-[image:var(--chat-own-bubble)] px-4 py-2.5 text-[14px] text-[var(--chat-own-fg)]">
              <p className="whitespace-pre-wrap break-words">{describePendingMessage(pendingPayload)}</p>
              {isSending ? <p className="mt-1 text-right text-[10px] opacity-70">Sending…</p> : null}
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="shrink-0 border-t border-border bg-bg px-4 py-2 text-center" role="alert">
            <span className="text-[12px] text-red-600 dark:text-red-400">{errorMessage}</span>
            {pendingPayload ? (
              <button
                type="button"
                className="ml-2 text-[12px] font-semibold text-accent"
                onClick={function () {
                  void deliver(pendingPayload);
                }}
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}

        <ChatComposer
          onSend={handleSend}
          disabled={isSending}
          isSending={isSending}
          replyingTo={null}
          onCancelReply={function () {}}
        />
      </section>
    </div>
  );
}
