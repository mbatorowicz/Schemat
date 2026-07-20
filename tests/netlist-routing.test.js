// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createNetlistRouting } from "../src/netlist-routing.js";

function stubRouting(state, extra = {}) {
  return createNetlistRouting({
    state,
    XLINK: "http://www.w3.org/1999/xlink",
    num: () => 0,
    fmt: (v) => String(v),
    mkEl: (tag, attrs) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    },
    currentSymNode: () => null,
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
    ...extra,
  });
}

describe("netlist-routing", () => {
  it("targetSheet zwraca aktywny arkusz", () => {
    const sheet = { id: "sch-1", name: "Zasilanie.svg", svg: {} };
    const state = {
      active: sheet,
      sheets: [sheet],
      lib: null,
      netlist: { connections: [] },
    };
    const n = stubRouting(state);
    expect(n.targetSheet()).toBe(sheet);
  });

  it("connectionDiagnostics zgłasza brak arkusza", () => {
    const state = { active: null, sheets: [], lib: null, netlist: { connections: [] } };
    const n = stubRouting(state);
    const d = n.connectionDiagnostics({ id: "1", from: { raw: "G1:1" }, to: { raw: "F1:1" } });
    expect(d.ok).toBe(false);
  });

  it("findAdoptCandidate znajduje bare line między pinami", () => {
    const sheet = { id: "sch-1", name: "A.svg", svg: document.createElementNS("http://www.w3.org/2000/svg", "svg") };
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "sch-1");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "0");
    line.setAttribute("x2", "20");
    line.setAttribute("y2", "0");
    g.appendChild(line);
    sheet.svg.appendChild(g);
    const state = { active: sheet, sheets: [sheet], lib: null, netlist: { connections: [] }, step: 5 };
    const n = stubRouting(state);
    const hit = n.findAdoptCandidate(g, { id: "1" }, { x: 0, y: 0 }, { x: 20, y: 0 });
    expect(hit?.kind).toBe("bare");
    expect(hit?.el).toBe(line);
  });
});
