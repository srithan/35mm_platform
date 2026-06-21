import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const linkClassName =
  "text-social-accent no-underline transition-colors hover:text-social-accent-hover hover:underline";

export function LegalPage(props: { children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("px-6 py-12 sm:px-8 sm:py-16", props.className)}>
      {props.children}
    </article>
  );
}

export function LegalTitle(props: { children: React.ReactNode }) {
  return (
    <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-fg sm:text-[36px]">
      {props.children}
    </h1>
  );
}

export function LegalMeta(props: { children: React.ReactNode }) {
  return <p className="mt-3 text-[13px] text-fg-faint">{props.children}</p>;
}

export function LegalLead(props: { children: React.ReactNode }) {
  return <p className="mt-6 text-[17px] leading-[1.6] text-fg-muted">{props.children}</p>;
}

export function LegalSection(props: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={cn("mt-10 scroll-mt-24", props.className)} id={props.id}>
      {props.children}
    </section>
  );
}

export function LegalHeading(props: {
  children: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  const Tag = props.as ?? "h2";
  return (
    <Tag
      className={cn(
        "text-[17px] font-semibold tracking-[-0.01em] text-fg",
        props.className
      )}
    >
      {props.children}
    </Tag>
  );
}

export function LegalBody(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mt-2.5 text-[15px] leading-[1.65] text-fg-muted", props.className)}>
      {props.children}
    </div>
  );
}

export function LegalList(props: { children: React.ReactNode }) {
  return (
    <ul className="mt-2.5 list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-fg-muted">
      {props.children}
    </ul>
  );
}

export function LegalLink(props: React.ComponentProps<"a">) {
  return <a {...props} className={cn(linkClassName, props.className)} />;
}

export function LegalInlineLink(props: React.ComponentProps<typeof Link>) {
  return <Link {...props} className={cn(linkClassName, props.className)} />;
}

export function LegalCard(props: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-elevated p-5",
        props.interactive && "transition-colors hover:bg-hover",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function LegalCardGrid(props: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-6 space-y-3", props.className)}>{props.children}</div>;
}
