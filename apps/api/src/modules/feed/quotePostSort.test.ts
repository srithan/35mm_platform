import { describe, expect, it } from "vitest";
import { parseQuotePostSort } from "./routes.js";

describe("parseQuotePostSort", function () {
  it("defaults to latest and accepts top", function () {
    expect(parseQuotePostSort(undefined)).toBe("latest");
    expect(parseQuotePostSort("latest")).toBe("latest");
    expect(parseQuotePostSort("top")).toBe("top");
  });

  it("rejects unsupported sorts", function () {
    expect(function () {
      parseQuotePostSort("oldest");
    }).toThrowError("Invalid quote post sort");
  });
});
