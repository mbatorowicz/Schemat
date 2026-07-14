/**
 * SSOT symboli: href, rozwiązywanie definicji, audyt, migracja href.
 * Wszystkie moduły (render, zapis, netlista, snap) korzystają wyłącznie stąd.
 */
import { canonicalSymbolId, canonicalInstanceRef } from "./symbol-aliases.js";
import {
  libSymbolGroups,
  resolveLibSymbol,
  resolveSheetSymbol,
  resolveSymbol,
  libSymbolIds,
  stripSheetEmbeddedSymbols,
  collectUsedSymbolIds,
  libraryCoversSymbols,
} from "./symbol-resolver.js";

export {
  libSymbolGroups,
  resolveLibSymbol,
  resolveSheetSymbol,
  resolveSymbol,
  libSymbolIds,
  stripSheetEmbeddedSymbols,
  collectUsedSymbolIds,
  libraryCoversSymbols,
};

export const XLINK_NS = "http://www.w3.org/1999/xlink";

export function parseUseHref(useEl, xlinkNs = XLINK_NS) {
  if (!useEl) return "";
  return (useEl.getAttribute("href") || useEl.getAttributeNS(xlinkNs, "href") || "").replace(/^#/, "");
}

export function setUseHref(useEl, id, xlinkNs = XLINK_NS) {
  const canon = canonicalSymbolId(id);
  useEl.setAttribute("href", "#" + canon);
  useEl.setAttributeNS(xlinkNs, "xlink:href", "#" + canon);
  useEl.setAttribute("data-sym", canon);
}

export function resolveSymbolDef(libSvg, sheetSvg, id) {
  if (!id) return null;
  return resolveSymbol(libSvg, sheetSvg, id);
}

export function definitionForUseElement(useEl, libSvg, sheetSvg, xlinkNs = XLINK_NS) {
  if (!useEl) return null;
  const href = parseUseHref(useEl, xlinkNs);
  const symId = useEl.getAttribute("data-sym") || href;
  return resolveSymbolDef(libSvg, sheetSvg, symId || href);
}

export function syncUseSymbolHrefs(root, xlinkNs = XLINK_NS) {
  if (!root) return false;
  let changed = false;
  root.querySelectorAll("use").forEach((use) => {
    const raw = parseUseHref(use, xlinkNs);
    if (!raw) return;
    const canon = canonicalSymbolId(raw);
    if (canon !== raw) {
      use.setAttribute("href", "#" + canon);
      use.setAttributeNS(xlinkNs, "xlink:href", "#" + canon);
      changed = true;
    }
    if (use.getAttribute("data-sym") !== canon) {
      use.setAttribute("data-sym", canon);
      changed = true;
    }
  });
  return changed;
}

export function auditSymbolsOnSheet(sheetNode, libSvg, sheetSvg, xlinkNs = XLINK_NS) {
  const missing = [];
  if (!sheetNode) return { missing, ok: true };
  sheetNode.querySelectorAll("use").forEach((u) => {
    const id = canonicalSymbolId(parseUseHref(u, xlinkNs));
    if (!id) return;
    if (!resolveSymbolDef(libSvg, sheetSvg, id)) missing.push(id);
  });
  const uniq = [...new Set(missing)];
  return { missing: uniq, ok: uniq.length === 0 };
}

export function migrateInstanceRefsOnRoot(root, xlinkNs = XLINK_NS) {
  let changed = false;
  if (!root) return false;
  if (syncUseSymbolHrefs(root, xlinkNs)) changed = true;
  root.querySelectorAll("use").forEach((use) => {
    const sym = parseUseHref(use, xlinkNs);
    let ref = use.getAttribute("data-ref");
    const nr = ref && canonicalInstanceRef(ref);
    if (ref && nr !== ref) {
      use.setAttribute("data-ref", nr);
      changed = true;
    } else if (!ref && sym === "WD") {
      use.setAttribute("data-ref", "WD1");
      changed = true;
    }
  });
  root.querySelectorAll("text[data-owner-ref]").forEach((t) => {
    const r = t.getAttribute("data-owner-ref");
    const nr = canonicalInstanceRef(r);
    if (nr === r) return;
    t.setAttribute("data-owner-ref", nr);
    const txt = (t.textContent || "").trim();
    if (!txt || txt === "-" + r || txt === r) t.textContent = "-" + nr;
    changed = true;
  });
  root.querySelectorAll('[data-role="conn"][data-ref]').forEach((c) => {
    const r = c.getAttribute("data-ref");
    const nr = canonicalInstanceRef(r);
    if (nr !== r) {
      c.setAttribute("data-ref", nr);
      changed = true;
    }
  });
  return changed;
}
