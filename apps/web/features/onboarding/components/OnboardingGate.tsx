"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { OnboardingModal } from "./OnboardingModal";
import { useOnboardingStatus } from "../hooks/useOnboarding";
import { onboardingKeys } from "../hooks/queryKeys";

export function OnboardingGate() {
  var { isLoaded, isSignedIn } = useAuth();
  var queryClient = useQueryClient();
  var [dismissed, setDismissed] = useState(false);
  var statusQuery = useOnboardingStatus(true);

  if (!isLoaded || !isSignedIn) return null;
  if (statusQuery.isLoading || !statusQuery.data) return null;
  if (dismissed || statusQuery.data.completed) return null;

  return (
    <OnboardingModal
      onCompleted={function () {
        setDismissed(true);
        queryClient.setQueryData(onboardingKeys.status(), {
          completed: true,
          completedAt: new Date().toISOString(),
        });
      }}
    />
  );
}
