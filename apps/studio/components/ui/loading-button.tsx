import type { ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LoadingButtonProps = ComponentProps<typeof Button> & {
  isLoading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  children,
  className,
  disabled,
  isLoading = false,
  loadingText,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      className={cn('gap-1.5', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}
