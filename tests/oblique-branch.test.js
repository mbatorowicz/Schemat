// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  obliqueStubPoints,
  buildObliqueBranchPoints,
  segmentAxis,
  hitNearestWireOnSheet,
  prependObliqueStub,
  attachPointOnTrunk,
  attachForObliqueAlign,
  buildFanoutBranchPoints,
  prefixPolylineToPoint,
  spaceAttachesAlongTrunk,
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

  it("obliqueStubPoints flowDir wymusza składową od źródła", () => {
    // cel nieco „w górę”, ale źródło jest z góry (flow S) → tip i tak w dół
    const s = obliqueStubPoints({ x: 10, y: 20 }, "V", { x: 50, y: 10 }, 5, "S");
    expect(s.tip[0]).toBe(15);
    expect(s.tip[1]).toBe(25);
    const up = obliqueStubPoints({ x: 10, y: 20 }, "V", { x: 50, y: 40 }, 5, "N");
    expect(up.tip[1]).toBe(15);
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

  it("attachPointOnTrunk preferuje przecięcie osi z celem", () => {
    const trunk = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ];
    const a = attachPointOnTrunk(trunk, { x: 40, y: 30 }, 0);
    expect(a.x).toBe(0);
    expect(a.y).toBe(30);
    expect(a.trunkAxis).toBe("V");
  });

  it("attachForObliqueAlign: tip 45° ląduje na Y pinu", () => {
    const trunk = [
      { x: 10, y: 0 },
      { x: 10, y: 100 },
    ];
    const a = attachForObliqueAlign(trunk, { x: 50, y: 40 }, 5, "S");
    expect(a.x).toBe(10);
    expect(a.y).toBe(30);
    expect(a.trunkAxis).toBe("V");
  });

  it("buildFanoutBranchPoints: wcześniejszy zakręt → prosta do pinu (brązowa linia)", () => {
    const trunk = [
      { x: 10, y: 0 },
      { x: 10, y: 100 },
    ];
    const pts = buildFanoutBranchPoints(trunk, { x: 50, y: 40, dir: "W" }, 5, null, "S");
    expect(pts[0]).toEqual([10, 0]);
    const attachIdx = pts.findIndex((p, i) => i > 0 && p[0] === 10 && Math.abs(p[1] - 30) < 0.5);
    expect(attachIdx).toBeGreaterThan(0);
    const tip = pts[attachIdx + 1];
    expect(tip[0]).toBe(20);
    expect(tip[1]).toBe(40);
    const last = pts[pts.length - 1];
    expect(last).toEqual([50, 40]);
    // ostatni segment poziomy, bez jogu ±step przed pinem
    const prev = pts[pts.length - 2];
    expect(prev[1]).toBe(40);
    expect(Math.abs(prev[0] - 50)).toBeGreaterThan(0.5);
  });

  it("spaceAttachesAlongTrunk rozsuwa bliskie attachy", () => {
    const trunk = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ];
    const spaced = spaceAttachesAlongTrunk(
      trunk,
      [
        { x: 0, y: 40, trunkAxis: "V" },
        { x: 0, y: 42, trunkAxis: "V" },
      ],
      5
    );
    expect(Math.abs(spaced[1].y - spaced[0].y)).toBeGreaterThanOrEqual(5);
  });

  it("buildFanoutBranchPoints: wspólny prefiks + ukos 45°", () => {
    const trunk = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ];
    const pts = buildFanoutBranchPoints(trunk, { x: 40, y: 40 }, 5, null, "S");
    expect(pts[0]).toEqual([0, 0]);
    const attachIdx = pts.findIndex((p, i) => i > 0 && p[0] === 0 && Math.abs(p[1] - 30) < 0.5);
    expect(attachIdx).toBeGreaterThan(0);
    const tip = pts[attachIdx + 1];
    expect(tip[0]).toBe(10);
    expect(tip[1]).toBe(40);
    const pref = prefixPolylineToPoint(trunk, { x: 0, y: 30 });
    expect(pref[0]).toEqual([0, 0]);
    expect(pref[pref.length - 1]).toEqual([0, 30]);
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
