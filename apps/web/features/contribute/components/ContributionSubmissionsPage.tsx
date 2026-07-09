"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import type { ContributionStatus } from "@35mm/types";
import { ROUTES } from "@/lib/constants/routes";
import { useContributionSubmissions } from "../hooks/useContributions";
import { CONTRIBUTION_CONFIG_BY_KIND } from "../lib/contributionConfig";
import styles from "./Contribute.module.css";

function statusLabel(status: ContributionStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_review":
      return "In review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ContributionSubmissionsPage() {
  var query = useContributionSubmissions();
  var pages = query.data?.pages ?? [];
  var items = pages.flatMap(function (page) {
    return page.items;
  });

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <div className={styles.topbar}>
          <Link href={ROUTES.CONTRIBUTE} className={styles.crumb}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Contributor Desk
          </Link>
          <Link href={ROUTES.CONTRIBUTE} className={styles.trackLink}>
            <Plus size={17} strokeWidth={2} aria-hidden />
            New submission
          </Link>
        </div>

        <header className={styles.formHeader}>
          <span className={styles.eyebrow}>Submission history</span>
          <h1>Track submissions</h1>
          <p>
            Your contribution history is cursor-paged and scoped to your account. Approved changes
            are applied by moderators to canonical catalog records.
          </p>
        </header>

        {query.isLoading ? (
          <div className={styles.empty}>Loading submissions.</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            No submissions yet. Open a contribution form to send your first catalog correction.
          </div>
        ) : (
          <div className={styles.submissionsList}>
            {items.map(function (item) {
              var config = CONTRIBUTION_CONFIG_BY_KIND.get(item.kind);
              return (
                <article key={item.id} className={styles.submissionRow}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>
                      {config?.shortTitle ?? item.kind} · {item.summary}
                    </p>
                    <p>Submitted {formatDate(item.createdAt)}</p>
                    {item.reviewNote ? <p>{item.reviewNote}</p> : null}
                  </div>
                  <span className={styles.status}>{statusLabel(item.status)}</span>
                </article>
              );
            })}
          </div>
        )}

        {query.hasNextPage ? (
          <div className={styles.submitRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={query.isFetchingNextPage}
              onClick={function () {
                query.fetchNextPage();
              }}
            >
              {query.isFetchingNextPage ? "Loading" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
