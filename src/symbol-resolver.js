/**
 * Rozwiązywanie symboli: biblioteka E-00 jest źródłem prawdy.
 * Osadzone <defs> w arkuszu — tylko fallback offline.
 */
import { canonicalSymbolId } from "./symbol-aliases.js";
import { qsById } from "./dom-selectors.js";

const XLINK = "http://www.w3.org/1999/xlink";

export function libSymbolGroups(svg) {
  const defs = svg?.querySelector("defs");
  if (!defs) return [];
  return [...defs.children].filter((n) => n.tagName?.toLowerCase() === "g" && n.id);
}

export function resolveLibSymbol(libSvg, id) {
  if (!libSvg || !id) return null;
  const canon = canonicalSymbolId(id);
  return (
    libSymbolGroups(libSvg).find((g) => g.id === canon || g.id === id) || null
  );
}

export function resolveSheetSymbol(sheetSvg, id) {
  if (!sheetSvg || !id) return null;
  const defs = sheetSvg.querySelector("defs");
  if (!defs) return null;
  const canon = canonicalSymbolId(id);
  return (
    [...defs.children].find(
      (n) =>
        n.tagName?.toLowerCase() === "g" &&
        n.id &&
        (n.id === canon || n.id === id)
    ) || null
  );
}

export function resolveSymbol(libSvg, sheetSvg, id) {
  return resolveLibSymbol(libSvg, id) || resolveSheetSymbol(sheetSvg, id);
}

export function libSymbolIds(libSvg) {
  return new Set(libSymbolGroups(libSvg).map((g) => g.id));
}

/** Usuwa z arkusza osadzone definicje symboli obecne w bibliotece (stare kopie nie psują renderu). */
export function stripSheetEmbeddedSymbols(sheetSvg, libSvg) {
  if (!sheetSvg || !libSvg) return false;
  const defs = sheetSvg.querySelector("defs");
  if (!defs) return false;
  const libIds = libSymbolIds(libSvg);
  let changed = false;
  [...defs.querySelectorAll("g[id]")].forEach((g) => {
    const id = g.id;
    const canon = canonicalSymbolId(id);
    if (libIds.has(id) || libIds.has(canon)) {
      g.remove();
      changed = true;
    }
  });
  return changed;
}

export function syncUseSymbolHrefs(root) {
  if (!root) return false;
  let changed = false;
  root.querySelectorAll("use").forEach((use) => {
    const raw = (use.getAttribute("href") || use.getAttributeNS(XLINK, "href") || "").replace(/^#/, "");
    if (!raw) return;
    const canon = canonicalSymbolId(raw);
    if (canon !== raw) {
      use.setAttribute("href", "#" + canon);
      use.setAttributeNS(XLINK, "xlink:href", "#" + canon);
      changed = true;
    }
    if (use.getAttribute("data-sym") !== canon) {
      use.setAttribute("data-sym", canon);
      changed = true;
    }
  });
  return changed;
}

export function collectUsedSymbolIds(rootNode, libSvg, sheetSvg) {
  const used = new Set();
  const visit = (node) => {
    node.querySelectorAll("use").forEach((u) => {
      const href = (u.getAttribute("href") || u.getAttributeNS(XLINK, "href") || "").replace(/^#/, "");
      const id = canonicalSymbolId(href);
      if (id && !used.has(id)) {
        used.add(id);
        const sym = resolveSymbol(libSvg, sheetSvg, id);
        if (sym) visit(sym);
      }
    });
  };
  if (rootNode) visit(rootNode);
  return used;
}

export function libraryCoversSymbols(libSvg, ids) {
  if (!libSvg) return false;
  return [...ids].every((id) => !!resolveLibSymbol(libSvg, id));
}
