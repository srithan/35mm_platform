"use client";

import Link from "next/link";
import { FolderOpen, Send, Film } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

interface FestivalEmptyStateProps {
  variant: "projects" | "submissions";
  className?: string;
}

export function FestivalEmptyState({ variant, className }: FestivalEmptyStateProps) {
  const config = {
    projects: {
      icon: FolderOpen,
      title: "No projects yet",
      description:
        "Create a project to track your films and screenplays. Add your work, then browse festivals and submit with one click.",
      cta: "Create your new project",
      ctaHref: "#", // TODO: wire to project creation flow
      gradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    submissions: {
      icon: Send,
      title: "No submissions yet",
      description:
        "Find the right festival for your work. Browse thousands of festivals, filter by category, and submit directly from 35mm.",
      cta: "Browse festivals",
      ctaHref: ROUTES.FESTIVALS,
      gradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
  };

  const { icon: Icon, title, description, cta, ctaHref, gradient, iconBg, iconColor } =
    config[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[280px] md:min-h-[480px] px-4 md:px-10",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl p-6 md:p-12 text-center overflow-hidden",
          `bg-gradient-to-br ${gradient}`,
          "border border-border/60"
        )}
      >
        {/* Decorative film strip corners */}
        <div className="absolute top-4 left-4 opacity-20">
          <Film className="w-8 h-8 text-fg-muted" strokeWidth={1.2} />
        </div>
        <div className="absolute top-4 right-4 opacity-20 rotate-90">
          <Film className="w-8 h-8 text-fg-muted" strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-4 left-4 opacity-20 -rotate-90">
          <Film className="w-8 h-8 text-fg-muted" strokeWidth={1.2} />
        </div>
        <div className="absolute bottom-4 right-4 opacity-20 rotate-180">
          <Film className="w-8 h-8 text-fg-muted" strokeWidth={1.2} />
        </div>

        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
            iconBg,
            iconColor
          )}
        >
          <Icon className="w-8 h-8" strokeWidth={1.5} />
        </div>

        <h2 className="text-[20px] font-semibold italic text-fg mb-3">
          {title}
        </h2>
        <p className="text-[14px] text-fg-muted leading-relaxed max-w-[320px] mx-auto mb-8">
          {description}
        </p>

        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-fg text-bg text-[13px] font-medium no-underline transition-all hover:bg-fg-light hover:-translate-y-0.5"
        >
          {cta}
          <span className="text-[11px] opacity-80">→</span>
        </Link>
      </div>
    </div>
  );
}
