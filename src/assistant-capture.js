/**
 * Zrzut wizualny aktywnego widoku schematu (PNG) — bez siatki i uchwytów edycji.
 */

export const CAPTURE_MAX_PX = 1280;
export const STAGE_LAYER_ATTR = "data-stage-layer";

/**
 * Klon `#stage` bez warstw edycji. Nie rasteryzuje.
 * @param {SVGSVGElement|Element|null} stageEl
 * @returns {SVGSVGElement|null}
 */
export function prepareCaptureSvg(stageEl) {
  if (!stageEl?.cloneNode) return null;
  const clone = stageEl.cloneNode(true);
  if (clone.tagName && clone.tagName.toLowerCase() !== "svg") return null;
  clone
    .querySelectorAll(`[${STAGE_LAYER_ATTR}="grid"], [${STAGE_LAYER_ATTR}="sel"], [${STAGE_LAYER_ATTR}="handles"]`)
    .forEach((el) => el.remove());
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const w = stageEl.clientWidth || Number(stageEl.getAttribute("width")) || 800;
  const h = stageEl.clientHeight || Number(stageEl.getAttribute("height")) || 600;
  clone.setAttribute("width", String(Math.round(w)));
  clone.setAttribute("height", String(Math.round(h)));
  return clone;
}

/**
 * @param {SVGSVGElement} svgEl
 * @param {{ maxPx?: number }} [opts]
 * @returns {Promise<string>} data URL PNG
 */
export async function rasterizeSvgElement(svgEl, opts = {}) {
  if (!svgEl) throw new Error("Brak SVG do zrzutu.");
  const maxPx = opts.maxPx || CAPTURE_MAX_PX;
  const xml = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Nie udało się zrasteryzować schematu."));
      img.src = url;
    });
    const nw = img.naturalWidth || Number(svgEl.getAttribute("width")) || 800;
    const nh = img.naturalHeight || Number(svgEl.getAttribute("height")) || 600;
    const scale = Math.min(1, maxPx / Math.max(nw, nh, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(nw * scale));
    canvas.height = Math.max(1, Math.round(nh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Brak canvas 2D.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {SVGSVGElement|Element|null} stageEl
 * @param {{ maxPx?: number }} [opts]
 * @returns {Promise<string|null>}
 */
export async function captureStagePng(stageEl, opts = {}) {
  const clone = prepareCaptureSvg(stageEl);
  if (!clone) return null;
  try {
    return await rasterizeSvgElement(clone, opts);
  } catch {
    return null;
  }
}
