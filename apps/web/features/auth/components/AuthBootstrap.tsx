"use client";

import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";

export function AuthBootstrap() {
  useCurrentUserProfile();
  return null;
}
