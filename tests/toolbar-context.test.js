import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { resolveToolbarGroups } from "../src/toolbar-context.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
    expect(g.netlistEditGroup).toBe(false);
    expect(g.strokeStyleGroup).toBe(true);
    expect(g.fillStyleGroup).toBe(false);
    expect(g.textStyleGroup).toBe(false);
    expect(g.primaryStyleGroup).toBe(true);
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

  it("pokazuje selectionProps dla use / conn / text / wire", () => {
    for (const mode of ["use", "conn", "text", "wire"]) {
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

  it("nadruk i promocja tylko przy przewodzie, nie przy symbolu", () => {
    const wire = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: true,
      hasDir: true,
      selectionPropsMode: "wire",
      canPromoteConn: true,
    });
    expect(wire.netlistEditGroup).toBe(true);
    const use = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: true,
      hasDir: true,
      selectionPropsMode: "use",
      canPromoteConn: false,
    });
    expect(use.netlistEditGroup).toBe(false);
    expect(use.primaryStyleGroup).toBe(false);
  });

  it("styl dopasowuje się do narzędzia rysowania", () => {
    const text = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: false,
      hasDir: true,
      drawMode: "text",
    });
    expect(text.textStyleGroup).toBe(true);
    expect(text.strokeStyleGroup).toBe(false);
    expect(text.fillStyleGroup).toBe(false);
    const rect = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: false,
      hasDir: true,
      drawMode: "rect",
    });
    expect(rect.strokeStyleGroup).toBe(true);
    expect(rect.fillStyleGroup).toBe(true);
    expect(rect.textStyleGroup).toBe(false);
  });

  it("przy zaznaczeniu pokazuje tylko pasujące grupy stylu", () => {
    const g = resolveToolbarGroups({
      onLib: false,
      onSheet: true,
      symSelected: false,
      hasSelection: true,
      hasDir: true,
      hasStroke: true,
      hasFill: false,
      hasText: false,
    });
    expect(g.strokeStyleGroup).toBe(true);
    expect(g.fillStyleGroup).toBe(false);
    expect(g.textStyleGroup).toBe(false);
    expect(g.primaryStyleGroup).toBe(true);
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
    expect(g.primaryStyleGroup).toBe(false);
  });

  it("zawsze pokazuje plik, edycję, widok i ustawienia", () => {
    const g = resolveToolbarGroups({
      onLib: false,
      onSheet: false,
      symSelected: false,
      hasSelection: false,
      hasDir: false,
    });
    expect(g.fileGroup).toBe(true);
    expect(g.editGroup).toBe(true);
    expect(g.createGroup).toBe(true);
    expect(g.viewGroup).toBe(true);
    expect(g.settingsGroup).toBe(true);
  });
});

describe("belka HTML", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");

  it("klastruje tryb: akcje vs widok, bez przełącznika obrotu napisów", () => {
    expect(html).toContain('id="toolbarPrimary"');
    expect(html).toContain('id="toolbarTrailing"');
    expect(html).toContain('id="editGroup"');
    expect(html).toContain('id="netlistEditGroup"');
    expect(html).toContain('id="lblWireMarkMode"');
    expect(html).toContain('id="wireMarkMode"');
    expect(html).not.toContain("rotateOwnedLabels");
    expect(html).not.toContain("Obracaj napisy");
    const mode = html.slice(html.indexOf('id="toolbarMode"'), html.indexOf('id="toolbarContext"'));
    const context = html.slice(html.indexOf('id="toolbarContext"'));
    expect(mode).not.toContain('id="wireMarkMode"');
    expect(mode).not.toContain("Do spisu");
    expect(context).toContain('id="wireMarkMode"');
    expect(context).toContain("Do spisu");
  });
});
