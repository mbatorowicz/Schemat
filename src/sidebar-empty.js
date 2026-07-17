/** Empty states list sidebara. */

import { emptyListCopy, W } from "./ui-wording.js";

/**
 * @param {{
 *   schEmpty: HTMLElement|null,
 *   symEmpty: HTMLElement|null,
 *   elemEmpty: HTMLElement|null,
 *   sheetCount: number,
 *   symbolCount: number,
 *   elementCount: number,
 *   sheetActive: boolean,
 * }} p
 */
export function syncSidebarEmptyStates(p) {
  const { schEmpty, symEmpty, elemEmpty, sheetCount, symbolCount, elementCount, sheetActive } = p;
  if (schEmpty) {
    schEmpty.hidden = sheetCount > 0;
    const copy = schEmpty.querySelector("div");
    if (copy) copy.textContent = emptyListCopy("sheets");
    const cta = schEmpty.querySelector(".btn-text");
    if (cta) cta.textContent = W.empty.openProjectCta;
  }
  if (symEmpty) {
    symEmpty.hidden = symbolCount > 0;
    if (!symEmpty.querySelector("button")) symEmpty.textContent = emptyListCopy("symbols");
  }
  if (elemEmpty) {
    if (!sheetActive) {
      elemEmpty.hidden = true;
      elemEmpty.classList.add("context-hidden");
    } else {
      elemEmpty.classList.remove("context-hidden");
      elemEmpty.hidden = elementCount > 0;
      elemEmpty.textContent = emptyListCopy("elements");
    }
  }
}
