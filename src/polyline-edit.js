/**
 * Edycja punktów łamania line / polyline (trasy połączeń i zwykłe kształty).
 */
import { parsePoints } from "./svg-dom.js";
import { fmt } from "./svg-utils.js";

export function pointsOfWire(el) {
  if (!el?.tagName) return [];
  const t = el.tagName.toLowerCase();
  if (t === "polyline" || t === "polygon") return parsePoints(el);
  if (t === "line") {
    return [
      [+(el.getAttribute("x1") || 0), +(el.getAttribute("y1") || 0)],
      [+(el.getAttribute("x2") || 0), +(el.getAttribute("y2") || 0)],
    ];
  }
  return [];
}

export function formatPointsAttr(pts) {
  return (pts || []).map((p) => fmt(p[0]) + "," + fmt(p[1])).join(" ");
}

/** Odległość punktu do odcinka + projekcja. */
export function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) {
    return { dist: Math.hypot(px - x1, py - y1), t: 0, x: x1, y: y1 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return { dist: Math.hypot(px - x, py - y), t, x, y };
}

/**
 * Najbliższy segment łamanej.
 * @returns {{ segmentIndex: number, dist: number, t: number, x: number, y: number } | null}
 */
export function nearestSegment(pts, x, y) {
  if (!pts || pts.length < 2) return null;
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const r = distPointToSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (!best || r.dist < best.dist) best = { segmentIndex: i, dist: r.dist, t: r.t, x: r.x, y: r.y };
  }
  return best;
}

/** Wstaw punkt na segmencie (po indeksie segmentu). */
export function insertVertex(pts, segmentIndex, x, y) {
  if (!pts || pts.length < 2) return null;
  const i = Math.max(0, Math.min(pts.length - 2, segmentIndex | 0));
  const next = pts.map((p) => [p[0], p[1]]);
  next.splice(i + 1, 0, [x, y]);
  return next;
}

/**
 * Usuń punkt łamania (nie końce — tylko wierzchołki pośrednie).
 * @returns {number[][]|null} nowe punkty albo null gdy nie można
 */
export function removeBreakVertex(pts, index) {
  if (!pts || pts.length <= 2) return null;
  const i = index | 0;
  if (i <= 0 || i >= pts.length - 1) return null;
  return pts.filter((_, k) => k !== i).map((p) => [p[0], p[1]]);
}

export function canRemoveBreakVertex(pts, index) {
  return removeBreakVertex(pts, index) != null;
}

/**
 * Zastosuj punkty do elementu; line z >2 punktami → zamiana na polyline.
 * @returns {Element} element wynikowy (może być nowy polyline)
 */
export function applyWirePoints(el, pts, mkEl) {
  if (!el || !pts || pts.length < 2) return el;
  const t = el.tagName.toLowerCase();
  const pointsAttr = formatPointsAttr(pts);

  if (t === "polyline" || t === "polygon") {
    el.setAttribute("points", pointsAttr);
    if (el.getAttribute("data-conn-id")) el.setAttribute("data-route", "manual");
    return el;
  }

  if (t === "line" && pts.length === 2) {
    el.setAttribute("x1", fmt(pts[0][0]));
    el.setAttribute("y1", fmt(pts[0][1]));
    el.setAttribute("x2", fmt(pts[1][0]));
    el.setAttribute("y2", fmt(pts[1][1]));
    if (el.getAttribute("data-conn-id")) el.setAttribute("data-route", "manual");
    return el;
  }

  if (t === "line" && pts.length > 2 && typeof mkEl === "function") {
    const poly = mkEl("polyline", { points: pointsAttr });
    for (const a of [...el.attributes]) {
      if (a.name === "x1" || a.name === "y1" || a.name === "x2" || a.name === "y2") continue;
      poly.setAttribute(a.name, a.value);
    }
    if (poly.getAttribute("data-conn-id")) poly.setAttribute("data-route", "manual");
    el.parentNode?.replaceChild(poly, el);
    return poly;
  }

  return el;
}

/**
 * Hit-test: czy klik jest blisko segmentu (w jednostkach świata).
 */
export function hitWireSegment(el, x, y, maxDist) {
  const pts = pointsOfWire(el);
  const hit = nearestSegment(pts, x, y);
  if (!hit || hit.dist > maxDist) return null;
  return { pts, ...hit };
}

/** Oś segmentu: H (poziomy) lub V (pionowy). */
export function segmentAxis(p0, p1) {
  if (!p0 || !p1) return "V";
  return Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]) ? "H" : "V";
}

