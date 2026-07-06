"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useIsDesktopMd } from "@/lib/hooks/useIsDesktopMd";
import { useCreateConversation } from "../hooks/useChatQueries";
import { NewChatModal } from "../components/NewChatModal";
import type { ProfileConnectionUser } from "@/features/profile/api/profileApi";

type NewChatContextValue = {
  draftOpen: boolean;
  recipientQuery: string;
  openNewChat: (opts?: { presentation?: "draft" | "modal" }) => void;
  closeNewChatDraft: () => void;
  setRecipientQuery: (query: string) => void;
  startConversationWithContact: (contact: ProfileConnectionUser) => void;
  isCreatingConversation: boolean;
  createErrorMessage: string | null;
};

const NewChatContext = createContext<NewChatContextValue | null>(null);

export function NewChatProvider({ children }: { children: ReactNode }) {
  var [open, setOpen] = useState(false);
  var [draftOpen, setDraftOpen] = useState(false);
  var [recipientQuery, setRecipientQuery] = useState("");
  var isDesktop = useIsDesktopMd();
  var router = useRouter();
  var createMutation = useCreateConversation();

  var closeNewChatDraft = useCallback(function () {
    setDraftOpen(false);
    setRecipientQuery("");
  }, []);

  var openNewChat = useCallback(
    function (opts?: { presentation?: "draft" | "modal" }) {
      var presentation =
        opts?.presentation ?? (isDesktop === true ? "draft" : "modal");
      if (presentation === "draft") {
        setOpen(false);
        setDraftOpen(true);
        setRecipientQuery("");
        return;
      }
      setDraftOpen(false);
      setRecipientQuery("");
      setOpen(true);
    },
    [isDesktop]
  );

  var handleSelect = useCallback(
    function (contact: ProfileConnectionUser) {
      createMutation.mutate(
        {
          type: "dm",
          memberIds: [contact.userId],
          member: {
            username: contact.username,
            displayName: contact.displayName,
          },
        },
        {
          onSuccess: function (thread) {
            setOpen(false);
            setDraftOpen(false);
            setRecipientQuery("");
            router.push(ROUTES.CHAT_WITH(thread.id));
          },
        }
      );
    },
    [createMutation, router]
  );

  return (
    <NewChatContext.Provider
      value={{
        draftOpen: draftOpen,
        recipientQuery: recipientQuery,
        openNewChat: openNewChat,
        closeNewChatDraft: closeNewChatDraft,
        setRecipientQuery: setRecipientQuery,
        startConversationWithContact: handleSelect,
        isCreatingConversation: createMutation.isPending,
        createErrorMessage: createMutation.isError
          ? "Could not start this conversation. Try again."
          : null,
      }}
    >
      {children}
      <NewChatModal
        open={open}
        onClose={function () {
          setOpen(false);
        }}
        onSelect={handleSelect}
        isSubmitting={createMutation.isPending}
        errorMessage={
          createMutation.isError
            ? "Could not start this conversation. Try again."
            : null
        }
      />
    </NewChatContext.Provider>
  );
}

export function useNewChat(): NewChatContextValue {
  var ctx = useContext(NewChatContext);
  if (!ctx) {
    throw new Error("useNewChat must be used within NewChatProvider");
  }
  return ctx;
}
