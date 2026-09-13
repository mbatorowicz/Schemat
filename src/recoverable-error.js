/** Puste catch → widoczny warn + toast. Nie połykaj błędów bez śladu. */

export const WARN_TOAST = { toast: true, tone: "warning" };

export function reportRecoverableError(err, message, setStatus, warn = console.warn) {
  warn(err);
  if (typeof setStatus === "function" && message) {
    setStatus(message, WARN_TOAST);
  }
}

/** JSON z localStorage; zły zapis → warn + toast, zwraca null. */
export function readLocalJson(key, message, setStatus, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    reportRecoverableError(e, message, setStatus);
    return null;
  }
}
