/** Empty states, liczniki i zwijane panele sidebara. */

import { emptyListCopy, W } from "./ui-wording.js";

export const SIDEBAR_PANEL_KEY = "schemat.sidebar.collapsed";

const SIDEBAR_LABELS = {
  sheets: () => W.sidebar.sheets,
  symbols: () => W.sidebar.symbols,
  elements: () => W.sidebar.elements,
};

function setCount(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n == null ? "" : String(n);
}

function readCollapsed() {
  try {
    return JSON.parse(sessionStorage.getItem(SIDEBAR_PANEL_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeCollapsed(map) {
  try {
    sessionStorage.setItem(SIDEBAR_PANEL_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

function setCollapsed(sec, head, on) {
  sec.classList.toggle("is-collapsed", on);
  if (head) head.setAttribute("aria-expanded", on ? "false" : "true");
}

/**
 * Zwijane sekcje sidebara (klik w nagłówek). Stan w sessionStorage.
 * @param {ParentNode|null} root
 */
export function wireSidebarPanels(root) {
  if (!root) return;
  const collapsed = readCollapsed();
  root.querySelectorAll(".side-sec[data-sec]").forEach((sec) => {
    const id = sec.dataset.sec;
    const head = sec.querySelector(":scope > .side-sec-head");
    if (!head || head.dataset.wired === "1") return;
    head.dataset.wired = "1";
    head.title = W.sidebar.collapseTip;
    const label = head.querySelector(".side-sec-label");
    if (label && id !== "props" && SIDEBAR_LABELS[id]) label.textContent = SIDEBAR_LABELS[id]();
    if (collapsed[id]) setCollapsed(sec, head, true);
    head.addEventListener("click", () => {
      const on = !sec.classList.contains("is-collapsed");
      setCollapsed(sec, head, on);
      collapsed[id] = on;
      writeCollapsed(collapsed);
    });
  });
}

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
  setCount("schCount", sheetCount);
  setCount("symCount", symbolCount);
  setCount("elemCount", sheetActive ? elementCount : null);
}
