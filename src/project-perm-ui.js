/** Badge zapisu / przywracanie uprawnień folderu. */

import { resolveSaveBadgeState } from "./save-badge.js";

/**
 * @param {{
 *   getState: () => { dir: unknown, libHandle: unknown, lib?: { dirty?: boolean }, sheets: unknown[] },
 *   countDirtySheets: (sheets: unknown[]) => number,
 *   needsPerm: (h: unknown) => Promise<boolean>,
 *   badgeEl?: HTMLElement|null,
 *   labelEl?: HTMLElement|null,
 * }} deps
 */
export function createSavePermBadge(deps) {
  const { getState, countDirtySheets, needsPerm, badgeEl, labelEl } = deps;
  let lastNeedPerm = false;

  async function computeNeedPerm() {
    const state = getState();
    lastNeedPerm = (await needsPerm(state.dir)) || (await needsPerm(state.libHandle));
    return lastNeedPerm;
  }

  function paint(needPerm) {
    const state = getState();
    const badge = badgeEl || document.getElementById("saveBadge");
    const label = labelEl || document.getElementById("saveBadgeLabel");
    if (!badge) return resolveSaveBadgeState({ dirtyN: 0, needPerm: false, hasDir: false });
    const view = resolveSaveBadgeState({
      dirtyN: countDirtySheets(state.sheets || []),
      needPerm: !!needPerm,
      hasDir: !!state.dir,
      hasLibDirty: !!state.lib?.dirty,
    });
    badge.dataset.kind = view.kind;
    badge.title = view.tip;
    badge.setAttribute("aria-label", view.label + ". " + view.tip);
    if (label) label.textContent = view.label;
    badge.style.cursor = view.actionable ? "pointer" : "default";
    return view;
  }

  async function sync() {
    const need = await computeNeedPerm();
    return paint(need);
  }

  /** Szybkie odświeżenie dirty bez ponownego queryPermission. */
  function syncDirtyOnly() {
    return paint(lastNeedPerm);
  }

  return { sync, syncDirtyOnly, paint, computeNeedPerm };
}
