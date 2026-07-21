/**
 * Oznaczniki koszulek na końcach trasy — widok pochodny z data-from / data-to.
 * SSOT odświeżania: resyncAllWireMarks (wołane z render()).
 */
import { wireEndpoints, wireConnId, isWireGeometry } from "./wire-geometry.js";
import { fmt } from "./svg-utils.js";

const SVGNS = "http://www.w3.org/2000/svg";
const MARK_ALONG = 14;
const MARK_SIDE = 5;
const FONT_SIZE = 7;

export const WIRE_MARK_MODES = ["local", "other", "both"];
export const DEFAULT_WIRE_MARK_MODE = "local";

export function normalizeWireMarkMode(v) {
  const s = String(v || "").trim();
  return WIRE_MARK_MODES.includes(s) ? s : DEFAULT_WIRE_MARK_MODE;
}

function segmentDir(end, next) {
  const dx = next.x - end.x;
  const dy = next.y - end.y;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len, len, dx, dy };
}

/** Kąt tekstu wzdłuż odcinka (czytelny, bez „do góry nogami”). */
export function markAngleDeg(end, next) {
  const { dx, dy } = segmentDir(end, next);
  let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (ang > 90 || ang < -90) ang += ang > 0 ? -180 : 180;
  return ang;
}

function markPlacement(end, next) {
  const { ux, uy, len } = segmentDir(end, next);
  const along = Math.min(MARK_ALONG, len * 0.45);
  const px = -uy;
  const py = ux;
  return {
    x: end.x + ux * along + px * MARK_SIDE,
    y: end.y + uy * along + py * MARK_SIDE,
    angle: markAngleDeg(end, next),
  };
}

function markPositions(ends) {
  if (!ends?.points || ends.points.length < 2) return null;
  const pts = ends.points;
  return {
    from: markPlacement(pts[0], pts[1]),
    to: markPlacement(pts[pts.length - 1], pts[pts.length - 2]),
  };
}

/** Etykieta nadruku: -F1:2 (myślnik jak oznaczenie aparatu). */
export function markLabelFromAttr(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.startsWith("-") ? s : "-" + s;
}

/**
 * Teksty nadruku przy końcach from / to według konwencji.
 * @returns {{ atFrom: string, atTo: string }}
 */
export function resolveMarkPair(fromAttr, toAttr, mode) {
  const fromL = markLabelFromAttr(fromAttr);
  const toL = markLabelFromAttr(toAttr);
  const m = normalizeWireMarkMode(mode);
  if (!fromL && !toL) return { atFrom: "", atTo: "" };
  if (m === "both") {
    const both = fromL && toL ? `${fromL} / ${toL}` : fromL || toL;
    return { atFrom: both, atTo: both };
  }
  if (m === "other") return { atFrom: toL, atTo: fromL };
  return { atFrom: fromL, atTo: toL };
}

/** Wszystkie trasy z data-conn-id na arkuszu. */
export function listSheetWires(sheetNode) {
  if (!sheetNode?.querySelectorAll) return [];
  return [...sheetNode.querySelectorAll("line[data-conn-id], polyline[data-conn-id]")].filter(isWireGeometry);
}

/** Usuń wszystkie nadruki na arkuszu (przed pełnym resync). */
export function clearAllWireMarks(sheetNode) {
  if (!sheetNode) return;
  [...sheetNode.querySelectorAll('[data-role="wire-mark"]')].forEach((el) => el.remove());
}

/** Usuń nadruki jednego połączenia. Bez connId — no-op (nigdy nie czyść wszystkich). */
export function removeWireMarks(sheetNode, connId) {
  if (!sheetNode) return;
  const want = connId != null && connId !== "" ? String(connId) : "";
  if (!want) return;
  [...sheetNode.querySelectorAll('[data-role="wire-mark"]')].forEach((el) => {
    if (el.getAttribute("data-conn-id") === want) el.remove();
  });
}

/**
 * Uzupełnij puste data-from / data-to z rekordu spisu (nie nadpisuje istniejących).
 * @returns {boolean} czy coś uzupełniono
 */
