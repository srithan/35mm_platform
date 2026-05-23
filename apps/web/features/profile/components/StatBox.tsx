import { cn } from "@/lib/utils/cn";

interface StatBoxProps {
  value: string | number;
  label: string;
  sub?: string;
  className?: string;
}

export function StatBox({ value, label, sub, className }: StatBoxProps) {
  return (
    <div
      className={cn(
        "bg-bg p-6 px-10 animate-fade-up",
        className
      )}
    >
      <div className="font-display text-[42px] font-semibold leading-none text-fg">
        {value}
      </div>
      <div className="text-[11px] tracking-[0.1em] uppercase text-fg-muted mt-1.5">
        {label}
      </div>
      {sub && <div className="text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
