import { cn } from "@/lib/utils/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    children,
    ...props
  },
  ref
) {
  const base =
    "font-semibold tracking-[0.01em] rounded-full transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5";
  const variants = {
    primary:
      "bg-fg text-bg border border-fg hover:opacity-90",
    secondary:
      "bg-transparent text-fg border border-border hover:border-fg-muted hover:bg-hover",
    ghost:
      "bg-transparent text-fg-muted hover:text-fg border border-transparent hover:bg-hover",
    danger:
      "bg-transparent text-accent border border-accent/40 hover:bg-accent/5 hover:border-accent",
  };
  const sizes = {
    xs: "text-[11px] px-3 py-1.5",
    sm: "text-[12.5px] px-4 py-1.5 h-8",
    md: "text-[13.5px] px-5 py-2.5 h-10",
    icon: "w-8 h-8 p-0",
  };

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});
