import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  fetchPublicProfile,
  updateCurrentProfile,
  updateCurrentUsername,
} from "@/features/profile/api";
import { EditProfileScreen } from "@/features/profile/EditProfileScreen";

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock("@/services/api", () => ({
  useApiClient: () => ({
    request: jest.fn(),
  }),
}));

jest.mock("@/features/auth/signup/useUsernameAvailability", () => ({
  useUsernameAvailability: () => ({ status: "available" }),
}));

jest.mock("@/features/profile/api", () => ({
  fetchPublicProfile: jest.fn(),
  presignProfileMedia: jest.fn(),
  updateCurrentProfile: jest.fn(),
  updateCurrentUsername: jest.fn(),
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const PROFILE = {
  userId: "4b3c0a38-5ac5-47c3-a6af-c2a09a3e6f86",
  username: "toni",
  displayName: "Toni",
  bio: "Noir and melodrama.",
  avatarUrl: "https://cdn.35mm.test/avatar.jpg",
  avatarUrlLg: "https://cdn.35mm.test/avatar-lg.jpg",
  coverUrl: "https://cdn.35mm.test/cover.jpg",
  location: "Los Angeles",
  website: "https://toni.example",
  dateOfBirth: null,
  role: "Critic",
  roleContext: "Noir desk",
  headline: "Critic",
  headlineContext: "Noir desk",
  filmsLoggedCount: 42,
  followerCount: 1200,
  followingCount: 98,
  followState: "self" as const,
  isPrivate: false,
  hasIncomingFollowRequest: false,
  hasPendingRequestToViewer: false,
  isMutedByViewer: false,
  isDeactivated: false,
  moderationStatus: "visible" as const,
  createdAt: "2026-09-13T12:00:00.000Z",
};

const activeQueryClients: QueryClient[] = [];

function Providers({
  children,
  queryClient,
}: {
  readonly children: ReactNode;
  readonly queryClient: QueryClient;
}) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider preference="light" reduceMotion systemColorScheme="light">
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

function renderWithProviders(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });
  activeQueryClients.push(queryClient);
  return render(
    <Providers queryClient={queryClient}>
      {children}
    </Providers>,
  );
}

const fetchPublicProfileMock = fetchPublicProfile as jest.MockedFunction<typeof fetchPublicProfile>;
const updateCurrentProfileMock = updateCurrentProfile as jest.MockedFunction<typeof updateCurrentProfile>;
const updateCurrentUsernameMock = updateCurrentUsername as jest.MockedFunction<typeof updateCurrentUsername>;

describe("mobile edit profile screen", () => {
  beforeEach(() => {
    fetchPublicProfileMock.mockResolvedValue(PROFILE);
    updateCurrentProfileMock.mockResolvedValue({
      userId: PROFILE.userId,
      username: "toni",
      displayName: "Toni Hall",
      bio: PROFILE.bio,
      avatarUrl: PROFILE.avatarUrl,
      avatarUrlLg: PROFILE.avatarUrlLg,
      coverUrl: PROFILE.coverUrl,
      location: PROFILE.location,
      website: PROFILE.website,
      dateOfBirth: PROFILE.dateOfBirth,
      role: PROFILE.role,
      roleContext: PROFILE.roleContext,
      headline: PROFILE.headline,
      headlineContext: PROFILE.headlineContext,
    });
    updateCurrentUsernameMock.mockResolvedValue("toni");
  });

  afterEach(() => {
    for (const queryClient of activeQueryClients) queryClient.clear();
    activeQueryClients.splice(0, activeQueryClients.length);
    jest.clearAllMocks();
  });

  it("saves profile edits through the production profile endpoint", async () => {
    await renderWithProviders(<EditProfileScreen username="toni" />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-profile-display-name")).toBeOnTheScreen();
    });
    fireEvent.changeText(screen.getByTestId("edit-profile-display-name"), "Toni Hall");
    await waitFor(() => {
      expect(screen.getByDisplayValue("Toni Hall")).toBeOnTheScreen();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateCurrentProfileMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          displayName: "Toni Hall",
          bio: "Noir and melodrama.",
          role: "Critic",
          roleContext: "Noir desk",
        }),
      );
    });
    expect(updateCurrentUsernameMock).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/profile/toni");
  });

  it("blocks editing another user's profile", async () => {
    fetchPublicProfileMock.mockResolvedValueOnce({ ...PROFILE, followState: "following" });
    await renderWithProviders(<EditProfileScreen username="toni" />);

    await waitFor(() => {
      expect(screen.getByText("Not your profile")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });
});
