import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { MobileQueryProvider } from "@/providers/query";

const mockUseAuth = jest.fn();
const mockTransitionQueryCacheScope = jest.fn();

jest.mock("@clerk/expo", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/services/queryPersistence", () => ({
  MOBILE_QUERY_CACHE_MAX_AGE_MS: 1_000,
  createMobileQueryPersister: jest.fn(),
  shouldPersistMobileQuery: jest.fn(),
  transitionQueryCacheScope: (...args: unknown[]) =>
    mockTransitionQueryCacheScope(...args),
}));

describe("MobileQueryProvider bootstrap", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockTransitionQueryCacheScope.mockReset();
  });

  it("renders a visible bootstrap while Clerk initializes", async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      userId: null,
    });

    const view = await render(
      <MobileQueryProvider appVersion="0.1.0">
        <Text>Route content</Text>
      </MobileQueryProvider>,
    );

    expect(view.getByTestId("app-bootstrap-loading")).toBeOnTheScreen();
    expect(view.getByText("35mm")).toBeOnTheScreen();
    expect(view.queryByText("Route content")).not.toBeOnTheScreen();
  });

  it("renders a visible bootstrap while cache scope changes", async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });
    mockTransitionQueryCacheScope.mockReturnValue(new Promise(() => undefined));

    const view = await render(
      <MobileQueryProvider appVersion="0.1.0">
        <Text>Route content</Text>
      </MobileQueryProvider>,
    );

    expect(view.getByTestId("app-bootstrap-loading")).toBeOnTheScreen();
    expect(view.queryByText("Route content")).not.toBeOnTheScreen();
  });
});
