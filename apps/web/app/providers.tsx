"use client";

import { QueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { FlashToastHost } from "@/components/FlashToast";
import { ChatInputFocusProvider } from "@/components/layout/ChatInputFocusContext";
import { ChatSidebarProvider } from "@/features/chat/context/ChatSidebarContext";
import { ChatRealtimeProvider } from "@/features/chat/realtime";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { AccentColorProvider } from "@/lib/theme/AccentColorProvider";
import { NotificationSoundPlayer } from "@/features/notifications/components/NotificationSoundPlayer";
import { NotificationTitleBadge } from "@/features/notifications/components/NotificationTitleBadge";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { queryPersister } from "@/lib/queryPersister";

const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
const PERSISTED_QUERY_ROOTS = new Set([
  "feed",
  "profiles",
  "notifications",
  "film-lists",
  "settings",
  "privacy",
  "suggestions",
  "bookmarks",
  "onboarding",
]);

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

function ProvidersWithCurrentUser({ children }: { children: React.ReactNode }) {
  const { isLoaded: isUserLoaded, isSignedIn } = useAuth();
  const currentUserQuery = useCurrentUserProfile();
  const notificationUserId = currentUserQuery.data?.userId ?? null;
  const isNotificationRealtimeReady = isUserLoaded && Boolean(isSignedIn) && Boolean(notificationUserId);

  return (
    <NotificationRealtimeProvider
      enabled={isNotificationRealtimeReady}
      userId={isUserLoaded ? notificationUserId : null}
    >
      <NotificationTitleBadge />
      <NotificationSoundPlayer />
      <FlashToastHost />
      <ChatRealtimeProvider>
        <ChatSidebarProvider>
          <ChatInputFocusProvider>{children}</ChatInputFocusProvider>
        </ChatSidebarProvider>
      </ChatRealtimeProvider>
    </NotificationRealtimeProvider>
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
              const keyRoot = query.queryKey[0];

              return (
                query.state.status === "success" &&
                typeof keyRoot === "string" &&
                PERSISTED_QUERY_ROOTS.has(keyRoot)
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
