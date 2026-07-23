import { useState, type ReactElement, type ReactNode } from "react";
import { View } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import {
  ActionSheet,
  AppIcon,
  AppText,
  Button,
  ConfirmationDialog,
  MobileUIProvider,
  SafeAreaProvider,
  SkeletonBlock,
  StateSurface,
  TextField,
  ToastProvider,
  fontFamilyForTypography,
  mobileFontAssets,
  mobileFonts,
  useMobileUI,
  useToast,
} from "@35mm/mobile-ui";
import { typography, type ThemePreference } from "@35mm/design-tokens";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function TestProviders({
  children,
  preference = "light",
}: {
  readonly children: ReactNode;
  readonly preference?: ThemePreference;
}) {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <MobileUIProvider
          preference={preference}
          systemColorScheme="dark"
          reduceMotion
        >
          {children}
        </MobileUIProvider>
      </SafeAreaProvider>
    </View>
  );
}

function renderUI(
  element: ReactElement,
  preference: ThemePreference = "light",
) {
  return render(
    <TestProviders preference={preference}>{element}</TestProviders>,
  );
}

describe("@35mm/mobile-ui foundation", () => {
  it("resolves auto theme from controlled system scheme", async () => {
    function Probe() {
      const value = useMobileUI();
      return (
        <AppText>{`${value.preference}:${value.themeId}:${value.reduceMotion}`}</AppText>
      );
    }

    await renderUI(<Probe />, "auto");
    expect(screen.getByText("auto:dark:true")).toBeOnTheScreen();
  });

  it("fails loudly when a themed primitive renders outside its provider", async () => {
    await expect(render(<AppText>Missing provider</AppText>)).rejects.toThrow(
      "useMobileUI must be used within MobileUIProvider.",
    );
  });

  it("exports local DM font assets and deterministic role mappings", () => {
    expect(Object.keys(mobileFontAssets)).toEqual([
      mobileFonts.displayRegular,
      mobileFonts.bodyRegular,
      mobileFonts.bodyMedium,
      mobileFonts.bodySemiBold,
      mobileFonts.bodyBold,
      mobileFonts.monoRegular,
      mobileFonts.monoMedium,
    ]);
    expect(fontFamilyForTypography(typography.wordmark)).toBe(
      mobileFonts.displayRegular,
    );
    expect(fontFamilyForTypography(typography.sectionTitle)).toBe(
      mobileFonts.bodySemiBold,
    );
    expect(fontFamilyForTypography(typography.counter)).toBe(
      mobileFonts.monoRegular,
    );
  });

  it("renders shared icons and blocks duplicate button presses while loading", async () => {
    const onPress = jest.fn();
    await renderUI(
      <View>
        <AppIcon name="home" accessibilityLabel="Home icon" filled />
        <Button label="Save" onPress={onPress} loading />
      </View>,
    );

    expect(screen.getAllByLabelText("Home icon").length).toBeGreaterThan(0);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("surfaces field errors accessibly without changing entered text", async () => {
    await renderUI(
      <TextField
        label="Username"
        value="cinema_friend"
        onChangeText={jest.fn()}
        errorMessage="Username is unavailable"
      />,
    );

    expect(screen.getByLabelText("Username")).toHaveDisplayValue(
      "cinema_friend",
    );
    expect(screen.getByText("Username is unavailable")).toHaveProp(
      "accessibilityLiveRegion",
      "polite",
    );
  });

  it("hides skeleton geometry from assistive technology", async () => {
    await renderUI(<SkeletonBlock testID="skeleton" width={120} height={20} />);
    const skeleton = screen.getByTestId("skeleton", {
      includeHiddenElements: true,
    });
    expect(skeleton).toHaveProp("accessible", false);
    expect(skeleton).toHaveProp(
      "importantForAccessibility",
      "no-hide-descendants",
    );
  });

  it("renders distinct retryable state surfaces", async () => {
    const retry = jest.fn();
    await renderUI(
      <StateSurface
        kind="offline"
        title="You’re offline"
        message="Reconnect, then try again."
        primaryAction={{ label: "Retry", onPress: retry }}
      />,
    );

    expect(screen.getByText("You’re offline")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps confirmation actions explicit and blocks cancellation while saving", async () => {
    const confirm = jest.fn();
    const cancel = jest.fn();
    await renderUI(
      <ConfirmationDialog
        visible
        title="Delete draft?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading
        onConfirm={confirm}
        onCancel={cancel}
      />,
    );

    expect(screen.getByText("Delete draft?")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent(screen.getByText("Delete draft?"), "requestClose");
    expect(cancel).not.toHaveBeenCalled();
  });

  it("dismisses action sheets before running enabled actions", async () => {
    const onRequestClose = jest.fn();
    const enabledAction = jest.fn();
    const disabledAction = jest.fn();
    await renderUI(
      <ActionSheet
        visible
        accessibilityLabel="Post actions"
        onRequestClose={onRequestClose}
        sections={[
          {
            id: "primary",
            actions: [
              {
                id: "share",
                label: "Share post",
                icon: "share",
                onPress: enabledAction,
              },
              {
                id: "delete",
                label: "Delete post",
                destructive: true,
                disabled: true,
                onPress: disabledAction,
              },
            ],
          },
        ]}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Delete post" }));
    expect(disabledAction).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Share post" }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(enabledAction).toHaveBeenCalledTimes(1));
  });

  it("uses a provider-scoped toast queue with actions and expiry", async () => {
    const action = jest.fn();

    function Harness() {
      const { showToast } = useToast();
      const [count, setCount] = useState(0);
      return (
        <Button
          label={`Show toast ${count}`}
          onPress={() => {
            showToast({
              message: "Saved to bookmarks",
              tone: "success",
              durationMs: 1_000,
              action: { label: "View", onPress: action },
            });
            setCount((value) => value + 1);
          }}
        />
      );
    }

    await renderUI(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Show toast 0" }));
    });
    expect(screen.getByText("Saved to bookmarks")).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "View" }));
    });
    expect(action).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText("Saved to bookmarks")).not.toBeOnTheScreen(),
    );
  });
});
