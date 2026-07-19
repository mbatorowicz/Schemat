/** Komunikaty i decyzje bootu UI (wydzielone z main.js). */

/**
 * @param {{
 *   loadedFromDisk: boolean,
 *   sheetCount: number,
 *   libraryLabel: string,
 *   restoredFromCache: boolean,
 *   dirHint?: string|null,
 *   hasDir: boolean,
 * }} p
 */
export function resolveBootStatusMessage(p) {
  if (p.loadedFromDisk) {
    return {
      message: "Wczytano z dysku: " + p.sheetCount + " schemat(ów), biblioteka " + (p.libraryLabel || "?") + ".",
      toast: false,
      tone: "info",
    };
  }
  if (p.restoredFromCache) {
    return {
      message:
        "Przywrócono z cache (" +
        p.sheetCount +
        " schemat(ów)" +
        (p.dirHint ? ", projekt: " + p.dirHint : "") +
        ")." +
        (p.hasDir
          ? " Użyj badge „Przywróć dostęp”, jeśli zapis nie działa."
          : " Zapisz projekt na dysk, aby utrwalić zmiany."),
      toast: true,
      tone: "warning",
    };
  }
  return {
    message: "Brak projektu — użyj Otwórz albo CTA w panelu schematów.",
    toast: true,
    tone: "info",
  };
}
