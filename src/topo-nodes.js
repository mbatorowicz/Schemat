/**
 * Węzły topologii na schemacie — <circle class="node">, adresowane jako N1, N2…
 * Mogą być końcami połączeń (obok pinów instancji / złącz).
 */
import { normalizeRef, parseEndpoint } from "./netlist-model.js";

export function isTopoNode(el) {
  return !!(el && el.classList && el.classList.contains("node") && String(el.tagName || "").toLowerCase() === "circle");
}

export function nodeCenter(el) {
  if (!el) return null;
  return {
    x: parseFloat(el.getAttribute("cx")) || 0,
    y: parseFloat(el.getAttribute("cy")) || 0,
  };
}

export function listTopoNodes(sheetNode) {
  if (!sheetNode) return [];
  return [...sheetNode.querySelectorAll("circle.node")];
}

export function findTopoNodeByRef(sheetNode, ref) {
  const r = normalizeRef(ref);
  if (!r || !sheetNode) return null;
  return listTopoNodes(sheetNode).find((el) => normalizeRef(el.getAttribute("data-ref")) === r) || null;
}

/** Czy endpoint netlisty wskazuje węzeł (bez pinu lub pin „@” / „node”). */
export function isNodeEndpoint(endpoint) {
  if (!endpoint) return false;
  const pin = String(endpoint.pin || "")
    .trim()
    .toUpperCase();
  if (pin && pin !== "@" && pin !== "NODE" && pin !== "WĘZEŁ" && pin !== "WEZEL") return false;
  const ref = normalizeRef(endpoint.ref);
  return !!ref;
}

export function usedNodeRefs(sheetNode) {
  const used = new Set();
  listTopoNodes(sheetNode).forEach((el) => {
    const r = normalizeRef(el.getAttribute("data-ref"));
    if (r) used.add(r);
  });
  return used;
}

/** Nadaj data-ref w przestrzeni N* jeśli brak. */
export function ensureNodeRef(el, sheetNode) {
  if (!isTopoNode(el)) return "";
  let ref = normalizeRef(el.getAttribute("data-ref"));
  if (ref) return ref;
  const used = usedNodeRefs(sheetNode || el.parentNode);
  let n = 1;
  while (used.has("N" + n)) n++;
  ref = "N" + n;
  el.setAttribute("data-ref", ref);
  return ref;
}

/** Uzupełnij data-ref wszystkim węzłom arkusza (kolejność DOM → N1, N2…). */
export function ensureAllTopoNodeRefs(sheetNode) {
  listTopoNodes(sheetNode).forEach((el) => ensureNodeRef(el, sheetNode));
}

/** Kandydat snapu jak pin (ref / pin / x / y / element / kind). */
export function topoNodeSnapCandidate(el, sheetNode) {
  if (!isTopoNode(el)) return null;
  const ref = ensureNodeRef(el, sheetNode);
  const c = nodeCenter(el);
  if (!c) return null;
  return {
    x: c.x,
    y: c.y,
    dir: "E",
    ref,
    pin: "",
    element: el,
    kind: "node",
  };
}

export function collectTopoNodeSnapCandidates(sheetNode) {
  return listTopoNodes(sheetNode)
    .map((el) => topoNodeSnapCandidate(el, sheetNode))
    .filter(Boolean);
}

/** Endpoint raw dla pinu, węzła lub junction (J*). */
export function endpointRawFromSnap(snap) {
  if (!snap?.ref) return "";
  const pin = String(snap.pin || "").trim();
  if (!pin || snap.kind === "node" || snap.kind === "junction") return normalizeRef(snap.ref);
  return normalizeRef(snap.ref) + ":" + pin;
}

export function parseNodeOrPinEndpoint(raw) {
  return parseEndpoint(raw);
}

/**
 * Najbliższy węzeł w tolerancji (świat).
 * @returns {{ el: Element, ref: string, x: number, y: number, dist: number } | null}
 */
export function nearestTopoNode(sheetNode, x, y, maxDist) {
  let best = null;
  const max = maxDist ?? 9;
  listTopoNodes(sheetNode).forEach((el) => {
    const c = nodeCenter(el);
    if (!c) return;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d <= max && (!best || d < best.dist)) {
      best = { el, ref: ensureNodeRef(el, sheetNode), x: c.x, y: c.y, dist: d };
    }
  });
  return best;
}
