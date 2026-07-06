'use client';

import { useQuery } from '@tanstack/react-query';
import { type AdminRisk, type HealthState } from '@/lib/data/admin';

export type OverviewMetricKey = 'activeUsers' | 'feedPosts' | 'mediaPosts' | 'pendingJobs';
export type OverviewActivityKind = 'user' | 'post' | 'job';

export interface OverviewMetric {
  key: OverviewMetricKey;
  label: string;
  value: string;
  detail: string;
  risk?: AdminRisk;
}

export interface OverviewService {
  name: string;
  owner: string;
  state: HealthState;
  detail: string;
}

export interface OverviewActivity {
  id: string;
  kind: OverviewActivityKind;
  title: string;
  detail: string;
  meta: string;
}

export interface OverviewCatalog {
  films: number;
  verifiedFilms: number;
  manualFilms: number;
  shelves: number;
}

export interface StudioOverviewResponse {
  metrics: OverviewMetric[];
  services: OverviewService[];
  activity: OverviewActivity[];
  catalog: OverviewCatalog;
  generatedAt: string;
}

export interface StudioUserAccount {
  id: string;
  name: string;
  handle: string;
  email: string;
  status: 'active' | 'deactivated' | 'suspended';
  role: string;
  joined: string;
  posts: number;
  followers: number;
  onboardingCompleted: boolean;
}

export interface StudioUsernameRecord {
  username: string;
  state: 'reserved' | 'locked';
  owner: string;
  reason: string;
  updatedAt: string;
}

export type StudioUsernameAvailability =
  | {
      username: string;
      status: 'available';
      available: true;
      canLock: true;
      message: string;
      owner?: undefined;
      reason?: undefined;
      updatedAt?: undefined;
    }
  | {
      username: string;
      status: 'reserved' | 'locked' | 'taken' | 'invalid';
      available: false;
      canLock: false;
      message: string;
      owner?: string;
      reason?: string;
      updatedAt?: string;
    };

export interface StudioUsersResponse {
  stats: {
    active: number;
    deactivated: number;
    suspended: number;
    reservedUsernames: number;
    takenUsernames: number;
  };
  accounts: StudioUserAccount[];
  usernames: StudioUsernameRecord[];
  cooldowns: [];
  auditEvents: [];
  generatedAt: string;
}

export interface StudioUsernameLockInput {
  username: string;
  state: 'locked' | 'reserved';
  owner: string;
  reason: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  var response = await fetch(path, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    var message = `Studio API failed: ${response.status}`;
    try {
      var body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch (_error) {
      // ignore non-json error bodies
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function useStudioOverview() {
  return useQuery({
    queryKey: ['studio', 'overview'],
    queryFn: () => fetchJson<StudioOverviewResponse>('/api/studio/overview'),
    staleTime: 60_000,
  });
}

export function useStudioUsers() {
  return useQuery({
    queryKey: ['studio', 'users'],
    queryFn: () => fetchJson<StudioUsersResponse>('/api/studio/users'),
    staleTime: 60_000,
  });
}

export async function checkStudioUsername(username: string) {
  return fetchJson<StudioUsernameAvailability>(`/api/studio/usernames/${encodeURIComponent(username)}`);
}

export async function lockStudioUsername(input: StudioUsernameLockInput) {
  var response = await fetch('/api/studio/usernames', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    var message = `Studio API failed: ${response.status}`;
    try {
      var body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch (_error) {
      // ignore non-json error bodies
    }
    throw new Error(message);
  }

  return (await response.json()) as StudioUsernameRecord;
}
