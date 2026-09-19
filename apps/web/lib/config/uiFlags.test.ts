import { describe, expect, it } from "vitest";
import { resolveUiRolloutConfig } from "./uiFlags";

describe("resolveUiRolloutConfig", function () {
  it("maps default public flags to current browse rail rollout", function () {
    expect(resolveUiRolloutConfig({})).toMatchObject({
      desktopNavigation: {
        variant: "header",
        primaryAlignment: "top",
      },
      browse: {
        chrome: "rail",
        density: "compact",
        showDirectoryTabs: false,
        showRailMenu: true,
      },
      mobile: {
        tabBar: "floating",
      },
      postComposer: {
        entry: "rich-trigger",
      },
      postCard: {
        mediaPresentation: "grid",
      },
    });
  });

  it("lets focused navigation own browse chrome without changing browse density", function () {
    expect(
      resolveUiRolloutConfig({
        browseRail: "true",
        focusedNavigation: "true",
        focusedNavigationCentered: "true",
      })
    ).toMatchObject({
      desktopNavigation: {
        variant: "focused-sidebar",
        primaryAlignment: "center",
      },
      browse: {
        chrome: "focused",
        density: "compact",
        showDirectoryTabs: true,
        showRailMenu: false,
      },
    });
  });

  it("keeps simplified composer trigger ahead of inline composer", function () {
    expect(
      resolveUiRolloutConfig({
        inlinePostComposer: "true",
        simplifiedPostComposerTrigger: "true",
      }).postComposer.entry
    ).toBe("simplified-trigger");
  });

  it("keeps mobile tab bar floating by default and enables traditional layout by flag", function () {
    expect(resolveUiRolloutConfig({}).mobile.tabBar).toBe("floating");
    expect(
      resolveUiRolloutConfig({
        mobileTabBarTraditional: "true",
      }).mobile.tabBar
    ).toBe("traditional");
  });

  it("keeps post card media grid by default and enables carousel by flag", function () {
    expect(resolveUiRolloutConfig({}).postCard.mediaPresentation).toBe("grid");
    expect(
      resolveUiRolloutConfig({
        postMediaCarousel: "true",
      }).postCard.mediaPresentation
    ).toBe("carousel");
  });
});
