import { describe, it, expect } from "vitest";
import {
  resolveToolbarGroups,
  resolveInstanceMetaKind,
  formatLibrarySelectionInfo,
} from "../src/toolbar-context.js";
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
    expect(g.sheetInstanceMetaGroup).toBe(false);
  });

  it("pokazuje meta symbolu i nazwę biblioteki gdy wybrany symbol", () => {
    const g = resolveToolbarGroups({ onLib: true, onSheet: false, symSelected: true, hasSelection: false, hasDir: true });
    expect(g.libSymbolMetaGroup).toBe(true);
    expect(g.resourceNameMode).toBe("library");
  });

  it("na schemacie pokazuje rysowanie; nazwa schematu jest na liście", () => {
    const g = resolveToolbarGroups({ onLib: false, onSheet: true, symSelected: false, hasSelection: true, hasDir: true });
    expect(g.drawGroup).toBe(true);
    expect(g.leadGroup).toBe(true);
    expect(g.markGroup).toBe(false);
    expect(g.sheetInsertGroup).toBe(false);
    expect(g.resourceNameMode).toBe(null);
    expect(g.resourceNameGroup).toBe(false);
    expect(g.arrangeGroup).toBe(true);
    expect(g.libSymbolMetaGroup).toBe(false);
    expect(g.sheetInstanceMetaGroup).toBe(false);
  });

  it("pokazuje meta instancji gdy pojedynczy use lub conn", () => {
    const useG = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: true,
      hasDir: true,
      instanceMetaKind: "use",
    });
    expect(useG.sheetInstanceMetaGroup).toBe(true);
    expect(useG.instanceMetaKind).toBe("use");

    const connG = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: true,
      hasDir: true,
      instanceMetaKind: "conn",
    });
    expect(connG.sheetInstanceMetaGroup).toBe(true);
    expect(connG.instanceMetaKind).toBe("conn");
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

describe("resolveInstanceMetaKind", () => {
  it("zwraca use / conn tylko przy pojedynczym zaznaczeniu na arkuszu", () => {
    const useEl = { tagName: "use", getAttribute: () => null };
    const connEl = { tagName: "g", getAttribute: (n) => (n === "data-role" ? "conn" : null) };
    const textEl = { tagName: "text", getAttribute: () => null };

    expect(resolveInstanceMetaKind({ onSheet: true, selection: [useEl] })).toBe("use");
    expect(resolveInstanceMetaKind({ onSheet: true, selection: [connEl] })).toBe("conn");
    expect(resolveInstanceMetaKind({ onSheet: true, selection: [textEl] })).toBe(null);
    expect(resolveInstanceMetaKind({ onSheet: true, selection: [useEl, connEl] })).toBe(null);
    expect(resolveInstanceMetaKind({ onSheet: false, selection: [useEl] })).toBe(null);
  });
});

describe("formatLibrarySelectionInfo", () => {
  it("deleguje do wording SSOT", () => {
    expect(formatLibrarySelectionInfo("E-STOP", "SB")).toBe("E-STOP · SB");
    expect(formatLibrarySelectionInfo("", "SB")).toBe(W.selection.pickSymbol);
  });
});
