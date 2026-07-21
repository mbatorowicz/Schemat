// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { pinWireEnds, rePinWireEndsFromMeta } from "../src/wire-ends.js";

describe("wire-ends", () => {
  it("pinWireEnds ustawia końce polyline na piny", () => {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "0,0 10,0 10,50 80,50");
    pinWireEnds(poly, { x: 5, y: 5 }, { x: 90, y: 60 }, true);
    expect(poly.getAttribute("points")).toMatch(/^5,5 /);
    expect(poly.getAttribute("points")).toMatch(/ 90,60$/);
  });

  it("rePinWireEndsFromMeta przywraca końce po edycji środka", () => {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "0,0 40,0 40,40");
    poly.setAttribute("data-from", "Q1:T2");
    poly.setAttribute("data-to", "SK1:23");
    rePinWireEndsFromMeta(poly, (raw) => {
      if (raw === "Q1:T2") return { x: 1, y: 2 };
      if (raw === "SK1:23") return { x: 99, y: 88 };
      return null;
    });
    const pts = poly.getAttribute("points").trim().split(/\s+/);
    expect(pts[0]).toBe("1,2");
    expect(pts[pts.length - 1]).toBe("99,88");
  });
});
