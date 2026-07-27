import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectionDeskScene } from "./ProjectionDeskScene";

describe("ProjectionDeskScene", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces a fallback and reports the error when WebGL is unavailable", async () => {
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      null
    );

    render(
      <ProjectionDeskScene
        fallback="WebGL fallback"
        onError={onError}
      />
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("WebGL fallback");
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
