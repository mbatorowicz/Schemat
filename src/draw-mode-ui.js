/** SSOT etykiet i banera trybu rysowania (wydzielone z main.js). */

import { W } from "./ui-wording.js";

export const DRAW_LABELS = {
  line: W.draw.line,
  rect: W.draw.rect,
  circle: W.draw.circle,
  arc: W.draw.arc,
  text: W.draw.text,
  point: W.draw.point,
  node: W.draw.node,
  lead: W.draw.lead,
  branch: W.draw.branch,
};

export const DRAW_HINT = { ...W.drawHint };

/**
 * @param {{ drawBannerEl: HTMLElement|null, toolbarEl: HTMLElement|null, getDrawMode: () => string|null, onToolbarSync?: () => void }} deps
 */
export function createDrawBannerSync(deps) {
  const { drawBannerEl, toolbarEl, getDrawMode, onToolbarSync } = deps;
  return function syncDrawBanner() {
    if (!drawBannerEl) return;
    const mode = getDrawMode();
    if (mode) {
      drawBannerEl.textContent =
        "Rysujesz: " + (DRAW_LABELS[mode] || mode) + " — Esc anuluje" + (mode === "line" ? ", Enter kończy" : "");
      drawBannerEl.classList.add("open");
      if (toolbarEl) toolbarEl.classList.add("draw-mode");
    } else {
      drawBannerEl.classList.remove("open");
      drawBannerEl.textContent = "";
      if (toolbarEl) toolbarEl.classList.remove("draw-mode");
    }
    if (typeof onToolbarSync === "function") onToolbarSync();
  };
}
