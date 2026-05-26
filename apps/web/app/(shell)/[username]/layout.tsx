import { ProfileUsernameLayout } from "@/features/profile/components/ProfileUsernameLayout";

export default async function UsernameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const resolved = await params;

  return (
    <ProfileUsernameLayout username={resolved.username.toLowerCase()}>
      {children}
    </ProfileUsernameLayout>
  );
}
