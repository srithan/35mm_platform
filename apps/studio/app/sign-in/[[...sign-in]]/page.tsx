import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { ClerkSetupNotice } from '@/components/auth/ClerkSetupNotice';
import { CustomAuthForm } from '@/components/auth/CustomAuthForm';

export default function SignInPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <AuthPageShell eyebrow="Welcome back" title="Return to the operations workspace.">
      {clerkEnabled ? (
        <CustomAuthForm mode="sign-in" />
      ) : (
        <ClerkSetupNotice />
      )}
    </AuthPageShell>
  );
}
