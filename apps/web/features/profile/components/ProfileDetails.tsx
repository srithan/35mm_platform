"use client";

import { MapPin, Link2, Calendar, Lock } from "lucide-react";
import { formatRoleContextSegment, getRoleDotColor } from "@/lib/utils/userRoleHeadline";

function websiteHref(raw: string): string {
  const t = raw.trim();
  if (t.length === 0) {
    return "#";
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return "https://" + t;
}

const metaRowClass =
  "flex max-w-full min-w-0 items-center gap-1.5 text-[12px] font-medium leading-snug text-fg-muted";
const metaLinkClass =
  metaRowClass +
  " no-underline transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const headlinePillClass =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-[#fbf7f6] px-3.5 py-1.5";

function ProfileHeadline(props: {
  headline?: string | null;
  headlineContext?: string | null;
  role?: string | null;
  roleContext?: string | null;
}) {
  const headline = props.headline?.trim() ?? "";
  const headlineContext = props.headlineContext?.trim() ?? "";
  const role = props.role?.trim() ?? "";

  if (headline.length > 0) {
    return (
      <div className={headlinePillClass + " mt-2.5"}>
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" aria-hidden />
        <span className="min-w-0 text-[12.5px] font-semibold leading-none text-accent">
          {headline}
          {headlineContext.length > 0 ? <span className="font-semibold"> · {headlineContext}</span> : null}
        </span>
      </div>
    );
  }

  if (role.length > 0) {
    const context = formatRoleContextSegment(role, { roleContext: props.roleContext }) ?? "";
    const dotColor = getRoleDotColor(role);

    return (
      <div className={headlinePillClass + " mt-2.5"}>
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
        <span className="min-w-0 text-[12.5px] font-semibold leading-none text-accent">
          {role}
          {context.length > 0 ? <span className="font-semibold"> · {context}</span> : null}
        </span>
      </div>
    );
  }

  return null;
}

export function ProfileDetails(props: {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  isPrivate?: boolean;
  role?: string | null;
  roleContext?: string | null;
  headline?: string | null;
  headlineContext?: string | null;
}) {
  const bio = props.bio.trim();
  const location = props.location.trim();
  const website = props.website.trim();

  return (
    <div className="w-full min-w-0">
      <div className="min-w-0">
        <h1 className="font-sans text-[1.375rem] font-semibold leading-[1.12] tracking-[-0.02em] text-fg md:text-[1.4375rem]">
          {props.displayName}
          {props.isPrivate ? (
            <span className="ml-2 inline-flex align-middle text-fg-muted" aria-label="Private account">
              <Lock className="h-[17px] w-[17px]" strokeWidth={1.8} />
            </span>
          ) : null}
        </h1>
        <p className="mt-1 font-sans text-[13px] font-normal leading-none text-fg-muted">
          @{props.username}
        </p>
      </div>

      <ProfileHeadline
        headline={props.headline}
        headlineContext={props.headlineContext}
        role={props.role}
        roleContext={props.roleContext}
      />

      {bio.length > 0 ? (
        <p className="mt-3.5 font-sans text-[14.5px] leading-[1.55] text-fg">{bio}</p>
      ) : null}

      <div className="mt-2.5 flex flex-col items-start gap-1">
        {location.length > 0 ? (
          <span className={metaRowClass}>
            <MapPin className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
            {location}
          </span>
        ) : null}
        {website.length > 0 ? (
          <a
            href={websiteHref(website)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={"Visit " + website + " (opens in new tab)"}
            className={metaLinkClass}
          >
            <Link2 className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} aria-hidden />
            <span className="min-w-0 truncate">{website}</span>
          </a>
        ) : null}
        <span className={metaRowClass}>
          <Calendar className="h-[13px] w-[13px] shrink-0 text-fg-faint" strokeWidth={1.7} />
          Joined Feb 2024
        </span>
      </div>
    </div>
  );
}
