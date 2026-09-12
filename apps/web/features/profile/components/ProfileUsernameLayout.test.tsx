import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSON_ROLE_SLUGS } from "@/lib/routing/personRoles";
import { ProfileUsernameLayout } from "./ProfileUsernameLayout";

var pathname = "/";

vi.mock("next/navigation", function () {
  return {
    usePathname: function () {
      return pathname;
    },
  };
});

vi.mock("./ProfileShellClient", function () {
  return {
    ProfileShellClient: function ({ username }: { username: string }) {
      return <div>Profile shell for {username}</div>;
    },
  };
});

describe("ProfileUsernameLayout", function () {
  beforeEach(function () {
    pathname = "/";
  });

  it.each(PERSON_ROLE_SLUGS)(
    "passes through the %s person-role route",
    function (role) {
      pathname = "/" + role + "/test-person";
      render(
        <ProfileUsernameLayout username={role}>
          <div>Role page</div>
        </ProfileUsernameLayout>,
      );

      expect(screen.getByText("Role page")).toBeInTheDocument();
      expect(screen.queryByText(/Profile shell/)).not.toBeInTheDocument();
    },
  );

  it("keeps a one-segment username matching a role on the profile layout", function () {
    pathname = "/makeup";
    render(
      <ProfileUsernameLayout username="makeup">
        <div>Role page</div>
      </ProfileUsernameLayout>,
    );

    expect(screen.getByText("Profile shell for makeup")).toBeInTheDocument();
    expect(screen.queryByText("Role page")).not.toBeInTheDocument();
  });
});
