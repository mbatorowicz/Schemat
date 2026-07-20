import { describe, it, expect } from "vitest";
import { DRAW_NEED, DRAW_BTN, createDrawMode } from "../src/draw-mode.js";

describe("draw-mode constants", () => {
  it("mapuje tryby na liczbę punktów i przyciski", () => {
    expect(DRAW_NEED.lead).toBe(2);
    expect(DRAW_NEED.point).toBe(1);
    expect(DRAW_NEED.line).toBe(Infinity);
    expect(DRAW_BTN.lead).toBe("btnAddLead");
    expect(DRAW_BTN.text).toBe("btnAddText");
    expect(DRAW_BTN.branch).toBe("btnBranchOblique");
    expect(DRAW_NEED.branch).toBe(2);
  });
});

describe("createDrawMode startDraw", () => {
  it("wymaga aktywnego węzła symbolu/schematu", () => {
    const statuses = [];
    const dm = createDrawMode({
      state: { drawMode: null },
      stage: { addEventListener() {} },
      getScene: () => ({}),
      currentSymNode: () => null,
      setStatus: (m) => statuses.push(m),
      syncDrawBanner: () => {},
      syncSelectionToolbar: () => {},
      clearHighlight: () => {},
      captureToolStyleFromToolbar: () => {},
      pushUndo: () => {},
      render: () => {},
      snap: (v) => v,
      fmt: String,
      mkEl: () => ({}),
      mkPrev: () => ({}),
      SVGNS: "http://www.w3.org/2000/svg",
      XLINK: "http://www.w3.org/1999/xlink",
      num: () => 0,
      rotatePoint: (p) => p,
      definitionForUseElement: () => null,
      isConnGroup: () => false,
      pushConnContactCandidates: () => {},
      finishConnDraw: () => {},
      nextProposalId: () => "p1",
      wireColor: () => "#000",
      styleShape: () => {},
      styleLine: () => {},
      styleText: () => {},
      styleNode: () => {},
    });
    dm.startDraw("line");
    expect(statuses[0]).toMatch(/symbol|schemat/i);
  });
});
