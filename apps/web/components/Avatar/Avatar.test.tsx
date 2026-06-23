import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", function () {
  it("does not show initials while image is loading", function () {
    const { container } = render(<Avatar initial="S" src="/media/avatar.webp" />);

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(screen.queryByText("S")).not.toBeInTheDocument();
    expect(image!).toHaveClass("opacity-100");

    fireEvent.load(image!);

    expect(image!).toHaveClass("opacity-100");
  });

  it("shows fallback initials only after image error", function () {
    const { container } = render(
      <Avatar initial="S" src="/media/missing-avatar.webp" allowDefaultFallback={false} />
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(screen.queryByText("S")).not.toBeInTheDocument();

    fireEvent.error(image!);

    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("keeps initials hidden when fallback is suppressed and source is pending", function () {
    const { container } = render(<Avatar initial="P" src={null} allowDefaultFallback={false} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("P")).not.toBeInTheDocument();
  });
});
