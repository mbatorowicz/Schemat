// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { resolveLibSymbol } from "../src/symbol-resolver.js";
import { normalizeLibLayout } from "../src/library-loader.js";

describe("resolveLibSymbol", () => {
  it("znajduje grupę symbolu w defs, nie element wewnętrzny o tym samym id", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    normalizeLibLayout(svg, "http://www.w3.org/2000/svg");
    const defs = svg.querySelector("defs");
    const symB = document.createElementNS("http://www.w3.org/2000/svg", "g");
    symB.id = "B";
    const symQ = document.createElementNS("http://www.w3.org/2000/svg", "g");
    symQ.id = "Q";
    const inner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    inner.id = "B";
    symQ.appendChild(inner);
    defs.append(symQ, symB);
    const found = resolveLibSymbol(svg, "B");
    expect(found).toBe(symB);
    expect(found?.tagName.toLowerCase()).toBe("g");
    expect(found?.parentNode).toBe(defs);
  });
});
