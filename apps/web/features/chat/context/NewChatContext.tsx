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
import { useCreateConversation } from "../hooks/useChatQueries";
import { NewChatModal } from "../components/NewChatModal";
import type { ProfileConnectionUser } from "@/features/profile/api/profileApi";

type NewChatContextValue = {
  openNewChat: () => void;
};

const NewChatContext = createContext<NewChatContextValue | null>(null);

export function NewChatProvider({ children }: { children: ReactNode }) {
  var [open, setOpen] = useState(false);
  var router = useRouter();
  var createMutation = useCreateConversation();

  var openNewChat = useCallback(function () {
    setOpen(true);
  }, []);

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
            router.push(ROUTES.CHAT_WITH(thread.id));
          },
        }
      );
    },
    [createMutation, router]
  );

  return (
    <NewChatContext.Provider value={{ openNewChat: openNewChat }}>
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
