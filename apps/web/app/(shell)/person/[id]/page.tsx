import type { Metadata } from "next";
import {
  getPersonPageMetadata,
  PersonPageContent,
} from "@/features/person/components/PersonPageContent";

type PersonPageQuery = {
  department?: string | string[];
  media?: string | string[];
  decade?: string | string[];
  genre?: string | string[];
  sort?: string | string[];
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<PersonPageQuery>;
};

export const revalidate = 86400;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return getPersonPageMetadata({ id, legacyQueryDepartment: query.department });
}

export default async function PersonPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return PersonPageContent({
    id,
    legacyQueryDepartment: query.department,
    filterQuery: query,
  });
}
