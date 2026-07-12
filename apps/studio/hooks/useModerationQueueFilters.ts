'use client';

import { useCallback, useMemo } from 'react';
import { parseAsStringLiteral, useQueryStates } from 'nuqs';
import type { ModerationQueueFilters } from '@/lib/moderation/api';
import {
  CONTENT_TYPE_OPTIONS,
  REPORT_REASON_OPTIONS,
  REPORT_STATUS_OPTIONS,
} from '@/lib/moderation/constants';

const statusParser = parseAsStringLiteral(REPORT_STATUS_OPTIONS);
const contentTypeParser = parseAsStringLiteral(CONTENT_TYPE_OPTIONS);
const reasonParser = parseAsStringLiteral(REPORT_REASON_OPTIONS);

/**
 * URL-backed moderation queue filters. Shared between the filter panel and the
 * queue query so a filtered queue is shareable and survives back/forward.
 */
export function useModerationQueueFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      status: statusParser,
      contentType: contentTypeParser,
      reason: reasonParser,
    },
    { history: 'push' },
  );

  const clear = useCallback(() => {
    void setFilters({ status: null, contentType: null, reason: null });
  }, [setFilters]);

  const hasFilters =
    filters.status !== null || filters.contentType !== null || filters.reason !== null;

  const value = useMemo<ModerationQueueFilters>(
    () => ({
      status: filters.status,
      contentType: filters.contentType,
      reason: filters.reason,
    }),
    [filters.status, filters.contentType, filters.reason],
  );

  return { filters: value, setFilters, clear, hasFilters };
}
