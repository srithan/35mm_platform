"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { FlashToastHost } from "@/components/FlashToast";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { NotificationSoundPlayer } from "@/features/notifications/components/NotificationSoundPlayer";
import { NotificationTitleBadge } from "@/features/notifications/components/NotificationTitleBadge";

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
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const notificationUserId = isSignedIn ? user?.id ?? null : null;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NotificationRealtimeProvider
          enabled={isUserLoaded && Boolean(isSignedIn)}
          userId={isUserLoaded ? notificationUserId : null}
        >
          <NotificationTitleBadge />
          <NotificationSoundPlayer />
          <FlashToastHost />
          {children}
        </NotificationRealtimeProvider>
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
