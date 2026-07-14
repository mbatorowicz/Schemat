/** Trwałość projektu — IndexedDB + localStorage. Dysk ma pierwszeństwo przed cache. */

const DB_NAME = "edytor";
const STORE = "kv";

export function idbSet(key, value) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

export function idbGet(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, "readonly");
      const get = tx.objectStore(STORE).get(key);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function readJsonCache(idbKey, lsKey) {
  try {
    const fromIdb = await idbGet(idbKey);
    if (fromIdb) return fromIdb;
  } catch {
    /* offline fallback */
  }
  try {
    const raw = localStorage.getItem(lsKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJsonCache(idbKey, lsKey, value) {
  try {
    localStorage.setItem(lsKey, JSON.stringify(value));
  } catch {
    /* quota */
  }
  idbSet(idbKey, value).catch(() => {});
}

export async function restoreLibrarySnapshot() {
  return readJsonCache("libDoc", "edytor.lib");
}

export async function restoreProjectSnapshot() {
  return readJsonCache("project", "edytor.project");
}

export async function restorePrefsSnapshot() {
  return readJsonCache("prefs", "edytor.prefs");
}

export async function restoreSettingsSnapshot() {
  return readJsonCache("settings", "edytor.settings");
}

/** Usuwa cache edytora (gdy pliki na dysku są źródłem prawdy). */
export async function clearEditorCache() {
  const keys = ["libDoc", "project", "prefs"];
  for (const key of keys) {
    try {
      await idbSet(key, null);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem("edytor.lib");
    localStorage.removeItem("edytor.project");
  } catch {
    /* ignore */
  }
}
