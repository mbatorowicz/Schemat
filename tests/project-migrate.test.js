// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createProjectMigrator } from "../src/project-migrate.js";

function migratorForLib(svg) {
  const state = { lib: { svg }, sheets: [] };
  return createProjectMigrator({
    state,
    SVGNS: "http://www.w3.org/2000/svg",
    XLINK: "http://www.w3.org/1999/xlink",
    normalizeLibLayout: () => {},
    stripSymPrefixInSvg: () => false,
    rewriteSymbolIdRefs: () => {},
    migrateConnModel: () => false,
    buildSymbolList: () => {},
    flushLibrary: () => {},
    markDirty: () => {},
  });
}

describe("migrateLibrarySymbolNames", () => {
  it("migruje sk1 → SK gdy brak blokady aliasu", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const sym = document.createElementNS("http://www.w3.org/2000/svg", "g");
    sym.id = "sk1";
    defs.appendChild(sym);
    svg.appendChild(defs);
    const { migrateProject } = migratorForLib(svg);
    migrateProject();
    expect(sym.id).toBe("SK");
  });

  it("pomija symbol z data-alias-lock po ręcznej zmianie ID", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const sym = document.createElementNS("http://www.w3.org/2000/svg", "g");
    sym.id = "sk1";
    sym.setAttribute("data-alias-lock", "1");
    defs.appendChild(sym);
    svg.appendChild(defs);
    const { migrateProject } = migratorForLib(svg);
    migrateProject();
    expect(sym.id).toBe("sk1");
  });

  it("migruje B1 → B gdy oznaczenie to B", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const sym = document.createElementNS("http://www.w3.org/2000/svg", "g");
    sym.id = "B1";
    sym.setAttribute("data-inst-prefix", "B");
    defs.appendChild(sym);
    svg.appendChild(defs);
    const { migrateProject } = migratorForLib(svg);
    migrateProject();
    expect(sym.id).toBe("B");
    expect(sym.getAttribute("data-inst-prefix")).toBe("B");
  });
});
