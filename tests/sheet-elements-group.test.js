import { describe, it, expect } from "vitest";
import {
  instanceRefOf,
  collectInstanceMembers,
  groupSchematicElements,
  expandToInstanceMembers,
} from "../src/sheet-elements.js";

function el(tag, attrs = {}) {
  return {
    tagName: tag,
    parentNode: null,
    getAttribute(n) {
      return attrs[n] ?? null;
    },
    setAttribute(n, v) {
      attrs[n] = v;
    },
    textContent: attrs.text || "",
  };
}

function sheet(children) {
  const node = { children };
  children.forEach((c) => {
    c.parentNode = node;
  });
  node.querySelectorAll = (sel) => {
    const m = String(sel).match(/data-owner-ref="([^"]+)"/);
    if (!m) return [];
    return children.filter((c) => c.tagName === "text" && c.getAttribute("data-owner-ref") === m[1]);
  };
  return node;
}

describe("instance grouping", () => {
  it("instanceRefOf czyta use / text / conn", () => {
    expect(instanceRefOf(el("use", { "data-ref": "K1" }))).toBe("K1");
    expect(instanceRefOf(el("text", { "data-owner-ref": "K1" }))).toBe("K1");
    expect(instanceRefOf(el("g", { "data-role": "conn", "data-ref": "K1", "data-pin": "33" }))).toBe("K1");
    expect(instanceRefOf(el("line", {}))).toBe("");
  });

  it("collectInstanceMembers zbiera use + etykietę + złącze", () => {
    const use = el("use", { "data-ref": "K1" });
    const lbl = el("text", { "data-owner-ref": "K1", text: "-K1" });
    const conn = el("g", { "data-role": "conn", "data-ref": "K1", "data-pin": "1" });
    const other = el("use", { "data-ref": "K2" });
    const node = sheet([use, lbl, conn, other]);
    const members = collectInstanceMembers(node, "K1");
    expect(members).toEqual([use, lbl, conn]);
  });

  it("groupSchematicElements grupuje instancję i zostawia singletony", () => {
    const use = el("use", { "data-ref": "K1" });
    const lbl = el("text", { "data-owner-ref": "K1" });
    const conn = el("g", { "data-role": "conn", "data-ref": "K1" });
    const line = el("line", {});
    const groups = groupSchematicElements([use, lbl, conn, line]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ type: "instance", ref: "K1" });
    expect(groups[0].members).toHaveLength(3);
    expect(groups[1]).toMatchObject({ type: "singleton", el: line });
  });

  it("expandToInstanceMembers rozszerza zaznaczenie", () => {
    const use = el("use", { "data-ref": "K1" });
    const lbl = el("text", { "data-owner-ref": "K1" });
    const node = sheet([use, lbl]);
    expect(expandToInstanceMembers(node, [lbl])).toEqual([use, lbl]);
  });
});