export function cardinalFromDelta(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
  return dy >= 0 ? "S" : "N";
}

/**
 * Krótki stub 45° od punktu na szynie w stronę celu.
 * @returns {{ attach: number[], tip: number[], trunkAxis: "H"|"V" }}
 */
export function obliqueStubPoints(attach, trunkAxis, towardXY, len) {
  const ax = +(attach.x != null ? attach.x : attach[0]);
  const ay = +(attach.y != null ? attach.y : attach[1]);
  const tx = +(towardXY.x != null ? towardXY.x : towardXY[0]);
  const ty = +(towardXY.y != null ? towardXY.y : towardXY[1]);
  const dx = tx - ax;
  const dy = ty - ay;
  const s = Math.max(+len || 10, 1);
  const axis = trunkAxis === "H" ? "H" : "V";
  let tip;
  if (axis === "V") {
    const sx = dx >= 0 ? s : -s;
    const sy = dy >= 0 ? s : -s;
    tip = [ax + sx, ay + sy];
  } else {
    const sy = dy >= 0 ? s : -s;
    const sx = dx >= 0 ? s : -s;
    tip = [ax + sx, ay + sy];
  }
  return { attach: [ax, ay], tip, trunkAxis: axis };
}

/**
 * Pełna geometria odgałęzienia: attach → ukos → trasa ortogonalna do celu.
 * @param {(opts: object) => Array<{x:number,y:number}>|null} [routeFn] OrthogonalRouter.route
 */
export function buildObliqueBranchPoints(attach, trunkAxis, endXY, step, routeFn) {
  const end = {
    x: +(endXY.x != null ? endXY.x : endXY[0]),
    y: +(endXY.y != null ? endXY.y : endXY[1]),
  };
  const len = Math.max((step || 5) * 2, 5);
  const stub = obliqueStubPoints(attach, trunkAxis, end, len);
  const tip = { x: stub.tip[0], y: stub.tip[1] };
  const startDir = cardinalFromDelta(stub.tip[0] - stub.attach[0], stub.tip[1] - stub.attach[1]);
  const endDir = cardinalFromDelta(tip.x - end.x, tip.y - end.y);

  let routePts = [];
  if (typeof routeFn === "function") {
    try {
      const routed = routeFn({
        start: tip,
        end,
        startDir,
        endDir,
        step: step || 5,
        obstacles: [],
      });
      if (routed?.length) routePts = routed.map((p) => [+p.x, +p.y]);
    } catch (e) {
      routePts = [];
    }
  }
  if (routePts.length < 2) {
    if (stub.trunkAxis === "V")
      routePts = [
        [tip.x, tip.y],
        [tip.x, end.y],
        [end.x, end.y],
      ];
    else
      routePts = [
        [tip.x, tip.y],
        [end.x, tip.y],
        [end.x, end.y],
      ];
  }

  const out = [stub.attach.slice(), stub.tip.slice()];
  routePts.forEach((p) => {
    const last = out[out.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.05) return;
    out.push([p[0], p[1]]);
  });
  return out;
}

/**
 * Najbliższy przewód (line/polyline) na arkuszu.
 * @returns {{ el: Element, pts: number[][], segmentIndex: number, dist: number, t: number, x: number, y: number, trunkAxis: "H"|"V" } | null}
 */
export function hitNearestWireOnSheet(sheetNode, x, y, maxDist) {
  if (!sheetNode) return null;
  let best = null;
  [...sheetNode.children].forEach((el) => {
    const tag = el.tagName?.toLowerCase?.();
    if (tag !== "line" && tag !== "polyline") return;
    const hit = hitWireSegment(el, x, y, maxDist);
    if (!hit) return;
    if (!best || hit.dist < best.dist) {
      const a = hit.pts[hit.segmentIndex];
      const b = hit.pts[hit.segmentIndex + 1];
      best = { el, ...hit, trunkAxis: segmentAxis(a, b) };
    }
  });
  return best;
}

/**
 * Wstaw ukos 45° na początku trasy (gdy koniec już leży przy szynie).
 * Zwraca nowe punkty albo null.
 */
export function prependObliqueStub(pts, trunkAxis, towardXY, len) {
  if (!pts || pts.length < 2) return null;
  const attach = { x: pts[0][0], y: pts[0][1] };
  const stub = obliqueStubPoints(attach, trunkAxis, towardXY || pts[1], len);
  const rest = pts.slice(1);
  const out = [stub.attach, stub.tip];
  rest.forEach((p) => {
    const last = out[out.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.05) return;
    out.push([p[0], p[1]]);
  });
  return out;
}
