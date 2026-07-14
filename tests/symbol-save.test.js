// @vitest-environment jsdom

import { describe, it, expect } from "vitest";

import {

  applySymbolForm,

  isValidSymbolName,

  isValidSymbolDisplayName,

  libSymbolIdExists,

  symbolDisplayName,

  symbolDesignation,

  symbolListPrimaryLabel,

  symbolCatalogLabel,

  symbolCatalogSubtitle,

  SYMBOL_NAME_ATTR,

} from "../src/symbol-save.js";

import { normalizeLibLayout } from "../src/library-loader.js";

import { refBaseForSymbol } from "../src/instance-refs.js";



function mockSym(id, attrs = {}) {

  const node = {

    id,

    tagName: "g",

    getAttribute(n) {

      return attrs[n] ?? null;

    },

    setAttribute(n, v) {

      attrs[n] = v;

    },

    removeAttribute(n) {

      delete attrs[n];

    },

  };

  return { node };

}



function mockLibSvg(groups = []) {

  const defs = { children: groups };

  return {

    querySelector(sel) {

      return sel === "defs" ? defs : null;

    },

  };

}



describe("applySymbolForm", () => {

  it("zapisuje nazwę wyświetlaną, oznaczenie (id SVG) i numerację w jednym kroku", () => {

    const sym = mockSym("B1", {});

    const rewrites = [];

    const result = applySymbolForm({

      sym,

      libSvg: mockLibSvg([sym.node]),

      sheets: [],

      form: { name: "Czujnik fotooptyczny", prefix: "B", numbered: true, start: 2 },

      rewriteSymbolIdRefs: (svg, a, b) => rewrites.push([a, b]),

      XLINK: "http://www.w3.org/1999/xlink",

    });

    expect(result.ok).toBe(true);

    expect(sym.node.id).toBe("B");

    expect(sym.node.getAttribute(SYMBOL_NAME_ATTR)).toBe("Czujnik fotooptyczny");

    expect(sym.node.getAttribute("data-inst-prefix")).toBe("B");

    expect(sym.node.getAttribute("data-inst-numbered")).toBe("1");

    expect(sym.node.getAttribute("data-inst-start")).toBe("2");

    expect(sym.node.getAttribute("data-alias-lock")).toBe("1");

    expect(rewrites).toEqual([["B1", "B"]]);

    expect(result.newId).toBe("B");

  });



  it("odrzuca pustą nazwę lub oznaczenie", () => {

    const sym = mockSym("A", {});

    expect(

      applySymbolForm({

        sym,

        libSvg: mockLibSvg([sym.node]),

        sheets: [],

        form: { name: "", prefix: "A", numbered: false, start: 1 },

        rewriteSymbolIdRefs: () => {},

        XLINK: "",

      }).ok

    ).toBe(false);

    expect(

      applySymbolForm({

        sym,

        libSvg: mockLibSvg([sym.node]),

        sheets: [],

        form: { name: "Test", prefix: "", numbered: false, start: 1 },

        rewriteSymbolIdRefs: () => {},

        XLINK: "",

      }).ok

    ).toBe(false);

  });



  it("akceptuje nazwę ze spacją — oznaczenie bez spacji staje się id SVG", () => {

    const sym = mockSym("B1", {});

    const result = applySymbolForm({

      sym,

      libSvg: mockLibSvg([sym.node]),

      sheets: [],

      form: { name: "Czujnik Fotooptyczn", prefix: "B", numbered: true, start: 1 },

      rewriteSymbolIdRefs: () => {},

      XLINK: "",

    });

    expect(result.ok).toBe(true);

    expect(sym.node.id).toBe("B");

    expect(sym.node.getAttribute(SYMBOL_NAME_ATTR)).toBe("Czujnik Fotooptyczn");

  });

  it("pozwala wielu symbolom mieć wspólne oznaczenie SB bez zmiany id SVG", () => {
    const existing = mockSym("SB", { "data-inst-prefix": "SB", [SYMBOL_NAME_ATTR]: "Przycisk główny" });
    const sym = mockSym("przycisk-stop", {});
    const rewrites = [];
    const result = applySymbolForm({
      sym,
      libSvg: mockLibSvg([existing.node, sym.node]),
      sheets: [],
      form: { name: "Przycisk Stop", prefix: "SB", numbered: true, start: 1 },
      rewriteSymbolIdRefs: (svg, a, b) => rewrites.push([a, b]),
      XLINK: "",
    });
    expect(result.ok).toBe(true);
    expect(sym.node.id).toBe("przycisk-stop");
    expect(sym.node.getAttribute("data-inst-prefix")).toBe("SB");
    expect(sym.node.getAttribute(SYMBOL_NAME_ATTR)).toBe("Przycisk Stop");
    expect(rewrites).toEqual([]);
    expect(result.newId).toBe("przycisk-stop");
  });

});



