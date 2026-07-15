import { describe, it, expect } from "vitest";
import { resolveInstPrefixFields } from "../src/symbol-name-fields.js";

describe("symbol-name-fields", () => {
  it("nie wypełnia placeholder sugestią", () => {
    expect(resolveInstPrefixFields("")).toEqual({ value: "", placeholder: "" });
    expect(resolveInstPrefixFields("Q")).toEqual({ value: "Q", placeholder: "" });
  });
});
