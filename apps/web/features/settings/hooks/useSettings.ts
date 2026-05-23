import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSettings,
  updateAppearance,
  updateNotifications,
  updatePrivacy,
  updateProfile,
} from "../api/settingsApi";
import { settingsKeys } from "./queryKeys";
import type {
  UpdateAppearanceInput,
  UpdateNotificationsInput,
  UpdatePrivacyInput,
  UpdateProfileInput,
  UserSettings,
} from "../types/settings";

interface MutationContext {
  previous?: UserSettings;
}

type MutationStatus = "idle" | "submitting" | "success" | "error";

export function getMutationStatus(mutation: {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}): MutationStatus {
  if (mutation.isPending) return "submitting";
  if (mutation.isSuccess) return "success";
  if (mutation.isError) return "error";
  return "idle";
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: getSettings,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, UpdateProfileInput, MutationContext>({
    mutationFn: updateProfile,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });
      const previous = queryClient.getQueryData<UserSettings>(settingsKeys.detail());

      if (previous) {
        queryClient.setQueryData<UserSettings>(settingsKeys.detail(), {
          ...previous,
          profile: input,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.detail(), context.previous);
      }
    },
    onSuccess: (next) => {
      queryClient.setQueryData(settingsKeys.detail(), next);
    },
  });
}

export function useUpdatePrivacyMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, UpdatePrivacyInput, MutationContext>({
    mutationFn: updatePrivacy,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });
      const previous = queryClient.getQueryData<UserSettings>(settingsKeys.detail());

      if (previous) {
        queryClient.setQueryData<UserSettings>(settingsKeys.detail(), {
          ...previous,
          privacy: input,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.detail(), context.previous);
      }
    },
    onSuccess: (next) => {
      queryClient.setQueryData(settingsKeys.detail(), next);
    },
  });
}

export function useUpdateNotificationsMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, UpdateNotificationsInput, MutationContext>({
    mutationFn: updateNotifications,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });
      const previous = queryClient.getQueryData<UserSettings>(settingsKeys.detail());

      if (previous) {
        queryClient.setQueryData<UserSettings>(settingsKeys.detail(), {
          ...previous,
          notifications: input,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.detail(), context.previous);
      }
    },
    onSuccess: (next) => {
      queryClient.setQueryData(settingsKeys.detail(), next);
    },
  });
}

export function useUpdateAppearanceMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, UpdateAppearanceInput, MutationContext>({
    mutationFn: updateAppearance,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });
      const previous = queryClient.getQueryData<UserSettings>(settingsKeys.detail());

      if (previous) {
        queryClient.setQueryData<UserSettings>(settingsKeys.detail(), {
          ...previous,
          appearance: input,
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.detail(), context.previous);
      }
    },
    onSuccess: (next) => {
      queryClient.setQueryData(settingsKeys.detail(), next);
    },
  });
}
