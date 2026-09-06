import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPersonShareLinks,
  PersonShareButton,
} from "./PersonShareButton";

const writeText = vi.fn();

describe("PersonShareButton", function () {
  beforeEach(function () {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });

  it("offers compact social sharing choices and copies the canonical role URL", async function () {
    render(
      <PersonShareButton
        path="/person/85720/actor"
        title="Films starring Suriya on 35mm"
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Share" }), {
      button: 0,
      ctrlKey: false,
    });

    expect(await screen.findByText("Share on X")).toBeInTheDocument();
    expect(screen.getByText("Share on WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Share on Facebook")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Copy link"));

    await waitFor(function () {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0]?.[0]).toMatch(/\/person\/85720\/actor$/);
    expect(screen.getByRole("button")).toHaveTextContent("Link copied");
  });

  it("builds encoded social share destinations", function () {
    const url = "https://35mm.in/person/85720/producer";
    const title = "Films produced by Suriya on 35mm";
    const links = buildPersonShareLinks(url, title);

    expect(links.x).toContain(encodeURIComponent(url));
    expect(links.x).toContain(encodeURIComponent(title));
    expect(links.whatsapp).toContain(encodeURIComponent(title + " " + url));
    expect(links.facebook).toContain(encodeURIComponent(url));
  });
});