export function fillMissingWireEndpoints(wireEl, record, endpointRawFn) {
  if (!wireEl || !record) return false;
  const rawOf = typeof endpointRawFn === "function" ? endpointRawFn : (ep) => (ep && (ep.raw || "")) || "";
  let changed = false;
  const from = String(rawOf(record.from) || "").trim();
  const to = String(rawOf(record.to) || "").trim();
  if (from && !(wireEl.getAttribute("data-from") || "").trim()) {
    wireEl.setAttribute("data-from", from);
    changed = true;
  }
  if (to && !(wireEl.getAttribute("data-to") || "").trim()) {
    wireEl.setAttribute("data-to", to);
    changed = true;
  }
  return changed;
}

function createMarkEl(mkEl, connId, end) {
  const attrs = {
    "data-role": "wire-mark",
    "data-conn-id": String(connId),
    "data-end": end,
    class: "wire-mark",
  };
  if (typeof mkEl === "function") return mkEl("text", attrs);
  const el = document.createElementNS(SVGNS, "text");
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function placeMark(sheetNode, connId, end, place, text, mkEl) {
  if (!text || !place) return null;
  const el = createMarkEl(mkEl, connId, end);
  el.setAttribute("x", fmt(place.x));
  el.setAttribute("y", fmt(place.y));
  el.setAttribute("text-anchor", "middle");
  el.setAttribute("dominant-baseline", "central");
  el.setAttribute("font-size", String(FONT_SIZE));
  el.setAttribute("fill", "#0f172a");
  el.setAttribute("transform", `rotate(${fmt(place.angle)} ${fmt(place.x)} ${fmt(place.y)})`);
  el.style.pointerEvents = "none";
  el.textContent = text;
  sheetNode.appendChild(el);
  return el;
}

/**
 * Zsynchronizuj / utwórz oznaczniki przy końcach przewodu.
 * @returns {{ from: Element|null, to: Element|null }|null}
 */
export function syncWireMarks(sheetNode, wireEl, mkEl, mode) {
  if (!sheetNode || !isWireGeometry(wireEl)) return null;
  const connId = wireConnId(wireEl);
  if (!connId) return null;
  const ends = wireEndpoints(wireEl);
  const pos = markPositions(ends);
  removeWireMarks(sheetNode, connId);
  if (!pos) return null;
  const fromAttr = wireEl.getAttribute("data-from") || "";
  const toAttr = wireEl.getAttribute("data-to") || "";
  const { atFrom, atTo } = resolveMarkPair(fromAttr, toAttr, mode);
  const a = placeMark(sheetNode, connId, "from", pos.from, atFrom, mkEl);
  const b = placeMark(sheetNode, connId, "to", pos.to, atTo, mkEl);
  if (!a && !b) return null;
  return { from: a, to: b };
}

/**
 * Pełny resync nadruków na arkuszu (SSOT widoku).
 * - usuwa wszystkie stare marki (w tym osierocone),
 * - opcjonalnie uzupełnia puste from/to ze spisu,
 * - tworzy nadruki dla każdej trasy z data-conn-id.
 *
 * @param {Element} sheetNode
 * @param {string} [mode]
 * @param {Function} [mkEl]
 * @param {{
 *   resolveRecord?: (connId: string) => object|null,
 *   endpointRaw?: (ep: unknown) => string,
 * }} [opts]
 * @returns {number} ile tras dostało ≥1 nadruk
 */
export function resyncAllWireMarks(sheetNode, mode, mkEl, opts = {}) {
  if (!sheetNode) return 0;
  clearAllWireMarks(sheetNode);
  const wires = listSheetWires(sheetNode);
  const resolveRecord = typeof opts.resolveRecord === "function" ? opts.resolveRecord : null;
  const endpointRaw = typeof opts.endpointRaw === "function" ? opts.endpointRaw : null;
  let n = 0;
  for (const el of wires) {
    if (resolveRecord) {
      const rec = resolveRecord(wireConnId(el));
      if (rec) fillMissingWireEndpoints(el, rec, endpointRaw);
    }
    if (syncWireMarks(sheetNode, el, mkEl, mode)) n += 1;
  }
  return n;
}

export function removeWireMarksForWire(sheetNode, wireEl) {
  if (!sheetNode || !wireEl) return;
  removeWireMarks(sheetNode, wireConnId(wireEl));
}
