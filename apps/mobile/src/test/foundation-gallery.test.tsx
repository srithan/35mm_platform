import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "@35mm/mobile-ui";

import { FoundationGallery } from "@/harness/FoundationGallery";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function renderGallery() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <FoundationGallery />
    </SafeAreaProvider>,
  );
}

describe("Phase 1 foundation quality gallery", () => {
  it("exposes deterministic controls with accessible names, roles, and states", async () => {
    await renderGallery();

    expect(screen.getByRole("header", { name: "Foundation gallery" })).toBeOnTheScreen();
    expect(screen.getByRole("image", { name: "35mm member avatar" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Search films")).toHaveDisplayValue("The Third Man");
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Controls" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "States" })).not.toBeSelected();
  });

  it("switches explicit gallery states and theme without relying on system state", async () => {
    await renderGallery();
    const user = userEvent.setup();

    await user.press(screen.getByRole("tab", { name: "States" }));
    expect(screen.getByTestId("foundation.state.offline")).toBeOnTheScreen();
    expect(screen.getByRole("progressbar", { name: "Loading foundation content" })).toBeOnTheScreen();

    await user.press(screen.getByTestId("foundation.theme.toggle"));
    expect(screen.getByLabelText("states gallery in dark theme")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Use light theme" })).toBeOnTheScreen();
  });

  it("keeps every gallery interaction at or above the 44-point target floor", async () => {
    await renderGallery();

    expect(screen.getByRole("button", { name: "Use dark theme" })).toHaveStyle({
      height: 44,
      width: 44,
    });
    expect(screen.getByRole("tab", { name: "Controls" })).toHaveStyle({
      minHeight: 44,
    });
    expect(screen.getByRole("button", { name: "Primary action" })).toHaveStyle({
      minHeight: 48,
    });
  });
});
