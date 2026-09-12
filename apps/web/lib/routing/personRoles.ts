export const PERSON_ROLE_SLUGS = [
  "actor",
  "creator",
  "director",
  "writer",
  "producer",
  "editor",
  "cinematographer",
  "composer",
  "production-designer",
  "art-director",
  "sets-decoration",
  "costume",
  "makeup",
  "visual-effects",
  "special-effects",
  "stunts",
  "lighting",
  "sound",
  "casting",
  "choreography",
  "animation",
  "camera",
  "art",
  "production",
  "costume-and-makeup",
  "crew",
] as const;

export type PersonRoleSlug = (typeof PERSON_ROLE_SLUGS)[number];

const ROLE_ALIASES: Record<string, PersonRoleSlug> = {
  acting: "actor",
  "filmography-acting": "actor",
  directing: "director",
  "filmography-directing": "director",
  writing: "writer",
  "filmography-writing": "writer",
  editing: "editor",
  "set-decoration": "sets-decoration",
  "costume & make-up": "costume-and-makeup",
  "costume-and-make-up": "costume-and-makeup",
  "visual effects": "visual-effects",
};

const DEPARTMENT_FALLBACKS: Record<string, PersonRoleSlug> = {
  Acting: "actor",
  Directing: "director",
  Writing: "writer",
  Production: "production",
  Editing: "editor",
  Camera: "camera",
  Sound: "sound",
  Art: "art",
  "Costume & Make-Up": "costume-and-makeup",
  "Visual Effects": "visual-effects",
  Lighting: "lighting",
  Crew: "crew",
};

const JOB_ROLE_MATCHERS: Array<{
  pattern: RegExp;
  role: PersonRoleSlug;
}> = [
  { pattern: /^(director|co-director|second unit director)$/i, role: "director" },
  { pattern: /^(creator|series creator)$/i, role: "creator" },
  { pattern: /(screenplay|writer|writing|story|teleplay|characters)/i, role: "writer" },
  { pattern: /producer/i, role: "producer" },
  { pattern: /^(editor|film editor)$/i, role: "editor" },
  { pattern: /(director of photography|cinematograph)/i, role: "cinematographer" },
  { pattern: /(original music composer|composer)/i, role: "composer" },
  { pattern: /production design/i, role: "production-designer" },
  { pattern: /art direction/i, role: "art-director" },
  { pattern: /(set decoration|set decorator|set dresser)/i, role: "sets-decoration" },
  { pattern: /costume/i, role: "costume" },
  { pattern: /(makeup|make-up|hair stylist|hairstylist)/i, role: "makeup" },
  { pattern: /special effects/i, role: "special-effects" },
  { pattern: /visual effects|\bvfx\b/i, role: "visual-effects" },
  { pattern: /stunt/i, role: "stunts" },
  { pattern: /(gaffer|lighting|electrician|best boy)/i, role: "lighting" },
  { pattern: /(sound|foley|adr|boom operator)/i, role: "sound" },
  { pattern: /casting/i, role: "casting" },
  { pattern: /choreograph/i, role: "choreography" },
  { pattern: /animat/i, role: "animation" },
  { pattern: /(camera operator|steadicam|camera assistant)/i, role: "camera" },
];

export function normalizePersonRoleSlug(value: string): string {
  const normalized = value.trim().toLowerCase();
  return ROLE_ALIASES[normalized] || normalized;
}

export function isPersonRoleSlug(value: string): value is PersonRoleSlug {
  return PERSON_ROLE_SLUGS.includes(value as PersonRoleSlug);
}

export function personRoleForCredit(input: {
  department?: string | null;
  isCast?: boolean;
  job?: string | null;
}): PersonRoleSlug {
  if (input.isCast) return "actor";
  const job = input.job?.trim();
  if (job) {
    const match = JOB_ROLE_MATCHERS.find(function (candidate) {
      return candidate.pattern.test(job);
    });
    if (match) return match.role;
  }
  return DEPARTMENT_FALLBACKS[input.department?.trim() || "Crew"] || "crew";
}

export function personRoleForKnownDepartment(
  department?: string | null,
): PersonRoleSlug {
  if (!department) return "crew";
  if (department === "Production") return "producer";
  return DEPARTMENT_FALLBACKS[department.trim()] || "crew";
}

export function isPersonRolePath(pathname: string | null): boolean {
  if (!pathname) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return false;
  const role = segments[0] || "";
  return isPersonRoleSlug(role);
}
