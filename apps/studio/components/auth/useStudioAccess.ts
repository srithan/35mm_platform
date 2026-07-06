'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import {
  getStudioRole,
  hasStudioPermission,
  studioRoleLabels,
  type StudioPermission,
} from '@/lib/auth/accessControl';
import { isStudioClerkEnabled } from '@/lib/auth/clerkConfig';

export function useStudioAccess() {
  if (!isStudioClerkEnabled) {
    return {
      role: 'viewer' as const,
      roleLabel: 'Clerk not configured',
      can: (permission: StudioPermission) => hasStudioPermission('viewer', permission),
    };
  }

  return useClerkStudioAccess();
}

function useClerkStudioAccess() {
  const auth = useAuth();
  const { user } = useUser();
  const role = getStudioRole({
    orgRole: auth.orgRole,
    publicMetadata: user?.publicMetadata,
    unsafeMetadata: user?.unsafeMetadata,
  });

  return {
    role,
    roleLabel: studioRoleLabels[role],
    can: (permission: StudioPermission) => hasStudioPermission(role, permission),
  };
}
