/**
 * Migracje projektu — jedna kolejność, idempotentne, bez rozproszonej logiki w main.js.
 */
import { symbolAliasMigrations, SYMBOL_ID_ALIASES } from "./symbol-aliases.js";
import { stripSheetEmbeddedSymbols } from "./symbol-resolver.js";
import { migrateInstanceRefsOnRoot } from "./symbol-service.js";
import { qsById } from "./dom-selectors.js";
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
      const oldNode = qsById(state.lib.svg, oldId);
      if (!oldNode) return;
      const existing = qsById(state.lib.svg, newId);
      if (existing && existing !== oldNode) {
        rewriteSymbolIdRefs(state.lib.svg, oldId, newId, XLINK);
        oldNode.remove();
        changed = true;
      } else {
        rewriteSymbolIdRefs(state.lib.svg, oldId, newId, XLINK);
        oldNode.id = newId;
        changed = true;
      }
    });
    return changed;
  }

  function migrateSheetEmbeddedSymbolIds() {
    let changed = false;
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
    });
    return changed;
  }

  function migrateInstanceRefs() {
    let changed = false;
    state.sheets.forEach((sh) => {
      if (migrateInstanceRefsOnRoot(sh.svg, XLINK)) changed = true;
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

  function migrateProject() {
    let changed = false;
    if (state.lib && state.lib.svg) {
      normalizeLibLayout(state.lib.svg, SVGNS);
      if (stripSymPrefixInSvg(state.lib.svg, XLINK)) changed = true;
      if (migrateLibrarySymbolNames()) changed = true;
    }
    state.sheets.forEach((sh) => {
      if (sh.svg && stripSymPrefixInSvg(sh.svg, XLINK)) changed = true;
    });
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
