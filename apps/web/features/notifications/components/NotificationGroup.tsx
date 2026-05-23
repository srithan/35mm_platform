interface NotificationGroupProps {
  dateLabel: string;
  children: React.ReactNode;
}

export function NotificationGroup({ dateLabel, children }: NotificationGroupProps) {
  return (
    <div className="pt-5 pb-1.5 first:pt-0">
      <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium px-4 md:px-4">
        {dateLabel}
      </div>
      {children}
    </div>
  );
}
