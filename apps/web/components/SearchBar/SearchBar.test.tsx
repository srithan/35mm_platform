import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchBar } from "./SearchBar";
import type { SearchResult } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

async function advanceTimers(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const STORAGE_KEY = "35mm-recent-searches";

// ---------------------------------------------------------------------------
// Mock the mock API so we can control timing and results in tests.
// ---------------------------------------------------------------------------

const fakeResults: SearchResult[] = [
  { id: "1", label: "Parasite", sublabel: "2019 · Drama" },
  { id: "2", label: "Past Lives", sublabel: "2023 · Drama" },
];

vi.mock("./mockSearchApi", () => ({
  mockSearch: vi.fn(async () => fakeResults),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SearchBar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Renders with placeholder
  it("renders with the given placeholder text", () => {
    renderWithProviders(<SearchBar placeholder="Search films…" />);
    expect(
      screen.getByPlaceholderText("Search films…"),
    ).toBeInTheDocument();
  });

  // 2. Typing updates input value
  it("reflects typed text in the input", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");

    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
  });

  // 3. Clear button
  it("shows a clear button when input has text and clears on click", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar onClear={onClear} />);
    const input = screen.getByRole("combobox");

    // No clear button initially
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();

    await user.type(input, "test");
    const clearBtn = screen.getByLabelText("Clear search");
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(input).toHaveValue("");
    expect(onClear).toHaveBeenCalledOnce();
  });

  // 4. Debounced query fires onSearch
  it("fires onSearch with the debounced value", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Par");

    // Advance past the 300ms debounce
    await advanceTimers(400);

    expect(onSearch).toHaveBeenCalledWith("Par");
  });

  // 5. Dropdown shows results
  it("opens the dropdown with results after debounce", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Par");

    // Wait for debounce + query resolution
    await advanceTimers(500);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    await waitFor(() => {
      expect(within(listbox).getAllByRole("option").length).toBeGreaterThanOrEqual(1);
    });
  });

  // 6. Arrow-key navigation highlights items
  it("navigates dropdown items with arrow keys", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Par");
    await advanceTimers(500);

    await user.keyboard("{ArrowDown}");

    const firstOption = screen.getByRole("option", { selected: true });
    expect(firstOption).toBeInTheDocument();

    await user.keyboard("{ArrowDown}");
    const options = screen.getAllByRole("option");
    const secondSelected = options.find(
      (o) => o.getAttribute("aria-selected") === "true",
    );
    expect(secondSelected).toBeDefined();
  });

  // 7. Enter selects highlighted item
  it("selects the highlighted item on Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar onSelect={onSelect} />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Par");
    await advanceTimers(500);

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", label: "Parasite" }),
    );
  });

  // 8. Escape closes dropdown
  it("closes the dropdown on Escape", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Par");
    await advanceTimers(500);

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  // 9. Recent searches are persisted and shown
  it("displays recent searches on focus when query is empty", async () => {
    // Seed recent searches.
    const recent: SearchResult[] = [
      { id: "r-1", label: "Dune", sublabel: "Sci-Fi" },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");

    await user.click(input);

    expect(screen.getByText("Recent")).toBeInTheDocument();
    expect(screen.getByText("Dune")).toBeInTheDocument();
  });

  // 10. ⌘K shortcut focuses the input
  it("focuses the input on ⌘K", async () => {
    renderWithProviders(<SearchBar />);
    const input = screen.getByRole("combobox");

    expect(document.activeElement).not.toBe(input);

    // Simulate ⌘K
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        }),
      );
    });

    expect(document.activeElement).toBe(input);
  });

  // 11. ARIA attributes are correct
  it("has correct ARIA attributes", () => {
    renderWithProviders(<SearchBar placeholder="Search films…" />);
    const input = screen.getByRole("combobox");

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-controls", "searchbar-listbox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  // 12. Shows ⌘K badge only in default variant
  it("shows ⌘K badge in default variant but not inline", () => {
    const { unmount } = renderWithProviders(
      <SearchBar variant="default" />,
    );
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    unmount();

    renderWithProviders(<SearchBar variant="inline" />);
    expect(screen.queryByText("⌘K")).not.toBeInTheDocument();
  });
});
