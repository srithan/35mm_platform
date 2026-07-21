import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostCardAttachments } from "./PostCardAttachments";

describe("PostCardAttachments", function () {
  it("links an attached film card to the title page", function () {
    render(
      <PostCardAttachments
        variant="film-log"
        filmCard={{
          title: "Fight Club",
          year: 1999,
          genre: "Drama",
          posterUrl: null,
          rating: 9,
        }}
        attachedFilm={{
          id: "01J00000000000000000000000",
          tmdbId: 550,
          title: "Fight Club",
          year: 1999,
          posterUrl: null,
          genres: ["Drama"],
          rating: 4.5,
        }}
        hasAttachedMedia={false}
        combinedVideoPreviews={[]}
        shouldRenderLinkPreviewCard={false}
        linkPreview={null}
        videoUrls={[]}
        imageUrls={[]}
        imageBlurhashes={[]}
        poll={null}
        postId="post-1"
        saveData={false}
        normalizedViewerMediaUrls={[]}
        viewerBlurhashes={[]}
        showImageViewer={false}
        viewerImageIndex={0}
        stopRichLinkBubble={false}
        onImageClick={() => {}}
        onCloseImageViewer={() => {}}
      />
    );

    expect(screen.getByRole("link", { name: "Open Fight Club" })).toHaveAttribute(
      "href",
      "/title/movie/550"
    );
  });

  it("renders image-first editorial link previews", function () {
    render(
      <PostCardAttachments
        variant="text"
        hasAttachedMedia={false}
        combinedVideoPreviews={[]}
        shouldRenderLinkPreviewCard
        linkPreview={{
          url: "https://example.com/story",
          title: "A cinematic link preview",
          description: "Supporting detail",
          image: "https://images.example.com/story.jpg",
          domain: "example.com",
          provider: "link",
          presentation: "card_only",
        }}
        videoUrls={[]}
        imageUrls={[]}
        imageBlurhashes={[]}
        poll={null}
        postId="post-1"
        saveData={false}
        normalizedViewerMediaUrls={[]}
        viewerBlurhashes={[]}
        showImageViewer={false}
        viewerImageIndex={0}
        stopRichLinkBubble={false}
        onImageClick={() => {}}
        onCloseImageViewer={() => {}}
      />
    );

    expect(screen.getByRole("link", { name: "A cinematic link preview — example.com" })).toHaveAttribute(
      "href",
      "https://example.com/story"
    );
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.queryByText("Supporting detail")).not.toBeInTheDocument();
  });
});
