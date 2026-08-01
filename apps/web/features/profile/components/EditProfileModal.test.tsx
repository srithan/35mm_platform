import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditProfileModal } from "./EditProfileModal";

const mocks = vi.hoisted(function () {
  return {
    fetchUsernameAvailability: vi.fn(),
    updateCurrentProfile: vi.fn(),
    updateCurrentUsername: vi.fn(),
    replace: vi.fn(),
  };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return { getToken: vi.fn().mockResolvedValue("token") };
    },
  };
});

vi.mock("next/navigation", function () {
  return {
    useRouter: function () {
      return { replace: mocks.replace };
    },
  };
});

vi.mock("../api/profileApi", function () {
  return {
    fetchUsernameAvailability: mocks.fetchUsernameAvailability,
    updateCurrentProfile: mocks.updateCurrentProfile,
    updateCurrentUsername: mocks.updateCurrentUsername,
  };
});

vi.mock("@/components/Dialog/Dialog", function () {
  return {
    Dialog: function (props: {
      title?: string;
      description?: string;
      children: React.ReactNode;
    }) {
      return (
        <div role="dialog" aria-label={props.title}>
          {props.description ? <p>{props.description}</p> : null}
          {props.children}
        </div>
      );
    },
  };
});

vi.mock("@/components/ConfirmDialog/ConfirmDialog", function () {
  return { ConfirmDialog: function () { return null; } };
});

vi.mock("./ProfilePictureUpload", function () {
  return {
    ProfilePictureUpload: function (props: { children: React.ReactNode }) {
      return <div>{props.children}</div>;
    },
  };
});

vi.mock("./CoverPhoto", function () {
  return {
    CoverPhoto: function () {
      return <button type="button" data-cover-photo-trigger>Add cover photo</button>;
    },
  };
});

vi.mock("./LocationAutocomplete", function () {
  return {
    LocationAutocomplete: function (props: {
      id: string;
      value: string;
      onChange: (value: string) => void;
    }) {
      return (
        <input
          id={props.id}
          value={props.value}
          onChange={function (event) {
            props.onChange(event.target.value);
          }}
        />
      );
    },
  };
});

function renderModal(
  onSave = vi.fn(),
  onClose = vi.fn(),
  initialEditTarget?: "avatar" | "cover" | "bio" | "location"
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <EditProfileModal
        open
        onClose={onClose}
        onSave={onSave}
        avatarUrl={null}
        initialEditTarget={initialEditTarget}
        initialData={{
          displayName: "Maya Frames",
          username: "maya.frames",
          dateOfBirth: "",
          role: "Cinephile",
          roleContext: "",
          bio: "",
          location: "",
          website: "",
        }}
      />
    </QueryClientProvider>
  );
}

describe("EditProfileModal", function () {
  afterEach(function () {
    vi.clearAllMocks();
  });

  it("uses the page surface instead of gray sunken field containers", async function () {
    renderModal();
    await act(async function () {
      await Promise.resolve();
    });

    const displayName = screen.getByLabelText("Display name");
    const fieldGroup = displayName.closest(".edit-profile-field-group");

    expect(fieldGroup).toHaveClass("bg-bg");
    expect(fieldGroup).not.toHaveClass("bg-sunken");
  });

  it("focuses and highlights a deep-linked completion field", async function () {
    renderModal(vi.fn(), vi.fn(), "location");

    var location = screen.getByLabelText("Location");
    await waitFor(function () {
      expect(location).toHaveFocus();
    });

    expect(location.closest('[data-profile-edit-target="location"]')).toHaveClass(
      "shadow-[inset_0_0_0_3px_color-mix(in_srgb,var(--color-film-red)_72%,transparent)]"
    );
  });

  it("checks and saves a changed username while clearing cinephile context", async function () {
    mocks.fetchUsernameAvailability.mockResolvedValue({ available: true });
    mocks.updateCurrentProfile.mockResolvedValue({
      userId: "user-1",
      username: "maya.frames",
      displayName: "Maya Frames",
      bio: null,
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
      dateOfBirth: null,
      role: "Cinephile",
      roleContext: null,
      headline: "Cinephile",
      headlineContext: null,
    });
    mocks.updateCurrentUsername.mockResolvedValue("maya.new");
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderModal(onSave, onClose);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "Maya.New" },
    });

    expect(
      await screen.findByText("Username is available.", {}, { timeout: 1500 })
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(function () {
      expect(mocks.updateCurrentProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "Cinephile",
          roleContext: null,
          headline: "Cinephile",
          headlineContext: null,
        }),
        "token"
      );
      expect(mocks.updateCurrentUsername).toHaveBeenCalledWith("maya.new", "token");
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ username: "maya.new" })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mocks.replace).toHaveBeenCalledWith("/maya.new");
    });
  });
});
