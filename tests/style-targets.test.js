import { describe, it, expect } from "vitest";
import {
  resolveStyleTargets,
  mergeStyleTargets,
  ownedLabelsForUse,
  primaryColorFromRecord,
} from "../src/style-targets.js";
import { applyPrimaryColor } from "../src/element-styles.js";

function mockStyle(initial = {}) {
  const store = { ...initial };
  return {
    get fill() {
      return store.fill || "";
    },
    set fill(v) {
      store.fill = v;
    },
    get stroke() {
      return store.stroke || "";
    },
    set stroke(v) {
      store.stroke = v;
    },
    setProperty(name, value) {
      store[name] = value;
    },
    getPropertyValue(name) {
      return store[name] || "";
    },
  };
}

function ctx(overrides = {}) {
  const label = { style: mockStyle() };
  const stub = { style: mockStyle() };
  return {
    isConnLabelMode: () => false,
    isConnGroup: (el) => el?.isConn === true,
    isConnPoint: () => false,
    connParts: () => ({ stub, joint: stub, label, contacts: [] }),
    connStrokeTargets: () => [stub],
    connFillTarget: () => stub,
    sheetNode: null,
    ...overrides,
  };
}

describe("style-targets", () => {
  it("conn group zwraca host, stroke i label w texts", () => {
    const g = { isConn: true };
    const record = { el: g, tag: "g", cs: { stroke: "#000" } };
    const t = resolveStyleTargets(record, ctx());
    expect(t.cssVarHosts).toContain(g);
    expect(t.strokes).toHaveLength(1);
    expect(t.texts).toHaveLength(1);
  });

  it("use kaskaduje etykiety data-owner-ref", () => {
    const lbl = { tag: "text" };
    const use = {
      tagName: "use",
      getAttribute: (n) => (n === "data-ref" ? "WD1" : null),
    };
    const sheet = {
      querySelectorAll: (sel) => (sel.includes("WD1") ? [lbl] : []),
    };
    expect(ownedLabelsForUse(use, sheet)).toEqual([lbl]);
    const record = { el: use, tag: "use", cs: {} };
    const t = resolveStyleTargets(record, ctx({ sheetNode: sheet }));
    expect(t.cssVarHosts).toContain(use);
    expect(t.texts).toContain(lbl);
  });

  it("zwykły text trafia tylko do texts", () => {
    const text = { tagName: "text" };
    const record = { el: text, tag: "text", cs: { fill: "#000" } };
    const t = resolveStyleTargets(record, ctx());
    expect(t.texts).toEqual([text]);
    expect(t.strokes).toHaveLength(0);
  });

  it("applyPrimaryColor ustawia fill etykiety złącza i --object-stroke na hoście", () => {
    const g = { isConn: true, style: mockStyle() };
    const label = { style: mockStyle() };
    const stub = { style: mockStyle() };
    const record = { el: g, tag: "g", cs: {} };
    const targets = resolveStyleTargets(record, {
      ...ctx(),
      connParts: () => ({ stub, joint: stub, label, contacts: [] }),
    });
    applyPrimaryColor(targets, "#ff00ff");
    expect(g.style.getPropertyValue("--object-stroke")).toBe("#ff00ff");
    expect(label.style.fill).toBe("#ff00ff");
  });

  it("primaryColorFromRecord czyta fill etykiety złącza", () => {
    const g = { isConn: true, style: mockStyle() };
    const label = { style: mockStyle({ fill: "#aabbcc" }) };
    const stub = { style: mockStyle() };
    const record = { el: g, tag: "g", cs: { stroke: "#000" } };
    const rgbToHex = () => "#aabbcc";
    const color = primaryColorFromRecord(
      record,
      {
        ...ctx(),
        connParts: () => ({ stub, joint: stub, label, contacts: [] }),
      },
      { rgbToHex }
    );
    expect(color).toBe("#aabbcc");
  });

  it("mergeStyleTargets deduplikuje elementy", () => {
    const el = { id: 1 };
    const a = { cssVarHosts: [], strokes: [el], fills: [], texts: [] };
    const b = { cssVarHosts: [], strokes: [el], fills: [], texts: [] };
    const m = mergeStyleTargets([a, b]);
    expect(m.strokes).toHaveLength(1);
  });
});
