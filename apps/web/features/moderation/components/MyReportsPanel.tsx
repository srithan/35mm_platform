"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  FileText,
  Flag,
  MessageSquare,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils/cn";
import type {
  ModerationContentType,
  ModerationReportStatus,
  ReportDto,
} from "@35mm/types";
import { fetchMyReports } from "../api/reportsApi";
import { reasonLabel } from "../data/reportReasons";
import { moderationKeys } from "../hooks/queryKeys";

var CONTENT_TYPE_LABEL: Record<ModerationContentType, string> = {
  post: "Post",
  comment: "Comment",
  profile: "Profile",
};

var CONTENT_TYPE_ICON: Record<ModerationContentType, LucideIcon> = {
  post: FileText,
  comment: MessageSquare,
  profile: UserRound,
};

interface StatusPresentation {
  label: string;
  className: string;
}

/** Maps the backend status enum to human copy + a themed, non-hardcoded pill. */
function statusPresentation(status: ModerationReportStatus): StatusPresentation {
  if (status === "actioned") {
    return {
      label: "Action taken",
      className:
        "border-[color-mix(in_srgb,var(--color-success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--elevated))] text-success",
    };
  }
  if (status === "dismissed") {
    return {
      label: "No violation found",
      className: "border-border bg-sunken text-fg-faint",
    };
  }
  if (status === "reviewing") {
    return {
      label: "Under review",
      className: "border-border-strong bg-sunken text-fg",
    };
  }
  return {
    label: "Submitted for review",
    className: "border-border bg-sunken text-fg-muted",
  };
}

function formatReportedAt(iso: string): string {
  var when = Date.parse(iso);
  if (Number.isNaN(when)) return "";
  var diff = Date.now() - when;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + "d ago";
  return new Date(when).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReportRow({ report }: { report: ReportDto }) {
  var TypeIcon = CONTENT_TYPE_ICON[report.contentType];
  var status = statusPresentation(report.status);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-fg-muted"
          aria-hidden
        >
          <TypeIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold leading-5 text-fg">
            {reasonLabel(report.reason)}
          </div>
          <div className="mt-0.5 truncate text-[12px] leading-4 text-fg-muted">
            {CONTENT_TYPE_LABEL[report.contentType]} · Reported{" "}
            {formatReportedAt(report.createdAt)}
          </div>
          {report.details ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-fg-faint">
              &ldquo;{report.details}&rdquo;
            </p>
          ) : null}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
          status.className
        )}
      >
        {status.label}
      </span>
    </div>
  );
}

function MyReportsEmptyState() {
  return (
    <div className="py-10 sm:py-12" role="status">
      <div className="mx-auto flex max-w-[420px] flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-gradient-to-br from-sunken to-bg shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_5%,transparent)]">
          <Flag className="h-6 w-6 text-fg-muted" strokeWidth={1.8} aria-hidden />
        </div>
        <h3 className="text-[15px] font-semibold leading-5 text-fg">
          No reports yet
        </h3>
        <p className="mt-2 max-w-[340px] text-[12.5px] leading-relaxed text-fg-muted">
          When you report a post, comment, or profile, it shows up here so you can
          track what happens next.
        </p>
      </div>
    </div>
  );
}

export function MyReportsPanel() {
  var { getToken } = useAuth();

  var listQuery = useInfiniteQuery({
    queryKey: moderationKeys.myReports(),
    initialPageParam: null as string | null,
    queryFn: async function ({ pageParam }) {
      var token = await getToken();
      return fetchMyReports({ token: token, cursor: pageParam, limit: 20 });
    },
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor;
    },
  });

  var items = useMemo(
    function () {
      return listQuery.data?.pages.flatMap(function (page) {
        return page.items;
      }) ?? [];
    },
    [listQuery.data]
  );

  if (listQuery.isLoading) {
    return <p className="text-sm text-fg-muted">Loading your reports...</p>;
  }

  if (listQuery.isError) {
    return (
      <div className="rounded-xl border border-accent/25 bg-sunken px-4 py-3">
        <p className="text-[12.5px] text-accent">Could not load your reports.</p>
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={function () {
              void listQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[13px] leading-relaxed text-fg-muted">
        Reports you&apos;ve filed. We keep you posted as our team reviews them.
      </p>
      {items.length === 0 ? (
        <MyReportsEmptyState />
      ) : (
        <div>
          {items.map(function (report) {
            return <ReportRow key={report.id} report={report} />;
          })}
        </div>
      )}
      {listQuery.hasNextPage ? (
        <div className="pt-4">
          <Button
            size="sm"
            variant="secondary"
            disabled={listQuery.isFetchingNextPage}
            onClick={function () {
              void listQuery.fetchNextPage();
            }}
          >
            {listQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
