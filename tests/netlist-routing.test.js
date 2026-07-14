import { describe, it, expect } from "vitest";
import { createNetlistRouting } from "../src/netlist-routing.js";

describe("netlist-routing", () => {
  it("targetSheet zwraca aktywny arkusz", () => {
    const sheet = { id: "sch-1", name: "Zasilanie.svg", svg: {} };
    const state = {
      active: sheet,
      sheets: [sheet],
      lib: null,
      netlist: { connections: [] },
    };
    const n = createNetlistRouting({
      state,
      XLINK: "http://www.w3.org/1999/xlink",
      num: () => 0,
      fmt: (v) => String(v),
      mkEl: () => null,
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
    });
    expect(n.targetSheet()).toBe(sheet);
  });

  it("connectionDiagnostics zgłasza brak arkusza", () => {
    const state = { active: null, sheets: [], lib: null, netlist: { connections: [] } };
    const n = createNetlistRouting({
      state,
      XLINK: "http://www.w3.org/1999/xlink",
      num: () => 0,
      fmt: (v) => String(v),
      mkEl: () => null,
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
    });
    const d = n.connectionDiagnostics({ id: "1", from: { raw: "G1:1" }, to: { raw: "F1:1" } });
    expect(d.ok).toBe(false);
  });
});
