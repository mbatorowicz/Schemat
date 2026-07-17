import { describe, it, expect } from "vitest";
import {
  W,
  BANNED_UI_TERMS,
  collectWordingStrings,
  symbolSelectionSummary,
  formatContextBreadcrumb,
  resourceNameLabel,
  saveFileLabel,
  saveActionTip,
  paramsSaveTip,
} from "../src/ui-wording.js";

describe("ui-wording SSOT", () => {
  it("nie zawiera zakazanych terminów w eksporcie", () => {
    const all = collectWordingStrings().join("\n");
    for (const banned of BANNED_UI_TERMS) {
      expect(all).not.toContain(banned);
    }
  });

  it("symbolSelectionSummary jest zwięzłe", () => {
    expect(symbolSelectionSummary("Stycznik", "SK")).toBe("Stycznik · SK");
    expect(symbolSelectionSummary("", "SK")).toBe(W.selection.pickSymbol);
  });

  it("formatContextBreadcrumb pokazuje liść, pełną ścieżkę w title", () => {
    const bc = formatContextBreadcrumb({
      projectName: "schematy",
      leafKind: "sheet",
      leafName: "Transporter boczny",
    });
    expect(bc.label).toBe("Schemat · Transporter boczny");
    expect(bc.title).toContain("Projekt: schematy");
    expect(bc.title).toContain("Schemat: Transporter boczny");
  });

  it("resourceNameLabel zwraca etykiety pól zasobów", () => {
    expect(resourceNameLabel("sheet")).toBe(W.field.sheetName);
    expect(resourceNameLabel("library")).toBe(W.field.libraryName);
    expect(resourceNameLabel("project")).toBe(W.field.projectName);
  });

  it("saveActionTip zależy od kontekstu projektu", () => {
    expect(saveActionTip({ hasDir: true })).toBe(W.saveTip.unifiedProject);
    expect(saveActionTip({ hasDir: false, fileName: "a.svg" })).toContain("a.svg");
  });

  it("rozróżnia zapis pliku od zapisu parametrów", () => {
    expect(saveFileLabel({ onLib: true, onSheet: false })).toBe(W.save.fileLib);
    expect(paramsSaveTip("symbol")).toBe(W.saveTip.symbol);
    expect(paramsSaveTip("sheet")).toBe(W.saveTip.sheet);
  });
});
