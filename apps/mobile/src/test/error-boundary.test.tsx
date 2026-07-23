import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { RootErrorBoundary } from "@/providers/errorBoundary";

function Broken({ shouldThrow }: { readonly shouldThrow: () => boolean }) {
  if (shouldThrow()) throw new Error("private failure details");
  return null;
}

describe("root error boundary", () => {
  it("shows accessible recovery and remounts after retry", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    let broken = true;
    const onReset = jest.fn(() => {
      broken = false;
    });
    const view = await render(
      <RootErrorBoundary onReset={onReset}>
        <Broken shouldThrow={() => broken} />
      </RootErrorBoundary>,
    );

    expect(view.getByTestId("root-error-boundary")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Retry" }));
    expect(onReset).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(view.queryByTestId("root-error-boundary")).toBeNull(),
    );
    consoleError.mockRestore();
  });
});
