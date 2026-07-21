/**
 * Podświetlenie trasy bez mutacji stroke/fill elementu (overlay + odczyt authored).
 */
import { isWireGeometry, wireConnId, findWireByConnId } from "./wire-geometry.js";

const SVGNS = "http://www.w3.org/2000/svg";
const HL_ROLE = "wire-hl";

/** Grubość zapisana na elemencie (nie computed / nie highlight CSS). */
export function authoredStrokeWidth(el, fallback = null) {
  if (!el) return fallback;
  const inline = parseFloat(el.style?.strokeWidth);
  if (!isNaN(inline) && inline > 0) return inline;
  const attr = parseFloat(el.getAttribute?.("stroke-width"));
  if (!isNaN(attr) && attr > 0) return attr;
  return fallback;
}

/** Kolor obrysu zapisany inline / atrybutem (nie computed highlight). */
export function authoredStrokeColor(el) {
  if (!el) return null;
  const inline = (el.style?.stroke || "").trim();
  if (inline && inline !== "none") return inline;
  const attr = (el.getAttribute?.("stroke") || "").trim();
  if (attr && attr !== "none") return attr;
  return null;
}

/**
 * Klon geometrii trasy jako overlay (nie mutuje wire).
 * @returns {Element|null}
 */
export function createWireStrokeOverlay(wireEl, opts = {}) {
  if (!isWireGeometry(wireEl)) return null;
  const fmt = typeof opts.fmt === "function" ? opts.fmt : String;
  const ns = opts.SVGNS || SVGNS;
  const active = !!opts.active;
  const tag = wireEl.tagName.toLowerCase();
  const hl = document.createElementNS(ns, tag === "line" || tag === "polyline" ? tag : "polyline");
  hl.setAttribute("data-role", HL_ROLE);
  if (wireConnId(wireEl)) hl.setAttribute("data-conn-id", wireConnId(wireEl));
  if (tag === "line") {
    ["x1", "y1", "x2", "y2"].forEach((a) => {
      const v = wireEl.getAttribute(a);
      if (v != null) hl.setAttribute(a, v);
    });
  } else {
    const pts = wireEl.getAttribute("points");
    if (pts) hl.setAttribute("points", pts);
  }
  const sw = authoredStrokeWidth(wireEl, 1.6) || 1.6;
  hl.setAttribute("fill", "none");
  hl.setAttribute("stroke", opts.stroke || "#2563eb");
  hl.setAttribute("stroke-width", fmt(sw + (active ? 3.2 : 2.2)));
  hl.setAttribute("stroke-opacity", active ? "0.45" : "0.28");
  hl.setAttribute("stroke-linecap", "round");
  hl.setAttribute("stroke-linejoin", "round");
  hl.setAttribute("vector-effect", "non-scaling-stroke");
  hl.style.pointerEvents = "none";
  return hl;
}

export function appendWireStrokeOverlay(selLayer, wireEl, opts = {}) {
  if (!selLayer) return null;
  const hl = createWireStrokeOverlay(wireEl, opts);
  if (hl) selLayer.appendChild(hl);
  return hl;
}

export function clearWireStrokeOverlays(selLayer) {
  if (!selLayer) return;
  [...selLayer.querySelectorAll(`[data-role="${HL_ROLE}"]`)].forEach((el) => el.remove());
}

/** Usuń legacy klasę .conn-route-hl (nie zmienia już wyglądu). */
export function stripLegacyConnRouteHl(root) {
  if (!root) return;
  root.querySelectorAll(".conn-route-hl").forEach((el) => el.classList.remove("conn-route-hl"));
}

/**
 * Znajdź trasę po id; czyści legacy highlight class (bez mutacji stroke).
 * @returns {Element|null}
 */
export function highlightWireByConnId(root, connId) {
  stripLegacyConnRouteHl(root);
  if (!root || !connId) return null;
  return findWireByConnId(root, connId);
}

export function clearWireConnHighlight(root) {
  stripLegacyConnRouteHl(root);
}
