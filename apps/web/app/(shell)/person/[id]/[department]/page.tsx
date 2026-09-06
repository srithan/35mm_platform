import type { Metadata } from "next";
import {
  getPersonPageMetadata,
  PersonPageContent,
} from "@/features/person/components/PersonPageContent";

type PageProps = {
  params: Promise<{ id: string; department: string }>;
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
  const { id, department } = await params;
  return getPersonPageMetadata({ id, routeDepartment: department });
}

export default async function PersonDepartmentPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id, department }, query] = await Promise.all([params, searchParams]);
  return PersonPageContent({
    id,
    routeDepartment: department,
    filterQuery: query,
  });
}
