import { auth } from "@clerk/nextjs/server";

export async function getIsAuthenticated(): Promise<boolean> {
  const session = await auth();
  return Boolean(session.userId);
}

/**
 * @deprecated Use getIsAuthenticated() in server components instead.
 * Kept for backward compatibility during migration.
 */
export const isAuthenticated = process.env.NEXT_PUBLIC_IS_AUTHENTICATED === "true";
