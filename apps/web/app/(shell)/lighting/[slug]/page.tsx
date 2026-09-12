import type { Metadata } from "next";
import {
  getPersonDepartmentMetadata,
  renderPersonDepartmentPage,
  type PersonDepartmentPageProps,
} from "@/features/person/server/personDepartmentRoute";

const DEPARTMENT = "lighting";
export const revalidate = 86400;

export function generateMetadata(props: PersonDepartmentPageProps): Promise<Metadata> {
  return getPersonDepartmentMetadata(props, DEPARTMENT);
}

export default function LightingPersonPage(props: PersonDepartmentPageProps) {
  return renderPersonDepartmentPage(props, DEPARTMENT);
}
