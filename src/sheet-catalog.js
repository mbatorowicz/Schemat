/** SSOT — nazwa wyświetlana schematu (lista, breadcrumb, nagłówek) vs nazwa pliku .svg. */

import { sheetBasename } from "./project-files.js";
import { qsById } from "./dom-selectors.js";
import { status as Wstatus } from "./ui-wording.js";

export const SHEET_TITLE_ATTR = "data-sheet-title";

export function sheetGroupNode(sheet) {
  if (!sheet?.svg || !sheet.id) return null;
  return qsById(sheet.svg, sheet.id);
}

export function sheetTitleFromChrome(sheet) {
  const node = sheetGroupNode(sheet);
  if (!node) return "";
  const ttl = node.querySelector("text.ttl, text[class~='ttl']");
  return (ttl?.textContent || "").trim();
}

/** Nazwa czytelna: atrybut → tytuł w ramce (.ttl) → nazwa pliku bez .svg */
export function sheetDisplayTitle(sheet) {
  const node = sheetGroupNode(sheet);
  const fromAttr = (node?.getAttribute(SHEET_TITLE_ATTR) || "").trim();
  if (fromAttr) return fromAttr;
  const fromTtl = sheetTitleFromChrome(sheet);
  if (fromTtl) return fromTtl;
  return sheetBasename(sheet?.name || "");
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

function findOrCreateTitleText(node, doc) {
  let ttl = node.querySelector("text.ttl, text[class~='ttl']");
  if (ttl) return ttl;
  ttl = doc.createElementNS("http://www.w3.org/2000/svg", "text");
  ttl.setAttribute("class", "ttl");
  ttl.setAttribute("data-sheet-chrome", "1");
  ttl.setAttribute("x", "34");
  ttl.setAttribute("y", "52");
  const fr = node.querySelector("rect.fr2, rect.fr");
  if (fr?.nextSibling) node.insertBefore(ttl, fr.nextSibling);
  else node.insertBefore(ttl, node.firstChild);
  return ttl;
}

/** Zapisuje nazwę wyświetlaną w SVG (atrybut + tekst w ramce). */
export function applySheetDisplayTitle(sheet, title) {
  const t = String(title || "").trim();
  if (!isValidSheetDisplayTitle(t)) {
    return { ok: false, message: Wstatus.sheetTitleInvalid };
  }
  const node = sheetGroupNode(sheet);
  if (!node) return { ok: false, message: Wstatus.sheetTitleMissingNode };

  const prev = sheetDisplayTitle(sheet);
  node.setAttribute(SHEET_TITLE_ATTR, t);
  const ttl = findOrCreateTitleText(node, sheet.svg.ownerDocument || document);
  ttl.textContent = t;

  const tbDoc = [...node.querySelectorAll("text.tb")].find(
    (el) => (el.textContent || "").trim() === prev || !(el.textContent || "").trim()
  );
  if (tbDoc) tbDoc.textContent = t;

  if (sheet) sheet.dirty = true;
  return { ok: true, title: t, prev, message: Wstatus.sheetTitleSaved(t) };
}

/** Uzupełnia data-sheet-title z istniejącego .ttl (migracja starych plików). */
export function migrateSheetDisplayTitle(sheet) {
  const node = sheetGroupNode(sheet);
  if (!node) return false;
  const attr = (node.getAttribute(SHEET_TITLE_ATTR) || "").trim();
  const ttl = sheetTitleFromChrome(sheet);
  if (attr) {
    if (ttl && ttl !== attr) {
      const t = findOrCreateTitleText(node, sheet.svg.ownerDocument || document);
      t.textContent = attr;
      return true;
    }
    return false;
  }
  if (!ttl) return false;
  node.setAttribute(SHEET_TITLE_ATTR, ttl);
  return true;
}
