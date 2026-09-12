import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/constants/routes";
import { isUrlSlug, toUrlSlug } from "./slugs";

describe("public URL slugs", function () {
  it("normalizes title and person names", function () {
    expect(toUrlSlug("The Runner")).toBe("the-runner");
    expect(toUrlSlug("Gal Gadot")).toBe("gal-gadot");
    expect(toUrlSlug("Am\u00e9lie")).toBe("amelie");
    expect(toUrlSlug("七人の侍")).toBe("七人の侍");
  });

  it("validates canonical URL segments", function () {
    expect(isUrlSlug("breaking-bad")).toBe(true);
    expect(isUrlSlug("Breaking-Bad")).toBe(false);
    expect(isUrlSlug("../breaking-bad")).toBe(false);
  });

  it("builds public title and role-first person routes", function () {
    expect(ROUTES.TITLE("movie", "The Runner")).toBe("/film/the-runner");
    expect(ROUTES.TITLE("tv", "Breaking Bad")).toBe("/tv/breaking-bad");
    expect(ROUTES.PERSON_ROLE("Gal Gadot", "Acting")).toBe(
      "/actor/gal-gadot",
    );
    expect(ROUTES.PERSON_ROLE("Tom Holland", "actor")).toBe(
      "/actor/tom-holland",
    );
    expect(ROUTES.PERSON_ROLE("Tom Holland", "production")).toBe(
      "/production/tom-holland",
    );
    expect(ROUTES.PERSON_ROLE("Vic Armstrong", "stunts")).toBe(
      "/stunts/vic-armstrong",
    );
    expect(
      ROUTES.PERSON_ROLE("Jacqueline Durran", "Costume & Make-Up"),
    ).toBe("/costume-and-makeup/jacqueline-durran");
  });
});
