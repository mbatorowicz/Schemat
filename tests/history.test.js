/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { HISTORY_LIMIT, captureActiveSnapshot, createHistory, snapshotByteSize } from "../src/history.js";
import { parseSvg } from "../src/svg-utils.js";
import { SVGNS } from "../src/svg-constants.js";
import { status } from "../src/ui-wording.js";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

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

function makeLibState(symbolCount = 2) {
  const svg = svgEl("svg", { viewBox: "0 0 100 100", width: "100", height: "100" });
  const defs = svgEl("defs");
  const style = svgEl("style");
  style.textContent = ".sym { stroke: #111 }";
  defs.appendChild(style);
  for (let i = 0; i < symbolCount; i++) {
    const id = i === 0 ? "G1" : i === 1 ? "F1" : `S${i}`;
    const g = svgEl("g", { id });
    const path = svgEl("path", { d: `M0 ${i} H${10 + i} V${8 + i} Z` });
    g.appendChild(path);
    defs.appendChild(g);
  }
  svg.appendChild(defs);
  const doc = document.implementation.createDocument(SVGNS, "svg", null);
  const lib = { svg, doc, id: "lib" };
  return {
    srcSvg: svg,
    srcDoc: doc,
    active: lib,
    lib,
    undo: [],
    redo: [],
    selection: [],
    activeEl: null,
    selHandle: null,
    selId: "G1",
    symbols: [],
  };
}

function historyFor(state, extra = {}) {
  const setStatus = vi.fn();
  const h = createHistory({
    state,
    parseSvg,
    buildSymbolList: () => {},
    currentSymNode: () =>
      extra.currentSymNode
        ? extra.currentSymNode()
        : state.active === state.lib
          ? state.srcSvg.querySelector(`#${state.selId}`)
          : state.srcSvg.querySelector("#sch-1"),
    clearHighlight: () => {},
    clearSelInfo: () => {},
    render: extra.render || (() => {}),
    setStatus,
    onMutate: extra.onMutate || (() => {}),
  });
  return { h, setStatus };
}

function fatSymbolMarkup(id, n = 40) {
  const segs = Array.from({ length: n }, (_, i) => `L${i} ${i % 7}`).join(" ");
  return `<g id="${id}"><path d="M0 0 ${segs} Z"/></g>`;
}

describe("createHistory", () => {
  it("pushUndo + doUndo przywraca snapshot", () => {
    const state = makeState('<svg xmlns="http://www.w3.org/2000/svg"><g id="sch-1"><text>A</text></g></svg>');
    const { h, setStatus } = historyFor(state);
    h.pushUndo();
    state.srcSvg.querySelector("text").textContent = "B";
    h.doUndo();
    expect(state.srcSvg.querySelector("text").textContent).toBe("A");
    expect(setStatus).toHaveBeenCalledWith(status.undone);
  });

  it("doUndo bez historii zgłasza status", () => {
    const state = makeState('<svg xmlns="http://www.w3.org/2000/svg"><g id="sch-1"/></svg>');
    const { h, setStatus } = historyFor(state);
    h.doUndo();
    expect(setStatus).toHaveBeenCalledWith(status.undoEmpty);
  });

  it("doRedo przywraca stan po cofnięciu", () => {
    const state = makeState('<svg xmlns="http://www.w3.org/2000/svg"><g id="sch-1"><text>A</text></g></svg>');
    const { h } = historyFor(state);
    h.pushUndo();
    state.srcSvg.querySelector("text").textContent = "B";
    h.doUndo();
    h.doRedo();
    expect(state.srcSvg.querySelector("text").textContent).toBe("B");
  });

  it("trzyma najwyżej HISTORY_LIMIT wpisów", () => {
    const state = makeState('<svg xmlns="http://www.w3.org/2000/svg"><g id="sch-1"><text>A</text></g></svg>');
    const { h } = historyFor(state);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      state.srcSvg.querySelector("text").textContent = "n" + i;
      h.pushUndo();
    }
    expect(state.undo.length).toBe(HISTORY_LIMIT);
    expect(HISTORY_LIMIT).toBe(80);
  });
});

