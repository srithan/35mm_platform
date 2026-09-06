import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NsfwMediaOverlay, NsfwTextReveal } from "./NsfwMediaOverlay";
import { PostImageGallery } from "@/features/feed/components/PostImageGallery";

vi.mock("@/components/ui/BlurImage", function () {
  return {
    BlurImage: function MockBlurImage({ alt }: { alt: string }) {
      return <img alt={alt} />;
    },
  };
});

describe("NsfwMediaOverlay", function () {
  it("screens flagged media until the viewer reveals it", async function () {
    const user = userEvent.setup();
    const { container } = render(
      <NsfwMediaOverlay status="flagged" categories={["nudity"]}>
        <img alt="Frame" src="/frame.jpg" />
      </NsfwMediaOverlay>
    );

    const root = container.querySelector("[data-nsfw-status]");
    expect(root).toHaveAttribute("data-nsfw-revealed", "false");
    expect(screen.getByAltText("Frame")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(root).toHaveAttribute("data-nsfw-revealed", "true");
    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
    expect(screen.getByAltText("Frame")).toBeInTheDocument();
  });

  it.each(["none", "pending"] as const)("leaves %s media fully visible", function (status) {
    const { container } = render(
      <NsfwMediaOverlay status={status} categories={[]}>
        <img alt="Frame" src="/frame.jpg" />
      </NsfwMediaOverlay>
    );

    expect(container.querySelector("[data-nsfw-status]")).toHaveAttribute(
      "data-nsfw-revealed",
      "false"
    );
    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  });

  it.each(["none", "pending"] as const)("leaves %s text fully visible", function (status) {
    render(
      <NsfwTextReveal status={status} categories={[]}>
        <p>Visible post</p>
      </NsfwTextReveal>
    );

    expect(screen.getByText("Visible post")).toBeInTheDocument();
    expect(screen.queryByText(/may contain sensitive content/i)).not.toBeInTheDocument();
  });

  it("collapses flagged text until the viewer reveals it", async function () {
    const user = userEvent.setup();
    render(
      <NsfwTextReveal status="flagged" categories={["sensitive"]}>
        <p>Hidden post</p>
      </NsfwTextReveal>
    );

    expect(screen.queryByText("Hidden post")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /may contain sensitive content/i }));
    expect(screen.getByText("Hidden post")).toBeInTheDocument();
  });

  it("screens only flagged entries in a mixed gallery", function () {
    const { container } = render(
      <PostImageGallery
        urls={["/flagged.jpg", "/clear.jpg"]}
        nsfwStatus="flagged"
        nsfwCategories={["nudity"]}
        imageNsfw={[
          { flagged: true, categories: ["nudity"] },
          { flagged: false, categories: [] },
        ]}
      />
    );

    const items = container.querySelectorAll("[data-nsfw-status]");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-nsfw-status", "flagged");
    expect(items[1]).toHaveAttribute("data-nsfw-status", "none");
    expect(screen.getAllByRole("button", { name: "View" })).toHaveLength(1);
  });
});
