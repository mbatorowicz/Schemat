import { describe, it, expect } from "vitest";
import {
  resolveBootCachePlan,
  resolveReloadSheetsOutcome,
  resolveBootActiveTarget,
  prefsSheetKey,
  shouldWriteProjectCache,
  projectCacheScore,
  libraryCacheScore,
} from "../src/boot-cache.js";

describe("projectCacheScore", () => {
  it("preferuje snapshot z arkuszami nad pustym", () => {
    expect(projectCacheScore({ sheets: [{ text: "x" }] })).toBeGreaterThan(projectCacheScore({ sheets: [] }));
  });
});

describe("resolveBootCachePlan", () => {
  it("wczytuje arkusze z cache gdy dysk nie zwrócił żadnego", () => {
    expect(resolveBootCachePlan({ loadedFromDisk: false, sheetCount: 0 })).toEqual({
      needCacheSheets: true,
      needCacheLib: true,
    });
  });

  it("nie nadpisuje arkuszy z dysku cache-em gdy dysk załadował projekt", () => {
    expect(resolveBootCachePlan({ loadedFromDisk: true, sheetCount: 3 })).toEqual({
      needCacheSheets: false,
      needCacheLib: false,
    });
  });

  it("przywraca arkusze z cache gdy dysk zwrócił 0 plików mimo uprawnień", () => {
    expect(resolveBootCachePlan({ loadedFromDisk: false, sheetCount: 0 })).toEqual({
      needCacheSheets: true,
      needCacheLib: true,
    });
  });

  it("nie wczytuje biblioteki z cache gdy dysk załadował projekt", () => {
    expect(resolveBootCachePlan({ loadedFromDisk: true, sheetCount: 2, hasLibrary: true }).needCacheLib).toBe(false);
  });

  it("wczytuje bibliotekę z cache gdy dysk ma arkusze ale bez symboli", () => {
    expect(resolveBootCachePlan({ loadedFromDisk: true, sheetCount: 2, hasLibrary: false }).needCacheLib).toBe(true);
  });
});

describe("shouldWriteProjectCache", () => {
  it("blokuje nadpisanie cache pustym snapshotem", () => {
    expect(shouldWriteProjectCache({ sheets: [] }, { sheets: [{ id: "sch-1", text: "a" }] })).toBe(false);
  });

  it("pozwala zapisać pełniejszy snapshot", () => {
    expect(shouldWriteProjectCache({ sheets: [{ id: "sch-1", text: "abc" }] }, { sheets: [] })).toBe(true);
    expect(
      shouldWriteProjectCache(
        {
          sheets: [
            { id: "sch-1", text: "a" },
            { id: "sch-2", text: "b" },
          ],
        },
        { sheets: [{ id: "sch-1", text: "a" }] }
      )
    ).toBe(true);
  });
});

describe("resolveReloadSheetsOutcome", () => {
  const prev = [{ id: "sch-1", name: "E-01.svg" }];
  const disk = [{ id: "sch-2", name: "E-02.svg" }];

  it("używa arkuszy z dysku gdy są dostępne", () => {
    expect(resolveReloadSheetsOutcome({ diskSheets: disk, prevSheets: prev, keepExistingOnEmpty: true })).toEqual({
      sheets: disk,
      count: 1,
      action: "use-disk",
    });
  });

  it("zachowuje poprzednie arkusze gdy dysk pusty i keepExistingOnEmpty", () => {
    expect(resolveReloadSheetsOutcome({ diskSheets: [], prevSheets: prev, keepExistingOnEmpty: true })).toEqual({
      sheets: prev,
      count: 1,
      action: "keep-prev",
    });
  });

  it("czyści arkusze gdy dysk pusty bez keepExistingOnEmpty", () => {
    expect(resolveReloadSheetsOutcome({ diskSheets: [], prevSheets: prev, keepExistingOnEmpty: false })).toEqual({
      sheets: [],
      count: 0,
      action: "empty",
    });
  });

  it("na świeżym boot (brak prev) zwraca empty — sygnał do cache", () => {
    expect(resolveReloadSheetsOutcome({ diskSheets: [], prevSheets: [], keepExistingOnEmpty: true })).toEqual({
      sheets: [],
      count: 0,
      action: "empty",
    });
  });
});

describe("resolveBootActiveTarget", () => {
  const sheets = [
    { id: "sch-1", name: "Bezpieczenstwo.svg", relPath: "Bezpieczenstwo.svg" },
    { id: "sch-1", name: "Enable.svg", relPath: "Enable.svg" },
    { id: "sch-1", name: "Zasilanie.svg", relPath: "Zasilanie.svg" },
  ];
  const symbols = [{ id: "G" }, { id: "SK" }];

  it("przywraca arkusz po sheetKey mimo kolizji sch-id", () => {
    const r = resolveBootActiveTarget({
      sheets,
      symbols,
      prefs: { sheetKey: "Zasilanie.svg", selId: "sch-1" },
    });
    expect(r).toEqual({ kind: "sheet", sheet: sheets[2] });
  });

  it("nie bierze pierwszego arkusza gdy selId jest współdzielone", () => {
    const r = resolveBootActiveTarget({
      sheets,
      symbols,
      prefs: { selId: "sch-1" },
    });
    expect(r.kind).toBe("sheet");
    expect(r.sheet).toBe(sheets[0]);
  });

  it("przywraca symbol gdy brak sheetKey a selId to symbol", () => {
    const r = resolveBootActiveTarget({
      sheets,
      symbols,
      prefs: { selId: "SK" },
    });
    expect(r).toEqual({ kind: "symbol", symbolId: "SK" });
  });

  it("używa activeSheetKey z cache projektu", () => {
    const r = resolveBootActiveTarget({
      sheets,
      symbols,
      prefs: null,
      projectSheetKey: "Enable.svg",
    });
    expect(r).toEqual({ kind: "sheet", sheet: sheets[1] });
  });

  it("sheetKey z prefs wygrywa ze współdzielonym selId", () => {
    const r = resolveBootActiveTarget({
      sheets,
      symbols,
      prefs: { sheetKey: "Enable.svg", selId: "sch-1" },
      projectSheetKey: "Zasilanie.svg",
    });
    expect(r).toEqual({ kind: "sheet", sheet: sheets[1] });
  });
});

describe("prefsSheetKey", () => {
  it("bierze aktywny arkusz, inaczej lastSheet", () => {
    const lib = { name: "lib" };
    const zasilanie = { relPath: "Zasilanie.svg" };
    const enable = { relPath: "Enable.svg" };
    expect(prefsSheetKey({ active: zasilanie, lib, lastSheet: enable })).toBe("Zasilanie.svg");
    expect(prefsSheetKey({ active: lib, lib, lastSheet: enable })).toBe("Enable.svg");
    expect(prefsSheetKey({ active: lib, lib, lastSheet: null })).toBe(null);
  });
});
