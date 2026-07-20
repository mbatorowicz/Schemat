// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  obliqueStubPoints,
  buildObliqueBranchPoints,
  segmentAxis,
  hitNearestWireOnSheet,
  prependObliqueStub,
} from "../src/polyline-edit.js";
import {
  createJunctionEl,
  ensureJunctionRef,
  findJunctionByRef,
  collectJunctionSnapCandidates,
} from "../src/junctions.js";
import { endpointRawFromSnap } from "../src/topo-nodes.js";
import { createNetlistRouting } from "../src/netlist-routing.js";
import { parseEndpoint } from "../src/netlist-model.js";

describe("oblique geometry", () => {
  it("segmentAxis", () => {
    expect(segmentAxis([0, 0], [0, 10])).toBe("V");
    expect(segmentAxis([0, 0], [10, 0])).toBe("H");
  });

  it("obliqueStubPoints 45° z pionu w prawo", () => {
    const s = obliqueStubPoints({ x: 10, y: 20 }, "V", { x: 50, y: 40 }, 5);
    expect(s.attach).toEqual([10, 20]);
    expect(s.tip[0]).toBe(15);
    expect(s.tip[1]).toBe(25);
  });

  it("buildObliqueBranchPoints zaczyna od attach i tip", () => {
    const pts = buildObliqueBranchPoints({ x: 0, y: 0 }, "V", { x: 40, y: 30 }, 5, null);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[1][0]).toBe(10);
    expect(pts[1][1]).toBe(10);
    expect(pts.length).toBeGreaterThanOrEqual(3);
  });

  it("prependObliqueStub", () => {
    const next = prependObliqueStub(
      [
        [0, 0],
        [20, 0],
      ],
      "V",
      { x: 20, y: 10 },
      5
    );
    expect(next[0]).toEqual([0, 0]);
    expect(next[1]).toEqual([5, 5]);
  });

  it("hitNearestWireOnSheet", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", "0");
    line.setAttribute("y2", "100");
    g.appendChild(line);
    const hit = hitNearestWireOnSheet(g, 2, 40, 5);
    expect(hit.trunkAxis).toBe("V");
    expect(hit.y).toBeCloseTo(40);
  });
});

describe("junctions J*", () => {
  it("tworzy ref i snap", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const mkEl = (tag, attrs) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    const j = createJunctionEl(mkEl, 12, 34, g);
    g.appendChild(j);
    expect(ensureJunctionRef(j, g)).toBe("J1");
    expect(findJunctionByRef(g, "J1")).toBe(j);
    const c = collectJunctionSnapCandidates(g);
    expect(c[0].kind).toBe("junction");
    expect(endpointRawFromSnap(c[0])).toBe("J1");
  });
});

describe("resolve junction", () => {
  it("resolveEndpoint lokalizuje J1", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "sch-1");
    const mkEl = (tag, attrs) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    const j = createJunctionEl(mkEl, 8, 9, g);
    g.appendChild(j);
    svg.appendChild(g);
    const sheet = { id: "sch-1", name: "A.svg", svg };
    const routing = createNetlistRouting({
      state: { active: sheet, sheets: [sheet], lib: null, netlist: { connections: [] }, step: 5 },
      XLINK: "http://www.w3.org/1999/xlink",
      num: () => 0,
      fmt: (v) => String(v),
      mkEl: () => null,
      currentSymNode: () => g,
      childPair: () => ({}),
      bboxInRoot: () => ({ x: 0, y: 0, width: 10, height: 10 }),
      isConnPoint: () => false,
      connEndpointCoords: () => ({ x: 0, y: 0, dir: "E" }),
      updateConnLabel: () => {},
      pushUndo: () => {},
      render: () => {},
      setStatus: () => {},
      selectSheet: () => {},
      getHost: () => null,
    });
    const d = routing.resolveEndpoint(sheet, parseEndpoint("J1"));
    expect(d.ok).toBe(true);
    expect(d.kind).toBe("junction");
    expect(d.x).toBe(8);
    expect(d.y).toBe(9);
  });
});
