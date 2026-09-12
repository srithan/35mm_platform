import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
