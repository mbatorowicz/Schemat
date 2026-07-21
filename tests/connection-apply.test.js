// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createConnectionApply } from "../src/connection-apply.js";
import { parseEndpoint } from "../src/netlist-model.js";

describe("applyConnectionRecord", () => {
  it("aktualizuje netlist i atrybuty SVG", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("data-conn-id", "5");
    poly.setAttribute("data-route", "auto");
    poly.setAttribute("points", "0,0 40,0");
    g.appendChild(poly);
    const state = {
      wireMarkMode: "other",
      netlist: {
        connections: [
          {
            id: "5",
            from: parseEndpoint("F1:2"),
            to: parseEndpoint("G1:L"),
            net: "—",
            wire: "do ustalenia",
            length: "",
            notes: "",
          },
        ],
      },
    };
    const { applyConnectionRecord } = createConnectionApply({
      state,
      getSheet: () => null,
      getSettingsCfg: () => null,
    });
    applyConnectionRecord(
      {
        id: "5",
        from: "F1:2",
        to: "G1:L",
        net: "L",
        wire: "YDY 1.5",
        length: "3 m",
        notes: "test",
      },
      { el: poly, routeKind: "auto", persist: false }
    );
    expect(state.netlist.connections[0].net).toBe("L");
    expect(state.netlist.connections[0].length).toBe("3 m");
    expect(poly.getAttribute("data-net")).toBe("L");
    expect(poly.getAttribute("data-wire")).toBe("YDY 1.5");
    expect(poly.getAttribute("data-length")).toBe("3 m");
    expect(poly.getAttribute("class")).toBe("wL");
    const marks = [...g.querySelectorAll('[data-role="wire-mark"]')];
    expect(marks).toHaveLength(2);
    const byEnd = Object.fromEntries(marks.map((t) => [t.getAttribute("data-end"), t.textContent]));
    expect(byEnd.from).toBe("-G1:L");
    expect(byEnd.to).toBe("-F1:2");
    expect(marks.every((t) => t.textContent !== "5")).toBe(true);
  });
});
