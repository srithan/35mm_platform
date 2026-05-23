import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  popModalFocusSnapshot,
  pushModalFocusSnapshot,
  resetModalFocusStackForTests,
} from "./focusStack";

describe("modal focusStack", () => {
  beforeEach(function () {
    resetModalFocusStackForTests();
    document.body.innerHTML = "";
  });

  afterEach(function () {
    resetModalFocusStackForTests();
    document.body.innerHTML = "";
  });

  it("restores focus in LIFO order", function () {
    const a = document.createElement("button");
    const b = document.createElement("button");
    a.textContent = "a";
    b.textContent = "b";
    document.body.appendChild(a);
    document.body.appendChild(b);

    a.focus();
    pushModalFocusSnapshot(a);
    b.focus();
    pushModalFocusSnapshot(b);

    popModalFocusSnapshot();
    expect(document.activeElement).toBe(b);

    popModalFocusSnapshot();
    expect(document.activeElement).toBe(a);
  });

  it("ignores stale nodes on pop", function () {
    const a = document.createElement("button");
    document.body.appendChild(a);
    a.focus();
    pushModalFocusSnapshot(a);
    document.body.removeChild(a);

    popModalFocusSnapshot();
    expect(document.activeElement).toBe(document.body);
  });
});
