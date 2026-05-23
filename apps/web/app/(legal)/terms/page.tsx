import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service – 35mm",
  description: "Terms and conditions for using the 35mm platform.",
};

export default function TermsPage() {
  return (
    <div className="px-6 py-10 max-w-[540px]">
      <h1 className="text-[22px] font-display font-bold text-fg tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-[12px] text-fg-muted">Last updated: 1 March 2025</p>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">1. Acceptance of terms</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          By accessing or using 35mm, you agree to be bound by these terms. If you do not agree, you may not
          use the platform.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">2. Accounts</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">3. User content</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          You retain ownership of content you post on 35mm. By posting, you grant us a non-exclusive,
          worldwide licence to display, distribute, and promote your content within the platform.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">4. Prohibited conduct</h2>
        <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-fg-muted list-disc pl-5">
          <li>Harassment, hate speech, or threats of violence</li>
          <li>Posting content you do not have the right to share</li>
          <li>Impersonating another person or entity</li>
          <li>Attempting to interfere with or disrupt the platform</li>
          <li>Using automated tools to scrape or spam</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">5. Termination</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          We reserve the right to suspend or terminate your account if you violate these terms. You may
          delete your account at any time through your settings.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">6. Disclaimers</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          35mm is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee
          uninterrupted or error-free operation of the platform.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-display font-semibold text-fg">7. Contact</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          Questions about these terms? Contact us at{" "}
          <a href="mailto:legal@35mm.in" className="text-accent hover:underline">legal@35mm.in</a>.
        </p>
      </section>
    </div>
  );
}