describe("captureActiveSnapshot (M8)", () => {
  it("arkusz: snapshot jest dużo mniejszy niż pełny SVG z defs", () => {
    const symbols = Array.from({ length: 24 }, (_, i) => fatSymbolMarkup("SYM" + i)).join("");
    const full = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
        `<defs><style>.s{}</style>${symbols}</defs>` +
        `<g id="sch-1"><use href="#SYM0"/><text>ok</text></g></svg>`
    );
    const sheet = { svg: full.svg, doc: full.doc, id: "sch-1" };
    const state = { srcSvg: full.svg, active: sheet, lib: null, selId: "sch-1" };
    const snap = captureActiveSnapshot(state, full.svg.querySelector("#sch-1"));
    const fullBytes = new XMLSerializer().serializeToString(full.svg).length;
    const snapBytes = snapshotByteSize(snap);
    expect(snap.kind).toBe("sheet");
    expect(snap.bodyMarkup).toContain("ok");
    expect(snap.bodyMarkup).not.toContain("SYM12");
    expect(snapBytes).toBeLessThan(fullBytes / 4);
  });

  it("biblioteka: snapshot to aktualny symbol, nie cała E-00", () => {
    const symbols = Array.from({ length: 30 }, (_, i) => fatSymbolMarkup(i === 0 ? "G1" : "S" + i)).join("");
    const full = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg"><defs><style>.s{}</style>${symbols}</defs></svg>`);
    const lib = { svg: full.svg, doc: full.doc, id: "lib" };
    const state = { srcSvg: full.svg, active: lib, lib, selId: "G1" };
    const snap = captureActiveSnapshot(state, full.svg.querySelector("#G1"));
    const fullBytes = new XMLSerializer().serializeToString(full.svg).length;
    const snapBytes = snapshotByteSize(snap);
    expect(snap.kind).toBe("lib");
    expect(snap.focusMarkup).toContain("G1");
    expect(snap.symbolIds).toHaveLength(30);
    expect(snapBytes).toBeLessThan(fullBytes / 5);
  });

  it("undo na arkuszu nie kasuje defs symboli", () => {
    const state = makeState(
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="SK"><rect width="4" height="2"/></g></defs>` +
        `<g id="sch-1"><use href="#SK"/><text>A</text></g></svg>`
    );
    const { h } = historyFor(state);
    h.pushUndo();
    state.srcSvg.querySelector("text").textContent = "B";
    h.doUndo();
    expect(state.srcSvg.querySelector("text").textContent).toBe("A");
    expect(state.srcSvg.querySelector("defs g#SK")).toBeTruthy();
  });

  it("undo edycji symbolu zostawia sąsiadów w bibliotece", () => {
    const state = makeLibState(2);
    const { h } = historyFor(state);
    h.pushUndo();
    state.srcSvg.querySelector("#G1 path").setAttribute("d", "M9 9");
    h.doUndo();
    expect(state.srcSvg.querySelector("#G1 path").getAttribute("d")).toBe("M0 0 H10 V8 Z");
    expect(state.srcSvg.querySelector("#F1")).toBeTruthy();
  });

  it("undo dodania symbolu zdejmuje go z biblioteki", () => {
    const state = makeLibState(2);
    const { h } = historyFor(state);
    h.pushUndo();
    const extra = svgEl("g", { id: "Q1" });
    extra.appendChild(svgEl("circle", { r: "2" }));
    state.srcSvg.querySelector("defs").appendChild(extra);
    h.doUndo();
    expect(state.srcSvg.querySelector("#Q1")).toBeNull();
    expect(state.srcSvg.querySelector("#F1")).toBeTruthy();
  });

  it("undo usunięcia symbolu wstawia go z powrotem", () => {
    const state = makeLibState(2);
    state.selId = "F1";
    const { h } = historyFor(state);
    h.pushUndo();
    state.srcSvg.querySelector("#F1").remove();
    h.doUndo();
    expect(state.srcSvg.querySelector("#F1")).toBeTruthy();
    expect(state.srcSvg.querySelector("#G1")).toBeTruthy();
  });
});
