/**
 * Końce trasy przyczepione do złączy (data-from / data-to).
 */
import { wireEndpoints, isWireGeometry, applyConnMetaToWire } from "./wire-geometry.js";
import { formatPointsAttr } from "./polyline-edit.js";
import { syncWireMarks } from "./wire-markers.js";

/**
 * Ustaw pierwszy/ostatni punkt geometrii dokładnie na XY pinów.
 * @param {Element} el line|polyline
 * @param {{ x: number, y: number }} fromXY
 * @param {{ x: number, y: number }} toXY
 * @param {boolean} [fromIsStart=true] — czy from odpowiada początkowi points
 */
export function pinWireEnds(el, fromXY, toXY, fromIsStart = true) {
  if (!isWireGeometry(el) || !fromXY || !toXY) return el;
  const tag = el.tagName.toLowerCase();
  const a = fromIsStart ? fromXY : toXY;
  const b = fromIsStart ? toXY : fromXY;
  if (tag === "line") {
    el.setAttribute("x1", String(a.x));
    el.setAttribute("y1", String(a.y));
    el.setAttribute("x2", String(b.x));
    el.setAttribute("y2", String(b.y));
    return el;
  }
  const ends = wireEndpoints(el);
  if (!ends?.points?.length) {
    el.setAttribute("points", formatPointsAttr([[a.x, a.y], [b.x, b.y]]));
    return el;
  }
  const pts = ends.points.map((p) => [p.x, p.y]);
  pts[0] = [a.x, a.y];
  pts[pts.length - 1] = [b.x, b.y];
  el.setAttribute("points", formatPointsAttr(pts));
  return el;
}

/**
 * Po edycji środka trasy — przywróć końce do zapisanych pinów (resolveXY: raw → {x,y}|null).
 */
export function rePinWireEndsFromMeta(el, resolveXY, wireMarkMode) {
  if (!isWireGeometry(el) || typeof resolveXY !== "function") return el;
  const fromRaw = (el.getAttribute("data-from") || "").trim();
  const toRaw = (el.getAttribute("data-to") || "").trim();
  if (!fromRaw || !toRaw) return el;
  const fromXY = resolveXY(fromRaw);
  const toXY = resolveXY(toRaw);
  if (!fromXY || !toXY) return el;
  const ends = wireEndpoints(el);
  if (!ends) return pinWireEnds(el, fromXY, toXY, true);
  // Dopasuj orientację: który koniec jest bliżej from
  const dStartFrom = Math.hypot(ends.a.x - fromXY.x, ends.a.y - fromXY.y);
  const dStartTo = Math.hypot(ends.a.x - toXY.x, ends.a.y - toXY.y);
  const fromIsStart = dStartFrom <= dStartTo;
  pinWireEnds(el, fromXY, toXY, fromIsStart);
  if (el.parentNode) syncWireMarks(el.parentNode, el, undefined, wireMarkMode);
  return el;
}

/** Czy uchwyt to trwały koniec trasy połączenia. */
export function isStickyWireEndHandle(h) {
  return !!(h && (h.stickyEnd === "from" || h.stickyEnd === "to"));
}
