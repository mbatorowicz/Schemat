/** Decyzje boot/reload — czysta logika bez DOM (testowalna regresja persystencji). */

import { findSheetByKey, sheetKey } from "./sheet-persistence.js";

/** Im wyższy wynik, tym pełniejszy snapshot projektu. */
export function projectCacheScore(snap) {
  if (!snap) return 0;
  const sheets = snap.sheets?.length ?? 0;
  const chars = snap.sheets?.reduce((n, sh) => n + String(sh.text || "").length, 0) ?? 0;
  return sheets * 1_000_000_000 + chars + (snap.savedAt ?? 0);
}

/** Im wyższy wynik, tym pełniejsza biblioteka w cache. */
export function libraryCacheScore(snap) {
  if (!snap) return 0;
  return String(snap.text || "").length + (snap.savedAt ?? 0);
}

/** Kiedy po starcie wczytać bibliotekę / arkusze z cache zamiast polegać wyłącznie na dysku. */
export function resolveBootCachePlan({ loadedFromDisk, sheetCount, hasLibrary = true }) {
  return {
    needCacheSheets: sheetCount === 0,
    needCacheLib: !loadedFromDisk || !hasLibrary,
  };
}

/**
 * Nie nadpisuj cache pustym ani słabszym snapshotem (np. po nieudanym odczycie dysku przy F5).
 */
export function shouldWriteProjectCache(newSnap, existingSnap) {
  const newScore = projectCacheScore(newSnap);
  const oldScore = projectCacheScore(existingSnap);
  if (newScore === 0 && oldScore > 0) return false;
  return newScore >= oldScore;
}

export function shouldWriteLibraryCache(newSnap, existingSnap, scoreFloor = 0) {
  const newScore = libraryCacheScore(newSnap);
  const oldScore = Math.max(libraryCacheScore(existingSnap), scoreFloor);
  if (newScore === 0 && oldScore === 0) return true;
  if (newScore === 0 && oldScore > 0) return false;
  return newScore >= oldScore;
}

/**
 * Wynik przeładowania arkuszy z dysku.
 * @returns {{ sheets: unknown[], count: number, action: "use-disk"|"keep-prev"|"empty" }}
 */
export function resolveReloadSheetsOutcome({ diskSheets, prevSheets, keepExistingOnEmpty }) {
  if (diskSheets.length > 0) {
    return { sheets: diskSheets, count: diskSheets.length, action: "use-disk" };
  }
  if (keepExistingOnEmpty && prevSheets.length > 0) {
    return { sheets: prevSheets, count: prevSheets.length, action: "keep-prev" };
  }
  return { sheets: [], count: 0, action: "empty" };
}

/**
 * Co otworzyć po boocie: ostatni schemat (sheetKey), potem symbol z selId, potem pierwszy arkusz.
 * `sch-*` id bywa wspólne dla wielu arkuszy — dlatego sheetKey (relPath/name) ma pierwszeństwo.
 * @returns {{ kind: "sheet"|"symbol"|"none", sheet?: object, symbolId?: string }}
 */
export function resolveBootActiveTarget({
  sheets = [],
  symbols = [],
  prefs = null,
  projectSheetKey = null,
  projectActiveId = null,
} = {}) {
  const sheetFromKey = findSheetByKey(sheets, prefs?.sheetKey) || findSheetByKey(sheets, projectSheetKey);
  if (sheetFromKey) return { kind: "sheet", sheet: sheetFromKey };

  const want = prefs?.selId || null;
  if (want && symbols.some((s) => s.id === want)) {
    return { kind: "symbol", symbolId: want };
  }
  const sheetFromSel = findSheetByKey(sheets, want) || findSheetByKey(sheets, projectActiveId);
  if (sheetFromSel) return { kind: "sheet", sheet: sheetFromSel };

  if (sheets[0]) return { kind: "sheet", sheet: sheets[0] };
  if (symbols[0]) return { kind: "symbol", symbolId: symbols[0].id };
  return { kind: "none" };
}

/** Klucz ostatniego arkusza do preferencji (aktywny arkusz albo lastSheet). */
export function prefsSheetKey({ active, lib, lastSheet } = {}) {
  if (active && active !== lib) return sheetKey(active) || null;
  if (lastSheet) return sheetKey(lastSheet) || null;
  return null;
}
