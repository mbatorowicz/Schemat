import { writeJsonCache } from "./persistence.js";
import { shouldWriteLibraryCache, shouldWriteProjectCache } from "./boot-cache.js";
import { readLocalJson, reportRecoverableError } from "./recoverable-error.js";
import { status } from "./ui-wording.js";

const QUOTA_TOAST = { toast: true, tone: "warning" };

/**
 * LS + IDB — ciało persistCache. Błąd odczytu/zapisu cache: console.warn + toast.
 * Nie zapisuje na dysk.
 */
export function persistEditorCache({
  noSave = false,
  projectSnapshot,
  lib = null,
  libSnapshot = () => null,
  syncLibStyles,
  cacheGenerationFloor = 0,
  libCacheScoreFloor = 0,
  setStatus,
  storage = globalThis.localStorage,
  writeProjectCache = (snap) => writeJsonCache("project", "edytor.project", snap),
  writeLibCache = (snap) => writeJsonCache("libDoc", "edytor.lib", snap),
} = {}) {
  if (noSave) return { quotaFail: false };
  let quotaFail = false;
  try {
    const snap = projectSnapshot();
    const existing = readLocalJson("edytor.project", status.cacheProjectUnreadable, setStatus, storage);
    if (shouldWriteProjectCache(snap, existing, cacheGenerationFloor)) {
      const w = writeProjectCache(snap);
      if (w && w.ok === false) quotaFail = true;
    }
  } catch (e) {
    reportRecoverableError(e, status.cacheProjectFailed, setStatus);
  }
  if (lib?.svg) {
    if (syncLibStyles) syncLibStyles(lib.svg);
    const s = libSnapshot();
    if (s) {
      const existing = readLocalJson("edytor.lib", status.cacheLibraryUnreadable, setStatus, storage);
      if (shouldWriteLibraryCache(s, existing, libCacheScoreFloor)) {
        const w = writeLibCache(s);
        if (w && w.ok === false) quotaFail = true;
      }
    }
  }
  if (quotaFail && typeof setStatus === "function") {
    setStatus(status.cacheQuota, QUOTA_TOAST);
  }
  return { quotaFail };
}
