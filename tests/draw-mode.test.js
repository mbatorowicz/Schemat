// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DRAW_NEED, DRAW_BTN, createDrawMode } from "../src/draw-mode.js";
import { SVGNS, XLINK } from "../src/svg-constants.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walkJs(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walkJs(p));
    else if (name.name.endsWith(".js")) out.push(p);
  }
  return out;
}

function sourceWithoutComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function mkEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}

function drawModeForText(extras = {}) {
  const node = mkEl("g", { id: "sch-1" });
  const added = [];
  const dm = createDrawMode({
    state: {
      drawMode: "text",
      drawing: { kind: "text", need: 1, pts: [[12, 34]], snaps: [], cursor: null },
      selection: [],
      activeEl: null,
      selHandle: null,
      zoom: 1,
      snap: false,
    },
    stage: { addEventListener() {}, style: {} },
    getScene: () => ({}),
    currentSymNode: () => node,
    setStatus: () => {},
    syncDrawBanner: () => {},
    syncSelectionToolbar: () => {},
    clearHighlight: () => {},
    captureToolStyleFromToolbar: () => {},
    pushUndo: () => {},
    render: () => {},
    snap: (v) => v,
    fmt: String,
    mkEl,
    mkPrev: () => mkEl("g"),
    SVGNS,
    XLINK,
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
    styleText: (el) => added.push(el),
    styleNode: () => {},
    ...extras,
  });
  return { dm, node, added };
}

describe("draw-mode constants", () => {
  it("mapuje tryby na liczbę punktów i przyciski", () => {
    expect(DRAW_NEED.lead).toBe(2);
    expect(DRAW_NEED.point).toBe(1);
    expect(DRAW_NEED.line).toBe(Infinity);
    expect(DRAW_BTN.lead).toBe("btnAddLead");
    expect(DRAW_BTN.text).toBe("btnAddText");
    expect(DRAW_BTN.pin).toBeUndefined();
    expect(DRAW_NEED.pin).toBeUndefined();
    expect(DRAW_BTN.branch).toBe("btnBranchOblique");
    expect(DRAW_NEED.branch).toBe(2);
  });

  it("smoke: brak przycisku Pin (A) — duplikat Tekstu", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    const main = readFileSync(join(root, "src/main.js"), "utf8");
    expect(html).not.toContain("btnAddPin");
    expect(main).not.toContain("btnAddPin");
    expect(html).toContain('id="btnAddText"');
  });

  it("belka: przyłącze osobno od linii, bez etykiety Kreska", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toMatch(/id="btnAddLead"[^>]*title="Przyłącze"/);
    expect(html).toMatch(/id="btnAddLine"[^>]*title="Linia \/ łamana"/);
    expect(html).toMatch(/id="btnAddPoint"[^>]*title="Punkt styku"/);
    expect(html).not.toContain('title="Kreska"');
    expect(html).toContain('id="btnRouteMenu"');
    expect(html).toContain('id="routeMenu"');
    expect(html).toContain('id="btnGenerateFromNetlist"');
    expect(html).toContain("Do spisu");
    expect(html).not.toContain("Promuj kreskę");
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

describe("finishShape tekst — askText", () => {
  it("bez askText nie woła prompt i nie dodaje napisu", async () => {
    const promptSpy = vi.fn();
    vi.stubGlobal("prompt", promptSpy);
    const { dm, node } = drawModeForText();
    await dm.finishShape();
    expect(promptSpy).not.toHaveBeenCalled();
    expect(node.querySelector("text")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("z mockiem askText wstawia tekst i nie woła prompt", async () => {
    const promptSpy = vi.fn();
    vi.stubGlobal("prompt", promptSpy);
    const askText = vi.fn(async () => "PE");
    const { dm, node } = drawModeForText({ askText });
    await dm.finishShape();
    const el = node.querySelector("text");
    expect(askText).toHaveBeenCalledWith("Tekst", { defaultValue: "TXT", label: "Tekst" });
    expect(el).toBeTruthy();
    expect(el.textContent).toBe("PE");
    expect(el.getAttribute("x")).toBe("12");
    expect(el.getAttribute("y")).toBe("34");
    expect(promptSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("anulowanie askText (null) nie dodaje napisu", async () => {
    const { dm, node } = drawModeForText({ askText: async () => null });
    await dm.finishShape();
    expect(node.querySelector("text")).toBeNull();
  });
});

describe("src bez window.prompt", () => {
  it("w kodzie src nie ma wywołania prompt(", () => {
    const files = walkJs(join(root, "src"));
    const hits = [];
    for (const file of files) {
      const code = sourceWithoutComments(readFileSync(file, "utf8"));
      if (/\bwindow\.prompt\b|\bprompt\s*\(/.test(code)) hits.push(file.slice(root.length + 1));
    }
    expect(hits).toEqual([]);
  });
});
