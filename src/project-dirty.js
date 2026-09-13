/** Jedna mapa dirty: arkusze + biblioteka + ustawienia (spis). */

import { countDirtySheets, markSheetDirty } from "./sheet-persistence.js";

let settingsDirty = false;

export function markLibDirty(lib) {
  if (lib) lib.dirty = true;
}

export function clearLibDirty(lib) {
  if (lib) lib.dirty = false;
}

/** Edycja aktywnego celu: arkusz albo biblioteka (E-00). */
export function markActiveTargetDirty(state) {
  if (!state?.active) return;
  if (state.active === state.lib) markLibDirty(state.lib);
  else markSheetDirty(state.active);
}

export function markSettingsDirty() {
  settingsDirty = true;
}

export function clearSettingsDirty() {
  settingsDirty = false;
}

export function isSettingsDirty() {
  return settingsDirty;
}

/**
 * @param {{ sheets?: unknown[], lib?: { dirty?: boolean } }|null|undefined} state
 * @returns {{ sheetsDirty: number, libDirty: boolean, settingsDirty: boolean }}
 */
export function getDirtyMap(state) {
  return {
    sheetsDirty: countDirtySheets(state?.sheets),
    libDirty: !!state?.lib?.dirty,
    settingsDirty,
  };
}

/** Arkusze + 1 za lib + 1 za ustawienia (spis). */
export function countDirtyAll(state) {
  const map = getDirtyMap(state);
  return map.sheetsDirty + (map.libDirty ? 1 : 0) + (map.settingsDirty ? 1 : 0);
}
