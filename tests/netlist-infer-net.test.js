import { describe, it, expect } from "vitest";
import {
  isBlankNet,
  inferNetFromPins,
  inferConnectionNet,
  parseEndpoint,
  normalizeConnection,
  connectionListLabel,
} from "../src/netlist-model.js";

describe("normalizeConnection migracja signal→net", () => {
  it("kopiuje signal do net gdy net pusty", () => {
    const n = normalizeConnection({
      id: "1",
      from: "A:1",
      to: "B:2",
      signal: "ESTOP",
      net: "—",
    });
    expect(n.net).toBe("ESTOP");
    expect(n.signal).toBe("");
  });

  it("zachowuje length", () => {
    const n = normalizeConnection({ id: "1", from: "A:1", to: "B:2", net: "L", length: "2.5 m" });
    expect(n.length).toBe("2.5 m");
  });

  it("connectionListLabel zawiera przewód i długość", () => {
    const label = connectionListLabel(
      { id: "5", from: parseEndpoint("F1:2"), to: parseEndpoint("G1:L"), net: "L", wire: "1.5", length: "2 m" },
      "OK"
    );
    expect(label).toContain("L");
    expect(label).toContain("1.5");
    expect(label).toContain("2 m");
  });
});

describe("inferConnectionNet", () => {
  it("isBlankNet", () => {
    expect(isBlankNet("")).toBe(true);
    expect(isBlankNet("—")).toBe(true);
    expect(isBlankNet("L")).toBe(false);
  });

  it("inferNetFromPins z L/N/PE", () => {
    expect(inferNetFromPins({ from: parseEndpoint("F1:2"), to: parseEndpoint("G1:L") })).toBe("L");
    expect(inferNetFromPins({ from: parseEndpoint("X1:N"), to: parseEndpoint("G1:N") })).toBe("N");
    expect(inferNetFromPins({ from: parseEndpoint("X1:PE"), to: parseEndpoint("G1:PE") })).toBe("PE");
  });

  it("zachowuje istniejący net", () => {
    const r = { id: "1", from: parseEndpoint("A:1"), to: parseEndpoint("B:2"), net: "+24V" };
    expect(inferConnectionNet(r, [])).toBe("+24V");
  });

  it("bierze net z rodzeństwa na wspólnym pinie", () => {
    const a = { id: "5", from: parseEndpoint("F1:2"), to: parseEndpoint("G1:L"), net: "L" };
    const b = { id: "6", from: parseEndpoint("F1:2"), to: parseEndpoint("SK1:13"), net: "—" };
    expect(inferConnectionNet(b, [a, b])).toBe("L");
  });

  it("fallback z pinu gdy brak rodzeństwa", () => {
    const r = { id: "1", from: parseEndpoint("F1:2"), to: parseEndpoint("G1:L"), net: "" };
    expect(inferConnectionNet(r, [r])).toBe("L");
  });
});
