'use client';

import { FormEvent, type InputHTMLAttributes, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  studioRoleDescriptions,
  studioRoleLabels,
  studioRolePermissions,
  type StudioRole,
} from '@/lib/auth/accessControl';
import { cn } from '@/lib/utils';

type AuthMode = 'sign-in' | 'sign-up';
type AuthStep = 'credentials' | 'verify-email' | 'sign-in-code' | 'second-factor';
type SecondFactorStrategy = 'email_code' | 'phone_code' | 'totp' | 'backup_code';
type ClerkMethodResult = { error?: unknown | null };
type SignInClient = {
  status?: string;
  createdSessionId?: string | null;
  supportedSecondFactors?: Array<{ strategy?: string }>;
  password: (params: { identifier: string; password: string }) => Promise<ClerkMethodResult>;
  finalize: () => Promise<ClerkMethodResult>;
  emailCode: {
    sendCode: (params: { emailAddress: string }) => Promise<ClerkMethodResult>;
    verifyCode: (params: { code: string }) => Promise<ClerkMethodResult>;
  };
  mfa?: {
    sendEmailCode?: () => Promise<ClerkMethodResult>;
    verifyEmailCode?: (params: { code: string }) => Promise<ClerkMethodResult>;
    sendPhoneCode?: () => Promise<ClerkMethodResult>;
    verifyPhoneCode?: (params: { code: string }) => Promise<ClerkMethodResult>;
    verifyTOTP?: (params: { code: string }) => Promise<ClerkMethodResult>;
    verifyBackupCode?: (params: { code: string }) => Promise<ClerkMethodResult>;
  };
};
type SignUpClient = {
  status?: string;
  createdSessionId?: string | null;
  create: (params: {
    emailAddress: string;
    password: string;
    firstName?: string;
    lastName?: string;
    unsafeMetadata?: Record<string, unknown>;
  }) => Promise<ClerkMethodResult>;
  finalize: () => Promise<ClerkMethodResult>;
  verifications: {
    sendEmailCode: () => Promise<ClerkMethodResult>;
    verifyEmailCode: (params: { code: string }) => Promise<ClerkMethodResult>;
  };
};

const roleOptions: StudioRole[] = ['catalog', 'moderation', 'systems', 'admin'];

