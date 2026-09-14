import { describe, it, expect } from "vitest";
import {
  isSkippedLayoutRef,
  uniqueRefsFromConnections,
  missingRefs,
  laneForRef,
  sortConnectionsForRouting,
  proposePlacements,
} from "../src/layout-from-netlist.js";
import { sheetContentBounds, laneRects } from "../src/sheet-lanes.js";

function rec(id, from, to, net = "—") {
  const parse = (raw) => {
    const i = raw.indexOf(":");
    return i < 0 ? { raw, ref: raw, pin: "" } : { raw, ref: raw.slice(0, i), pin: raw.slice(i + 1) };
  };
  return { id, from: parse(from), to: parse(to), net };
}

describe("layout-from-netlist", () => {
  it("pomija węzły N* i junctiony J*", () => {
    expect(isSkippedLayoutRef("N1")).toBe(true);
    expect(isSkippedLayoutRef("J2")).toBe(true);
    expect(isSkippedLayoutRef("WD1")).toBe(false);
    const refs = uniqueRefsFromConnections([rec("1", "WD1:L", "N1"), rec("2", "J1", "X1:1")]);
    expect(refs).toEqual(["WD1", "X1"]);
  });

  it("missingRefs pomija to, co już jest na arkuszu", () => {
    const node = {
      querySelectorAll: () => [{ getAttribute: () => "WD1" }],
    };
    const missing = missingRefs([rec("1", "WD1:L", "X1:1"), rec("2", "G1:L", "WD1:2")], node);
    expect(missing).toEqual(["X1", "G1"]);
  });

  it("laneForRef: zasilanie / sterowanie / napęd / listwy", () => {
    expect(laneForRef("G1")).toBe("power");
    expect(laneForRef("WD2")).toBe("power");
    expect(laneForRef("SK1")).toBe("control");
    expect(laneForRef("M1")).toBe("drive");
    expect(laneForRef("X1")).toBe("terminals");
    expect(laneForRef("ZZ1")).toBe("control");
  });

  it("sortConnectionsForRouting: L/N/PE przed resztą", () => {
    const list = [rec("3", "A:1", "B:1", "SIG"), rec("1", "A:L", "B:L", "L"), rec("2", "A:N", "B:N", "N")];
    expect(sortConnectionsForRouting(list).map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("proposePlacements stawia na pasach, na siatce, bez kolizji z istniejącymi", () => {
    const bounds = sheetContentBounds("landscape");
    const lanes = laneRects(bounds, 5);
    const existing = [{ x: lanes.power.x + lanes.power.width * 0.42, y: lanes.power.y + 5 * 8 }];
    const placed = proposePlacements({
      toPlace: [
        { ref: "G1", symbolId: "PSU" },
        { ref: "SK1", symbolId: "SK" },
        { ref: "X1", symbolId: "X-3" },
      ],
      existingPositions: existing,
      lanes,
      step: 5,
    });
    expect(placed).toHaveLength(3);
    const g = placed.find((p) => p.ref === "G1");
    const sk = placed.find((p) => p.ref === "SK1");
    const x = placed.find((p) => p.ref === "X1");
    expect(g.lane).toBe("power");
    expect(sk.lane).toBe("control");
    expect(x.lane).toBe("terminals");
    expect(g.x % 5).toBe(0);
    expect(g.y % 5).toBe(0);
    expect(Math.abs(g.x - existing[0].x) >= 5 || Math.abs(g.y - existing[0].y) >= 70).toBe(true);
    expect(x.x).toBeGreaterThan(sk.x);
    expect(sk.x).toBeGreaterThan(g.x);
  });
});
