import { renderRouter } from "expo-router/testing-library";

import IndexRoute from "@/app/index";

jest.mock("@/harness/FoundationGallery", () => ({
  FoundationGallery: () => null,
}));

describe("mobile router bootstrap", () => {
  it("resolves the canonical root entry", () => {
    const router = renderRouter({ index: IndexRoute }, { initialUrl: "/" });

    expect(router.getPathname()).toBe("/");
    expect(router.getSegments()).toEqual([]);
  });
});
