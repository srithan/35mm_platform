import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { PostCardHeader } from "./PostCardHeader";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(async () => null), isLoaded: true }),
}));

const baseProps = {
  timestamp: "20d",
  menu: <button type="button">Post options</button>,
  username: "teju",
  displayName: "Tejaswi Yaramada",
  avatarInitial: "T",
  handle: "@teju",
  role: "Cinephile",
  children: <p>Post content</p>,
};

function renderHeader(
  variant: "discussion" | "film-log" | "text",
  role: string | null = "Cinephile"
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PostCardHeader {...baseProps} role={role} variant={variant} />
    </QueryClientProvider>
  );
}

describe("PostCardHeader", () => {
  it.each([
    ["discussion", "discussion", "Discussion"],
    ["film-log", "log", "logged"],
  ] as const)(
    "places %s label below role on mobile without moving desktop label",
    (variant, key, label) => {
      const { container } = renderHeader(variant);

      const labels = container.querySelectorAll(`[data-post-variant-label="${key}"]`);
      expect(labels).toHaveLength(2);
      expect(labels[0]).toHaveTextContent(label);
      expect(labels[0]).toHaveClass("hidden");
      expect(labels[0]).toHaveClass(
        variant === "discussion" ? "sm:inline-flex" : "sm:inline"
      );

      const role = screen.getByText("Cinephile");
      const mobileLabel = labels[1];
      const content = screen.getByText("Post content");
      expect(mobileLabel).toHaveClass("sm:hidden");
      expect(content.parentElement).toHaveClass("pt-0", "sm:pt-2");
      expect(
        role.compareDocumentPosition(mobileLabel) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        mobileLabel.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  );

  it("does not render a variant label for a text post", () => {
    const { container } = renderHeader("text");

    expect(container.querySelector("[data-post-variant-label]")).not.toBeInTheDocument();
  });

  it("preserves zero desktop content padding when author has no role", () => {
    renderHeader("discussion", null);

    expect(screen.getByText("Post content").parentElement).toHaveClass("pt-0");
    expect(screen.getByText("Post content").parentElement).not.toHaveClass("sm:pt-2");
  });
});
