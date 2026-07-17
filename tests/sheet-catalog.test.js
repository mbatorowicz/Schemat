import { describe, it, expect } from "vitest";
import {
  sheetDisplayTitle,
  sheetCatalogLabel,
  sheetCatalogSubtitle,
  sheetTitleFromChrome,
  applySheetDisplayTitle,
  migrateSheetDisplayTitle,
  isSheetTitlePollutedByDoc,
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
    querySelectorAll() {
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
    _attrs: attrs,
  };
}

describe("sheet-catalog", () => {
  it("sheetDisplayTitle: atrybut arkusza > plik; ignoruje .ttl (tytuł projektu)", () => {
    expect(sheetDisplayTitle(mockSheet({ titleAttr: "Zasilanie", ttl: "Transporter" }))).toBe("Zasilanie");
    expect(sheetDisplayTitle(mockSheet({ ttl: "Transporter boczny", name: "Zasilanie.svg" }))).toBe("Zasilanie");
    expect(sheetDisplayTitle(mockSheet({ name: "Bezpieczenstwo.svg" }))).toBe("Bezpieczenstwo");
  });

  it("odrzuca data-sheet-title skopiowany z tytułu projektu", () => {
    const sh = mockSheet({
      titleAttr: "Transporter boczny do drukarki",
      ttl: "Transporter boczny do drukarki",
      name: "Bezpieczenstwo.svg",
    });
    expect(isSheetTitlePollutedByDoc(sh)).toBe(true);
    expect(sheetDisplayTitle(sh)).toBe("Bezpieczenstwo");
    expect(sheetCatalogLabel(sh)).toBe("Bezpieczenstwo");
  });

  it("sheetCatalogSubtitle puste gdy etykieta = plik", () => {
    const sh = mockSheet({ name: "Zasilanie.svg", titleAttr: "Zasilanie" });
    expect(sheetCatalogSubtitle(sh)).toBe("");
  });

  it("applySheetDisplayTitle zapisuje atrybut i nie rusza .ttl", () => {
    const sh = mockSheet({ name: "Zasilanie.svg", ttl: "Transporter" });
    const res = applySheetDisplayTitle(sh, "1. Zasilanie");
    expect(res.ok).toBe(true);
    expect(sh._attrs[SHEET_TITLE_ATTR]).toBe("1. Zasilanie");
    expect(sh.dirty).toBe(true);
    expect(sheetTitleFromChrome(sh)).toBe("Transporter");
  });

  it("migrateSheetDisplayTitle naprawia zanieczyszczenie i ustawia nazwę z pliku", () => {
    const polluted = mockSheet({
      ttl: "Transporter",
      titleAttr: "Transporter",
      name: "Enable.svg",
    });
    expect(migrateSheetDisplayTitle(polluted)).toBe(true);
    expect(polluted._attrs[SHEET_TITLE_ATTR]).toBe("Enable");

    const bare = mockSheet({ name: "Naped.svg", ttl: "Transporter", titleAttr: "" });
    expect(migrateSheetDisplayTitle(bare)).toBe(true);
    expect(bare._attrs[SHEET_TITLE_ATTR]).toBe("Naped");
  });
});
