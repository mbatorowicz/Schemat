import { describe, it, expect } from "vitest";
import {
  markSheetDirty,
  clearSheetDirty,
  countDirtySheets,
  preserveDirtySheets,
  sheetKey,
} from "../src/sheet-persistence.js";
import { shouldWriteLibraryCache, libraryCacheScore } from "../src/boot-cache.js";

describe("sheet dirty / save guards", () => {
  it("markuje i liczy dirty arkusze", () => {
    const a = { name: "A.svg", dirty: false };
    const b = { name: "B.svg", dirty: false };
    markSheetDirty(a);
    expect(a.dirty).toBe(true);
    expect(countDirtySheets([a, b])).toBe(1);
    clearSheetDirty(a);
    expect(countDirtySheets([a, b])).toBe(0);
  });

  it("preserveDirtySheets zachowuje lokalne zmiany przy reload", () => {
    const prev = [{ name: "A.svg", relPath: "A.svg", dirty: true, id: "sch-1" }];
    const disk = [{ name: "A.svg", relPath: "A.svg", dirty: false, id: "sch-1" }];
    const out = preserveDirtySheets(prev, disk);
    expect(out[0]).toBe(prev[0]);
    expect(sheetKey(out[0])).toBe("A.svg");
  });
});

describe("shouldWriteLibraryCache", () => {
  it("nie nadpisuje pełnego cache pustym", () => {
    const full = { text: "<svg></svg>".repeat(20), savedAt: 2 };
    const empty = { text: "", savedAt: 0 };
    expect(shouldWriteLibraryCache(empty, full)).toBe(false);
    expect(shouldWriteLibraryCache(full, empty)).toBe(true);
  });

  it("uwzględnia scoreFloor", () => {
    const snap = { text: "abc", savedAt: 1 };
    expect(libraryCacheScore(snap)).toBeLessThan(1000);
    expect(shouldWriteLibraryCache(snap, null, 1000)).toBe(false);
  });
});
