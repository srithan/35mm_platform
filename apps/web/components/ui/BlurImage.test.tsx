import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlurImage } from "./BlurImage";

describe("BlurImage", function () {
  it("renders neutral placeholder without image source", function () {
    render(<BlurImage src={null} alt="Poster still" />);

    expect(screen.queryByAltText("Poster still")).not.toBeInTheDocument();
  });

  it("renders image when source is available", function () {
    render(<BlurImage src="/media/example.webp" alt="Poster still" resolveR2Url={false} />);

    expect(screen.getByAltText("Poster still")).toBeInTheDocument();
  });
});
