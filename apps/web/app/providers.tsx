"use client";

import { QueryClient, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useAuth } from "@clerk/nextjs";
import { Suspense, useEffect, useState } from "react";
import { FlashToastHost } from "@/components/FlashToast";
import { ChatInputFocusProvider } from "@/components/layout/ChatInputFocusContext";
import { ChatSidebarProvider } from "@/features/chat/context/ChatSidebarContext";
import { NewChatProvider } from "@/features/chat/context/NewChatContext";
import {
  setChatAuthGetToken,
  setChatCurrentUserIdGetter,
} from "@/features/chat/api";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { AccentColorProvider } from "@/lib/theme/AccentColorProvider";
import { NotificationSoundPlayer } from "@/features/notifications/components/NotificationSoundPlayer";
import { NotificationTitleBadge } from "@/features/notifications/components/NotificationTitleBadge";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { queryPersister, removePersistedQueryCache } from "@/lib/queryPersister";

const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
const PERSISTED_QUERY_ROOTS = new Set([
  "35mm",
  "profiles",
  "notifications",
  "film-lists",
  "settings",
  "privacy",
  "suggestions",
  "bookmarks",
  "onboarding",
]);

function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  const keyRoot = queryKey[0];
  if (keyRoot === "35mm") {
    return (
      queryKey[1] === "chat" &&
      queryKey[2] !== "messagesInfinite" &&
      queryKey[2] !== "presence"
    );
  }
  return typeof keyRoot === "string" && PERSISTED_QUERY_ROOTS.has(keyRoot);
}

const NotificationRealtimeProvider = dynamic(
  function () {
    return import("@/features/notifications/realtime").then(function (module) {
      return {
        default: module.NotificationRealtimeProvider,
      };
    });
  },
  {
    ssr: false,
  }
);

const ChatRealtimeProvider = dynamic(
  function () {
    return import("@/features/chat/realtime").then(function (module) {
      return {
        default: module.ChatRealtimeProvider,
      };
    });
  },
  {
    ssr: false,
  }
);

const FloatingChatInbox = dynamic(
  function () {
    return import("@/features/chat/components/FloatingChatInbox").then(function (module) {
      return {
        default: module.FloatingChatInbox,
      };
    });
  },
  {
    ssr: false,
  }
);

function ChatProviderShell({
  children,
  onActiveChatIdChange,
}: {
  children: React.ReactNode;
  onActiveChatIdChange: (chatId: string | null) => void;
}) {
  return (
    <ChatSidebarProvider>
      <NewChatProvider>
        <ChatInputFocusProvider>{children}</ChatInputFocusProvider>
        <Suspense fallback={null}>
          <FloatingChatInbox onActiveChatIdChange={onActiveChatIdChange} />
        </Suspense>
      </NewChatProvider>
    </ChatSidebarProvider>
  );
}

function ProvidersWithCurrentUser({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded: isUserLoaded, isSignedIn } = useAuth();
  const [floatingChatId, setFloatingChatId] = useState<string | null>(null);
  const currentUserQuery = useCurrentUserProfile();
  const notificationUserId = currentUserQuery.data?.userId ?? null;
  const isNotificationRealtimeReady = isUserLoaded && Boolean(isSignedIn) && Boolean(notificationUserId);
  const chatRealtimeUserId = currentUserQuery.data?.userId ?? null;
  const isChatRealtimeReady =
    isUserLoaded && Boolean(isSignedIn) && Boolean(chatRealtimeUserId);

  useEffect(
    function () {
      setChatAuthGetToken(function () {
        return getToken();
      });
      return function () {
        setChatAuthGetToken(null);
      };
    },
    [getToken]
  );

  useEffect(
    function () {
      setChatCurrentUserIdGetter(function () {
        return currentUserQuery.data?.userId ?? null;
      });
      return function () {
        setChatCurrentUserIdGetter(null);
      };
    },
    [currentUserQuery.data?.userId]
  );

  useEffect(
    function () {
      if (!isUserLoaded) {
        return;
      }
      const currentUserId = currentUserQuery.data?.userId ?? null;
      const storageKey = "35mm.chat.cacheUserId";
      const previousUserId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(storageKey)
          : null;
      if (!isSignedIn) {
        queryClient.clear();
        removePersistedQueryCache();
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(storageKey);
        }
        return;
      }
      if (!currentUserId) {
        return;
      }
      if (previousUserId && previousUserId !== currentUserId) {
        queryClient.clear();
        removePersistedQueryCache();
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, currentUserId);
      }
    },
    [currentUserQuery.data?.userId, isSignedIn, isUserLoaded, queryClient]
  );

  const chatShell = (
    <ChatProviderShell onActiveChatIdChange={setFloatingChatId}>
      {children}
    </ChatProviderShell>
  );

  return (
    <Suspense fallback={chatShell}>
      <NotificationRealtimeProvider
        enabled={isNotificationRealtimeReady}
        userId={isUserLoaded ? notificationUserId : null}
      >
        <NotificationTitleBadge />
        <NotificationSoundPlayer />
        <FlashToastHost />
        <Suspense fallback={chatShell}>
          <ChatRealtimeProvider
            enabled={isChatRealtimeReady}
            userId={isUserLoaded ? chatRealtimeUserId : null}
            activeThreadId={floatingChatId}
          >
            {chatShell}
          </ChatRealtimeProvider>
        </Suspense>
      </NotificationRealtimeProvider>
    </Suspense>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    function () {
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: QUERY_CACHE_MAX_AGE,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      });
    }
  );
  return (
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: QUERY_CACHE_MAX_AGE,
          buster: process.env.NEXT_PUBLIC_APP_VERSION ?? "",
          dehydrateOptions: {
            shouldDehydrateQuery: function (query) {
              return (
                query.state.status === "success" &&
                shouldPersistQueryKey(query.queryKey)
              );
            },
          },
        }}
      >
        <AccentColorProvider>
          <ProvidersWithCurrentUser>{children}</ProvidersWithCurrentUser>
        </AccentColorProvider>
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
