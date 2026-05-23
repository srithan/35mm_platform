import { ShellGrid } from "@/components/layout/ShellGrid";
import { ScrollRestore } from "@/features/feed/components/FeedScrollRestore";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollRestore />
      <a
        href="#main-content"
        className="sr-only"
      >
        Skip to main content
      </a>
      <ShellGrid>{children}</ShellGrid>
    </>
  );
}
