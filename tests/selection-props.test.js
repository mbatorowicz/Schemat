import { describe, it, expect } from "vitest";
import {
  resolveSelectionPropsMode,
  readSelectionPropsState,
  selectionPropsFocusField,
  selectionInstanceUse,
  selectionElRef,
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
    expect(resolveSelectionPropsMode({ onSheet: false, selection: [useEl] })).toBe(null);
  });

  it("dla grupy instancji (use + etykieta) zwraca use", () => {
    const useEl = {
      tagName: "use",
      getAttribute: (n) => (n === "data-ref" ? "SB1" : null),
    };
    const textEl = {
      tagName: "text",
      getAttribute: (n) => (n === "data-owner-ref" ? "SB1" : null),
    };
    expect(resolveSelectionPropsMode({ onSheet: true, selection: [useEl, textEl] })).toBe("use");
    expect(selectionInstanceUse([useEl, textEl])).toBe(useEl);
  });

  it("dla mieszanego zaznaczenia różnych ref zwraca null", () => {
    const useA = { tagName: "use", getAttribute: (n) => (n === "data-ref" ? "SB1" : null) };
    const useB = { tagName: "use", getAttribute: (n) => (n === "data-ref" ? "SB2" : null) };
    expect(resolveSelectionPropsMode({ onSheet: true, selection: [useA, useB] })).toBe(null);
    expect(selectionInstanceUse([useA, useB])).toBe(null);
  });
});

describe("selectionElRef", () => {
  it("czyta ref z use / text / conn", () => {
    expect(selectionElRef({ tagName: "use", getAttribute: (n) => (n === "data-ref" ? "K1" : null) })).toBe("K1");
    expect(
      selectionElRef({ tagName: "text", getAttribute: (n) => (n === "data-owner-ref" ? "K1" : null) })
    ).toBe("K1");
    expect(
      selectionElRef({
        tagName: "g",
        getAttribute: (n) => (n === "data-role" ? "conn" : n === "data-ref" ? "X1" : null),
      })
    ).toBe("X1");
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

    const label = { textContent: "Schneider XAL" };
    expect(readSelectionPropsState({ mode: "use", el: use, labelEl: label })).toMatchObject({
      ref: "K1",
      text: "Schneider XAL",
      symId: "SK-33-34",
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
