import type { ReactNode } from "react";
import type { HeaderNotifRow } from "./types";

export function actorDisplayName(row: HeaderNotifRow): string {
  if (!row.actor) return "Someone";
  return row.actor.displayName?.trim() || row.actor.username;
}

export function relativeNotificationTime(isoDate: string): string {
  const when = Date.parse(isoDate);
  if (Number.isNaN(when)) return "now";

  const diff = Date.now() - when;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

export function formatNotificationText(row: HeaderNotifRow): ReactNode {
  const actor = row.actor;
  const actorName = actor?.displayName?.trim() || actor?.username || "Someone";
  const isBundle = row.bundleCount > 1;
  const actorLabel = isBundle ? `${actorName} and ${row.bundleCount - 1} others` : actorName;

  if (row.type === "follow") {
    return (
      <>
        <strong>{actorLabel}</strong> followed you
      </>
    );
  }

  if (row.type === "follow_request") {
    return (
      <>
        <strong>{actorLabel}</strong> requested to follow you
      </>
    );
  }

  if (row.type === "follow_request_approved") {
    return (
      <>
        <strong>{actorLabel}</strong> approved your follow request
      </>
    );
  }

  if (row.type === "mention") {
    return (
      <>
        <strong>{actorLabel}</strong> mentioned you
      </>
    );
  }

  if (row.type === "like") {
    if (row.entity?.type === "comment") {
      return (
        <>
          <strong>{actorLabel}</strong> liked your comment
        </>
      );
    }

    return (
      <>
        <strong>{actorLabel}</strong> liked your {row.entity?.title ? <em>{row.entity.title}</em> : <strong>post</strong>}
      </>
    );
  }

  if (row.type === "comment") {
    return (
      <>
        <strong>{actorLabel}</strong> commented on your {row.entity?.title ? <em>{row.entity.title}</em> : "post"}
      </>
    );
  }

  if (row.type === "reply") {
    return (
      <>
        <strong>{actorLabel}</strong> replied to your comment
      </>
    );
  }

  if (row.type === "film_logged") {
    return (
      <>
        <strong>{actorLabel}</strong> logged {row.entity?.title ? <em>{row.entity.title}</em> : "a film"}
      </>
    );
  }

  if (row.type === "chat_reaction") {
    return (
      <>
        <strong>{actorLabel}</strong> reacted to your message
      </>
    );
  }

  return (
    <>
      <strong>{actorLabel}</strong> reposted your {row.entity?.title ? <em>{row.entity.title}</em> : "post"}
    </>
  );
}
