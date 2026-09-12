import type { Metadata } from "next";
import {
  getPersonCanonicalIdentity,
  getPersonPageMetadata,
} from "@/features/person/components/PersonPageContent";
import { ROUTES } from "@/lib/constants/routes";
import {
  isPersonRoleSlug,
  normalizePersonRoleSlug,
} from "@/lib/routing/personRoles";
import { notFound, permanentRedirect } from "next/navigation";

type PersonPageQuery = {
  department?: string | string[];
  media?: string | string[];
  decade?: string | string[];
  genre?: string | string[];
  sort?: string | string[];
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PersonPageQuery>;
};

export const revalidate = 86400;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return getPersonPageMetadata({ id: slug, legacyQueryDepartment: query.department });
}

export default async function PersonPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const legacyDepartment = Array.isArray(query.department)
    ? query.department[0]
    : query.department;
  const requestedRole = legacyDepartment
    ? normalizePersonRoleSlug(legacyDepartment)
    : null;
  const identity = await getPersonCanonicalIdentity(
    slug,
    requestedRole && isPersonRoleSlug(requestedRole) ? requestedRole : undefined,
  );
  if (!identity) notFound();
  const role =
    requestedRole && isPersonRoleSlug(requestedRole)
      ? requestedRole
      : identity.role;
  const next = new URLSearchParams();
  Object.entries(query).forEach(function ([key, value]) {
    if (key === "department") return;
    if (typeof value === "string") next.set(key, value);
    else value?.forEach(function (item) {
      next.append(key, item);
    });
  });
  permanentRedirect(
    ROUTES.PERSON_ROLE(identity.slug, role) +
      (next.size ? "?" + next.toString() : ""),
  );
}
