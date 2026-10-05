import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalFooterMark } from "./LegalFooterMark";

describe("LegalFooterMark", function () {
  it("renders immediately from static paths without font-dependent text or filters", function () {
    const { container } = render(<LegalFooterMark />);

    expect(screen.getByRole("link", { name: "35mm home" })).toHaveAttribute("href", "/");
    expect(container.querySelector("svg path")).not.toBeNull();
    expect(container.querySelector("svg text")).toBeNull();
    expect(container.querySelector("svg filter")).toBeNull();
  });
});
