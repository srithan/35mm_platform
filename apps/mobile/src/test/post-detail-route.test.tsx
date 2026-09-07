import { render, screen } from "@testing-library/react-native";

import PostDetailRoute from "@/app/post/[postId]";
import { parsePostRouteId } from "@/features/feed/postRoute";

const LIVE_POST_ID = "530784aa-d70d-4c51-b846-2fea9ff2c632";
let mockPostId: string | string[] | undefined = LIVE_POST_ID;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ postId: mockPostId }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("@/features/feed/PostDetailScreen", () => ({
  PostDetailScreen: ({ postId }: { readonly postId: string }) => {
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return <Text testID="loaded-post-id">{postId}</Text>;
  },
}));

describe("mobile post detail route", () => {
  it("loads a feed post UUID instead of rejecting it as an invalid link", async () => {
    mockPostId = LIVE_POST_ID;
    await render(<PostDetailRoute />);

    expect(screen.getByTestId("loaded-post-id")).toHaveTextContent(LIVE_POST_ID);
    expect(screen.queryByTestId("invalid-post-route")).not.toBeOnTheScreen();
  });

  it("accepts only one canonical UUID-shaped route segment", () => {
    expect(parsePostRouteId(LIVE_POST_ID.toUpperCase())).toBe(LIVE_POST_ID);
    expect(parsePostRouteId("01K4D0M4Y6X7T8W9V0A1B2C3D4")).toBeNull();
    expect(parsePostRouteId([LIVE_POST_ID])).toBeNull();
    expect(parsePostRouteId("../../feed")).toBeNull();
    expect(parsePostRouteId(undefined)).toBeNull();
  });
});
