'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type {
  ModerationActionDto,
  ModerationContentType,
  ModerationReportDetailDto,
} from '@35mm/types';
import type {
  ModerationActionPayloadInput,
  ModerationDismissPayloadInput,
} from '@35mm/validators';
import {
  applyModerationAction,
  dismissModerationContent,
  getModerationContentDetail,
  ModerationApiError,
  newModerationIdempotencyKey,
} from '@/lib/moderation/api';

const DETAIL_LIMIT = 25;
const CACHE_SYNC_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ListState<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  loadingMore: boolean;
}

function emptyList<T>(): ListState<T> {
  return { items: [], cursor: null, hasMore: false, loadingMore: false };
}

/**
 * A 503 after a committed enforcement means the action landed but cache sync
 * failed; the API repairs side effects when the SAME Idempotency-Key is
 * retried, so we reuse one key across attempts.
 */
async function runIdempotent<T>(key: string, attempt: (key: string) => Promise<T>): Promise<T> {
  let tries = 0;
  for (;;) {
    try {
      return await attempt(key);
    } catch (error) {
      if (error instanceof ModerationApiError && error.status === 503 && tries < CACHE_SYNC_RETRIES) {
        tries += 1;
        await delay(400 * tries);
        continue;
      }
      throw error;
    }
  }
}

export function useModerationContent(contentType: ModerationContentType, contentId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['moderation', 'content', contentType, contentId],
    queryFn: async () =>
      getModerationContentDetail(contentType, contentId, { limit: DETAIL_LIMIT }, await getToken()),
    staleTime: 10_000,
  });

  const [reports, setReports] = useState<ListState<ModerationReportDetailDto>>(emptyList);
  const [actions, setActions] = useState<ListState<ModerationActionDto>>(emptyList);
  const [strikes, setStrikes] = useState<ListState<ModerationActionDto>>(emptyList);

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail) return;
    setReports({
      items: detail.reports.items,
      cursor: detail.reports.nextCursor,
      hasMore: detail.reports.hasMore,
      loadingMore: false,
    });
    setActions({
      items: detail.actions.items,
      cursor: detail.actions.nextCursor,
      hasMore: detail.actions.hasMore,
      loadingMore: false,
    });
    setStrikes({
      items: detail.strikeHistory.items,
      cursor: detail.strikeHistory.nextCursor,
      hasMore: detail.strikeHistory.hasMore,
      loadingMore: false,
    });
  }, [detailQuery.data]);

  const loadMoreReports = useCallback(async () => {
    if (!reports.cursor || reports.loadingMore) return;
    setReports((state) => ({ ...state, loadingMore: true }));
    try {
      const page = await getModerationContentDetail(
        contentType,
        contentId,
        { reportCursor: reports.cursor, limit: DETAIL_LIMIT },
        await getToken(),
      );
      setReports((state) => ({
        items: [...state.items, ...page.reports.items],
        cursor: page.reports.nextCursor,
        hasMore: page.reports.hasMore,
        loadingMore: false,
      }));
    } catch (error) {
      setReports((state) => ({ ...state, loadingMore: false }));
      throw error;
    }
  }, [reports.cursor, reports.loadingMore, contentType, contentId, getToken]);

  const loadMoreActions = useCallback(async () => {
    if (!actions.cursor || actions.loadingMore) return;
    setActions((state) => ({ ...state, loadingMore: true }));
    try {
      const page = await getModerationContentDetail(
        contentType,
        contentId,
        { actionCursor: actions.cursor, limit: DETAIL_LIMIT },
        await getToken(),
      );
      setActions((state) => ({
        items: [...state.items, ...page.actions.items],
        cursor: page.actions.nextCursor,
        hasMore: page.actions.hasMore,
        loadingMore: false,
      }));
    } catch (error) {
      setActions((state) => ({ ...state, loadingMore: false }));
      throw error;
    }
  }, [actions.cursor, actions.loadingMore, contentType, contentId, getToken]);

  const loadMoreStrikes = useCallback(async () => {
    if (!strikes.cursor || strikes.loadingMore) return;
    setStrikes((state) => ({ ...state, loadingMore: true }));
    try {
      const page = await getModerationContentDetail(
        contentType,
        contentId,
        { strikeCursor: strikes.cursor, limit: DETAIL_LIMIT },
        await getToken(),
      );
      setStrikes((state) => ({
        items: [...state.items, ...page.strikeHistory.items],
        cursor: page.strikeHistory.nextCursor,
        hasMore: page.strikeHistory.hasMore,
        loadingMore: false,
      }));
    } catch (error) {
      setStrikes((state) => ({ ...state, loadingMore: false }));
      throw error;
    }
  }, [strikes.cursor, strikes.loadingMore, contentType, contentId, getToken]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['moderation', 'content', contentType, contentId] });
    void queryClient.invalidateQueries({ queryKey: ['moderation', 'queue'] });
  }, [queryClient, contentType, contentId]);

  const applyAction = useMutation({
    mutationFn: async (payload: ModerationActionPayloadInput) => {
      const token = await getToken();
      return runIdempotent(newModerationIdempotencyKey(payload.action), (key) =>
        applyModerationAction(contentType, contentId, payload, { token, idempotencyKey: key }),
      );
    },
    onSuccess: invalidate,
  });

  const dismiss = useMutation({
    mutationFn: async (payload: ModerationDismissPayloadInput) => {
      const token = await getToken();
      return runIdempotent(newModerationIdempotencyKey('dismiss'), (key) =>
        dismissModerationContent(contentType, contentId, payload, { token, idempotencyKey: key }),
      );
    },
    onSuccess: invalidate,
  });

  return {
    detailQuery,
    reports,
    actions,
    strikes,
    loadMoreReports,
    loadMoreActions,
    loadMoreStrikes,
    applyAction,
    dismiss,
  };
}
