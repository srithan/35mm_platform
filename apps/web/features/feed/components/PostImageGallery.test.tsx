import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostImageGallery } from "./PostImageGallery";

vi.mock("@/components/ui/BlurImage", function () {
  return {
    BlurImage: function MockBlurImage() {
      return <span />;
    },
  };
});

describe("PostImageGallery stable single-image geometry", function () {
  it("reserves capped portrait space from stored dimensions before image load", function () {
    const { container } = render(
      <PostImageGallery
        urls={["https://images.example.com/portrait.jpg"]}
        dimensions={[{ width: 1200, height: 1800 }]}
      />
    );

    expect(container.querySelector("button")).toHaveStyle({
      aspectRatio: "1200 / 1800",
      width: "100%",
      maxWidth: "340px",
    });
  });

  it("keeps metadata-free images on the bounded fallback ratio", function () {
    const { container } = render(
      <PostImageGallery urls={["https://images.example.com/legacy.jpg"]} />
    );

    expect(container.querySelector("button")).toHaveClass("aspect-[16/10]");
  });
});
