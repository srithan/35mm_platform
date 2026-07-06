'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, ShieldCheck, UnlockKeyhole, UserCheck, UserX } from 'lucide-react';
import { AdminMetricCard, PageIntro } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  checkStudioUsername,
  lockStudioUsername,
  useStudioUsers,
  type StudioUserAccount,
  type StudioUsernameAvailability,
  type StudioUsernameRecord,
} from '@/lib/studio/api';

const statusVariant: Record<StudioUserAccount['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'secondary',
  deactivated: 'outline',
  suspended: 'destructive',
};

const reservationVariant: Record<StudioUsernameRecord['state'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reserved: 'default',
  locked: 'secondary',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useStudioUsers();
  const stats = usersQuery.data?.stats;
  const accounts = usersQuery.data?.accounts ?? [];
  const usernames = usersQuery.data?.usernames ?? [];
  const [usernameInput, setUsernameInput] = useState('');
  const [lockType, setLockType] = useState<'locked' | 'reserved'>('locked');
  const [lockOwner, setLockOwner] = useState('studio');
  const [lockReason, setLockReason] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<StudioUsernameAvailability | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [lockingUsername, setLockingUsername] = useState(false);

  async function handleCheckUsername() {
    const username = usernameInput.trim();
    setUsernameError(null);
    setUsernameStatus(null);

    if (!username) {
      setUsernameError('Enter a username.');
      return;
    }

    setCheckingUsername(true);
    try {
      setUsernameStatus(await checkStudioUsername(username));
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Username check failed.');
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleLockUsername() {
    const username = usernameInput.trim();
    setUsernameError(null);

    if (!usernameStatus?.canLock) {
      setUsernameError('Check an available username before locking.');
      return;
    }

    if (!lockOwner.trim()) {
      setUsernameError('Owner is required.');
      return;
    }

    if (!lockReason.trim()) {
      setUsernameError('Reason is required.');
      return;
    }

    setLockingUsername(true);
    try {
      await lockStudioUsername({
        username,
        state: lockType,
        owner: lockOwner.trim(),
        reason: lockReason.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['studio', 'users'] });
      setUsernameStatus(await checkStudioUsername(username));
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Username lock failed.');
    } finally {
      setLockingUsername(false);
    }
  }

  return (
    <AppShell title="Users">
      <PageIntro
        title="User operations"
        description="Account status, roles, username availability, cooldowns, and identity review across the 35mm social graph."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Active accounts" value={String(stats?.active ?? '...')} detail="accounts in good standing" icon={UserCheck} />
        <AdminMetricCard label="Deactivated" value={String(stats?.deactivated ?? '...')} detail="accounts closed or disabled" icon={ShieldCheck} />
        <AdminMetricCard label="Suspended" value={String(stats?.suspended ?? '...')} detail="restricted account access" risk={stats?.suspended ? 'high' : undefined} icon={UserX} />
        <AdminMetricCard label="Locked usernames" value={String(stats?.reservedUsernames ?? '...')} detail={`${stats?.takenUsernames ?? '...'} assigned usernames, hidden from list`} icon={LockKeyhole} />
      </section>

      {usersQuery.isError ? (
        <Card className="border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="pt-4 text-sm text-red-900 dark:text-red-200">
            {usersQuery.error instanceof Error ? usersQuery.error.message : 'Users API failed'}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="accounts" className="gap-4">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="usernames">Usernames</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Admin-facing account inventory from platform database</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.handle} · {user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[user.status]} className="capitalize">{user.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{user.posts}</TableCell>
                      <TableCell className="text-right tabular-nums">{user.followers}</TableCell>
                      <TableCell>{user.onboardingCompleted ? 'Complete' : 'Incomplete'}</TableCell>
                      <TableCell>{user.joined}</TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                        {usersQuery.isLoading ? 'Loading accounts.' : 'No account records found.'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usernames">
          <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Username control</CardTitle>
                <CardDescription>Reserve, lock, or release usernames from public availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="username"
                      className="h-9"
                      value={usernameInput}
                      onChange={(event) => {
                        setUsernameInput(event.currentTarget.value);
                        setUsernameStatus(null);
                        setUsernameError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleCheckUsername();
                        }
                      }}
                    />
                    <Button className="h-9" variant="outline" onClick={() => void handleCheckUsername()} disabled={checkingUsername || lockingUsername}>
                      {checkingUsername ? 'Checking' : 'Check'}
                    </Button>
                    <Button className="h-9 gap-1.5" onClick={() => void handleLockUsername()} disabled={!usernameStatus?.canLock || lockingUsername}>
                      <LockKeyhole className="size-3.5" />
                      {lockingUsername ? 'Locking' : 'Lock'}
                    </Button>
                  </div>
                  {usernameStatus ? (
                    <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{usernameStatus.message}</p>
                      {usernameStatus.owner || usernameStatus.reason ? (
                        <p className="mt-1">
                          {usernameStatus.owner ? `Owner: ${usernameStatus.owner}. ` : ''}
                          {usernameStatus.reason ?? ''}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {usernameError ? (
                    <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{usernameError}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Reservation type</Label>
                    <Select value={lockType} onValueChange={(value) => setLockType(value === 'reserved' ? 'reserved' : 'locked')}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locked">Locked</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Owner</Label>
                    <Input placeholder="trust, brand, catalog..." className="h-9" value={lockOwner} onChange={(event) => setLockOwner(event.currentTarget.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Input placeholder="Why this username should not be publicly available" className="h-9" value={lockReason} onChange={(event) => setLockReason(event.currentTarget.value)} />
                </div>

                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Search checks exact username only. Taken user-owned names stay out of the list and appear only in lookup results.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Locked and reserved usernames</CardTitle>
                <CardDescription>Policy and admin-held names only; user-owned usernames are checked on search</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usernames.map((item) => (
                      <TableRow key={item.username}>
                        <TableCell className="font-medium">@{item.username}</TableCell>
                        <TableCell>
                          <Badge variant={reservationVariant[item.state]} className="capitalize">{item.state}</Badge>
                        </TableCell>
                        <TableCell>{item.owner}</TableCell>
                        <TableCell>
                          <div>
                            <p>{item.reason}</p>
                            <p className="text-xs text-muted-foreground">Updated {item.updatedAt}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled>
                            <UnlockKeyhole className="size-3.5" />
                            {item.state === 'reserved' ? 'Unlock' : 'Inspect'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {usernames.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                          {usersQuery.isLoading ? 'Loading usernames.' : 'No username records found.'}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Username cooldowns</CardTitle>
                <CardDescription>Recently released usernames waiting before becoming public again</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Previous owner</TableHead>
                      <TableHead>Released</TableHead>
                      <TableHead>Public unlock</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                        No cooldown records found. Platform schema does not yet include username cooldowns.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Username audit</CardTitle>
                <CardDescription>Recent admin-side username events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No audit events found. Platform schema does not yet include username audit events.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
