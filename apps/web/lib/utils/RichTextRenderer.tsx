"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import {
  parseStoredRichText,
  type RichTextDoc,
  type RichTextMark,
  type RichTextNode,
} from "./richContent";
import {
  parseRichPostText,
  tokensToRichNodes,
  mentionInlineClassName,
} from "./richPostText";
import { SpoilerReveal } from "./SpoilerReveal";

function applyMarks(nodes: ReactNode[], marks: RichTextMark[] | undefined, keyBase: string) {
  let out: ReactNode = nodes;
  for (let i = (marks?.length ?? 0) - 1; i >= 0; i -= 1) {
    const mark = marks![i];
    if (mark.type === "bold") out = <strong key={`${keyBase}-b-${i}`}>{out}</strong>;
    else if (mark.type === "italic") out = <em key={`${keyBase}-i-${i}`}>{out}</em>;
    else if (mark.type === "underline") out = <u key={`${keyBase}-u-${i}`}>{out}</u>;
    else if (mark.type === "strike") out = <s key={`${keyBase}-st-${i}`}>{out}</s>;
    else if (mark.type === "spoiler") out = <SpoilerReveal key={`${keyBase}-s-${i}`}>{out}</SpoilerReveal>;
  }
  return out;
}

function stopClick(e: MouseEvent) {
  e.stopPropagation();
}

function renderNode(node: RichTextNode, key: string, stopLinkPropagation: boolean): ReactNode {
  if (node.type === "text") {
    const tokens = parseRichPostText(node.text ?? "");
    const nodes = tokensToRichNodes(tokens, {
      stopLinkPropagation,
      segmentKeyPrefix: key,
    });
    return applyMarks(nodes, node.marks, key);
  }

  if (node.type === "mention") {
    const label =
      typeof node.attrs?.label === "string"
        ? node.attrs.label.replace(/^@/, "")
        : typeof node.attrs?.username === "string"
          ? node.attrs.username.replace(/^@/, "")
          : "user";
    const username =
      typeof node.attrs?.username === "string" ? node.attrs.username.replace(/^@/, "") : label;
    const deleted = node.attrs?.deleted === true || username.trim().length === 0;
    if (deleted) {
      return (
        <span key={key} className="text-fg-muted">
          @{label}
        </span>
      );
    }
    return (
      <Link
        key={key}
        href={ROUTES.PROFILE(username)}
        className={mentionInlineClassName}
        onClick={stopLinkPropagation ? stopClick : undefined}
      >
        @{label}
      </Link>
    );
  }

  if (node.type === "hardBreak") return <br key={key} />;

  const children = (node.content ?? []).map(function (child, index) {
    return renderNode(child, `${key}-${index}`, stopLinkPropagation);
  });

  if (node.type === "paragraph") {
    return (
      <span key={key} className="block min-h-[1em]">
        {children.length > 0 ? children : "\u00a0"}
      </span>
    );
  }

  return <span key={key}>{children}</span>;
}

export function RichTextRenderer(props: {
  stored: string;
  stopLinkPropagation?: boolean;
  className?: string;
}) {
  const doc = parseStoredRichText(props.stored) as RichTextDoc | null;
  if (!doc) return null;
  return (
    <span className={cn("contents", props.className)}>
      {(doc.content ?? []).map(function (node, index) {
        return renderNode(node, `r-${index}`, props.stopLinkPropagation === true);
      })}
    </span>
  );
}
