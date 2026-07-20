/**
 * SSOT symboli: href, rozwiązywanie definicji, audyt, migracja href.
 * Wszystkie moduły (render, zapis, netlista, snap) korzystają wyłącznie stąd.
 */
import { canonicalSymbolId, canonicalInstanceRef } from "./symbol-aliases.js";
import {
  libSymbolGroups,
  resolveLibSymbol,
  resolveLibSymbolId,
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
  resolveLibSymbolId,
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

export function setUseHref(useEl, id, xlinkNs = XLINK_NS, libSvg = null) {
  const target = (libSvg && resolveLibSymbolId(libSvg, id)) || canonicalSymbolId(id);
  useEl.setAttribute("href", "#" + target);
  useEl.setAttributeNS(xlinkNs, "xlink:href", "#" + target);
  useEl.setAttribute("data-sym", target);
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

/** Ujednolica href/data-sym do aktualnego id z biblioteki (aliasy + data-id-aliases). */
export function syncUseSymbolHrefs(root, xlinkNs = XLINK_NS, libSvg = null) {
  if (!root) return false;
  let changed = false;
  root.querySelectorAll("use").forEach((use) => {
    const raw = parseUseHref(use, xlinkNs) || (use.getAttribute("data-sym") || "").trim();
    if (!raw) return;
    const target = (libSvg && resolveLibSymbolId(libSvg, raw)) || canonicalSymbolId(raw);
    if (!target) return;
    const href = parseUseHref(use, xlinkNs);
    if (href !== target) {
      use.setAttribute("href", "#" + target);
      use.setAttributeNS(xlinkNs, "xlink:href", "#" + target);
      changed = true;
    }
    if (use.getAttribute("data-sym") !== target) {
      use.setAttribute("data-sym", target);
      changed = true;
    }
  });
  return changed;
}

export function auditSymbolsOnSheet(sheetNode, libSvg, sheetSvg, xlinkNs = XLINK_NS) {
  const missing = [];
  if (!sheetNode) return { missing, ok: true };
  sheetNode.querySelectorAll("use").forEach((u) => {
    const raw = parseUseHref(u, xlinkNs);
    if (!raw) return;
    const id = resolveLibSymbolId(libSvg, raw) || canonicalSymbolId(raw);
    if (!resolveSymbolDef(libSvg, sheetSvg, id)) missing.push(id);
  });
  const uniq = [...new Set(missing)];
  return { missing: uniq, ok: uniq.length === 0 };
}

export function migrateInstanceRefsOnRoot(root, xlinkNs = XLINK_NS, libSvg = null) {
  let changed = false;
  if (!root) return false;
  if (syncUseSymbolHrefs(root, xlinkNs, libSvg)) changed = true;
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
