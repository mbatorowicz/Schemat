// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createProjectMigrator } from "../src/project-migrate.js";
import { rewriteSymbolIdRefs } from "../src/library-loader.js";
import { resolveLibSymbol } from "../src/symbol-resolver.js";
import { syncUseSymbolHrefs, migrateInstanceRefsOnRoot } from "../src/symbol-service.js";
import { SYMBOL_ID_ALIASES_ATTR, rememberSymbolIdAlias } from "../src/symbol-aliases.js";

const SVGNS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";

function mkSvg() {
  return document.createElementNS(SVGNS, "svg");
}

function mkLibWithG() {
  const svg = mkSvg();
  const defs = document.createElementNS(SVGNS, "defs");
  const g = document.createElementNS(SVGNS, "g");
  g.id = "G";
  g.setAttribute("data-symbol-name", "Zasilacz");
  g.setAttribute("data-inst-prefix", "G");
  defs.appendChild(g);
  svg.appendChild(defs);
  return { svg, g };
}

function mkSheetWithUse(symId) {
  const svg = mkSvg();
  const defs = document.createElementNS(SVGNS, "defs");
  const embedded = document.createElementNS(SVGNS, "g");
  embedded.id = symId;
  defs.appendChild(embedded);
  svg.appendChild(defs);
  const sch = document.createElementNS(SVGNS, "g");
  sch.id = "E-01";
  const use = document.createElementNS(SVGNS, "use");
  use.setAttribute("href", "#" + symId);
  use.setAttributeNS(XLINK, "xlink:href", "#" + symId);
  use.setAttribute("data-sym", symId);
  use.setAttribute("data-ref", "G1");
  sch.appendChild(use);
  svg.appendChild(sch);
  return { svg, use, embedded, sch };
}

describe("sync starych id symbolu z biblioteką", () => {
  it("resolveLibSymbol znajduje G po aliasie PSU", () => {
    const { svg, g } = mkLibWithG();
    expect(resolveLibSymbol(svg, "PSU")).toBe(g);
  });

  it("resolveLibSymbol znajduje symbol po data-id-aliases", () => {
    const { svg, g } = mkLibWithG();
    rememberSymbolIdAlias(g, "OldPSU");
    expect(g.getAttribute(SYMBOL_ID_ALIASES_ATTR)).toBe("OldPSU");
    expect(resolveLibSymbol(svg, "OldPSU")).toBe(g);
  });

  it("syncUseSymbolHrefs przepisuje PSU → G", () => {
    const { svg: lib } = mkLibWithG();
    const { svg, use } = mkSheetWithUse("PSU");
    expect(syncUseSymbolHrefs(svg, XLINK, lib)).toBe(true);
    expect(use.getAttribute("data-sym")).toBe("G");
    expect(use.getAttribute("href")).toBe("#G");
  });

  it("migrateProject aktualizuje arkusz gdy biblioteka ma nowsze id G", () => {
    const { svg: libSvg } = mkLibWithG();
    const { svg: sheetSvg, use, embedded } = mkSheetWithUse("PSU");
    const state = {
      lib: { svg: libSvg },
      sheets: [{ svg: sheetSvg, id: "E-01" }],
    };
    const { migrateProject } = createProjectMigrator({
      state,
      SVGNS,
      XLINK,
      normalizeLibLayout: () => {},
      stripSymPrefixInSvg: () => false,
      rewriteSymbolIdRefs,
      migrateConnModel: () => false,
      buildSymbolList: () => {},
      flushLibrary: () => {},
      markDirty: () => {},
    });
    expect(migrateProject()).toBe(true);
    expect(use.getAttribute("data-sym")).toBe("G");
    expect(use.getAttribute("href")).toBe("#G");
    expect(embedded.isConnected).toBe(false);
  });

  it("migrateInstanceRefsOnRoot jest idempotentne", () => {
    const { svg: lib } = mkLibWithG();
    const { svg, use } = mkSheetWithUse("PSU");
    expect(migrateInstanceRefsOnRoot(svg, XLINK, lib)).toBe(true);
    expect(migrateInstanceRefsOnRoot(svg, XLINK, lib)).toBe(false);
    expect(use.getAttribute("data-sym")).toBe("G");
  });
});
