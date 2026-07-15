/** Wnioskowanie nazwy symbolu wyłącznie z danych pliku — bez katalogu przykładowych nazw. */

import { SYMBOL_NAME_ATTR, symbolDisplayName, symbolDesignation } from "./symbol-save.js";

export function looksLikeReadableSymbolId(id) {
  const s = String(id || "").trim();
  if (s.length < 3) return false;
  if (/^[A-Z]{2,}$/.test(s)) return true;
  if (/^[A-Za-z][A-Za-z0-9_-]*[a-z]/.test(s)) return true;
  if (s.includes("-") || s.includes("_")) return true;
  return false;
}

export function humanizeSymbolId(id) {
  return String(id || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferSymbolDisplayName(node, id = "") {
  const explicit = symbolDisplayName(node);
  if (explicit) return explicit;

  const fromTitle = (node?.querySelector?.("title")?.textContent || "").trim();
  if (fromTitle) return fromTitle;

  const fromDesc = (node?.getAttribute?.("desc") || node?.getAttribute?.("data-desc") || "").trim();
  if (fromDesc) return fromDesc;

  const key = id || node?.id || "";
  if (looksLikeReadableSymbolId(key)) return humanizeSymbolId(key);
  return "";
}

export function symbolEffectiveDisplayName(node, id = "") {
  return inferSymbolDisplayName(node, id);
}

export function symbolListSubtitle(node, id = "") {
  const name = symbolEffectiveDisplayName(node, id);
  const ozn = symbolDesignation(node, id);
  if (!name || !ozn || ozn === name) return "";
  return ozn;
}
