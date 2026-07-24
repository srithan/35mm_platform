import { renderRouter } from "expo-router/testing-library";

import IndexRoute from "@/app/index";

jest.mock("@/features/auth/bootstrap/AuthBootstrapGate", () => ({
  AuthBootstrapGate: ({
    children,
  }: {
    children: (destination: { status: "signedOut" }) => React.ReactNode;
  }) => children({ status: "signedOut" }),
}));
jest.mock(
  "@/features/auth/signup/SignupCompletionRecoveryGate",
  () => ({
    SignupCompletionRecoveryGate: ({
      children,
    }: {
      children: React.ReactNode;
    }) => children,
  }),
);
jest.mock("@/features/auth/welcome/WelcomeScreen", () => ({
  WelcomeScreen: () => null,
}));
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
