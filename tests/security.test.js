import { describe, it, expect } from "vitest";
import { sanitizeSvgText } from "../src/svg-utils.js";
import { cssEsc, qsById } from "../src/dom-selectors.js";

describe("svg-utils sanitize", () => {
  it("usuwa tag script z SVG", () => {
    const raw = '<svg><script>alert(1)</script><rect id="a"/></svg>';
    expect(sanitizeSvgText(raw)).not.toMatch(/<script/i);
    expect(sanitizeSvgText(raw)).toContain('id="a"');
  });

  it("usuwa atrybuty onload", () => {
    const raw = '<svg><rect id="a" onload="alert(1)"/></svg>';
    expect(sanitizeSvgText(raw)).not.toMatch(/onload/i);
  });
});

describe("dom-selectors", () => {
  it("cssEsc działa bez globalnego CSS (Node)", () => {
    expect(cssEsc('a"b')).toBe('a\\"b');
  });

  it("qsById zwraca null dla brakującego root", () => {
    expect(qsById(null, "x")).toBeNull();
  });
});
