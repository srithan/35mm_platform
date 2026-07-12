import { adminNavGroups, type AdminNavItem } from '@/lib/data/admin';

export type StudioRole =
  | 'owner'
  | 'admin'
  | 'catalog'
  | 'moderation'
  | 'moderation_admin'
  | 'systems'
  | 'viewer';

export type StudioPermission =
  | 'dashboard:view'
  | 'users:view'
  | 'content:view'
  | 'moderation:view'
  | 'moderation:admin'
  | 'catalog:view'
  | 'catalog:write'
  | 'systems:view'
  | 'settings:view';

export const studioRoleLabels: Record<StudioRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  catalog: 'Catalog',
  moderation: 'Moderation',
  moderation_admin: 'Moderation admin',
  systems: 'Systems',
  viewer: 'Viewer',
};

export const studioRoleDescriptions: Record<StudioRole, string> = {
  owner: 'Everything across org, billing, users, catalog, moderation, systems.',
  admin: 'Most operator controls except owner-only org settings.',
  catalog: 'Films, shelves, import, and catalog write workflows.',
  moderation: 'Content and review queues for trust and safety work.',
  moderation_admin: 'Trust and safety with authority to reverse another staff actor.',
  systems: 'Queues, infrastructure, APIs, and service readiness.',
  viewer: 'Read-only overview access.',
};

export const studioRolePermissions: Record<StudioRole, StudioPermission[]> = {
  owner: [
    'dashboard:view',
    'users:view',
    'content:view',
    'moderation:view',
    'moderation:admin',
    'catalog:view',
    'catalog:write',
    'systems:view',
    'settings:view',
  ],
  admin: [
    'dashboard:view',
    'users:view',
    'content:view',
    'moderation:view',
    'moderation:admin',
    'catalog:view',
    'catalog:write',
    'systems:view',
  ],
  catalog: ['dashboard:view', 'catalog:view', 'catalog:write'],
  moderation: ['dashboard:view', 'content:view', 'moderation:view'],
  moderation_admin: ['dashboard:view', 'content:view', 'moderation:view', 'moderation:admin'],
  systems: ['dashboard:view', 'systems:view'],
  viewer: ['dashboard:view'],
};

const navPermissionByHref: Record<string, StudioPermission> = {
  '/dashboard': 'dashboard:view',
  '/users': 'users:view',
  '/content': 'content:view',
  '/moderation': 'moderation:view',
  '/films': 'catalog:view',
  '/shelves': 'catalog:view',
  '/import': 'catalog:write',
  '/queues': 'systems:view',
  '/infrastructure': 'systems:view',
  '/apis': 'systems:view',
  '/settings': 'settings:view',
};

export const protectedRoutePermissions: Array<{ prefix: string; permission: StudioPermission }> = [
  { prefix: '/dashboard', permission: 'dashboard:view' },
  { prefix: '/users', permission: 'users:view' },
  { prefix: '/content', permission: 'content:view' },
  { prefix: '/moderation', permission: 'moderation:view' },
  { prefix: '/films', permission: 'catalog:view' },
  { prefix: '/shelves', permission: 'catalog:view' },
  { prefix: '/import', permission: 'catalog:write' },
  { prefix: '/queues', permission: 'systems:view' },
  { prefix: '/infrastructure', permission: 'systems:view' },
  { prefix: '/apis', permission: 'systems:view' },
  { prefix: '/settings', permission: 'settings:view' },
  { prefix: '/api/studio/users', permission: 'users:view' },
  { prefix: '/api/studio/overview', permission: 'dashboard:view' },
  { prefix: '/api/studio', permission: 'dashboard:view' },
  { prefix: '/api/catalog', permission: 'catalog:view' },
];

export function normalizeStudioRole(value: unknown): StudioRole {
  if (typeof value !== 'string') {
    return 'viewer';
  }

  const role = value.toLowerCase().replace(/^org:/, '').replace(/^studio:/, '');

  if (role === 'owner' || role === 'super_admin') {
    return 'owner';
  }
  if (role === 'admin') {
    return 'admin';
  }
  if (role === 'catalog' || role === 'catalog_admin' || role === 'catalog_editor') {
    return 'catalog';
  }
  if (role === 'moderation_admin' || role === 'moderator_admin' || role === 'trust_safety_admin') {
    return 'moderation_admin';
  }
  if (role === 'moderation' || role === 'moderator' || role === 'trust_safety') {
    return 'moderation';
  }
  if (role === 'systems' || role === 'system' || role === 'ops' || role === 'infrastructure') {
    return 'systems';
  }

  return 'viewer';
}

export function getStudioRole(input: {
  orgRole?: unknown;
  publicMetadata?: unknown;
  unsafeMetadata?: unknown;
}): StudioRole {
  const publicMetadata = isRecord(input.publicMetadata) ? input.publicMetadata : {};
  const unsafeMetadata = isRecord(input.unsafeMetadata) ? input.unsafeMetadata : {};

  return normalizeStudioRole(
    input.orgRole ??
      publicMetadata.studioRole ??
      publicMetadata.role ??
      unsafeMetadata.studioRole ??
      unsafeMetadata.role,
  );
}

export function hasStudioPermission(role: StudioRole, permission: StudioPermission): boolean {
  return studioRolePermissions[role].includes(permission);
}

export function getPermissionForPath(pathname: string): StudioPermission | null {
  const route = protectedRoutePermissions.find((item) => pathname.startsWith(item.prefix));
  return route?.permission ?? null;
}

export function canAccessPath(role: StudioRole, pathname: string): boolean {
  const permission = getPermissionForPath(pathname);
  return permission ? hasStudioPermission(role, permission) : true;
}

export function filterAdminNavGroups(role: StudioRole): typeof adminNavGroups {
  return adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavItem(role, item)),
    }))
    .filter((group) => group.items.length > 0);
}

function canAccessNavItem(role: StudioRole, item: AdminNavItem): boolean {
  const permission = navPermissionByHref[item.href];
  return permission ? hasStudioPermission(role, permission) : true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
