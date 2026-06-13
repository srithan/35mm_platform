"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { FlashToastHost } from "@/components/FlashToast";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { NotificationSoundPlayer } from "@/features/notifications/components/NotificationSoundPlayer";
import { NotificationTitleBadge } from "@/features/notifications/components/NotificationTitleBadge";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";

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
      {children}
    </NotificationRealtimeProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    function () {
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
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
      <QueryClientProvider client={queryClient}>
        <ProvidersWithCurrentUser>{children}</ProvidersWithCurrentUser>
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
