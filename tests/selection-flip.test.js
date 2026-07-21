// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { flipPoint, flipAngleDeg, normalizeAngleDeg, collectFlipTargets } from "../src/selection-flip.js";
import { composeSheetFlip, writeUseOrient, readUseOrient } from "../src/instance-orient.js";

describe("selection-flip", () => {
  it("flipPoint H/V względem środka", () => {
    expect(flipPoint(10, 5, 0, 0, "h")).toEqual([-10, 5]);
    expect(flipPoint(10, 5, 0, 0, "v")).toEqual([10, -5]);
    expect(flipPoint(30, 20, 20, 20, "h")).toEqual([10, 20]);
  });

  it("flipAngleDeg: H = 180-θ, V = -θ", () => {
    expect(flipAngleDeg(90, "h")).toBe(90);
    expect(flipAngleDeg(0, "h")).toBe(180);
    expect(flipAngleDeg(90, "v")).toBe(-90);
    expect(flipAngleDeg(45, "v")).toBe(-45);
  });

  it("normalizeAngleDeg do (-180, 180]", () => {
    expect(normalizeAngleDeg(270)).toBe(-90);
    expect(normalizeAngleDeg(-270)).toBe(90);
  });

  it("collectFlipTargets dokłada członków instancji i etykiety owned", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("data-ref", "K1");
    const conn = document.createElementNS("http://www.w3.org/2000/svg", "g");
    conn.setAttribute("data-role", "conn");
    conn.setAttribute("data-ref", "K1");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("data-owner-ref", "K1");
    const mark = document.createElementNS("http://www.w3.org/2000/svg", "text");
    mark.setAttribute("data-role", "wire-mark");
    mark.setAttribute("data-owner-ref", "K1");
    g.append(use, conn, label, mark);

    const out = collectFlipTargets([use], g, {
      expandToInstanceMembers: (_node, els) => [use, conn],
      instanceRefOf: (el) => el.getAttribute("data-ref") || el.getAttribute("data-owner-ref") || "",
      rotateOwnedLabels: true,
    });
    expect(out).toContain(use);
    expect(out).toContain(conn);
    expect(out).toContain(label);
    expect(out).not.toContain(mark);
  });

  it("use@90 flip H: flaga + scale (nie no-op kąta)", () => {
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    writeUseOrient(use, { ang: 90, flipH: false, flipV: false }, 0, 0);
    const next = composeSheetFlip(readUseOrient(use), "h");
    writeUseOrient(use, next, 0, 0);
    expect(use.getAttribute("data-flip-h")).toBe("1");
    expect(use.getAttribute("transform")).toMatch(/scale\(-1/);
    const back = composeSheetFlip(readUseOrient(use), "h");
    writeUseOrient(use, back, 0, 0);
    expect(use.getAttribute("data-flip-h")).toBe(null);
    expect(parseFloat(use.getAttribute("data-ang"))).toBe(90);
  });
});
