import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TitleReviewsSection } from "./TitleReviewsSection";
import { TitleContentTabs } from "./TitleContentTabs";

const mocks = vi.hoisted(() => ({ query: vi.fn(), next: vi.fn(), retry: vi.fn() }));
vi.mock("../hooks/useTitleReviews", () => ({ useTitleReviews: mocks.query }));
vi.mock("./TitleReviewCard", () => ({ TitleReviewCard: ({ review }: { review: { body: string } }) => <article>{review.body}</article> }));
const props = { filmId: "01ARZ3NDEKTSV4RRFFQ69G5FAV", referenceLoading: false, referenceError: false, onRetryReference: vi.fn(), isTv: false, onWriteReview: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockReturnValue({ data: { pages: [] }, isPending: false, isError: false, fetchNextPage: mocks.next, refetch: mocks.retry });
});
describe("title reviews", () => {
  it("offers writing for a true empty result without an invented total", async () => {
    render(<TitleReviewsSection {...props} />);
    expect(screen.getByText("What stayed with you?")).toBeInTheDocument();
    expect(screen.queryByText(/1,247/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Write a review" }));
    expect(props.onWriteReview).toHaveBeenCalledOnce();
  });
  it("distinguishes errors from an empty community and retries", async () => {
    mocks.query.mockReturnValue({ isPending: false, isError: true, refetch: mocks.retry });
    render(<TitleReviewsSection {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load reviews");
    expect(screen.queryByText("What stayed with you?")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.retry).toHaveBeenCalledOnce();
  });
  it("deduplicates cursor pages and loads more only when requested", async () => {
    mocks.query.mockReturnValue({ data: { pages: [{ posts: [{ id: "a", body: "First review" }] }, { posts: [{ id: "a", body: "First review" }, { id: "b", body: "Second review" }] }] }, hasNextPage: true, fetchNextPage: mocks.next });
    render(<TitleReviewsSection {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(mocks.next).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "More reviews" }));
    expect(mocks.next).toHaveBeenCalledOnce();
  });
  it("does not show a false empty state for unsupported TV titles", () => {
    render(<TitleReviewsSection {...props} isTv filmId={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("TV titles aren’t available");
    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
  });
  it("supports keyboard selection of title sections", async () => {
    const details = vi.fn();
    render(<TitleContentTabs contentTab="reviews" onSelectOverview={details} onSelectReviews={vi.fn()} />);
    screen.getByRole("tab", { name: "Reviews" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(details).toHaveBeenCalledOnce();
    expect(screen.getByRole("tab", { name: "Cast & details" })).toHaveFocus();
  });
});
