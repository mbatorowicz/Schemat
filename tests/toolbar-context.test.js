import { describe, it, expect } from "vitest";
import { resolveToolbarGroups, formatLibrarySelectionInfo } from "../src/toolbar-context.js";
import { W } from "../src/ui-wording.js";

describe("resolveToolbarGroups", () => {
  it("pokazuje akcje biblioteki i ukrywa wstawianie na schemacie", () => {
    const g = resolveToolbarGroups({ onLib: true, onSheet: false, symSelected: false, hasSelection: false, hasDir: true });
    expect(g.drawGroup).toBe(true);
    expect(g.leadGroup).toBe(true);
    expect(g.markGroup).toBe(false);
    expect(g.libActionsGroup).toBe(true);
    expect(g.libSymbolMetaGroup).toBe(false);
    expect(g.resourceNameGroup).toBe(true);
    expect(g.resourceNameMode).toBe("library");
    expect(g.sheetInsertGroup).toBe(false);
  });

  it("pokazuje meta symbolu i nazwę biblioteki gdy wybrany symbol", () => {
    const g = resolveToolbarGroups({ onLib: true, onSheet: false, symSelected: true, hasSelection: false, hasDir: true });
    expect(g.libSymbolMetaGroup).toBe(true);
    expect(g.resourceNameMode).toBe("library");
  });

  it("na schemacie pokazuje rysowanie i wstawianie", () => {
    const g = resolveToolbarGroups({ onLib: false, onSheet: true, symSelected: false, hasSelection: true, hasDir: true });
    expect(g.drawGroup).toBe(true);
    expect(g.leadGroup).toBe(true);
    expect(g.markGroup).toBe(false);
    expect(g.sheetInsertGroup).toBe(true);
    expect(g.resourceNameMode).toBe("sheet");
    expect(g.arrangeGroup).toBe(true);
    expect(g.libSymbolMetaGroup).toBe(false);
  });

  it("pokazuje rename projektu gdy brak aktywnego arkusza/biblioteki", () => {
    const g = resolveToolbarGroups({ onLib: false, onSheet: false, symSelected: false, hasSelection: false, hasDir: true });
    expect(g.resourceNameMode).toBe("project");
  });

  it("zawsze pokazuje menu Więcej", () => {
    const g = resolveToolbarGroups({ onLib: false, onSheet: false, symSelected: false, hasSelection: false, hasDir: false });
    expect(g.moreGroup).toBe(true);
    expect(g.createGroup).toBe(true);
  });
});

describe("formatLibrarySelectionInfo", () => {
  it("deleguje do wording SSOT", () => {
    expect(formatLibrarySelectionInfo("E-STOP", "SB")).toBe("Symbol: E-STOP · oznaczenie: SB");
    expect(formatLibrarySelectionInfo("", "SB")).toBe(W.selection.pickSymbol);
  });
});
