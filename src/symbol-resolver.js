/**
 * Rozwiązywanie symboli: biblioteka E-00 jest źródłem prawdy.
 * Osadzone <defs> w arkuszu — tylko fallback offline.
 */
import { canonicalSymbolId, parseSymbolIdAliases } from "./symbol-aliases.js";
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
  const groups = libSymbolGroups(libSvg);
  const direct = groups.find((g) => g.id === canon || g.id === id);
  if (direct) return direct;
  return (
    groups.find((g) => {
      const aliases = parseSymbolIdAliases(g);
      return aliases.includes(id) || aliases.includes(canon);
    }) || null
  );
}

/** Aktualne id w bibliotece dla surowego id / aliasu, albo null gdy brak definicji. */
export function resolveLibSymbolId(libSvg, id) {
  const node = resolveLibSymbol(libSvg, id);
  return node?.id || null;
}

export function resolveSheetSymbol(sheetSvg, id) {
  if (!sheetSvg || !id) return null;
  const defs = sheetSvg.querySelector("defs");
  if (!defs) return null;
  const canon = canonicalSymbolId(id);
  return (
    [...defs.children].find((n) => n.tagName?.toLowerCase() === "g" && n.id && (n.id === canon || n.id === id)) || null
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
