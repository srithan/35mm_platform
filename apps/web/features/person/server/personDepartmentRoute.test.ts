import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonIdentityResolutionError } from "@/lib/tmdb/personIdentity";
import { renderPersonDepartmentPage } from "./personDepartmentRoute";

const mocks = vi.hoisted(function () {
  return {
    getIdentity: vi.fn(),
    personPage: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("next/navigation", function () {
  return { permanentRedirect: mocks.redirect };
});

vi.mock("@/features/person/components/PersonPageContent", function () {
  return {
    getPersonCanonicalIdentity: mocks.getIdentity,
    getPersonPageMetadata: vi.fn(),
    PersonPageContent: mocks.personPage,
  };
});

describe("renderPersonDepartmentPage", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(function () {});
  });

  it("redirects a legacy numeric URL to the clean role/name URL", async function () {
    mocks.getIdentity.mockResolvedValue({
      id: "60208",
      slug: "mark-gibson",
      name: "Mark Gibson",
      role: "writer",
    });

    await renderPersonDepartmentPage(
      {
        params: Promise.resolve({ slug: "60208" }),
        searchParams: Promise.resolve({ media: "movie" }),
      },
      "writer",
    );

    expect(mocks.getIdentity).toHaveBeenCalledWith("60208", "writer");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/writer/mark-gibson?media=movie",
    );
  });

  it("renders an already-clean URL without another redirect", async function () {
    await renderPersonDepartmentPage(
      {
        params: Promise.resolve({ slug: "mark-gibson" }),
        searchParams: Promise.resolve({}),
      },
      "writer",
    );

    expect(mocks.getIdentity).not.toHaveBeenCalled();
    expect(mocks.personPage).toHaveBeenCalledWith({
      id: "mark-gibson",
      routeDepartment: "writer",
      filterQuery: {},
    });
  });

  it("renders a numeric profile when canonical identity resolution is transiently unavailable", async function () {
    mocks.getIdentity.mockRejectedValue(
      new PersonIdentityResolutionError(
        "Person catalog resolution failed: 503",
        503,
      ),
    );

    await renderPersonDepartmentPage(
      {
        params: Promise.resolve({ slug: "60208" }),
        searchParams: Promise.resolve({ media: "movie" }),
      },
      "writer",
    );

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.personPage).toHaveBeenCalledWith({
      id: "60208",
      routeDepartment: "writer",
      filterQuery: { media: "movie" },
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[person-route] canonical redirect skipped",
      expect.objectContaining({
        personId: "60208",
        department: "writer",
        error: "Person catalog resolution failed: 503",
      }),
    );
  });

  it("preserves hard failures from canonical identity resolution", async function () {
    mocks.getIdentity.mockRejectedValue(new Error("identity corruption"));

    await expect(
      renderPersonDepartmentPage(
        {
          params: Promise.resolve({ slug: "60208" }),
          searchParams: Promise.resolve({}),
        },
        "writer",
      ),
    ).rejects.toThrow("identity corruption");

    expect(mocks.personPage).not.toHaveBeenCalled();
  });
});