describe("symbolDisplayName / symbolDesignation", () => {

  it("rozdziela nazwę wyświetlaną od oznaczenia technicznego", () => {

    const sym = mockSym("B", {

      [SYMBOL_NAME_ATTR]: "Czujnik",

      "data-inst-prefix": "B",

    });

    expect(symbolDisplayName(sym.node)).toBe("Czujnik");

    expect(symbolDesignation(sym.node, sym.node.id)).toBe("B");

    expect(symbolListPrimaryLabel(sym.node, sym.node.id)).toBe("Czujnik");

    expect(symbolListPrimaryLabel(mockSym("SK", {}).node, "SK")).toBe("SK");

  });

  it("preferuje oznaczenie nad legacy id B1 w liście", () => {

    const sym = mockSym("B1", {

      "data-inst-prefix": "B",

      [SYMBOL_NAME_ATTR]: "Czujnik fotooptyczny",

    });

    expect(symbolCatalogLabel(sym.node, sym.node.id)).toBe("Czujnik fotooptyczny");

    expect(symbolCatalogSubtitle(sym.node, sym.node.id)).toBe("B");

    const bare = mockSym("B1", { "data-inst-prefix": "B" });

    expect(symbolCatalogLabel(bare.node, bare.node.id)).toBe("B");

    expect(symbolCatalogSubtitle(bare.node, bare.node.id)).toBe("");

  });

});



describe("isValidSymbolDisplayName", () => {

  it("akceptuje nazwy ze spacją", () => {

    expect(isValidSymbolDisplayName("Czujnik Fotooptyczn")).toBe(true);

  });

});



describe("isValidSymbolName", () => {

  it("akceptuje oznaczenia techniczne B, SK, SB", () => {

    expect(isValidSymbolName("B")).toBe(true);

    expect(isValidSymbolName("SK")).toBe(true);

    expect(isValidSymbolName("Czujnik Fotooptyczn")).toBe(false);

  });

});



describe("libSymbolIdExists", () => {

  it("ignoruje id elementów wewnątrz symbolu", () => {

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    normalizeLibLayout(svg, "http://www.w3.org/2000/svg");

    const defs = svg.querySelector("defs");

    const sym = document.createElementNS("http://www.w3.org/2000/svg", "g");

    sym.id = "SK1";

    const inner = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    inner.id = "SK";

    sym.appendChild(inner);

    defs.appendChild(sym);

    expect(libSymbolIdExists(svg, "SK", "SK1")).toBe(false);

  });

});



describe("refBaseForSymbol", () => {

  it("używa id symbolu jako bazy numeracji na schemacie", () => {

    const sym = mockSym("B", { "data-inst-prefix": "B", "data-inst-numbered": "1", "data-inst-start": "1" });

    const rule = refBaseForSymbol("B", sym.node);

    expect(rule.base).toBe("B");

    expect(rule.numbered).toBe(true);

  });

});



describe("applySymbolForm z DOM biblioteki", () => {

  it("B1 → oznaczenie B + nazwa wyświetlana", () => {

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    normalizeLibLayout(svg, "http://www.w3.org/2000/svg");

    const defs = svg.querySelector("defs");

    const symEl = document.createElementNS("http://www.w3.org/2000/svg", "g");

    symEl.id = "B1";

    defs.appendChild(symEl);

    const sym = { node: symEl };

    const result = applySymbolForm({

      sym,

      libSvg: svg,

      sheets: [],

      form: { name: "Czujnik Fotooptyczn", prefix: "B", numbered: true, start: 1 },

      rewriteSymbolIdRefs: () => {},

      XLINK: "http://www.w3.org/1999/xlink",

    });

    expect(result.ok).toBe(true);

    expect(symEl.id).toBe("B");

    expect(symEl.getAttribute(SYMBOL_NAME_ATTR)).toBe("Czujnik Fotooptyczn");

    expect(symEl.getAttribute("data-inst-prefix")).toBe("B");

  });

});