export function CustomAuthForm({
  mode,
  compact = false,
}: {
  mode: AuthMode;
  compact?: boolean;
}) {
  const signInState = useSignIn() as unknown as { isLoaded?: boolean; signIn?: SignInClient };
  const signUpState = useSignUp() as unknown as { isLoaded?: boolean; signUp?: SignUpClient };
  const signIn = signInState.signIn;
  const signUp = signUpState.signUp;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<StudioRole>('catalog');
  const [code, setCode] = useState('');
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<SecondFactorStrategy | null>(null);
  const [step, setStep] = useState<AuthStep>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === 'sign-up';
  const ready = isSignUp
    ? Boolean(signUpState.isLoaded ?? signUp)
    : Boolean(signInState.isLoaded ?? signIn);
  const title = isSignUp ? 'Create Studio account' : 'Sign in to Studio';
  const description = isSignUp
    ? 'Request correct org role during signup. Admin can change it later in Clerk.'
    : 'Use your workspace credentials. Controls depend on org role.';
  const submitLabel = isSignUp ? 'Create account' : 'Sign in';
  const Icon = isSignUp ? KeyRound : LogIn;
  const rolePermissions = useMemo(() => studioRolePermissions[role].slice(0, 4), [role]);

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (isSignUp) {
        if (!signUp) {
          throw new Error('Clerk sign-up client not ready.');
        }

        const created = await signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
          unsafeMetadata: {
            studioRole: role,
          },
        });

        if (created.error) {
          throw created.error;
        }

        if (await finalizeIfComplete(signUp)) {
          return;
        }

        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) {
          throw sent.error;
        }
        setStep('verify-email');
        return;
      }

      if (!signIn) {
        throw new Error('Clerk sign-in client not ready.');
      }

      const result = await signIn.password({
        identifier: email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      if (await finalizeIfComplete(signIn)) {
        return;
      }

      if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
        const strategy = await beginSecondFactor(signIn);
        setSecondFactorStrategy(strategy);
        setCode('');
        setStep('second-factor');
        return;
      }

      setError(getIncompleteSignInMessage(signIn.status));
    } catch (caught) {
      setError(getClerkErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function handleSendSignInCode() {
    setError(null);

    if (!email) {
      setError('Enter email first.');
      return;
    }

    if (!signIn) {
      setError('Clerk sign-in client not ready.');
      return;
    }

    setPending(true);
    try {
      const sent = await signIn.emailCode.sendCode({ emailAddress: email });
      if (sent.error) {
        throw sent.error;
      }
      setStep('sign-in-code');
    } catch (caught) {
      setError(getClerkErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function handleSignInCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (!signIn) {
        throw new Error('Clerk sign-in client not ready.');
      }

      const result = await signIn.emailCode.verifyCode({ code });
      if (result.error) {
        throw result.error;
      }

      if (await finalizeIfComplete(signIn)) {
        return;
      }

      if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
        const strategy = await beginSecondFactor(signIn);
        setSecondFactorStrategy(strategy);
        setCode('');
        setStep('second-factor');
        return;
      }

      setError(getIncompleteSignInMessage(signIn.status));
    } catch (caught) {
      setError(getClerkErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (!signUp) {
        throw new Error('Clerk sign-up client not ready.');
      }

      const result = await signUp.verifications.verifyEmailCode({ code });

      if (result.error) {
        throw result.error;
      }

      if (await finalizeIfComplete(signUp)) {
        return;
      }

      setError('Verification incomplete. Check code and try again.');
    } catch (caught) {
      setError(getClerkErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function handleSecondFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (!signIn) {
        throw new Error('Clerk sign-in client not ready.');
      }

      const result = await verifySecondFactor(signIn, secondFactorStrategy, code);
      if (result.error) {
        throw result.error;
      }

      if (await finalizeIfComplete(signIn)) {
        return;
      }

      setError(getIncompleteSignInMessage(signIn.status));
    } catch (caught) {
      setError(getClerkErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="space-y-3 rounded-[8px] border bg-card p-4 shadow-sm">
        <div className="h-9 animate-pulse rounded-[8px] bg-muted" />
        <div className="h-9 animate-pulse rounded-[8px] bg-muted" />
        <div className="h-9 animate-pulse rounded-[8px] bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[8px] border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-amber-600" />
          {title}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {step === 'credentials' ? (
        <form className="space-y-3" onSubmit={handleCredentialsSubmit}>
          {isSignUp ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" value={firstName} onChange={setFirstName} autoComplete="given-name" />
              <Field label="Last name" value={lastName} onChange={setLastName} autoComplete="family-name" />
            </div>
          ) : null}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
          />

          {isSignUp ? (
            <div className="space-y-2">
              <Label>Requested access</Label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      'rounded-[8px] border p-3 text-left text-sm transition-colors',
                      role === option ? 'border-foreground bg-secondary' : 'hover:bg-muted',
                    )}
                    onClick={() => setRole(option)}
                  >
                    <span className="block font-medium">{studioRoleLabels[option]}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {studioRoleDescriptions[option]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rolePermissions.map((permission) => (
                  <Badge key={permission} variant="secondary">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {isSignUp ? <div id="clerk-captcha" className="min-h-0" /> : null}

          {error ? <p className="rounded-[8px] bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="h-10 w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
            {submitLabel}
          </Button>

          {!isSignUp ? (
            <Button type="button" variant="outline" className="h-10 w-full gap-2" disabled={pending} onClick={handleSendSignInCode}>
              <Mail className="size-4" />
              Email code instead
            </Button>
          ) : null}
        </form>
      ) : step === 'verify-email' ? (
        <form className="space-y-3" onSubmit={handleVerifySubmit}>
          <div className="rounded-[8px] border bg-secondary/50 p-3 text-sm leading-6 text-muted-foreground">
            <Mail className="mr-2 inline size-4 text-emerald-600" />
            Verification code sent to {email}.
          </div>
          <Field label="Email code" value={code} onChange={setCode} inputMode="numeric" required />
          {error ? <p className="rounded-[8px] bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10 w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Verify email
          </Button>
        </form>
      ) : step === 'sign-in-code' ? (
        <form className="space-y-3" onSubmit={handleSignInCodeSubmit}>
          <div className="rounded-[8px] border bg-secondary/50 p-3 text-sm leading-6 text-muted-foreground">
            <Mail className="mr-2 inline size-4 text-emerald-600" />
            Sign-in code sent to {email}.
          </div>
          <Field label="Email code" value={code} onChange={setCode} inputMode="numeric" required />
          {error ? <p className="rounded-[8px] bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10 w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Verify code
          </Button>
          <Button type="button" variant="ghost" className="h-9 w-full" onClick={() => setStep('credentials')}>
            Back to password
          </Button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={handleSecondFactorSubmit}>
          <div className="rounded-[8px] border bg-secondary/50 p-3 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mr-2 inline size-4 text-emerald-600" />
            {getSecondFactorHelp(secondFactorStrategy)}
          </div>
          <Field label={getSecondFactorLabel(secondFactorStrategy)} value={code} onChange={setCode} inputMode="numeric" required />
          {error ? <p className="rounded-[8px] bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10 w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Verify second factor
          </Button>
          <Button type="button" variant="ghost" className="h-9 w-full" onClick={() => setStep('credentials')}>
            Back to password
          </Button>
        </form>
      )}

      {!compact ? (
        <div className="grid grid-cols-2 gap-2 border-t pt-3">
          <Link href="/sign-up" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Need account?
          </Link>
          <Link href="/sign-in" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Have account?
          </Link>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-[8px] border bg-secondary/45 p-3 text-sm leading-6 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        Custom UI. Clerk handles auth/session only. Role metadata drives visible controls.
      </div>
    </div>
  );
}

async function finalizeIfComplete(resource: { status?: string; createdSessionId?: string | null; finalize: () => Promise<ClerkMethodResult> }) {
  if (resource.status !== 'complete' || !resource.createdSessionId) {
    return false;
  }

  const finalized = await resource.finalize();
  if (finalized.error) {
    throw finalized.error;
  }

  window.location.assign('/dashboard');
  return true;
}

async function beginSecondFactor(signIn: SignInClient) {
  const strategy = getPreferredSecondFactor(signIn);
  if (!strategy) {
    throw new Error('Second-factor verification required, but this form cannot handle the configured factor.');
  }

  if (strategy === 'email_code') {
    const sent = await signIn.mfa?.sendEmailCode?.();
    if (sent?.error) throw sent.error;
  }

  if (strategy === 'phone_code') {
    const sent = await signIn.mfa?.sendPhoneCode?.();
    if (sent?.error) throw sent.error;
  }

  return strategy;
}

async function verifySecondFactor(signIn: SignInClient, strategy: SecondFactorStrategy | null, code: string) {
  if (strategy === 'email_code') {
    return signIn.mfa?.verifyEmailCode?.({ code }) ?? { error: new Error('Email second-factor verification unavailable.') };
  }
  if (strategy === 'phone_code') {
    return signIn.mfa?.verifyPhoneCode?.({ code }) ?? { error: new Error('Phone second-factor verification unavailable.') };
  }
  if (strategy === 'totp') {
    return signIn.mfa?.verifyTOTP?.({ code }) ?? { error: new Error('Authenticator app verification unavailable.') };
  }
  if (strategy === 'backup_code') {
    return signIn.mfa?.verifyBackupCode?.({ code }) ?? { error: new Error('Backup code verification unavailable.') };
  }

  return { error: new Error('Choose a second-factor method before verifying.') };
}

function getPreferredSecondFactor(signIn: SignInClient): SecondFactorStrategy | null {
  const strategies = signIn.supportedSecondFactors?.map((factor) => factor.strategy).filter(Boolean) ?? [];
  const priority: SecondFactorStrategy[] = ['email_code', 'phone_code', 'totp', 'backup_code'];
  return priority.find((strategy) => strategies.includes(strategy)) ?? null;
}

function getSecondFactorLabel(strategy: SecondFactorStrategy | null) {
  if (strategy === 'backup_code') return 'Backup code';
  if (strategy === 'totp') return 'Authenticator code';
  return 'Verification code';
}

function getSecondFactorHelp(strategy: SecondFactorStrategy | null) {
  if (strategy === 'email_code') return 'Second-factor code sent to your email.';
  if (strategy === 'phone_code') return 'Second-factor code sent to your phone.';
  if (strategy === 'totp') return 'Enter the code from your authenticator app.';
  if (strategy === 'backup_code') return 'Enter one of your backup codes.';
  return 'Complete second-factor verification.';
}

function getIncompleteSignInMessage(status: string | undefined) {
  if (status === 'needs_new_password') return 'This account needs a new password before signing in.';
  if (status === 'needs_first_factor') return 'Sign-in needs another first-factor method. Try email code.';
  if (status === 'needs_identifier') return 'Enter an email address to continue.';
  return `Sign-in incomplete${status ? ` (${status})` : ''}.`;
}

export function CustomSignedInPanel() {
  const { user } = useUser();
  const { signOut } = useAuth();

  return (
    <div className="space-y-3 rounded-[8px] border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">Session active</div>
        <div className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress ?? 'Signed in'}</div>
      </div>
      <Link href="/dashboard" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
        Open dashboard
        <ArrowRight className="size-4" />
      </Link>
      <Button variant="outline" className="h-10 w-full" onClick={() => void signOut({ redirectUrl: '/' })}>
        Sign out
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} {...props} />
    </div>
  );
}

function getClerkErrorMessage(error: unknown): string {
  const withCode = (message: string, code: unknown) => {
    return typeof code === 'string' ? `${message} (${code})` : message;
  };

  if (isRecord(error) && typeof error.longMessage === 'string') {
    return withCode(error.longMessage, error.code);
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return withCode(error.message, error.code);
  }

  if (isRecord(error) && Array.isArray(error.errors)) {
    const [first] = error.errors;
    if (isRecord(first) && typeof first.longMessage === 'string') {
      return withCode(first.longMessage, first.code);
    }
    if (isRecord(first) && typeof first.message === 'string') {
      return withCode(first.message, first.code);
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication failed. Check details and try again.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
