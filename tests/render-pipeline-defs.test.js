// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRenderPipeline } from "../src/render-pipeline.js";
import { SVGNS, XLINK } from "../src/svg-constants.js";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function makeLib(id = "SK") {
  const libSvg = svgEl("svg");
  const defs = svgEl("defs");
  const style = svgEl("style");
  style.textContent = ".sym { stroke: #111 }";
  const sym = svgEl("g", { id });
  sym.appendChild(svgEl("rect", { width: "10", height: "6" }));
  defs.append(style, sym);
  libSvg.appendChild(defs);
  return { libSvg, defs, sym };
}

function makeSheet(href = "#SK") {
  const sheetSvg = svgEl("svg");
  const sheetNode = svgEl("g", { id: "sheet1" });
  sheetNode.appendChild(svgEl("use", { href, "data-sym": href.replace(/^#/, "") }));
  sheetSvg.appendChild(sheetNode);
  return { sheetSvg, sheetNode };
}

function pipeline(state, flags = { onSheet: true }) {
  return createRenderPipeline({
    state,
    XLINK,
    createSVGPoint: () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) }),
    isSheetActive: () => flags.onSheet,
    currentSymNode: () =>
      flags.onSheet ? state.srcSvg?.querySelector("g") : state.lib?.svg?.querySelector("defs g[id]"),
  });
}

describe("rebuildEditDefs cache (M10)", () => {
  it("nie klonuje defs ponownie, gdy symbole się nie zmieniły", () => {
    const { libSvg } = makeLib();
    const { sheetSvg, sheetNode } = makeSheet();
    const p = pipeline({ lib: { svg: libSvg }, srcSvg: sheetSvg });
    const editDefs = svgEl("defs");

    const first = p.rebuildEditDefs(editDefs);
    expect(first.reused).toBe(false);
    expect(editDefs.querySelector("#SK")).toBeTruthy();
    editDefs.querySelector("#SK").setAttribute("data-cache-probe", "1");

    sheetNode.appendChild(svgEl("line", { x1: "0", y1: "0", x2: "8", y2: "8" }));
    const second = p.rebuildEditDefs(editDefs);
    expect(second.reused).toBe(true);
    expect(editDefs.querySelector("[data-cache-probe]")).toBeTruthy();
  });

  it("przebudowuje defs, gdy na arkuszu pojawia się nowy use", () => {
    const { libSvg, defs } = makeLib();
    const extra = svgEl("g", { id: "F1" });
    extra.appendChild(svgEl("circle", { r: "2" }));
    defs.appendChild(extra);
    const { sheetSvg, sheetNode } = makeSheet();
    const p = pipeline({ lib: { svg: libSvg }, srcSvg: sheetSvg });
    const editDefs = svgEl("defs");

    p.rebuildEditDefs(editDefs);
    editDefs.querySelector("#SK").setAttribute("data-cache-probe", "1");
    sheetNode.appendChild(svgEl("use", { href: "#F1", "data-sym": "F1" }));

    const next = p.rebuildEditDefs(editDefs);
    expect(next.reused).toBe(false);
    expect(editDefs.querySelector("[data-cache-probe]")).toBeNull();
    expect(editDefs.querySelector("#F1")).toBeTruthy();
  });

  it("przebudowuje defs, gdy zmieni się treść użytego symbolu", () => {
    const { libSvg, sym } = makeLib();
    const { sheetSvg } = makeSheet();
    const p = pipeline({ lib: { svg: libSvg }, srcSvg: sheetSvg });
    const editDefs = svgEl("defs");

    p.rebuildEditDefs(editDefs);
    editDefs.querySelector("#SK").setAttribute("data-cache-probe", "1");
    sym.appendChild(svgEl("circle", { r: "1" }));

    const next = p.rebuildEditDefs(editDefs);
    expect(next.reused).toBe(false);
    expect(editDefs.querySelector("[data-cache-probe]")).toBeNull();
  });

  it("przebudowuje defs przy przejściu arkusz → podgląd biblioteki", () => {
    const { libSvg } = makeLib();
    const { sheetSvg } = makeSheet();
    const flags = { onSheet: true };
    const p = pipeline({ lib: { svg: libSvg }, srcSvg: sheetSvg }, flags);
    const editDefs = svgEl("defs");

    p.rebuildEditDefs(editDefs);
    editDefs.querySelector("#SK").setAttribute("data-cache-probe", "1");
    flags.onSheet = false;
    const libResult = p.rebuildEditDefs(editDefs);
    expect(libResult.reused).toBe(false);
    expect(editDefs.querySelector("[data-cache-probe]")).toBeNull();
  });
});
