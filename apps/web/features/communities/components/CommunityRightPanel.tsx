"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { formatCount } from "@/lib/utils/formatCount";
import type { CommunityAccessType } from "../types/community";
import { useCommunity } from "../hooks/useCommunities";

const COMMUNITY_RULES: Record<string, string[]> = {
  "world-cinema-club": [
    "Keep discussions focused on world cinema discovery and analysis.",
    "Use spoiler tags for key plot reveals from recent releases.",
    "Share context when posting recommendations (country, era, theme).",
    "No dismissive comments about language, subtitles, or regions.",
  ],
  "bollywood-storytellers": [
    "Keep debates respectful across eras, stars, and franchises.",
    "Mark spoilers for films less than 30 days old.",
    "Avoid fan-war baiting between actors or production houses.",
    "When sharing box office claims, include a reliable source.",
  ],
  "hollywood-insiders": [
    "Stay on topic: films, shows, and production craft.",
    "No leak or piracy links; official sources only.",
    "Use spoiler tags for current theatrical releases.",
    "Critique ideas, not creators or other members.",
  ],
  "tollywood-telugu-cinema": [
    "Respect all tastes from mass to indie cinema.",
    "Credit editors, writers, and technicians in craft posts.",
    "No caste/regional hate speech or coded slurs.",
    "Flag major spoilers in first-watch threads.",
  ],
  "kollywood-craft-room": [
    "Discussion-first space; low-effort one-liners may be removed.",
    "Use clear titles when posting analysis threads.",
    "No spam self-promotion without prior mod approval.",
    "Spoiler tags required for new releases.",
  ],
  "mollywood-screenplay-lab": [
    "Screenplay and structure conversations take priority.",
    "Criticism should be specific and constructive.",
    "No personal attacks on creators or members.",
    "Spoiler warnings mandatory for new films/shows.",
  ],
  "tv-show-analysis": [
    "Use episode labels in titles (e.g., S02E04).",
    "Mark spoilers clearly in post body.",
    "No title spoilers for currently airing shows.",
    "Keep comparisons thoughtful, not tribal.",
  ],
  "truefilm-deep-cuts": [
    "Back claims with scenes, shots, or references.",
    "Low-effort memes belong elsewhere.",
    "No gatekeeping newcomers to film analysis.",
    "Use spoiler formatting for plot-specific criticism.",
  ],
};

const ACCESS_COPY: Record<
  CommunityAccessType,
  { title: string; body: string }
> = {
  public: {
    title: "Public",
    body: "Anyone can view, post, and comment to this community.",
  },
  restricted: {
    title: "Restricted",
    body: "Anyone can view, but only approved users can contribute.",
  },
  private: {
    title: "Private",
    body: "Only approved users can view and contribute.",
  },
};

function formatCreatedDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function fallbackRules(slug: string): string[] {
  return [
    "Keep posts and comments relevant to this community theme.",
    "Be respectful with disagreements and avoid personal attacks.",
    "Use spoiler tags for major reveals from recent titles.",
    `Follow moderator guidance for ${slug.replaceAll("-", " ")} threads.`,
  ];
}

export function CommunityRightPanel() {
  const params = useParams();
  const slug = (params?.slug as string | undefined) ?? "";
  const { data: community, isLoading } = useCommunity(slug);

  const rules = useMemo(() => {
    if (!slug) return [];
    return COMMUNITY_RULES[slug] ?? fallbackRules(slug);
  }, [slug]);
  const accessCopy = ACCESS_COPY[community?.accessType ?? "public"];
  const headContributor = community?.moderators.find(
    (moderator) => moderator.id === community?.headContributorId
  );

  if (isLoading || !community) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-32 rounded bg-skeleton" />
        <div className="h-3 w-full rounded bg-skeleton" />
        <div className="h-3 w-4/5 rounded bg-skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="text-[11px] uppercase tracking-[0.07em] text-fg-muted">Community Type</h3>
        <div className="mt-1 text-[14px] font-semibold text-fg">{accessCopy.title}</div>
        <p className="mt-1 text-[12.5px] text-fg-light">{accessCopy.body}</p>
      </section>

      <section className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="text-[11px] uppercase tracking-[0.07em] text-fg-muted">Details</h3>
        <div className="mt-2 space-y-1 text-[12px] text-fg-light">
          <p>Created {formatCreatedDate(community.createdAt)}</p>
          <p>{formatCount(community.memberCount)} members joined</p>
          <p>Head contributor: {headContributor?.displayName ?? "Community team"}</p>
          {community.isMature && <p>Mature (18+) community</p>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="text-[11px] uppercase tracking-[0.07em] text-fg-muted">Moderators</h3>
        <div className="mt-2 space-y-2">
          {community.moderators.map((moderator) => (
            <div
              key={moderator.id}
              className="inline-flex w-full items-center gap-2 rounded-full border border-border bg-bg px-2.5 py-1.5"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{
                  background: moderator.avatar.gradient,
                  color: moderator.avatar.textColor,
                }}
              >
                {moderator.avatar.initial}
              </div>
              <div className="text-[12px] leading-tight">
                <div className="font-medium text-fg">{moderator.displayName}</div>
                <div className="text-fg-muted">
                  {moderator.role === "head-contributor" ? "Head contributor" : "Moderator"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="text-[11px] uppercase tracking-[0.07em] text-fg-muted">
          Community Rules
        </h3>
        <ol className="mt-2 space-y-2 text-[12.5px] text-fg-light list-decimal list-inside">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
