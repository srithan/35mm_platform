import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { LandingAuthPanel } from '@/components/auth/LandingAuthPanel';

export default function Home() {
  return (
    <AuthPageShell>
      <LandingAuthPanel clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
    </AuthPageShell>
  );
}
