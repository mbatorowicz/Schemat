import { describe, it, expect } from "vitest";
import { resolveInstPrefixFields } from "../src/symbol-name-fields.js";

describe("resolveInstPrefixFields", () => {
  it("nie wypełnia value sugestią — tylko placeholder", () => {
    expect(resolveInstPrefixFields("", "SK")).toEqual({ value: "", placeholder: "SK" });
  });

  it("zachowuje jawny prefiks niezależnie od sugestii", () => {
    expect(resolveInstPrefixFields("Q", "SK")).toEqual({ value: "Q", placeholder: "SK" });
  });

  it("trimuje spacje z obu pól", () => {
    expect(resolveInstPrefixFields("  WD  ", "  F  ")).toEqual({ value: "WD", placeholder: "F" });
  });
});
