import { cn } from "@/lib/utils/cn";

/** Dot colors by canonical role label (match API / display strings). */
export const ROLE_DOT_COLORS: Record<string, string> = {
  Cinephile: "var(--color-accent)",
  Creator: "#6366f1",
  Critic: "#0ea5e9",
  Director: "#6366f1",
  "Film Critic": "#0ea5e9",
  Cinematographer: "#10b981",
  "Film Student": "#f59e0b",
  Editor: "#a855f7",
  Screenwriter: "#ec4899",
  Industry: "#78716c",
};

export function getRoleDotColor(roleLabel: string): string {
  return ROLE_DOT_COLORS[roleLabel] ?? ROLE_DOT_COLORS.Industry;
}

/**
 * Secondary segment after "·" — Cinephile uses `filmsLoggedCount`; others use `roleContext`.
 */
export function formatRoleContextSegment(
  roleLabel: string,
  opts: { roleContext?: string | null; filmsLoggedCount?: number | null }
): string | null {
  if (roleLabel === "Cinephile") {
    const n = opts.filmsLoggedCount;
    if (n == null || typeof n !== "number" || Number.isNaN(n)) return null;
    if (n <= 0) return null;
    return `${n.toLocaleString()} films logged`;
  }
  const ctx = opts.roleContext;
  if (typeof ctx !== "string") return null;
  const t = ctx.trim();
  return t.length > 0 ? t : null;
}

export function UserRoleHeadline(props: {
  role: string;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
  textClassName: string;
}) {
  const label = props.role.trim();
  if (!label) return null;

  const dotColor = getRoleDotColor(label);
  const context = formatRoleContextSegment(label, {
    roleContext: props.roleContext,
    filmsLoggedCount: props.filmsLoggedCount,
  });

  return (
    <div className="mt-[3px] flex w-fit items-center gap-1.5 leading-none">
      <span
        className="h-[5px] w-[5px] flex-shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className={cn("font-sans font-medium leading-[1.2] text-fg-muted", props.textClassName)}>
        {label}
        {context ? (
          <>
            {" "}
            · {context}
          </>
        ) : null}
      </span>
    </div>
  );
}

export const profileHeadlinePillClassName =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--accent)_7%,var(--sunken))] px-3.5 py-1.5";

/** Accent pill — profile page + hover card; visually distinct from bio body text. */
export function ProfileCustomHeadlinePill(props: {
  headline: string;
  headlineContext?: string | null;
  className?: string;
}) {
  const headline = props.headline.trim();
  if (!headline) return null;

  const headlineContext = props.headlineContext?.trim() ?? "";

  return (
    <div className={cn(profileHeadlinePillClassName, props.className)}>
      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" aria-hidden />
      <span className="min-w-0 text-[12.5px] font-semibold leading-none text-accent">
        {headline}
        {headlineContext.length > 0 ? (
          <span className="font-semibold"> · {headlineContext}</span>
        ) : null}
      </span>
    </div>
  );
}

/** Accent pill — profile page + hover card; visually distinct from bio body text. */
export function ProfileRoleHeadlinePill(props: {
  role: string;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
  className?: string;
}) {
  const label = props.role.trim();
  if (!label) return null;

  const dotColor = getRoleDotColor(label);
  const context = formatRoleContextSegment(label, {
    roleContext: props.roleContext,
    filmsLoggedCount: props.filmsLoggedCount,
  });

  return (
    <div className={cn(profileHeadlinePillClassName, "px-3 py-1", props.className)}>
      <span
        className="h-[6px] w-[6px] shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="min-w-0 text-[12px] font-semibold leading-none text-accent">
        {label}
        {context ? <span className="font-semibold"> · {context}</span> : null}
      </span>
    </div>
  );
}
