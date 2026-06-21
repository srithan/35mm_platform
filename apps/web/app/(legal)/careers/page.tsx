import type { Metadata } from "next";
import {
  LegalBody,
  LegalCard,
  LegalCardGrid,
  LegalHeading,
  LegalLead,
  LegalLink,
  LegalPage,
  LegalSection,
  LegalTitle,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Careers – 35mm",
  description: "Join the 35mm team. We're building the future of film culture.",
};

const OPEN_ROLES = [
  {
    title: "Senior Frontend Engineer",
    location: "Remote",
    type: "Full-time",
    description: "Build delightful interfaces for filmmakers and cinephiles using Next.js and React.",
  },
  {
    title: "Backend Engineer",
    location: "Remote",
    type: "Full-time",
    description: "Design and scale our API, real-time messaging, and content delivery infrastructure.",
  },
  {
    title: "Product Designer",
    location: "Remote",
    type: "Full-time",
    description: "Shape the experience of a social platform purpose-built for film culture.",
  },
  {
    title: "Community Manager",
    location: "Remote",
    type: "Part-time",
    description: "Cultivate and grow our filmmaker communities, festivals programme, and creator partnerships.",
  },
];

export default function CareersPage() {
  return (
    <LegalPage>
      <LegalTitle>Careers</LegalTitle>
      <LegalLead>
        We&rsquo;re a small, passionate team building a home for film on the internet.
        If you care deeply about cinema and craft, we&rsquo;d love to hear from you.
      </LegalLead>

      <LegalSection className="mt-12">
        <LegalHeading>Open roles</LegalHeading>
        <LegalCardGrid className="mt-5 space-y-3">
          {OPEN_ROLES.map(function (role) {
            return (
              <LegalCard key={role.title}>
                <LegalHeading as="h3" className="text-[15px]">
                  {role.title}
                </LegalHeading>
                <p className="mt-1.5 text-[13px] text-fg-faint">
                  {role.location} &middot; {role.type}
                </p>
                <p className="mt-2.5 text-[14px] leading-[1.55] text-fg-muted">{role.description}</p>
              </LegalCard>
            );
          })}
        </LegalCardGrid>
      </LegalSection>

      <LegalBody className="mt-10 text-[14px]">
        Don&rsquo;t see a role that fits? Send us a note at{" "}
        <LegalLink href="mailto:careers@35mm.in">careers@35mm.in</LegalLink>.
      </LegalBody>
    </LegalPage>
  );
}
