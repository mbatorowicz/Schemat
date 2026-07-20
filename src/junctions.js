/**
 * Punkty rozgałęzienia ukośnego (J*) — topologia bez widocznej kropki.
 * <circle data-role="junction" data-kind="oblique" data-ref="J1" r="0">
 */
import { normalizeRef } from "./netlist-model.js";

export function isJunction(el) {
  return !!(el && el.getAttribute && el.getAttribute("data-role") === "junction");
}

export function junctionCenter(el) {
  if (!el) return null;
  return {
    x: parseFloat(el.getAttribute("cx")) || 0,
    y: parseFloat(el.getAttribute("cy")) || 0,
  };
}

export function listJunctions(sheetNode) {
  if (!sheetNode) return [];
  return [...sheetNode.querySelectorAll('[data-role="junction"]')];
}

export function findJunctionByRef(sheetNode, ref) {
  const r = normalizeRef(ref);
  if (!r || !sheetNode) return null;
  return listJunctions(sheetNode).find((el) => normalizeRef(el.getAttribute("data-ref")) === r) || null;
}

export function usedJunctionRefs(sheetNode) {
  const used = new Set();
  listJunctions(sheetNode).forEach((el) => {
    const r = normalizeRef(el.getAttribute("data-ref"));
    if (r) used.add(r);
  });
  return used;
}

export function ensureJunctionRef(el, sheetNode) {
  if (!isJunction(el)) return "";
  let ref = normalizeRef(el.getAttribute("data-ref"));
  if (ref) return ref;
  const used = usedJunctionRefs(sheetNode || el.parentNode);
  let n = 1;
  while (used.has("J" + n)) n++;
  ref = "J" + n;
  el.setAttribute("data-ref", ref);
  return ref;
}

export function ensureAllJunctionRefs(sheetNode) {
  listJunctions(sheetNode).forEach((el) => ensureJunctionRef(el, sheetNode));
}

/** Niewidoczny marker rozgałęzienia. */
export function createJunctionEl(mkEl, x, y, sheetNode) {
  const el = mkEl("circle", {
    cx: x,
    cy: y,
    r: 0,
    class: "junction",
    "data-role": "junction",
    "data-kind": "oblique",
  });
  el.style.fill = "none";
  el.style.stroke = "none";
  el.style.pointerEvents = "none";
  ensureJunctionRef(el, sheetNode);
  return el;
}

export function junctionSnapCandidate(el, sheetNode) {
  if (!isJunction(el)) return null;
  const ref = ensureJunctionRef(el, sheetNode);
  const c = junctionCenter(el);
  if (!c) return null;
  return {
    x: c.x,
    y: c.y,
    dir: "E",
    ref,
    pin: "",
    element: el,
    kind: "junction",
  };
}

export function collectJunctionSnapCandidates(sheetNode) {
  return listJunctions(sheetNode)
    .map((el) => junctionSnapCandidate(el, sheetNode))
    .filter(Boolean);
}

export function nearestJunction(sheetNode, x, y, maxDist) {
  let best = null;
  const max = maxDist ?? 9;
  listJunctions(sheetNode).forEach((el) => {
    const c = junctionCenter(el);
    if (!c) return;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d <= max && (!best || d < best.dist)) {
      best = { el, ref: ensureJunctionRef(el, sheetNode), x: c.x, y: c.y, dist: d };
    }
  });
  return best;
}
