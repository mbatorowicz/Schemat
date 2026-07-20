import { describe, it, expect } from "vitest";
import { resolveToolbarGroups } from "../src/toolbar-context.js";

describe("resolveToolbarGroups", () => {
  it("pokazuje akcje biblioteki i ukrywa wstawianie na schemacie", () => {
    const g = resolveToolbarGroups({
      onLib: true,
      onSheet: false,
      symSelected: false,
      hasSelection: false,
      hasDir: true,
    });
    expect(g.drawGroup).toBe(true);
    expect(g.leadGroup).toBe(true);
    expect(g.libActionsGroup).toBe(true);
    expect(g.libSymbolMetaGroup).toBe(false);
    expect(g.resourceNameGroup).toBe(true);
    expect(g.resourceNameMode).toBe("library");
    expect(g.selectionPropsGroup).toBe(false);
  });

  it("pokazuje meta symbolu i nazwę biblioteki gdy wybrany symbol", () => {
    const g = resolveToolbarGroups({
      onLib: true,
      onSheet: false,
      symSelected: true,
      hasSelection: false,
      hasDir: true,
    });
    expect(g.libSymbolMetaGroup).toBe(true);
    expect(g.resourceNameMode).toBe("library");
  });

  it("na schemacie pokazuje rysowanie; nazwa schematu jest na liście", () => {
    const g = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: true,
      hasDir: true,
    });
    expect(g.drawGroup).toBe(true);
    expect(g.leadGroup).toBe(true);
    expect(g.resourceNameMode).toBe(null);
    expect(g.resourceNameGroup).toBe(false);
    expect(g.arrangeGroup).toBe(true);
    expect(g.libSymbolMetaGroup).toBe(false);
    expect(g.selectionPropsGroup).toBe(false);
  });

  it("pokazuje selectionProps dla use / conn / text", () => {
    for (const mode of ["use", "conn", "text"]) {
      const g = resolveToolbarGroups({
        onLib: false,
        onSheet: true,
        symSelected: false,
        hasSelection: true,
        hasDir: true,
        selectionPropsMode: mode,
      });
      expect(g.selectionPropsGroup).toBe(true);
      expect(g.selectionPropsMode).toBe(mode);
    }
  });

  it("pokazuje rename projektu gdy brak aktywnego arkusza/biblioteki", () => {
    const g = resolveToolbarGroups({
      onLib: false,
      onSheet: false,
      symSelected: false,
      hasSelection: false,
      hasDir: true,
    });
    expect(g.resourceNameMode).toBe("project");
  });

  it("zawsze pokazuje plik, widok i ustawienia", () => {
    const g = resolveToolbarGroups({
      onLib: false,
      onSheet: false,
      symSelected: false,
      hasSelection: false,
      hasDir: false,
    });
    expect(g.fileGroup).toBe(true);
    expect(g.createGroup).toBe(true);
    expect(g.viewGroup).toBe(true);
    expect(g.settingsGroup).toBe(true);
  });
});
