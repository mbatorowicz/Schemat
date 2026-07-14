import { describe, it, expect } from "vitest";
import {
  sheetDisplayTitle,
  sheetCatalogLabel,
  sheetCatalogSubtitle,
  applySheetDisplayTitle,
  migrateSheetDisplayTitle,
  SHEET_TITLE_ATTR,
} from "../src/sheet-catalog.js";

function mockSheet({ name = "Zasilanie.svg", id = "sch-1", titleAttr = "", ttl = "" } = {}) {
  const attrs = {};
  if (titleAttr) attrs[SHEET_TITLE_ATTR] = titleAttr;
  const ttlNode = ttl
    ? {
        tagName: "text",
        getAttribute(n) {
          return n === "class" ? "ttl" : null;
        },
        textContent: ttl,
        setAttribute() {},
      }
    : null;
  const g = {
    id,
    tagName: "g",
    getAttribute(n) {
      return attrs[n] ?? null;
    },
    setAttribute(n, v) {
      attrs[n] = v;
    },
    querySelector(sel) {
      if (sel.includes("ttl")) return ttlNode;
      return null;
    },
    querySelectorAll(sel) {
      if (sel.includes("tb")) return [];
      return [];
    },
    children: [],
    insertBefore() {},
    firstChild: null,
  };
  return {
    name,
    id,
    dirty: false,
    svg: {
      ownerDocument: { createElementNS: () => ({ setAttribute() {}, textContent: "" }) },
      querySelector(sel) {
        return sel === `[id="${id}"]` ? g : null;
      },
    },
    _g: g,
    _attrs: attrs,
  };
}

describe("sheet-catalog", () => {
  it("sheetDisplayTitle: atrybut > ttl > plik", () => {
    expect(sheetDisplayTitle(mockSheet({ titleAttr: "1. Zasilanie", ttl: "Stare" }))).toBe("1. Zasilanie");
    expect(sheetDisplayTitle(mockSheet({ ttl: "Zasilanie główne" }))).toBe("Zasilanie główne");
    expect(sheetDisplayTitle(mockSheet({ name: "Zasilanie.svg" }))).toBe("Zasilanie");
  });

  it("sheetCatalogSubtitle pokazuje plik gdy tytuł się różni", () => {
    const sh = mockSheet({ titleAttr: "1. Zasilanie", name: "Zasilanie.svg" });
    expect(sheetCatalogSubtitle(sh)).toBe("Zasilanie");
    expect(sheetCatalogLabel(sh)).toBe("1. Zasilanie");
  });

  it("applySheetDisplayTitle akceptuje spacje i kropki", () => {
    const sh = mockSheet({ name: "Zasilanie.svg" });
    const res = applySheetDisplayTitle(sh, "1. Zasilanie");
    expect(res.ok).toBe(true);
    expect(sh._attrs[SHEET_TITLE_ATTR]).toBe("1. Zasilanie");
    expect(sh.dirty).toBe(true);
  });

  it("migrateSheetDisplayTitle kopiuje ttl do atrybutu", () => {
    const sh = mockSheet({ ttl: "Enable", name: "Enable.svg" });
    expect(migrateSheetDisplayTitle(sh)).toBe(true);
    expect(sh._attrs[SHEET_TITLE_ATTR]).toBe("Enable");
  });
});
