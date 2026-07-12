import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { RICH_TEXT_PREFIX } from "@/lib/utils/richContent";
import { ReportedContent } from "./MyReportDetailPanel";

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return { getToken: async function () { return null; }, isLoaded: true };
    },
  };
});

function renderReportedContent(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {node}
    </QueryClientProvider>
  );
}

describe("ReportedContent", function () {
  it("renders captured rich post text as social content instead of stored JSON", function () {
    const stored = RICH_TEXT_PREFIX + JSON.stringify({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "What’s up fam, how’s the josh?" }],
      }],
    });

    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { container } = renderReportedContent(
      <ReportedContent
        contentType="post"
        snapshot={{
          body: stored,
          headline: null,
          media: [],
          visibility: "public",
          author_username: "josh",
          author_display_name: "Josh Safdie",
          author_avatar_url: null,
          created_at: createdAt,
          post_type: "text",
        }}
      />
    );

    expect(screen.getByText("Josh Safdie")).toBeInTheDocument();
    expect(screen.getByText("@josh")).toBeInTheDocument();
    expect(screen.getByText("· 2h ago")).toBeInTheDocument();
    expect(screen.getByText("What’s up fam, how’s the josh?")).toBeInTheDocument();
    expect(container.textContent).not.toContain(RICH_TEXT_PREFIX);
    expect(container.textContent).not.toContain('"type":"doc"');
  });

  it("uses CommentCard header anatomy for captured comments", function () {
    const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    renderReportedContent(
      <ReportedContent
        contentType="comment"
        snapshot={{
          body: "That final shot stayed with me.",
          post_id: "00000000-0000-4000-8000-000000000001",
          author_username: "mira",
          author_display_name: "Mira Chen",
          author_avatar_url: null,
          created_at: createdAt,
        }}
      />
    );

    expect(screen.getByText("Mira Chen")).toBeInTheDocument();
    expect(screen.getByText("@mira")).toBeInTheDocument();
    expect(screen.getByText("· 3h ago")).toBeInTheDocument();
    expect(screen.getByText("That final shot stayed with me.")).toBeInTheDocument();
  });

  it("shows profile context captured when the report was filed", function () {
    renderReportedContent(
      <ReportedContent
        contentType="profile"
        snapshot={{
          display_name: "Ava DuVernay",
          username: "ava",
          avatar_url: null,
          bio: "Director, writer, and film lover.",
          post_count: 128,
          follower_count: 12_400,
          following_count: 315,
          joined_at: "2024-03-08T12:00:00.000Z",
        }}
      />
    );

    expect(screen.getByText("Ava DuVernay")).toBeInTheDocument();
    expect(screen.getByText("Director, writer, and film lover.")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("12.4k")).toBeInTheDocument();
    expect(screen.getByText("315")).toBeInTheDocument();
    expect(screen.getByText("Joined March 2024")).toBeInTheDocument();
  });
});
