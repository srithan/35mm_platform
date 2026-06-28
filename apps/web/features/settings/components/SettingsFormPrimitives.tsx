"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/Switch";
import { cn } from "@/lib/utils/cn";
import { settingsPickerCardClass, SettingsPickerCheck } from "./settingsPickerStyles";
import type { ThemeOption } from "@/lib/theme/ThemeProvider";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border pb-8 last:border-b-0 last:pb-0">
      <h2 className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  action,
  href,
  onClick,
}: {
  label: string;
  description?: string;
  action?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="group flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0 sm:items-center">
      <div className="min-w-0">
        <span className="text-[13px] text-fg-light block">{label}</span>
        {description && (
          <span className="text-[11.5px] text-fg-muted mt-0.5 block">
            {description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center pt-0.5 sm:pt-0">
        {action ??
          (href ? (
            <ChevronRight className="h-4 w-4 text-fg-muted group-hover:text-fg" />
          ) : null)}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block -mx-1 px-1 rounded-sm hover:bg-fg/5 transition-colors"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left -mx-1 px-1 rounded-sm hover:bg-fg/5 transition-colors"
      >
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0 sm:items-center">
      <div className="min-w-0">
        <span className="text-[12.5px] text-fg-light block">{label}</span>
        {description && (
          <span className="text-[11.5px] text-fg-muted mt-0.5 block">
            {description}
          </span>
        )}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 sm:mt-0"
        aria-label={label}
      />
    </div>
  );
}

export function SettingsInput({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
  error,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "email";
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <label className="text-[11.5px] text-fg-muted block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full text-[13px] text-fg bg-transparent border border-border rounded-sm px-3 py-2 focus:outline-none focus:border-fg-muted placeholder:text-fg-muted/60",
          error ? "border-accent" : "",
          disabled ? "opacity-60 cursor-not-allowed" : ""
        )}
      />
      {error ? (
        <p className="mt-1 text-[11px] text-accent">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function ThemePicker({ value, onChange }: { value: ThemeOption; onChange: (v: ThemeOption) => void }) {
  const options: {
    id: ThemeOption | "grain" | "oppenheimer-bw" | "kodachrome" | "barbie";
    label: string;
    enabled: boolean;
    selectableId?: ThemeOption;
  }[] = [
      { id: "auto", label: "Auto", enabled: true, selectableId: "auto" },
      { id: "light", label: "Light", enabled: true, selectableId: "light" },
      { id: "dark", label: "Dark", enabled: true, selectableId: "dark" },
      { id: "matrix", label: "Matrix", enabled: true, selectableId: "matrix" },
      { id: "grain", label: "35mm Grain", enabled: false },
      {
        id: "oppenheimer-bw",
        label: "Oppenheimer B&W",
        enabled: true,
        selectableId: "oppenheimer-bw",
      },
      {
        id: "barbie",
        label: "Barbie",
        enabled: true,
        selectableId: "barbie",
      },
      { id: "kodachrome", label: "Kodachrome", enabled: false },
    ];

  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 lg:grid-cols-4">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            if (opt.selectableId) onChange(opt.selectableId);
          }}
          disabled={!opt.enabled}
          aria-disabled={!opt.enabled}
          className={cn(
            "relative flex min-h-[112px] flex-col items-center justify-center gap-2.5 rounded-lg p-2",
            opt.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-80",
            settingsPickerCardClass({ selected: value === opt.id, enabled: opt.enabled })
          )}
        >
          {value === opt.id && opt.enabled ? <SettingsPickerCheck /> : null}
          {/* Mini window preview */}
          <div
            className={cn(
              "flex h-[48px] w-[72px] overflow-hidden rounded-md border border-black/10 shadow-md",
              opt.id === "auto" ? "flex-row" : "",
              opt.id === "oppenheimer-bw" ? "grayscale" : ""
            )}
          >
            {opt.id === "auto" ? (
              <>
                <div className="flex-1 bg-[#faf9f7] flex flex-col">
                  <div className="h-2.5 bg-[#e8e5e0] flex items-center px-1 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex-1 p-1">
                    <div className="h-2 bg-fg/10 rounded w-full mb-1" />
                    <div className="h-1.5 bg-fg/5 rounded w-3/4" />
                  </div>
                </div>
                <div className="flex-1 bg-[#1a1917] flex flex-col">
                  <div className="h-2.5 bg-[#2d2b28] flex items-center px-1 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="flex-1 p-1">
                    <div className="h-2 bg-white/10 rounded w-full mb-1" />
                    <div className="h-1.5 bg-white/5 rounded w-3/4" />
                  </div>
                </div>
              </>
            ) : opt.id === "light" ? (
              <div className="flex-1 bg-[#faf9f7] flex flex-col w-full">
                <div className="h-2.5 bg-[#e8e5e0] flex items-center px-1.5 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 p-1.5">
                  <div className="h-2.5 bg-fg/10 rounded w-full mb-1.5" />
                  <div className="h-1.5 bg-fg/5 rounded w-4/5" />
                </div>
              </div>
            ) : opt.id === "grain" ? (
              <div className="relative flex-1 bg-[#15120f] flex flex-col w-full">
                <div className="h-2.5 bg-[#221d18] flex items-center px-1.5 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#9a3f31]/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#b07e2f]/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6d8e74]/90" />
                </div>
                <div className="absolute inset-y-0 left-0 w-[5px] bg-black/45" />
                <div className="absolute inset-y-0 right-0 w-[5px] bg-black/45" />
                <div className="absolute left-[1px] top-[13px] h-1 w-[3px] rounded-full bg-[#b89f7e]/65" />
                <div className="absolute left-[1px] top-[24px] h-1 w-[3px] rounded-full bg-[#b89f7e]/65" />
                <div className="absolute right-[1px] top-[13px] h-1 w-[3px] rounded-full bg-[#b89f7e]/65" />
                <div className="absolute right-[1px] top-[24px] h-1 w-[3px] rounded-full bg-[#b89f7e]/65" />
                <div className="relative flex-1 p-1.5">
                  <div className="h-2.5 bg-[#f0dfc4]/12 rounded w-full mb-1.5" />
                  <div className="h-1.5 bg-[#f0dfc4]/8 rounded w-4/5" />
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.12)_0,transparent_34%),radial-gradient(circle_at_78%_70%,rgba(255,255,255,0.1)_0,transparent_30%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.6)_0px,rgba(255,255,255,0.6)_1px,transparent_1px,transparent_3px)]" />
              </div>
            ) : opt.id === "oppenheimer-bw" ? (
              <div className="relative flex-1 bg-[#0f0f0f] flex flex-col w-full">
                <div className="h-2.5 bg-[#1a1a1a] flex items-center px-1.5 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/45" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                </div>
                <div className="relative flex-1 p-1.5">
                  <div className="h-2.5 bg-white/25 rounded w-full mb-1.5" />
                  <div className="h-1.5 bg-white/15 rounded w-4/5" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_84%,rgba(255,255,255,0.75)_0,rgba(255,255,255,0.14)_40%,transparent_68%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-25 bg-[linear-gradient(0deg,transparent_0%,rgba(255,255,255,0.12)_48%,transparent_100%)]" />
              </div>
            ) : opt.id === "barbie" ? (
              <div className="relative flex-1 bg-[#ffc4f3] flex flex-col w-full">
                <div className="h-2.5 bg-[#ff36af] flex items-center px-1.5 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff9ee2]/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ffc4f3]/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                </div>
                <div className="relative flex-1 p-1.5">
                  <div className="h-2.5 bg-[#ff36af]/30 rounded w-full mb-1.5" />
                  <div className="h-1.5 bg-[#ff36af]/18 rounded w-4/5" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.35)_0,transparent_50%)]" />
              </div>
            ) : opt.id === "kodachrome" ? (
              <div className="relative flex-1 bg-[#ffe8be] flex flex-col w-full">
                <div className="h-2.5 bg-[#cf3f2d] flex items-center px-1.5 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8b1b10]/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#e6ad38]/90" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#146373]/90" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-3 bg-[linear-gradient(90deg,#cf3f2d_0%,#e6ad38_50%,#146373_100%)] opacity-85" />
                <div className="relative flex-1 p-1.5">
                  <div className="h-2.5 bg-[#2f2018]/22 rounded w-full mb-1.5" />
                  <div className="h-1.5 bg-[#2f2018]/14 rounded w-4/5" />
                </div>
              </div>
            ) : opt.id === "matrix" ? (
              <div className="relative flex-1 bg-black flex flex-col w-full">
                <div className="h-2.5 bg-[#051409] flex items-center px-1.5 gap-1 border-b border-[#00ff41]/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]/70" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]/20" />
                </div>
                <div className="relative flex-1 p-1.5 ">
                  <div className="h-2.5 bg-[#00ff41]/25 rounded w-full mb-1.5 shadow-[0_0_8px_rgba(0,255,65,0.3)]" />
                  <div className="h-1.5 bg-[#00ff41]/15 rounded w-4/5" />
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
              </div>
            ) : (
              <div className="flex-1 bg-[#1a1917] flex flex-col w-full">
                <div className="h-2.5 bg-[#2d2b28] flex items-center px-1.5 gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 p-1.5">
                  <div className="h-2.5 bg-white/10 rounded w-full mb-1.5" />
                  <div className="h-1.5 bg-white/5 rounded w-4/5" />
                </div>
              </div>
            )}
          </div>
          <span className="text-center text-[12px] font-medium leading-tight text-fg">{opt.label}</span>
          {!opt.enabled && (
            <span className="inline-flex items-center rounded-full border border-border-strong bg-sunken px-1.5 py-0.5 text-[9px] leading-none font-medium text-fg-muted">
              Coming soon
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
