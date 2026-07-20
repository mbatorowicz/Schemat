// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  distPointToSegment,
  nearestSegment,
  insertVertex,
  removeBreakVertex,
  canRemoveBreakVertex,
  formatPointsAttr,
  pointsOfWire,
  applyWirePoints,
  hitWireSegment,
} from "../src/polyline-edit.js";

describe("polyline-edit", () => {
  it("projekcja na segment", () => {
    const r = distPointToSegment(5, 3, 0, 0, 10, 0);
    expect(r.x).toBeCloseTo(5);
    expect(r.y).toBeCloseTo(0);
    expect(r.dist).toBeCloseTo(3);
  });

  it("nearestSegment wybiera właściwy odcinek", () => {
    const pts = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const hit = nearestSegment(pts, 10, 5);
    expect(hit.segmentIndex).toBe(1);
  });

  it("insertVertex wstawia między końcami", () => {
    const pts = [
      [0, 0],
      [10, 0],
    ];
    const next = insertVertex(pts, 0, 5, 0);
    expect(next).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
    ]);
  });

  it("removeBreakVertex chroni końce i min. 2 punkty", () => {
    const pts = [
      [0, 0],
      [5, 0],
      [10, 0],
    ];
    expect(canRemoveBreakVertex(pts, 0)).toBe(false);
    expect(canRemoveBreakVertex(pts, 2)).toBe(false);
    expect(removeBreakVertex(pts, 1)).toEqual([
      [0, 0],
      [10, 0],
    ]);
    expect(
      removeBreakVertex(
        [
          [0, 0],
          [10, 0],
        ],
        0
      )
    ).toBeNull();
  });

  it("formatPointsAttr", () => {
    expect(
      formatPointsAttr([
        [1, 2],
        [3, 4],
      ])
    ).toBe("1,2 3,4");
  });

  it("line → polyline przy >2 punktach", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", "10");
    line.setAttribute("y2", "0");
    line.setAttribute("class", "w24");
    line.setAttribute("data-conn-id", "1");
    svg.appendChild(line);
    const mkEl = (tag, attrs) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    const out = applyWirePoints(
      line,
      [
        [0, 0],
        [5, 0],
        [10, 0],
      ],
      mkEl
    );
    expect(out.tagName.toLowerCase()).toBe("polyline");
    expect(out.getAttribute("data-conn-id")).toBe("1");
    expect(out.getAttribute("data-route")).toBe("manual");
    expect(pointsOfWire(out)).toHaveLength(3);
  });

  it("hitWireSegment", () => {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "0,0 10,0 10,10");
    const hit = hitWireSegment(poly, 5, 1, 3);
    expect(hit.segmentIndex).toBe(0);
    expect(hit.x).toBeCloseTo(5);
  });
});
