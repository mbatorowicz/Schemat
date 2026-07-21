// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  syncWireMarks,
  removeWireMarks,
  markLabelFromAttr,
  markAngleDeg,
  resolveMarkPair,
  normalizeWireMarkMode,
  resyncAllWireMarks,
  clearAllWireMarks,
  fillMissingWireEndpoints,
  listSheetWires,
  DEFAULT_WIRE_MARK_MODE,
} from "../src/wire-markers.js";
import { createConnectionApply } from "../src/connection-apply.js";
import { parseEndpoint, endpointRaw } from "../src/netlist-model.js";
import { WIRE_DEFAULT_STROKE, wireColor } from "../src/wire-theme.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function makeWire(g, attrs = {}) {
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", attrs.points || "0,0 100,0");
  poly.setAttribute("data-conn-id", attrs.id || "5");
  if (attrs.from != null) poly.setAttribute("data-from", attrs.from);
  if (attrs.to != null) poly.setAttribute("data-to", attrs.to);
  g.appendChild(poly);
  return poly;
}

describe("wire-markers", () => {
  it("markLabelFromAttr: myślnik jak oznaczenie aparatu", () => {
    expect(markLabelFromAttr("  Q1:T2  ")).toBe("-Q1:T2");
    expect(markLabelFromAttr("-F1:1")).toBe("-F1:1");
    expect(markLabelFromAttr("")).toBe("");
  });

  it("normalizeWireMarkMode domyślnie local", () => {
    expect(normalizeWireMarkMode("")).toBe(DEFAULT_WIRE_MARK_MODE);
    expect(normalizeWireMarkMode("both")).toBe("both");
    expect(normalizeWireMarkMode("nope")).toBe("local");
  });

  it("resolveMarkPair: trzy konwencje", () => {
    expect(resolveMarkPair("F1:2", "G1:L", "local")).toEqual({
      atFrom: "-F1:2",
      atTo: "-G1:L",
    });
    expect(resolveMarkPair("F1:2", "G1:L", "other")).toEqual({
      atFrom: "-G1:L",
      atTo: "-F1:2",
    });
    expect(resolveMarkPair("F1:2", "G1:L", "both")).toEqual({
      atFrom: "-F1:2 / -G1:L",
      atTo: "-F1:2 / -G1:L",
    });
  });

  it("markAngleDeg: tekst wzdłuż odcinka poziomego/pionowego", () => {
    expect(markAngleDeg({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(0, 5);
    expect(Math.abs(markAngleDeg({ x: 0, y: 0 }, { x: 0, y: 100 }))).toBeCloseTo(90, 5);
  });

  it("syncWireMarks local: nadruk = ten koniec", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = makeWire(g, { id: "5", from: "F1:2", to: "G1:L" });
    syncWireMarks(g, poly, undefined, "local");
    const byEnd = Object.fromEntries(
      [...g.querySelectorAll('[data-role="wire-mark"]')].map((t) => [t.getAttribute("data-end"), t.textContent])
    );
    expect(byEnd.from).toBe("-F1:2");
    expect(byEnd.to).toBe("-G1:L");
  });

  it("resyncAllWireMarks: nadruki na WSZYSTKICH trasach z from/to", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    makeWire(g, { id: "1", from: "A:1", to: "B:1", points: "0,0 50,0" });
    makeWire(g, { id: "2", from: "C:1", to: "D:1", points: "0,20 50,20" });
    makeWire(g, { id: "3", from: "E:1", to: "F:1", points: "0,40 50,40" });
    // osierocony mark po starym conn
    const orphan = document.createElementNS("http://www.w3.org/2000/svg", "text");
    orphan.setAttribute("data-role", "wire-mark");
    orphan.setAttribute("data-conn-id", "999");
    orphan.textContent = "stary";
    g.appendChild(orphan);

    const n = resyncAllWireMarks(g, "local");
    expect(n).toBe(3);
    expect(listSheetWires(g)).toHaveLength(3);
    expect(g.querySelectorAll('[data-role="wire-mark"]').length).toBe(6);
    expect(g.querySelector('[data-conn-id="999"]')).toBeNull();
    for (const id of ["1", "2", "3"]) {
      const marks = [...g.querySelectorAll(`[data-role="wire-mark"][data-conn-id="${id}"]`)];
      expect(marks).toHaveLength(2);
    }
  });

  it("resyncAllWireMarks uzupełnia puste from/to ze spisu", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = makeWire(g, { id: "7", points: "0,0 80,0" });
    expect(poly.getAttribute("data-from")).toBeNull();
    const records = {
      7: { id: "7", from: parseEndpoint("Q1:T2"), to: parseEndpoint("G1:L") },
    };
    resyncAllWireMarks(g, "local", undefined, {
      resolveRecord: (id) => records[id] || null,
      endpointRaw,
    });
    expect(poly.getAttribute("data-from")).toBe("Q1:T2");
    expect(poly.getAttribute("data-to")).toBe("G1:L");
    const byEnd = Object.fromEntries(
      [...g.querySelectorAll('[data-role="wire-mark"]')].map((t) => [t.getAttribute("data-end"), t.textContent])
    );
    expect(byEnd.from).toBe("-Q1:T2");
    expect(byEnd.to).toBe("-G1:L");
  });

  it("fillMissingWireEndpoints nie nadpisuje istniejących", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = makeWire(g, { id: "1", from: "X:1", to: "" });
    poly.setAttribute("data-to", "");
    fillMissingWireEndpoints(poly, { from: parseEndpoint("A:1"), to: parseEndpoint("B:2") }, endpointRaw);
    expect(poly.getAttribute("data-from")).toBe("X:1");
    expect(poly.getAttribute("data-to")).toBe("B:2");
  });

  it("syncWireMarks other / both", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = makeWire(g, { id: "5", from: "F1:2", to: "G1:L" });
    syncWireMarks(g, poly, undefined, "other");
    let byEnd = Object.fromEntries(
      [...g.querySelectorAll('[data-role="wire-mark"]')].map((t) => [t.getAttribute("data-end"), t.textContent])
    );
    expect(byEnd.from).toBe("-G1:L");
    expect(byEnd.to).toBe("-F1:2");
    clearAllWireMarks(g);
    syncWireMarks(g, poly, undefined, "both");
    const texts = [...g.querySelectorAll('[data-role="wire-mark"]')].map((t) => t.textContent);
    expect(texts).toEqual(["-F1:2 / -G1:L", "-F1:2 / -G1:L"]);
  });

  it("syncWireMarks bez from/to nie tworzy numerów", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = makeWire(g, { id: "9" });
    expect(syncWireMarks(g, poly, undefined, "local")).toBeNull();
    expect(g.querySelectorAll('[data-role="wire-mark"]').length).toBe(0);
  });

  it("applyConnectionRecord z sheetNode tworzy nadruki przed append wire", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "10,10 90,10");
    // celowo NIE w DOM — jak attachProposal w draw-mode
    const state = {
      wireMarkMode: "local",
      netlist: { connections: [] },
    };
    const { applyConnectionRecord } = createConnectionApply({
      state,
      getSheet: () => null,
      getSettingsCfg: () => null,
    });
    applyConnectionRecord(
      {
        id: "8",
        from: "F1:2",
        to: "G1:L",
        net: "L",
        wire: "do ustalenia",
        length: "",
        notes: "",
      },
      { el: poly, sheetNode: g, persist: false, upsert: false }
    );
    expect(g.querySelectorAll('[data-role="wire-mark"]').length).toBe(2);
    expect(poly.getAttribute("data-from")).toBe("F1:2");
    expect(wireColor("wL")).toBe(WIRE_DEFAULT_STROKE);
    expect(poly.style.stroke === WIRE_DEFAULT_STROKE || poly.style.stroke === "rgb(15, 23, 42)").toBe(true);
  });

  it("removeWireMarks bez connId nie kasuje cudzych nadruków", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const a = makeWire(g, { id: "1", from: "A:1", to: "B:2" });
    const b = makeWire(g, { id: "2", from: "C:1", to: "D:2", points: "0,20 50,20" });
    syncWireMarks(g, a, undefined, "local");
    syncWireMarks(g, b, undefined, "local");
    expect(g.querySelectorAll('[data-role="wire-mark"]').length).toBe(4);
    removeWireMarks(g, "");
    removeWireMarks(g, null);
    expect(g.querySelectorAll('[data-role="wire-mark"]').length).toBe(4);
    removeWireMarks(g, "1");
    expect(g.querySelectorAll('[data-role="wire-mark"]').length).toBe(2);
  });

  it("smoke: select #wireMarkMode w HTML", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toContain('id="wireMarkMode"');
    expect(html).toContain('value="local"');
    expect(html).toContain('value="other"');
    expect(html).toContain('value="both"');
  });
});
