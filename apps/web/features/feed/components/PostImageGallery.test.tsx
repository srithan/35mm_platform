import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostImageGallery } from "./PostImageGallery";

vi.mock("@/components/ui/BlurImage", function () {
  return {
    BlurImage: function MockBlurImage({ src, alt }: { src: string | null; alt: string }) {
      return <span data-testid="mock-blur-image" data-src={src ?? ""} data-alt={alt} />;
    },
  };
});

beforeEach(function () {
  vi.stubGlobal(
    "IntersectionObserver",
    class MockIntersectionObserver {
      private callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
      }
      disconnect() {}
    }
  );
});

describe("PostImageGallery stable single-image geometry", function () {
  it("reserves capped portrait space from stored dimensions before image load", function () {
    const { container } = render(
      <PostImageGallery
        urls={["https://images.example.com/portrait.jpg"]}
        dimensions={[{ width: 1200, height: 1800 }]}
      />
    );

    expect(container.querySelector("[data-nsfw-status]")).toHaveStyle({
      aspectRatio: "1200 / 1800",
      width: "100%",
      maxWidth: "340px",
    });
  });

  it("keeps metadata-free images on the bounded fallback ratio", function () {
    const { container } = render(
      <PostImageGallery urls={["https://images.example.com/legacy.jpg"]} />
    );

    expect(container.querySelector("[data-nsfw-status]")).toHaveClass("aspect-[16/10]");
  });

  it("keeps two images in the grid by default", function () {
    const { container } = render(
      <PostImageGallery
        urls={[
          "https://images.example.com/first.jpg",
          "https://images.example.com/second.jpg",
        ]}
      />
    );

    expect(screen.queryByLabelText("Post images")).not.toBeInTheDocument();
    expect(container.querySelector(".grid")).toBeInTheDocument();
    expect(container.querySelector("[data-nsfw-status]")).toHaveClass("aspect-[4/5]");
  });

  it("renders flagged multi-image post cards as a peek carousel with above-left dots", async function () {
    render(
      <PostImageGallery
        presentation="carousel"
        urls={[
          "https://images.example.com/first.jpg",
          "https://images.example.com/second.jpg",
          "https://images.example.com/third.jpg",
          "https://images.example.com/fourth.jpg",
        ]}
      />
    );

    expect(screen.getByLabelText("Post images")).toBeInTheDocument();
    expect(screen.getByLabelText("Post image carousel position")).toHaveClass("mb-2", "w-fit");
    expect(screen.getByLabelText("Post image carousel position")).toHaveClass("bg-sunken", "px-2");
    expect(screen.getByRole("button", { name: "Show image 1 of 4" })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("button", { name: "Show image 2 of 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image 3 of 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image 2 of 4" })).toHaveClass(
      "w-1.5",
      "bg-fg-muted"
    );
    expect(screen.getByLabelText("View image 1 of 4").closest("[data-nsfw-status]")).toHaveClass(
      "w-[44%]"
    );
    expect(screen.getByLabelText("Post images")).toHaveClass("[scroll-snap-type:none]");
    expect(screen.queryByText("1/3")).not.toBeInTheDocument();
    await waitFor(function () {
      expect(screen.getAllByTestId("mock-blur-image").slice(0, 4).map(function (image) {
        return image.getAttribute("data-src");
      })).toEqual([
        "https://images.example.com/first.jpg",
        "https://images.example.com/second.jpg",
        "https://images.example.com/third.jpg",
        "https://images.example.com/fourth.jpg",
      ]);
    });
  });
});
