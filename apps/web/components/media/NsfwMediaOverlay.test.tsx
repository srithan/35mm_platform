import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NsfwMediaOverlay } from "./NsfwMediaOverlay";
import { PostImageGallery } from "@/features/feed/components/PostImageGallery";

vi.mock("@/components/ui/BlurImage", function () {
  return {
    BlurImage: function MockBlurImage({ alt }: { alt: string }) {
      return <img alt={alt} />;
    },
  };
});

describe("NsfwMediaOverlay", function () {
  it.each(["flagged", "pending"] as const)(
    "screens %s media until the viewer reveals it",
    async function (status) {
      const user = userEvent.setup();
      const { container } = render(
        <NsfwMediaOverlay status={status} categories={["nudity"]}>
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
    }
  );

  it("leaves non-sensitive media fully visible", function () {
    const { container } = render(
      <NsfwMediaOverlay status="none" categories={[]}>
        <img alt="Frame" src="/frame.jpg" />
      </NsfwMediaOverlay>
    );

    expect(container.querySelector("[data-nsfw-status]")).toHaveAttribute(
      "data-nsfw-revealed",
      "false"
    );
    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
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
