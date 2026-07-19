import { describe, it, expect } from "vitest";
import {
  resolveSelectionPropsMode,
  readSelectionPropsState,
  selectionPropsFocusField,
  leadPropsFromConn,
} from "../src/selection-props.js";
import { num, fmt } from "../src/svg-utils.js";

describe("resolveSelectionPropsMode", () => {
  it("rozróżnia use / conn / text / null", () => {
    const useEl = { tagName: "use", getAttribute: () => null };
    const connEl = { tagName: "g", getAttribute: (n) => (n === "data-role" ? "conn" : null) };
    const textEl = { tagName: "text", getAttribute: () => null };

    expect(resolveSelectionPropsMode({ onSheet: true, selection: [useEl] })).toBe("use");
    expect(resolveSelectionPropsMode({ onSheet: true, selection: [connEl] })).toBe("conn");
    expect(resolveSelectionPropsMode({ onSheet: true, selection: [textEl] })).toBe("text");
    expect(resolveSelectionPropsMode({ onSheet: true, selection: [connEl], connLabelSel: connEl })).toBe("text");
    expect(resolveSelectionPropsMode({ onSheet: true, selection: [useEl, textEl] })).toBe(null);
    expect(resolveSelectionPropsMode({ onSheet: false, selection: [useEl] })).toBe(null);
  });
});

describe("readSelectionPropsState", () => {
  it("czyta ref/pin/text/sym/lead", () => {
    const use = {
      tagName: "use",
      getAttribute: (n) => ({ "data-ref": "K1", "data-sym": "SK-33-34", href: "#SK-33-34" })[n] ?? null,
    };
    expect(readSelectionPropsState({ mode: "use", el: use })).toMatchObject({
      ref: "K1",
      symId: "SK-33-34",
      isLead: false,
    });

    const conn = {
      tagName: "g",
      getAttribute: (n) => ({ "data-ref": "X2", "data-pin": "2", "data-role": "conn" })[n] ?? null,
    };
    expect(
      readSelectionPropsState({
        mode: "conn",
        el: conn,
        lead: { len: "12", dir: "E" },
      })
    ).toEqual({
      ref: "X2",
      pin: "2",
      text: "",
      symId: "",
      len: "12",
      dir: "E",
      isLead: true,
    });
  });
});

describe("selectionPropsFocusField", () => {
  it("mapuje tryb na id pola", () => {
    expect(selectionPropsFocusField("use")).toBe("selPropSym");
    expect(selectionPropsFocusField("conn")).toBe("selPropPin");
    expect(selectionPropsFocusField("conn", { isLead: true })).toBe("selPropLen");
    expect(selectionPropsFocusField("text")).toBe("selPropText");
    expect(selectionPropsFocusField(null)).toBe(null);
  });
});

describe("leadPropsFromConn", () => {
  it("czyta długość i kierunek kreski", () => {
    const el = {
      getAttribute: (n) => ({ "data-kind": "lead", "data-dir": "N", "data-len": "20" })[n] ?? null,
    };
    const parts = {
      stub: {
        getAttribute: (n) => ({ x1: "0", y1: "0", x2: "0", y2: "-20" })[n] ?? null,
      },
    };
    expect(leadPropsFromConn(el, parts, { num, fmt })).toEqual({ len: "20", dir: "N" });
    expect(leadPropsFromConn({ getAttribute: () => "point" }, parts, { num, fmt })).toBe(null);
  });
});
