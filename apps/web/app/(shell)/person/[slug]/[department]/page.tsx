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

type PageProps = {
  params: Promise<{ slug: string; department: string }>;
  searchParams: Promise<{
    media?: string | string[];
    decade?: string | string[];
    genre?: string | string[];
    sort?: string | string[];
  }>;
};

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, department } = await params;
  return getPersonPageMetadata({ id: slug, routeDepartment: department });
}

export default async function PersonDepartmentPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug, department }, query] = await Promise.all([params, searchParams]);
  const role = normalizePersonRoleSlug(department);
  if (!isPersonRoleSlug(role)) notFound();
  const identity = await getPersonCanonicalIdentity(slug, role);
  if (!identity) notFound();
  const next = new URLSearchParams();
  Object.entries(query).forEach(function ([key, value]) {
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
