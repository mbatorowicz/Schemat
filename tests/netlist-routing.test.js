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

  it("ensureRecordNet uzupełnia potencjał z pinu", () => {
    const sheet = { id: "sch-1", name: "A.svg", svg: document.createElementNS("http://www.w3.org/2000/svg", "svg") };
    const state = {
      active: sheet,
      sheets: [sheet],
      lib: null,
      netlist: { connections: [] },
      step: 5,
      routeOpts: { strokeWidth: "" },
    };
    const n = stubRouting(state);
    const record = {
      id: "1",
      from: { raw: "F1:2", ref: "F1", pin: "2" },
      to: { raw: "G1:L", ref: "G1", pin: "L" },
      net: "—",
    };
    state.netlist.connections = [record];
    n.ensureRecordNet(record);
    expect(record.net).toBe("L");
  });

  it("ensureRecordNet nie nadpisuje istniejącego sygnału", () => {
    const sheet = { id: "sch-1", name: "A.svg", svg: document.createElementNS("http://www.w3.org/2000/svg", "svg") };
    const state = {
      active: sheet,
      sheets: [sheet],
      lib: null,
      netlist: { connections: [] },
      step: 5,
      routeOpts: { strokeWidth: "3" },
    };
    const n = stubRouting(state);
    const record = {
      id: "1",
      from: { raw: "F1:2", ref: "F1", pin: "2" },
      to: { raw: "G1:L", ref: "G1", pin: "L" },
      net: "L",
    };
    n.ensureRecordNet(record);
    expect(record.net).toBe("L");
  });

  it("routeObstacles: symbol końcowy wyłączony; obcy net i daleki opis blokują", () => {
    const sheet = { id: "sch-1", name: "A.svg", svg: document.createElementNS("http://www.w3.org/2000/svg", "svg") };
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "sch-1");
    const symEnd = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    symEnd.setAttribute("data-role", "end-sym");
    const symOther = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    symOther.setAttribute("data-role", "other-sym");
    const labelFar = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelFar.setAttribute("data-owner-ref", "X9");
    labelFar.textContent = "X9";
    const wireL = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    wireL.setAttribute("points", "50,0 50,80");
    wireL.setAttribute("data-conn-id", "1");
    wireL.setAttribute("data-net", "L");
    g.appendChild(symEnd);
    g.appendChild(symOther);
    g.appendChild(labelFar);
    g.appendChild(wireL);
    sheet.svg.appendChild(g);

    const cloneRoot = document.createElementNS("http://www.w3.org/2000/svg", "g");
    cloneRoot.appendChild(symEnd.cloneNode(true));
    cloneRoot.appendChild(symOther.cloneNode(true));
    cloneRoot.appendChild(labelFar.cloneNode(true));
    cloneRoot.appendChild(wireL.cloneNode(true));
    const host = document.createElementNS("http://www.w3.org/2000/svg", "g");
    host.appendChild(cloneRoot);

    const state = {
      active: sheet,
      sheets: [sheet],
      lib: null,
      netlist: {
        connections: [{ id: "1", net: "L", from: { raw: "A:1" }, to: { raw: "B:1" } }],
      },
      step: 5,
    };
    const n = stubRouting(state, {
      currentSymNode: () => g,
      getHost: () => host,
      bboxInRoot: (cel) => {
        const role = cel?.getAttribute?.("data-role");
        if (role === "end-sym") return { x: 0, y: 0, width: 40, height: 40 };
        if (role === "other-sym") return { x: 100, y: 100, width: 30, height: 30 };
        if (cel?.tagName?.toLowerCase?.() === "text") return { x: 100, y: 140, width: 20, height: 8 };
        return { x: 0, y: 0, width: 1, height: 1 };
      },
    });

    const pinOnEdge = { x: 0, y: 20 };
    const obs = n.routeObstacles(sheet, [], [pinOnEdge], { forNet: "N", skipConnIds: ["2"] });
    expect(obs.some((r) => r.x < 5 && r.y < 5 && r.width > 40)).toBe(false);
    expect(obs.some((r) => r.x > 90 && r.y > 90)).toBe(true);
    expect(obs.some((r) => r.x <= 50 && r.x + r.width >= 50 && r.height > 40)).toBe(true);
    expect(obs.some((r) => r.y > 130)).toBe(true);
  });

  it("placeStraightConnection: prosta linia pin→pin, ignoruje przeszkody", () => {
    const sheet = {
      id: "sch-1",
      name: "A.svg",
      svg: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    };
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "sch-1");
    sheet.svg.appendChild(g);
    const state = {
      active: sheet,
      sheets: [sheet],
      lib: null,
      netlist: { connections: [] },
      step: 5,
      routeOpts: { strokeWidth: "" },
    };
    const n = stubRouting(state, { currentSymNode: () => g });
    const record = { id: "10", net: "N", from: { raw: "A:1" }, to: { raw: "B:1" } };
    state.netlist.connections = [record];
    const d = {
      ok: true,
      from: { x: 0, y: 0, dir: "E", element: null },
      to: { x: 80, y: 40, dir: "W", element: null },
    };
    const el = n.placeStraightConnection(g, record, d, sheet);
    expect(el).toBeTruthy();
    const pts = (el.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map((p) => p.split(",").map(Number));
    expect(pts.length).toBe(2);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[1]).toEqual([80, 40]);
    expect(el.getAttribute("data-conn-id")).toBe("10");
  });
});
