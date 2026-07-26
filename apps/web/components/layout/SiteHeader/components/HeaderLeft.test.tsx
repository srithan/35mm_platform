import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderLeft } from "./HeaderLeft";

var push = vi.fn();

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return { push };
    },
  };
});

vi.mock("@/features/search/hooks/useSiteSearch", function () {
  return {
    useSiteSearch: function () {
      return {
        data: {
          items: [
            {
              id: "01HX0000000000000000000000",
              type: "film",
              title: "Alien",
              year: 1979,
              posterUrl: null,
              director: "Ridley Scott",
              genres: ["Science Fiction"],
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
        isFetching: false,
      };
    },
  };
});

describe("HeaderLeft search", function () {
  afterEach(function () {
    push.mockReset();
  });

  it("renders real API results and navigates with canonical film ID", async function () {
    var client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <HeaderLeft />
      </QueryClientProvider>
    );
    var user = userEvent.setup();
    var input = screen.getByRole("combobox", { name: "Search 35mm" });
    await user.type(input, "alien");
    expect(await screen.findByText("Alien")).toBeInTheDocument();
    await user.click(screen.getByText("Alien"));
    expect(push).toHaveBeenCalledWith(
      "/title/movie/01HX0000000000000000000000"
    );
  });
});
