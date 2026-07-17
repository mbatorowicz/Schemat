/** SSOT — nazwa wyświetlana schematu (lista, breadcrumb) vs nazwa dokumentu w ramce (.ttl). */

import { sheetBasename } from "./project-files.js";
import { qsById } from "./dom-selectors.js";
import { status as Wstatus } from "./ui-wording.js";

export const SHEET_TITLE_ATTR = "data-sheet-title";

export function sheetGroupNode(sheet) {
  if (!sheet?.svg || !sheet.id) return null;
  return qsById(sheet.svg, sheet.id);
}

/** Tytuł dokumentu / projektu w ramce A4 — nie mylić z nazwą arkusza. */
export function sheetTitleFromChrome(sheet) {
  const node = sheetGroupNode(sheet);
  if (!node) return "";
  const ttl = node.querySelector("text.ttl, text[class~='ttl']");
  return (ttl?.textContent || "").trim();
}

/** Czy data-sheet-title wygląda na skopiowany tytuł projektu z .ttl (nie nazwę arkusza). */
export function isSheetTitlePollutedByDoc(sheet) {
  const node = sheetGroupNode(sheet);
  const fromAttr = (node?.getAttribute(SHEET_TITLE_ATTR) || "").trim();
  const fromTtl = sheetTitleFromChrome(sheet);
  const fromFile = sheetBasename(sheet?.name || "");
  return !!(fromAttr && fromTtl && fromAttr === fromTtl && fromFile && fromAttr !== fromFile);
}

/**
 * Nazwa arkusza (lista, breadcrumb, pole „Nazwa schematu”).
 * Źródło: data-sheet-title (gdy nie jest tytułem projektu) → nazwa pliku bez .svg.
 * Nie używa .ttl — to nazwa dokumentu/projektu w ramce.
 */
export function sheetDisplayTitle(sheet) {
  const node = sheetGroupNode(sheet);
  const fromFile = sheetBasename(sheet?.name || "");
  const fromAttr = (node?.getAttribute(SHEET_TITLE_ATTR) || "").trim();
  if (fromAttr && !isSheetTitlePollutedByDoc(sheet)) return fromAttr;
  return fromFile || "Schemat";
}

export function sheetCatalogLabel(sheet) {
  return sheetDisplayTitle(sheet) || sheetBasename(sheet?.name || "") || "Schemat";
}

/** Druga linia listy — plik, gdy różni się od tytułu wyświetlanego. */
export function sheetCatalogSubtitle(sheet) {
  const title = sheetDisplayTitle(sheet);
  const file = sheetBasename(sheet?.name || "");
  if (!file || !title || title === file) return "";
  return file;
}

export function isValidSheetDisplayTitle(v) {
  const s = String(v || "").trim();
  return s.length >= 1 && s.length <= 120;
}

/**
 * Zapisuje nazwę arkusza w data-sheet-title.
 * Nie nadpisuje .ttl (tytuł dokumentu/projektu w ramce).
 */
export function applySheetDisplayTitle(sheet, title) {
  const t = String(title || "").trim();
  if (!isValidSheetDisplayTitle(t)) {
    return { ok: false, message: Wstatus.sheetTitleInvalid };
  }
  const node = sheetGroupNode(sheet);
  if (!node) return { ok: false, message: Wstatus.sheetTitleMissingNode };

  const prev = sheetDisplayTitle(sheet);
  node.setAttribute(SHEET_TITLE_ATTR, t);

  if (sheet) sheet.dirty = true;
  return { ok: true, title: t, prev, message: Wstatus.sheetTitleSaved(t) };
}

/**
 * Migracja: usuń zanieczyszczenie tytułem projektu; ustaw nazwę z pliku gdy brak atrybutu.
 */
export function migrateSheetDisplayTitle(sheet) {
  const node = sheetGroupNode(sheet);
  if (!node) return false;
  const fromFile = sheetBasename(sheet?.name || "");
  if (!fromFile) return false;

  if (isSheetTitlePollutedByDoc(sheet)) {
    node.setAttribute(SHEET_TITLE_ATTR, fromFile);
    return true;
  }

  const attr = (node.getAttribute(SHEET_TITLE_ATTR) || "").trim();
  if (!attr) {
    node.setAttribute(SHEET_TITLE_ATTR, fromFile);
    return true;
  }
  return false;
}
