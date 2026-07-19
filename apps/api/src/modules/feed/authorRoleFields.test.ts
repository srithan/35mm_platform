import { describe, expect, it } from "vitest";
import { publicAuthorRoleFields } from "./routes.js";

describe("publicAuthorRoleFields", function () {
  it("returns current profile role presentation", function () {
    expect(publicAuthorRoleFields({
      role: "Cinephile",
      roleContext: "Silent cinema",
      profileHeadline: "Legacy role",
      profileHeadlineContext: "Legacy context",
      filmsLoggedCount: 142,
    })).toEqual({
      role: "Cinephile",
      roleContext: "Silent cinema",
      filmsLoggedCount: 142,
    });
  });

  it("preserves legacy headline fallback", function () {
    expect(publicAuthorRoleFields({
      role: null,
      roleContext: null,
      profileHeadline: "Film Critic",
      profileHeadlineContext: "Frame by Frame",
      filmsLoggedCount: null,
    })).toEqual({
      role: "Film Critic",
      roleContext: "Frame by Frame",
      filmsLoggedCount: 0,
    });
  });
});
