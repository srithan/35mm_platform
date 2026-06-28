import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  getSettings,
  updateAppearance,
  updateNotifications,
  updatePrivacy,
  updateProfile,
} from "../api/settingsApi";
import { settingsKeys } from "./queryKeys";
import { feedKeys } from "@/features/feed/hooks/queryKeys";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
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
  var { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: async () => {
      return getSettings(await getToken());
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<UserSettings, Error, UpdateProfileInput, MutationContext>({
    mutationFn: async function (input) {
      return updateProfile(input, await getToken());
    },
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
	      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
	      void queryClient.invalidateQueries({ queryKey: feedKeys.all });
	    },
	  });
	}

export function useUpdatePrivacyMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<UserSettings, Error, UpdatePrivacyInput, MutationContext>({
    mutationFn: async function (input) {
      return updatePrivacy(input, await getToken());
    },
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
    onSuccess: function (next, input) {
      queryClient.setQueryData(settingsKeys.detail(), next);
      if (input.privateAccount !== undefined) {
        void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
        void queryClient.invalidateQueries({ queryKey: profileKeys.all });
        void queryClient.invalidateQueries({ queryKey: feedKeys.all });
      }
    },
  });
}

export function useUpdateNotificationsMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<UserSettings, Error, UpdateNotificationsInput, MutationContext>({
    mutationFn: async function (input) {
      return updateNotifications(input, await getToken());
    },
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
  const { getToken } = useAuth();

  return useMutation<UserSettings, Error, UpdateAppearanceInput, MutationContext>({
    mutationFn: async function (input) {
      return updateAppearance(input, await getToken());
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });
      const previous = queryClient.getQueryData<UserSettings>(settingsKeys.detail());

      if (previous) {
        queryClient.setQueryData<UserSettings>(settingsKeys.detail(), {
          ...previous,
          appearance: {
            ...previous.appearance,
            ...input,
          },
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKeys.detail(), context.previous);
      }
    },
    onSuccess: (next, input) => {
      const current = queryClient.getQueryData<UserSettings>(settingsKeys.detail());

      queryClient.setQueryData<UserSettings>(settingsKeys.detail(), {
        ...next,
        appearance: {
          ...next.appearance,
          ...current?.appearance,
          ...input,
        },
      });
    },
  });
}
