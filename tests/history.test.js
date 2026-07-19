/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { createHistory } from "../src/history.js";
import { parseSvg } from "../src/svg-utils.js";
import { status } from "../src/ui-wording.js";

function makeState(svgText) {
  const p = parseSvg(svgText);
  const sheet = { svg: p.svg, doc: p.doc, id: "sch-1" };
  return {
    srcSvg: p.svg,
    srcDoc: p.doc,
    active: sheet,
    lib: null,
    undo: [],
    redo: [],
    selection: [],
    activeEl: null,
    selHandle: null,
    selId: "sch-1",
    symbols: [],
  };
}

describe("createHistory", () => {
  it("pushUndo + doUndo przywraca snapshot", () => {
    const state = makeState('<svg xmlns="http://www.w3.org/2000/svg"><g id="sch-1"><text>A</text></g></svg>');
    const setStatus = vi.fn();
    const h = createHistory({
      state,
      parseSvg,
      buildSymbolList: () => {},
      currentSymNode: () => state.srcSvg.querySelector("#sch-1"),
      clearHighlight: () => {},
      clearSelInfo: () => {},
      render: () => {},
      setStatus,
      onMutate: () => {},
    });
    h.pushUndo();
    state.srcSvg.querySelector("text").textContent = "B";
    h.doUndo();
    expect(state.srcSvg.querySelector("text").textContent).toBe("A");
    expect(setStatus).toHaveBeenCalledWith(status.undone);
  });

  it("doUndo bez historii zgłasza status", () => {
    const state = makeState('<svg xmlns="http://www.w3.org/2000/svg"><g id="sch-1"/></svg>');
    const setStatus = vi.fn();
    const h = createHistory({
      state,
      parseSvg,
      buildSymbolList: () => {},
      currentSymNode: () => null,
      clearHighlight: () => {},
      clearSelInfo: () => {},
      render: () => {},
      setStatus,
    });
    h.doUndo();
    expect(setStatus).toHaveBeenCalledWith(status.undoEmpty);
  });
});
