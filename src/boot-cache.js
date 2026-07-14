/** Decyzje boot/reload — czysta logika bez DOM (testowalna regresja persystencji). */

/** Im wyższy wynik, tym pełniejszy snapshot projektu. */
export function projectCacheScore(snap) {
  if (!snap) return 0;
  const sheets = snap.sheets?.length ?? 0;
  const chars =
    snap.sheets?.reduce((n, sh) => n + String(sh.text || "").length, 0) ?? 0;
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

export function shouldWriteLibraryCache(newSnap, existingSnap) {
  const newScore = libraryCacheScore(newSnap);
  const oldScore = libraryCacheScore(existingSnap);
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
