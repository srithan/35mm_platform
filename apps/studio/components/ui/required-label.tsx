import type { ComponentProps } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function RequiredLabel({ className, children, ...props }: ComponentProps<typeof Label>) {
  return (
    <Label className={cn('gap-1', className)} {...props}>
      {children}
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
      <span className="sr-only">required</span>
    </Label>
  );
}
