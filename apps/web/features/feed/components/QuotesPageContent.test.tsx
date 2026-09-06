import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuotesPageContent } from "./QuotesPageContent";

const navigation = vi.hoisted(function () {
  return {
    replace: vi.fn(),
    search: "",
  };
});

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return { replace: navigation.replace };
    },
    useSearchParams: function () {
      return new URLSearchParams(navigation.search);
    },
  };
});

vi.mock("./InfinitePostList", function () {
  return {
    InfinitePostList: function (props: { quotePostId: string; quoteSort: string }) {
      return <div data-testid="quote-list">{`${props.quotePostId}:${props.quoteSort}`}</div>;
    },
  };
});

describe("QuotesPageContent", function () {
  beforeEach(function () {
    navigation.replace.mockReset();
    navigation.search = "";
  });

  it("renders the feed header and a deterministic back link", function () {
    render(<QuotesPageContent username="maya" postId="post-1" />);

    expect(screen.getByRole("heading", { name: "Quotes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to post" })).toHaveAttribute(
      "href",
      "/maya/post/post-1"
    );
    expect(screen.getByTestId("quote-list")).toHaveTextContent("post-1:latest");
  });

  it("puts the selected sort in the URL without scrolling", function () {
    render(<QuotesPageContent username="maya" postId="post-1" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Sort quotes" }), {
      target: { value: "top" },
    });

    expect(navigation.replace).toHaveBeenCalledWith(
      "/maya/post/post-1/quotes?sort=top",
      { scroll: false }
    );
  });
});
