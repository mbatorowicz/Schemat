// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  readUseOrient,
  writeUseOrient,
  composeSheetFlip,
  mapLocalToSheet,
  buildUseTransform,
  flipDirWithOrient,
} from "../src/instance-orient.js";
import { rotatePoint } from "../src/svg-dom.js";

describe("instance-orient", () => {
  it("use@90 flip H → kąt  -90 znormalizowany / flaga + scale", () => {
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("x", "100");
    use.setAttribute("y", "50");
    writeUseOrient(use, { ang: 90, flipH: false, flipV: false }, 100, 50);
    const next = composeSheetFlip(readUseOrient(use), "h");
    writeUseOrient(use, next, 100, 50);
    expect(use.getAttribute("data-flip-h")).toBe("1");
    expect(use.getAttribute("data-flip-v")).toBe(null);
    expect(parseFloat(use.getAttribute("data-ang"))).toBe(-90);
    expect(use.getAttribute("transform")).toContain("scale(-1");
    expect(use.getAttribute("transform")).toContain("rotate(-90)");
  });

  it("θ=90 flip H: punkt asymetryczny ≠ samo rotate(90)", () => {
    const o0 = { ang: 90, flipH: false, flipV: false };
    const o1 = composeSheetFlip(o0, "h");
    expect(o1.flipH).toBe(true);
    expect(o1.ang).toBe(-90);
    const a = mapLocalToSheet(0, 0, o0, 10, 4);
    const b = mapLocalToSheet(0, 0, o1, 10, 4);
    const onlyRot = rotatePoint(10, 4, 0, 0, 90);
    expect(a[0]).toBeCloseTo(onlyRot[0], 5);
    expect(a[1]).toBeCloseTo(onlyRot[1], 5);
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeGreaterThan(1);
  });

  it("podwójny flip H przywraca orientację", () => {
    let o = { ang: 90, flipH: false, flipV: false };
    o = composeSheetFlip(o, "h");
    o = composeSheetFlip(o, "h");
    expect(o.flipH).toBe(false);
    expect(o.ang).toBe(90);
  });

  it("mapLocalToSheet: lustro H przy θ=0 = odbicie X", () => {
    const [x, y] = mapLocalToSheet(100, 50, { ang: 0, flipH: true, flipV: false }, 10, 4);
    expect(x).toBeCloseTo(90, 5);
    expect(y).toBeCloseTo(54, 5);
  });

  it("buildUseTransform bez flip = zwykły rotate", () => {
    expect(buildUseTransform(10, 20, { ang: 45, flipH: false, flipV: false })).toBe("rotate(45 10 20)");
  });

  it("flipDirWithOrient: H zamienia E↔W, potem obrót", () => {
    expect(flipDirWithOrient("E", { ang: 0, flipH: true, flipV: false })).toBe("W");
    expect(flipDirWithOrient("E", { ang: 90, flipH: false, flipV: false })).toBe("S");
  });

  it("writeUseOrient czyta i zapisuje flagi", () => {
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    writeUseOrient(use, { ang: 0, flipH: true, flipV: true }, 1, 2);
    const o = readUseOrient(use);
    expect(o.flipH).toBe(true);
    expect(o.flipV).toBe(true);
    expect(use.getAttribute("transform")).toContain("scale(-1 -1)");
  });
});
