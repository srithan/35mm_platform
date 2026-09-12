import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  getPersonCanonicalIdentity,
  getPersonPageMetadata,
  PersonPageContent,
} from "@/features/person/components/PersonPageContent";
import { ROUTES } from "@/lib/constants/routes";
import type { PersonRoleSlug } from "@/lib/routing/personRoles";

type PersonFilterQuery = {
  media?: string | string[];
  decade?: string | string[];
  genre?: string | string[];
  sort?: string | string[];
};

export type PersonDepartmentPageProps<
  Params extends { slug: string } = { slug: string },
> = {
  params: Promise<Params>;
  searchParams: Promise<PersonFilterQuery>;
};

function querySuffix(query: PersonFilterQuery): string {
  const next = new URLSearchParams();
  Object.entries(query).forEach(function ([key, value]) {
    if (typeof value === "string") next.set(key, value);
    else value?.forEach(function (item) {
      next.append(key, item);
    });
  });
  return next.size ? "?" + next.toString() : "";
}

export async function getPersonDepartmentMetadata<
  Params extends { slug: string },
>(
  props: PersonDepartmentPageProps<Params>,
  department: PersonRoleSlug,
): Promise<Metadata> {
  const { slug } = await props.params;
  return getPersonPageMetadata({ id: slug, routeDepartment: department });
}

export async function renderPersonDepartmentPage<
  Params extends { slug: string },
>(
  props: PersonDepartmentPageProps<Params>,
  department: PersonRoleSlug,
) {
  const [{ slug }, query] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  if (/^\d+$/.test(slug)) {
    const identity = await getPersonCanonicalIdentity(slug, department);
    if (identity) {
      permanentRedirect(
        ROUTES.PERSON_ROLE(identity.slug, department) + querySuffix(query),
      );
    }
  }

  return PersonPageContent({
    id: slug,
    routeDepartment: department,
    filterQuery: query,
  });
}
