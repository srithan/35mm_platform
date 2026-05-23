import { cn } from "@/lib/utils/cn";

interface RightPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function RightPanel({ children, className }: RightPanelProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 w-[320px] h-screen border-l border-border py-9 px-6 bg-bg overflow-y-auto hidden lg:block",
        className
      )}
    >
      {children}
    </aside>
  );
}
