import type { Metadata } from "next";
import {
  LegalCard,
  LegalCardGrid,
  LegalHeading,
  LegalInlineLink,
  LegalLead,
  LegalLink,
  LegalPage,
  LegalTitle,
} from "@/components/legal/LegalPage";

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
    <LegalPage>
      <LegalTitle>Help Centre</LegalTitle>
      <LegalLead>
        Find answers to common questions or reach out to our support team.
      </LegalLead>

      <LegalCardGrid>
        {HELP_TOPICS.map(function (topic) {
          return (
            <LegalCard key={topic.title} interactive className="cursor-pointer">
              <LegalHeading as="h3" className="text-[15px]">
                {topic.title}
              </LegalHeading>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-fg-muted">{topic.description}</p>
            </LegalCard>
          );
        })}
      </LegalCardGrid>

      <LegalCard className="mt-10 text-center">
        <p className="text-[15px] font-semibold text-fg">Still need help?</p>
        <p className="mt-2 text-[14px] leading-[1.55] text-fg-muted">
          Reach our support team at{" "}
          <LegalLink href="mailto:support@35mm.in">support@35mm.in</LegalLink>
        </p>
        <p className="mt-4 text-[13px] text-fg-faint">
          Or review our{" "}
          <LegalInlineLink href="/privacy">Privacy Policy</LegalInlineLink>
          {" and "}
          <LegalInlineLink href="/terms">Terms of Service</LegalInlineLink>.
        </p>
      </LegalCard>
    </LegalPage>
  );
}
