import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPersonDepartmentMetadata,
  renderPersonDepartmentPage,
  type PersonDepartmentPageProps,
} from "@/features/person/server/personDepartmentRoute";
import { isPersonRoleSlug } from "@/lib/routing/personRoles";

type PageProps = PersonDepartmentPageProps<{
  slug: string;
  username: string;
}>;

export const revalidate = 86400;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { username } = await props.params;
  if (!isPersonRoleSlug(username)) return { title: "Not found" };
  return getPersonDepartmentMetadata(props, username);
}

export default async function PersonRolePage(props: PageProps) {
  const { username } = await props.params;
  if (!isPersonRoleSlug(username)) notFound();
  return renderPersonDepartmentPage(props, username);
}
