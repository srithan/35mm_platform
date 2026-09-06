// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SettingsMediaPanel } from "./SettingsMediaPanel";
import type { MediaSettings } from "../types/settings";

afterEach(cleanup);
const initial: MediaSettings = {
  videoDefaultQuality: "auto",
  videoAutoplay: true,
  startWithSound: false,
  alwaysShowCaptions: false,
  captionStyle: "default",
  quietMode: false,
};

it("saves sound preference and restores the saved choice on remount", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = render(<SettingsMediaPanel initialValues={initial} onSave={onSave} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Video sound" }), { target: { value: "normal" } });
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...initial, startWithSound: true }));
  await waitFor(() => expect(screen.queryByText("Saving media settings...")).toBeNull());
  view.unmount();
  render(<SettingsMediaPanel initialValues={{ ...initial, startWithSound: true }} onSave={onSave} />);
  expect((screen.getByRole("combobox", { name: "Video sound" }) as HTMLSelectElement).value).toBe("normal");
});

it("restores the previous choice and shows a failed save", async () => {
  render(<SettingsMediaPanel initialValues={initial} onSave={vi.fn().mockRejectedValue(new Error("Could not save"))} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Video sound" }), { target: { value: "normal" } });
  await screen.findByText("Could not save");
  expect((screen.getByRole("combobox", { name: "Video sound" }) as HTMLSelectElement).value).toBe("muted");
});

it.each([
  ["low", true, true],
  ["normal", true, false],
  ["muted", false, false],
] as const)("saves %s as one consistent sound choice", async (mode, startWithSound, quietMode) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<SettingsMediaPanel initialValues={{ ...initial, startWithSound: true, quietMode: true }} onSave={onSave} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Video sound" }), { target: { value: mode } });
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...initial, startWithSound, quietMode }));
  expect(screen.queryByRole("checkbox", { name: "Quiet mode" })).toBeNull();
  await waitFor(() => expect(screen.queryByText("Saving media settings...")).toBeNull());
});
