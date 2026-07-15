import { describe, it, expect } from "vitest";
import {
  W,
  BANNED_UI_TERMS,
  collectWordingStrings,
  symbolSelectionSummary,
  resourceNameLabel,
  saveFileLabel,
  paramsSaveTip,
} from "../src/ui-wording.js";

describe("ui-wording SSOT", () => {
  it("nie zawiera zakazanych terminów w eksporcie", () => {
    const all = collectWordingStrings().join("\n");
    for (const banned of BANNED_UI_TERMS) {
      expect(all).not.toContain(banned);
    }
  });

  it("symbolSelectionSummary formatuje nazwę i oznaczenie", () => {
    expect(symbolSelectionSummary("Stycznik", "SK")).toBe("Symbol: Stycznik · oznaczenie: SK");
    expect(symbolSelectionSummary("", "SK")).toBe(W.selection.pickSymbol);
  });

  it("resourceNameLabel zwraca etykiety pól zasobów", () => {
    expect(resourceNameLabel("sheet")).toBe(W.field.sheetName);
    expect(resourceNameLabel("library")).toBe(W.field.libraryName);
    expect(resourceNameLabel("project")).toBe(W.field.projectName);
  });

  it("rozróżnia zapis pliku od zapisu parametrów", () => {
    expect(saveFileLabel({ onLib: true, onSheet: false })).toBe(W.save.fileLib);
    expect(paramsSaveTip("symbol")).toBe(W.saveTip.symbol);
    expect(paramsSaveTip("sheet")).toBe(W.saveTip.sheet);
  });
});
