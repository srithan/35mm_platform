import { describe, expect, it } from "vitest";
import { isUsernameProfilePath } from "./navigation";

describe("isUsernameProfilePath", function () {
  it("recognizes the reposts profile tab", function () {
    expect(isUsernameProfilePath("/teju/reposts")).toBe(true);
  });

  it("does not treat unrelated nested routes as profiles", function () {
    expect(isUsernameProfilePath("/teju/post/post-id")).toBe(false);
    expect(isUsernameProfilePath("/settings/privacy")).toBe(false);
  });
});
