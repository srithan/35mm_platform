import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscoverContent } from "./DiscoverContent";

vi.mock("next/navigation", function () {
  return { useRouter: function () { return { push: vi.fn() }; } };
});

vi.mock("./DiscoverTabs", function () {
  return { DiscoverTabs: function () { return <nav aria-label="Discover sections" />; } };
});

vi.mock("./ExploreTabContent", function () {
  return { ExploreTabContent: function () { return <section aria-label="Editorial discovery" />; } };
});

describe("DiscoverContent", function () {
  it("keeps search and catalog filters off the editorial Discover page", function () {
    render(<DiscoverContent />);

    expect(screen.getByRole("region", { name: "Editorial discovery" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Discover search and filters")).not.toBeInTheDocument();
  });
});
