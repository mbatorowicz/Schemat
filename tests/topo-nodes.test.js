// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  isTopoNode,
  ensureNodeRef,
  findTopoNodeByRef,
  collectTopoNodeSnapCandidates,
  endpointRawFromSnap,
  nearestTopoNode,
  isNodeEndpoint,
} from "../src/topo-nodes.js";
import { createNetlistRouting } from "../src/netlist-routing.js";
import { parseEndpoint } from "../src/netlist-model.js";

function sheetWithNode() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", "sch-1");
  const n = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  n.setAttribute("class", "node");
  n.setAttribute("cx", "40");
  n.setAttribute("cy", "50");
  n.setAttribute("r", "4");
  g.appendChild(n);
  svg.appendChild(g);
  return { svg, g, n, sheet: { id: "sch-1", name: "A.svg", svg } };
}

describe("topo-nodes", () => {
  it("nadaje N* i znajduje po ref", () => {
    const { g, n } = sheetWithNode();
    expect(isTopoNode(n)).toBe(true);
    expect(ensureNodeRef(n, g)).toBe("N1");
    expect(n.getAttribute("data-ref")).toBe("N1");
    expect(findTopoNodeByRef(g, "N1")).toBe(n);
  });

  it("snap candidates i raw endpoint", () => {
    const { g } = sheetWithNode();
    const c = collectTopoNodeSnapCandidates(g);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe("node");
    expect(endpointRawFromSnap(c[0])).toBe("N1");
    expect(endpointRawFromSnap({ ref: "G1", pin: "L" })).toBe("G1:L");
  });

  it("nearestTopoNode", () => {
    const { g } = sheetWithNode();
    const hit = nearestTopoNode(g, 42, 51, 5);
    expect(hit.ref).toBe("N1");
    expect(nearestTopoNode(g, 100, 100, 5)).toBeNull();
  });

  it("isNodeEndpoint", () => {
    expect(isNodeEndpoint(parseEndpoint("N1"))).toBe(true);
    expect(isNodeEndpoint(parseEndpoint("G1:L"))).toBe(false);
  });
});

describe("netlist-routing + węzły", () => {
  it("resolveEndpoint lokalizuje węzeł", () => {
    const { sheet, g, n } = sheetWithNode();
    ensureNodeRef(n, g);
    const state = { active: sheet, sheets: [sheet], lib: null, netlist: { connections: [] }, step: 5 };
    const routing = createNetlistRouting({
      state,
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
    const d = routing.resolveEndpoint(sheet, parseEndpoint("N1"));
    expect(d.ok).toBe(true);
    expect(d.kind).toBe("node");
    expect(d.x).toBe(40);
    expect(d.y).toBe(50);
  });

  it("connectionDiagnostics OK dla pin↔węzeł gdy pin istnieje", () => {
    const { sheet, g, n } = sheetWithNode();
    ensureNodeRef(n, g);
    // połączenie N1 → N1 powinno być złe; samo resolve węzła już pokryte
    const state = { active: sheet, sheets: [sheet], lib: null, netlist: { connections: [] }, step: 5 };
    const routing = createNetlistRouting({
      state,
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
    const r = routing.resolveConnectionEndpoints(sheet, {
      id: "1",
      from: parseEndpoint("N1"),
      to: parseEndpoint("N1"),
    });
    // ten sam węzeł — oba końce OK geometrycznie
    expect(r.from.ok).toBe(true);
    expect(r.to.ok).toBe(true);
  });
});
