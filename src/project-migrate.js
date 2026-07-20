/**
 * Migracje projektu — jedna kolejność, idempotentne, bez rozproszonej logiki w main.js.
 */
import { symbolAliasMigrations, SYMBOL_ID_ALIASES, rememberSymbolIdAlias } from "./symbol-aliases.js";
import { stripSheetEmbeddedSymbols, resolveLibSymbol, libSymbolGroups } from "./symbol-resolver.js";
import { migrateInstanceRefsOnRoot } from "./symbol-service.js";
import { qsById } from "./dom-selectors.js";
import { migrateSheetDisplayTitle } from "./sheet-catalog.js";
import { inferSymbolDisplayName } from "./symbol-display.js";
import { SYMBOL_NAME_ATTR, symbolDisplayName } from "./symbol-save.js";
export function createProjectMigrator(deps) {
  const {
    state,
    SVGNS,
    XLINK,
    normalizeLibLayout,
    stripSymPrefixInSvg,
    rewriteSymbolIdRefs,
    migrateConnModel,
    buildSymbolList,
    flushLibrary,
    markDirty,
  } = deps;

  function migrateLibrarySymbolNames() {
    if (!state.lib?.svg) return false;
    let changed = false;
    symbolAliasMigrations().forEach(([oldId, newId]) => {
      const oldNode = resolveLibSymbol(state.lib.svg, oldId);
      if (!oldNode) return;
      if (oldNode.getAttribute("data-alias-lock") === "1") return;
      const existing = resolveLibSymbol(state.lib.svg, newId);
      if (existing && existing !== oldNode) {
        rewriteSymbolIdRefs(state.lib.svg, oldId, newId, XLINK);
        rememberSymbolIdAlias(existing, oldId);
        oldNode.remove();
        changed = true;
      } else {
        rewriteSymbolIdRefs(state.lib.svg, oldId, newId, XLINK);
        oldNode.id = newId;
        rememberSymbolIdAlias(oldNode, oldId);
        changed = true;
      }
    });
    return changed;
  }

  function migrateSheetEmbeddedSymbolIds() {
    let changed = false;
    const libSvg = state.lib?.svg || null;
    state.sheets.forEach((sh) => {
      const defs = sh.svg && sh.svg.querySelector("defs");
      if (!defs) return;
      Object.entries(SYMBOL_ID_ALIASES).forEach(([oldId, newId]) => {
        if (oldId === newId) return;
        const oldNode = qsById(defs, oldId);
        if (!oldNode) return;
        if (qsById(defs, newId)) {
          oldNode.remove();
          changed = true;
        } else {
          oldNode.id = newId;
          changed = true;
        }
      });
      if (!libSvg) return;
      [...defs.children]
        .filter((n) => n.tagName?.toLowerCase() === "g" && n.id)
        .forEach((g) => {
          const libNode = resolveLibSymbol(libSvg, g.id);
          if (!libNode || libNode.id === g.id) return;
          if (qsById(defs, libNode.id)) g.remove();
          else g.id = libNode.id;
          changed = true;
        });
    });
    return changed;
  }

  function migrateInstanceRefs() {
    let changed = false;
    const libSvg = state.lib?.svg || null;
    state.sheets.forEach((sh) => {
      if (migrateInstanceRefsOnRoot(sh.svg, XLINK, libSvg)) changed = true;
    });
    return changed;
  }

  function stripDuplicateEmbeddedSymbols() {
    if (!state.lib?.svg) return false;
    let changed = false;
    state.sheets.forEach((sh) => {
      if (sh.svg && stripSheetEmbeddedSymbols(sh.svg, state.lib.svg)) changed = true;
    });
    return changed;
  }

  function migrateLibraryDesignationIds() {
    if (!state.lib?.svg) return false;
    let changed = false;
    libSymbolGroups(state.lib.svg).forEach((g) => {
      if (g.getAttribute("data-alias-lock") === "1") return;
      const prefix = (g.getAttribute("data-inst-prefix") || "").trim();
      const target = prefix && prefix !== g.id ? prefix : null;
      if (!target) {
        const m = g.id.match(/^([A-Z])(\d+)$/i);
        if (!m || resolveLibSymbol(state.lib.svg, m[1])) return;
        renameLibSymbolId(g, m[1], parseInt(m[2], 10) || 1);
        changed = true;
        return;
      }
      if (resolveLibSymbol(state.lib.svg, target)) return;
      renameLibSymbolId(g, target, parseInt(g.getAttribute("data-inst-start") || "1", 10) || 1);
      changed = true;
    });
    return changed;
  }

  function renameLibSymbolId(node, newId, startNum) {
    const oldId = node.id;
    rewriteSymbolIdRefs(state.lib.svg, oldId, newId, XLINK);
    state.sheets.forEach((sh) => {
      if (sh.svg) rewriteSymbolIdRefs(sh.svg, oldId, newId, XLINK);
    });
    node.id = newId;
    rememberSymbolIdAlias(node, oldId);
    if (!node.getAttribute("data-inst-prefix")) node.setAttribute("data-inst-prefix", newId);
    if (node.getAttribute("data-inst-numbered") == null || node.getAttribute("data-inst-numbered") === "") {
      node.setAttribute("data-inst-numbered", "1");
    }
    if (!node.getAttribute("data-inst-start")) node.setAttribute("data-inst-start", String(startNum || 1));
  }

  function migrateSheetDisplayTitles() {
    let changed = false;
    state.sheets.forEach((sh) => {
      if (migrateSheetDisplayTitle(sh)) changed = true;
    });
    return changed;
  }

  function migrateLibraryDisplayNames() {
    if (!state.lib?.svg) return false;
    let changed = false;
    libSymbolGroups(state.lib.svg).forEach((g) => {
      if (symbolDisplayName(g)) return;
      const inferred = inferSymbolDisplayName(g, g.id);
      const ozn = (g.getAttribute("data-inst-prefix") || g.id || "").trim();
      if (inferred && inferred !== ozn) {
        g.setAttribute(SYMBOL_NAME_ATTR, inferred);
        changed = true;
      }
    });
    return changed;
  }

  function migrateProject() {
    let changed = false;
    if (state.lib && state.lib.svg) {
      normalizeLibLayout(state.lib.svg, SVGNS);
      if (stripSymPrefixInSvg(state.lib.svg, XLINK)) changed = true;
      if (migrateLibrarySymbolNames()) changed = true;
      if (migrateLibraryDesignationIds()) changed = true;
      if (migrateLibraryDisplayNames()) changed = true;
    }
    state.sheets.forEach((sh) => {
      if (sh.svg && stripSymPrefixInSvg(sh.svg, XLINK)) changed = true;
    });
    if (migrateSheetDisplayTitles()) changed = true;
    if (migrateSheetEmbeddedSymbolIds()) changed = true;
    if (stripDuplicateEmbeddedSymbols()) changed = true;
    if (migrateInstanceRefs()) changed = true;
    if (migrateConnModel()) changed = true;
    if (changed) {
      buildSymbolList();
      flushLibrary();
      markDirty();
    }
    return changed;
  }

  return { migrateProject, migrateLibrarySymbolNames, migrateSheetEmbeddedSymbolIds, migrateInstanceRefs };
}
