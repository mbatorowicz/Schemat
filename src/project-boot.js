/** Komunikaty i decyzje bootu UI (wydzielone z main.js). */

export const BOOT_LOADING_STATUS = "Wczytywanie\u2026";

/**
 * Blokada toolbar + stage na czas bootu (`body.is-booting`).
 * @returns {{ locked: boolean }}
 */
export function setBootLock(on, { body = typeof document !== "undefined" ? document.body : null, statusEl } = {}) {
  if (!body?.classList) return { locked: false };
  body.classList.toggle("is-booting", !!on);
  if (on && statusEl) statusEl.textContent = BOOT_LOADING_STATUS;
  return { locked: !!on };
}

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
