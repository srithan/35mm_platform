"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { ROUTES } from "@/lib/constants/routes";

type RichToken =
  | { t: "txt"; s: string }
  | { t: "url"; href: string; display: string }
  | { t: "mention"; user: string }
  | { t: "tag"; tag: string };

function isWordChar(ch: string): boolean {
  return /[a-zA-Z0-9_]/.test(ch);
}

function trimTrailingFromUrl(raw: string): string {
  let s = raw;
  while (s.length > 0) {
    const last = s.charAt(s.length - 1);
    if (
      last === "." ||
      last === "," ||
      last === ";" ||
      last === ":" ||
      last === "!" ||
      last === "?"
    ) {
      s = s.slice(0, -1);
      continue;
    }
    if (last === ")") {
      const opens = (s.match(/\(/g) || []).length;
      const closes = (s.match(/\)/g) || []).length;
      if (closes > opens) {
        s = s.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return s;
}

/**
 * Split plain text into URLs, @mentions, and #hashtags for inline links.
 * Video URLs are normally stripped upstream via extractVideoPreviews for embeds.
 */
export function parseRichPostText(input: string): RichToken[] {
  const out: RichToken[] = [];
  let i = 0;
  const n = input.length;
  let buf = "";

  function flushBuf() {
    if (buf.length > 0) {
      out.push({ t: "txt", s: buf });
      buf = "";
    }
  }

  while (i < n) {
    let matched = false;

    if (input.slice(i, i + 7) === "http://" || input.slice(i, i + 8) === "https://") {
      let j = i;
      while (j < n) {
        const ch = input.charAt(j);
        if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") break;
        if (ch === "<" || ch === ">") break;
        j++;
      }
      const rawUrl = input.slice(i, j);
      const href = trimTrailingFromUrl(rawUrl);
      if (href.length > 0) {
        flushBuf();
        out.push({ t: "url", href, display: href });
        i += rawUrl.length;
        matched = true;
      }
    }

    if (!matched && input.charAt(i) === "@") {
      const beforeOk = i === 0 || !isWordChar(input.charAt(i - 1));
      if (beforeOk) {
        let km = i + 1;
        if (km < n && /[a-zA-Z0-9_]/.test(input.charAt(km))) {
          while (km < n && /[a-zA-Z0-9_.]/.test(input.charAt(km))) {
            km++;
          }
          const userRaw = input.slice(i + 1, km);
          const user = userRaw.replace(/\.+$/g, "");
          if (user.length > 0) {
            flushBuf();
            out.push({ t: "mention", user });
            i += 1 + userRaw.length;
            matched = true;
          }
        }
      }
    }

    if (!matched && input.charAt(i) === "#") {
      const beforeHash =
        i === 0 ||
        /\s/.test(input.charAt(i - 1)) ||
        input.charAt(i - 1) === "(" ||
        input.charAt(i - 1) === "[";
      if (beforeHash && i + 1 < n && /[a-zA-Z0-9_]/.test(input.charAt(i + 1))) {
        let kt = i + 1;
        while (kt < n && /[a-zA-Z0-9_]/.test(input.charAt(kt))) kt++;
        const tag = input.slice(i + 1, kt);
        if (tag.length > 0) {
          flushBuf();
          out.push({ t: "tag", tag });
          i = kt;
          matched = true;
        }
      }
    }

    if (!matched) {
      buf += input.charAt(i);
      i++;
    }
  }

  flushBuf();
  return out;
}

const defaultLink =
  "text-accent underline underline-offset-2 hover:opacity-90 break-all";

export const blueInlineLinkClassName =
  "text-[#0095f6] underline underline-offset-2 hover:text-[#1877f2] break-all";

export function tokensToRichNodes(
  tokens: RichToken[],
  opts: {
    linkClassName?: string;
    stopLinkPropagation?: boolean;
    segmentKeyPrefix?: string;
  }
): ReactNode[] {
  const cls = opts.linkClassName || defaultLink;
  const stop = opts.stopLinkPropagation === true;
  const baseKey = opts.segmentKeyPrefix || "";

  const nodes: ReactNode[] = [];
  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti];
    const keyBase = `${baseKey}t-${ti}`;

    if (tok.t === "txt") {
      nodes.push(tok.s);
      continue;
    }
    if (tok.t === "url") {
      nodes.push(
        <a
          key={keyBase}
          href={tok.href}
          className={blueInlineLinkClassName}
          target="_blank"
          rel="noopener noreferrer"
          {...(stop
            ? {
                onClick: function stopCardNav(e: MouseEvent) {
                  e.stopPropagation();
                },
              }
            : {})}
        >
          {tok.display}
        </a>
      );
      continue;
    }
    if (tok.t === "mention") {
      nodes.push(
        <Link
          key={keyBase}
          href={ROUTES.PROFILE(tok.user)}
          className={cls}
          {...(stop
            ? {
                onClick: function stopCardNav(e: MouseEvent) {
                  e.stopPropagation();
                },
              }
            : {})}
        >
          @{tok.user}
        </Link>
      );
      continue;
    }
    if (tok.t === "tag") {
      nodes.push(
        <Link
          key={keyBase}
          href={ROUTES.DISCOVER_TAG(tok.tag)}
          className={blueInlineLinkClassName}
          {...(stop
            ? {
                onClick: function stopCardNav(e: MouseEvent) {
                  e.stopPropagation();
                },
              }
            : {})}
        >
          #{tok.tag}
        </Link>
      );
      continue;
    }
  }
  return nodes;
}

export function RichPostInline(props: {
  text: string;
  linkClassName?: string;
  stopLinkPropagation?: boolean;
  segmentKeyPrefix?: string;
}) {
  const tokens = parseRichPostText(props.text);
  const opts = {
    linkClassName: props.linkClassName,
    stopLinkPropagation: props.stopLinkPropagation,
    segmentKeyPrefix: props.segmentKeyPrefix,
  };
  return <>{tokensToRichNodes(tokens, opts)}</>;
}

/** Body text with optional film-log italic middle segment (may repeat when `filmRef` appears multiple times). */
export function RichPostBodyWithFilmRef(props: {
  text: string;
  filmRef?: string;
  stopLinkPropagation?: boolean;
  linkClassName?: string;
}) {
  const t = props.text;
  const fr = props.filmRef;
  if (fr && fr.length > 0 && t.indexOf(fr) !== -1) {
    const parts = t.split(fr);
    const chunks: ReactNode[] = [];
    for (let pi = 0; pi < parts.length; pi++) {
      chunks.push(
        <RichPostInline
          key={`chunk-${pi}`}
          text={parts[pi]}
          segmentKeyPrefix={`c${pi}-`}
          stopLinkPropagation={props.stopLinkPropagation}
          linkClassName={props.linkClassName}
        />
      );
      if (pi < parts.length - 1) {
        chunks.push(
          <span key={`film-${pi}`} className="font-display italic">
            {fr}
          </span>
        );
      }
    }
    return <>{chunks}</>;
  }
  return (
    <RichPostInline
      text={t}
      stopLinkPropagation={props.stopLinkPropagation}
      linkClassName={props.linkClassName}
    />
  );
}
