/** Wnioskowanie czytelnej nazwy symbolu, gdy brak data-symbol-name (legacy biblioteki). */

import { SYMBOL_NAME_ATTR, symbolDisplayName, symbolDesignation } from "./symbol-save.js";

/** Opcjonalne domyślne nazwy dla krótkich oznaczeń technicznych. */
export const SYMBOL_DEFAULT_NAMES = {
  B: "Mostek / prostownik",
  A: "Stycznik",
  CO: "Stycznik pomocniczy",
  CO2: "Stycznik pomocniczy (2)",
  SK: "Przekaźnik bezpieczeństwa",
  SB: "Przycisk bezpieczeństwa",
  WD: "Przyłącze",
  DRV: "Sterownik",
  CYL: "Siłownik",
  MOTOR: "Silnik",
  M: "Silnik",
  R: "Przekaźnik",
  Y: "Cewka",
  X: "Złącze",
};

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
  if (SYMBOL_DEFAULT_NAMES[key]) return SYMBOL_DEFAULT_NAMES[key];

  if (looksLikeReadableSymbolId(key)) return humanizeSymbolId(key);
  return "";
}

/** Nazwa do list / breadcrumb — zawsze preferuj czytelną nazwę nad samym oznaczeniem. */
export function symbolEffectiveDisplayName(node, id = "") {
  return inferSymbolDisplayName(node, id);
}

/** Druga linia listy — oznaczenie techniczne, gdy główna linia to nazwa. */
export function symbolListSubtitle(node, id = "") {
  const name = symbolEffectiveDisplayName(node, id);
  const ozn = symbolDesignation(node, id);
  if (!name || !ozn || ozn === name) return "";
  return ozn;
}
