// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  getStoredConnections,
  setStoredConnections,
  hasStoredConnections,
  adoptConnectionsToSheet,
  upsertConnection,
  allocateConnectionId,
  ensureNetlistForSheet,
} from "../src/sheet-connections.js";
import {
  serialize,
  connectionsToJson,
  connectionsFromJson,
  nextConnectionId,
  normalizeConnection,
  parse,
} from "../src/netlist-model.js";
import { wireEndpoints, wireMatchesEndpoints, analyzeSheetWires } from "../src/wire-geometry.js";

describe("netlist-model serialize / json", () => {
  it("round-trip connections JSON", () => {
    const list = connectionsFromJson([
      { id: "2", from: "G1:1", to: "F1:2", signal: "L", net: "L", wire: "1.5", notes: "" },
    ]);
    expect(list[0].from.ref).toBe("G1");
    expect(connectionsToJson(list)[0].from).toBe("G1:1");
  });

  it("serialize produces parseable markdown", () => {
    const netlist = {
      meta: { sheet: "E-01", version: "1.0", date: "2026-01-01" },
      connections: [
        normalizeConnection({ id: "1", from: "A:1", to: "B:2", signal: "", net: "—", wire: "x", notes: "" }),
      ],
    };
    const md = serialize(netlist);
    const parsed = parse(md);
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.connections[0].from.ref).toBe("A");
  });

  it("nextConnectionId", () => {
    expect(nextConnectionId([{ id: "3" }, { id: "10" }])).toBe("11");
  });
});

describe("sheet-connections SSOT", () => {
  it("stores and reads by sheet key", () => {
    const cfg = { sheetConnections: {} };
    const sheet = { name: "E-01.svg", relPath: "CS/E-01.svg" };
    setStoredConnections(cfg, sheet, [normalizeConnection({ id: "1", from: "G1:1", to: "F1:2", net: "L" })]);
    expect(hasStoredConnections(cfg, sheet)).toBe(true);
    const got = getStoredConnections(cfg, sheet);
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe("1");
  });

  it("ensure / adopt netlist", () => {
    const cfg = { sheetConnections: {} };
    const sheet = { name: "A.svg", relPath: "A.svg" };
    const state = {};
    ensureNetlistForSheet(state, sheet, cfg);
    expect(state.netlist.connections).toEqual([]);
    adoptConnectionsToSheet(state, sheet, cfg, [normalizeConnection({ id: "5", from: "X:1", to: "Y:2" })]);
    expect(state.netlist.source).toBe("project");
    expect(getStoredConnections(cfg, sheet)[0].id).toBe("5");
  });

  it("upsert and allocate id", () => {
    let list = [];
    list = upsertConnection(list, { id: "1", from: "A:1", to: "B:1" });
    list = upsertConnection(list, { id: "1", from: "A:1", to: "B:2", net: "N" });
    expect(list).toHaveLength(1);
    expect(list[0].to.pin).toBe("2");
    expect(allocateConnectionId(list)).toBe("2");
    expect(allocateConnectionId(list, "9")).toBe("9");
  });
});

describe("wire-geometry", () => {
  it("line endpoints and match", () => {
    const el = {
      tagName: "line",
      getAttribute: (k) => ({ x1: "0", y1: "0", x2: "10", y2: "0" })[k],
    };
    const ends = wireEndpoints(el);
    expect(ends.a).toEqual({ x: 0, y: 0 });
    expect(wireMatchesEndpoints(el, { x: 0, y: 0 }, { x: 10, y: 0 }, 1)).toBe(true);
    expect(wireMatchesEndpoints(el, { x: 10, y: 0 }, { x: 0, y: 0 }, 1)).toBe(true);
  });

  it("analyze orphans and bare", () => {
    const doc = new DOMParser().parseFromString(
      `<svg>
        <g id="sch-1">
          <line data-conn-id="99" x1="0" y1="0" x2="1" y2="0"/>
          <line class="w24" x1="0" y1="0" x2="2" y2="0"/>
          <polyline data-conn-id="1" points="0,0 5,0"/>
        </g>
      </svg>`,
      "image/svg+xml"
    );
    const node = doc.querySelector("#sch-1");
    const h = analyzeSheetWires(node, [{ id: "1" }, { id: "2" }]);
    expect(h.orphans).toHaveLength(1);
    expect(h.bare).toHaveLength(1);
    expect(h.missing).toContain("2");
  });
});
