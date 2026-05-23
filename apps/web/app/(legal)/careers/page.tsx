import type { Metadata } from "next";

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
    <div className="px-6 py-10 max-w-[540px]">
      <h1 className="text-[22px] font-display font-bold text-fg tracking-tight">Careers</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-fg-muted">
        We&rsquo;re a small, passionate team building a home for film on the internet.
        If you care deeply about cinema and craft, we&rsquo;d love to hear from you.
      </p>

      <h2 className="mt-8 text-[16px] font-display font-semibold text-fg">Open roles</h2>

      <div className="mt-4 space-y-4">
        {OPEN_ROLES.map(function (role) {
          return (
            <div key={role.title} className="border border-border rounded-xl p-4">
              <h3 className="text-[14px] font-semibold text-fg">{role.title}</h3>
              <p className="mt-1 text-[12px] text-fg-muted">
                {role.location} &middot; {role.type}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{role.description}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-[13px] text-fg-muted">
        Don&rsquo;t see a role that fits? Send us a note at{" "}
        <a href="mailto:careers@35mm.in" className="text-accent hover:underline">careers@35mm.in</a>.
      </p>
    </div>
  );
}
