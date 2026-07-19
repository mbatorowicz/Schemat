/** Ochrona arkuszy przed utratą danych przy przeładowaniu i zapisie. */
import { canonicalSymbolId } from "./symbol-aliases.js";
import { libSymbolGroups } from "./symbol-resolver.js";
import { qsById } from "./dom-selectors.js";

export function sheetKey(sheet) {
  return sheet?.relPath || sheet?.name || sheet?.id || "";
}

export function markSheetDirty(sheet) {
  if (sheet) sheet.dirty = true;
}

export function clearSheetDirty(sheet) {
  if (sheet) sheet.dirty = false;
}

export function countDirtySheets(sheets) {
  return (sheets || []).filter((s) => s.dirty).length;
}

/** Przy przeładowaniu z dysku zachowaj arkusze z niezapisanymi zmianami w pamięci. */
export function preserveDirtySheets(previousSheets, loadedSheets) {
  const dirty = new Map();
  for (const sh of previousSheets || []) {
    if (sh?.dirty) dirty.set(sheetKey(sh), sh);
  }
  if (!dirty.size) return loadedSheets;
  return loadedSheets.map((sh) => dirty.get(sheetKey(sh)) || sh);
}

/**
 * Osadza używane symbole z biblioteki w <defs> arkusza — bez kasowania reszty.
 * Nadpisuje tylko top-level definicje symboli obecne w bibliotece.
 */
export function inlineSheetDefsSafe(sheet, deps) {
  const { svgNs, libSvg, resolveLibSymbol, resolveSheetSymbol, useColorAwareClone, collectUsedSymbols } = deps;
  const svg = sheet?.svg;
  if (!svg) return { ok: false, reason: "brak svg" };

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = svg.ownerDocument.createElementNS(svgNs, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  const sch = qsById(svg, sheet.id);
  if (!sch) return { ok: false, reason: "brak grupy arkusza" };

  const used = collectUsedSymbols(sch, svg);
  const missing = [];
  const updated = [];

  for (const id of used) {
    const canon = canonicalSymbolId(id);
    const libSym = resolveLibSymbol(libSvg, id);
    if (!libSym) {
      if (!resolveSheetSymbol(svg, id)) missing.push(canon);
      continue;
    }
    const topLevel = [...defs.children].find(
      (n) => n.tagName?.toLowerCase() === "g" && (n.id === canon || n.id === id)
    );
    if (topLevel) topLevel.remove();
    const clone = useColorAwareClone(libSym);
    clone.id = canon;
    defs.appendChild(clone);
    updated.push(canon);
  }

  if (libSvg) {
    const srcStyle = libSvg.querySelector("defs style");
    const st = [...defs.children].find((n) => n.tagName?.toLowerCase() === "style");
    if (srcStyle) {
      const styleClone = useColorAwareClone(srcStyle);
      if (st) st.replaceWith(styleClone);
      else defs.insertBefore(styleClone, defs.firstChild);
    } else if (st) {
      st.replaceWith(useColorAwareClone(st));
    }
  }

  return { ok: true, updated, missing };
}
