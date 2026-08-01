export const PROFILE_EDIT_TARGETS = ["avatar", "cover", "bio", "location"] as const;

export type ProfileEditTarget = (typeof PROFILE_EDIT_TARGETS)[number];

export function isProfileEditTarget(value: string | null): value is ProfileEditTarget {
  return PROFILE_EDIT_TARGETS.some(function (target) {
    return target === value;
  });
}
