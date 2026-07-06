import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { ClerkSetupNotice } from '@/components/auth/ClerkSetupNotice';
import { CustomAuthForm } from '@/components/auth/CustomAuthForm';

export default function SignUpPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <AuthPageShell eyebrow="First operator" title="Create the first secure Studio account.">
      {clerkEnabled ? (
        <CustomAuthForm mode="sign-up" />
      ) : (
        <ClerkSetupNotice />
      )}
    </AuthPageShell>
  );
}
