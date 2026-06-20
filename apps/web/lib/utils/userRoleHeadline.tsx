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
