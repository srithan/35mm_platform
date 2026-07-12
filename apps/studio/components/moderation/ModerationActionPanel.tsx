'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ModerationActionDto } from '@35mm/types';
import type {
  ModerationActionPayloadInput,
  ModerationDismissPayloadInput,
} from '@35mm/validators';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ModerationApiError } from '@/lib/moderation/api';
import {
  MODERATION_ACTION_OPTIONS,
  SUSPEND_DURATION_OPTIONS,
  type EnforcementAction,
  type ModerationActionOption,
} from '@/lib/moderation/constants';

const REASON_MAX = 1000;
const NOTES_MAX = 5000;

function errorMessage(error: unknown): string {
  if (error instanceof ModerationApiError) {
    if (error.status === 403) return error.message || 'You are not authorized for this action.';
    if (error.status === 404) return 'The target content no longer exists.';
    if (error.status === 409) return error.message || 'Conflict — this action could not be applied. Retry.';
    if (error.status === 429) return 'Rate limited. Wait a moment and try again.';
    if (error.status === 503) return 'Enforcement committed but cache sync failed. Retry the same action.';
    return error.message || 'Moderation request failed.';
  }
  return error instanceof Error ? error.message : 'Moderation request failed.';
}

export function ModerationActionPanel({
  applyAction,
  dismiss,
}: {
  applyAction: UseMutationResult<ModerationActionDto, Error, ModerationActionPayloadInput>;
  dismiss: UseMutationResult<ModerationActionDto, Error, ModerationDismissPayloadInput>;
}) {
  const [action, setAction] = useState<EnforcementAction>(MODERATION_ACTION_OPTIONS[0].value);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(SUSPEND_DURATION_OPTIONS[2].minutes);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [dismissNotes, setDismissNotes] = useState('');

  const selected = useMemo<ModerationActionOption>(
    () => MODERATION_ACTION_OPTIONS.find((option) => option.value === action) ?? MODERATION_ACTION_OPTIONS[0],
    [action],
  );

  const reasonValid = reason.trim().length > 0 && reason.trim().length <= REASON_MAX;
  const notesValid = notes.trim().length <= NOTES_MAX;
  const canApply = reasonValid && notesValid && !applyAction.isPending;

  function buildPayload(): ModerationActionPayloadInput {
    const metadata: Record<string, unknown> = {};
    if (selected.needsDuration) metadata.durationMinutes = durationMinutes;
    return {
      action,
      reason: reason.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      metadata,
    };
  }

  async function runApply() {
    try {
      await applyAction.mutateAsync(buildPayload());
      toast.success(`${selected.label} applied`);
      setReason('');
      setNotes('');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function onApplyClick() {
    if (!canApply) return;
    if (selected.destructive) {
      setConfirmOpen(true);
      return;
    }
    void runApply();
  }

  async function runDismiss() {
    try {
      await dismiss.mutateAsync(dismissNotes.trim() ? { notes: dismissNotes.trim() } : {});
      toast.success('Reports dismissed — no violation recorded');
      setDismissNotes('');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Take action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select value={action} onValueChange={(value) => setAction(value as EnforcementAction)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODERATION_ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{selected.description}</p>
        </div>

        {selected.needsDuration ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Select
              value={String(durationMinutes)}
              onValueChange={(value) => setDurationMinutes(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUSPEND_DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.minutes} value={String(option.minutes)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Reason (required)</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {reason.trim().length}/{REASON_MAX}
            </span>
          </div>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Policy basis for this decision"
            rows={2}
            maxLength={REASON_MAX}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Internal notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Evidence or context for the audit trail"
            rows={2}
            maxLength={NOTES_MAX}
          />
        </div>

        <Button className="w-full" disabled={!canApply} onClick={onApplyClick}>
          {applyAction.isPending ? 'Applying…' : `Apply: ${selected.label}`}
        </Button>

        <Separator />

        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">Dismiss reports</p>
            <p className="text-xs text-muted-foreground">
              No violation found. Resolves open reports and restores any auto-hidden content.
            </p>
          </div>
          <Textarea
            value={dismissNotes}
            onChange={(event) => setDismissNotes(event.target.value)}
            placeholder="Optional note (why no action)"
            rows={2}
            maxLength={NOTES_MAX}
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={dismiss.isPending || dismissNotes.trim().length > NOTES_MAX}
            onClick={() => void runDismiss()}
          >
            {dismiss.isPending ? 'Dismissing…' : 'Dismiss — no action'}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selected.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected.description}
              {selected.addsStrike ? ' This adds a strike to the author.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" type="button">Cancel</Button>} />
            <LoadingButton
              variant="destructive"
              isLoading={applyAction.isPending}
              loadingText="Applying"
              onClick={async () => {
                setConfirmOpen(false);
                await runApply();
              }}
            >
              Confirm
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
