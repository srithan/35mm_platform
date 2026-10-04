import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import styles from "./LegalPage.module.css";

const linkClassName = styles.textLink;

export function LegalPage(props: { children: React.ReactNode; className?: string }) {
  return (
    <article className={cn(styles.page, props.className)}>
      {props.children}
    </article>
  );
}

export function LegalTitle(props: { children: React.ReactNode }) {
  return <h1 className={styles.title}>{props.children}</h1>;
}

export function LegalMeta(props: { children: React.ReactNode }) {
  return <p className={styles.meta}>{props.children}</p>;
}

export function LegalLead(props: { children: React.ReactNode }) {
  return <p className={styles.lead}>{props.children}</p>;
}

export function LegalSection(props: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={cn(styles.section, props.className)} id={props.id}>
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
      className={cn(styles.heading, props.className)}
    >
      {props.children}
    </Tag>
  );
}

export function LegalBody(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(styles.body, props.className)}>
      {props.children}
    </div>
  );
}

export function LegalList(props: { children: React.ReactNode }) {
  return (
    <ul className={styles.list}>
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
        styles.card,
        props.interactive && styles.cardInteractive,
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function LegalCardGrid(props: { children: React.ReactNode; className?: string }) {
  return <div className={cn(styles.cardGrid, props.className)}>{props.children}</div>;
}
