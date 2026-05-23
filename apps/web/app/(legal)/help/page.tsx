import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help Centre – 35mm",
  description: "Get help with your 35mm account, settings, and features.",
};

const HELP_TOPICS = [
  {
    title: "Getting started",
    description: "Set up your profile, follow filmmakers, and post your first review.",
  },
  {
    title: "Your feed",
    description: "How the feed works, sorting options, and content preferences.",
  },
  {
    title: "Communities",
    description: "Joining, creating, and moderating communities on 35mm.",
  },
  {
    title: "Festivals & submissions",
    description: "Browse festivals, submit your films, and track your submissions.",
  },
  {
    title: "Chat & messaging",
    description: "Send direct messages, create group chats, and manage conversations.",
  },
  {
    title: "Account & security",
    description: "Password resets, two-factor authentication, and account deletion.",
  },
  {
    title: "Privacy & data",
    description: "Control your data, manage visibility, and understand our privacy practices.",
  },
];

export default function HelpPage() {
  return (
    <div className="px-6 py-10 max-w-[540px]">
      <h1 className="text-[22px] font-display font-bold text-fg tracking-tight">Help Centre</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-fg-muted">
        Find answers to common questions or reach out to our support team.
      </p>

      <div className="mt-6 space-y-3">
        {HELP_TOPICS.map(function (topic) {
          return (
            <div key={topic.title} className="border border-border rounded-xl p-4 hover:bg-hover transition-colors cursor-pointer">
              <h2 className="text-[14px] font-semibold text-fg">{topic.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{topic.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border border-border rounded-xl p-5 text-center">
        <p className="text-[14px] font-semibold text-fg">Still need help?</p>
        <p className="mt-1 text-[13px] text-fg-muted">
          Reach our support team at{" "}
          <a href="mailto:support@35mm.in" className="text-accent hover:underline">support@35mm.in</a>
        </p>
        <p className="mt-3 text-[12px] text-fg-muted">
          Or check our{" "}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          {" and "}
          <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
