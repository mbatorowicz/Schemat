/**
 * Edycja punktów łamania line / polyline (trasy połączeń i zwykłe kształty).
 */
import { parsePoints } from "./svg-dom.js";
import { fmt } from "./svg-utils.js";
import { syncWireMarks } from "./wire-markers.js";
import { ensureWireStrokeOnly } from "./wire-geometry.js";

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
export function applyWirePoints(el, pts, mkEl, wireMarkMode) {
  if (!el || !pts || pts.length < 2) return el;
  const t = el.tagName.toLowerCase();
  const pointsAttr = formatPointsAttr(pts);
  let out = el;

  if (t === "polyline" || t === "polygon") {
    el.setAttribute("points", pointsAttr);
    if (el.getAttribute("data-conn-id")) el.setAttribute("data-route", "manual");
    out = el;
  } else if (t === "line" && pts.length === 2) {
    el.setAttribute("x1", fmt(pts[0][0]));
    el.setAttribute("y1", fmt(pts[0][1]));
    el.setAttribute("x2", fmt(pts[1][0]));
    el.setAttribute("y2", fmt(pts[1][1]));
    if (el.getAttribute("data-conn-id")) el.setAttribute("data-route", "manual");
    out = el;
  } else if (t === "line" && pts.length > 2 && typeof mkEl === "function") {
    const poly = mkEl("polyline", { points: pointsAttr, fill: "none" });
    for (const a of [...el.attributes]) {
      if (a.name === "x1" || a.name === "y1" || a.name === "x2" || a.name === "y2") continue;
      if (a.name === "fill") continue;
      poly.setAttribute(a.name, a.value);
    }
    if (poly.getAttribute("data-conn-id")) poly.setAttribute("data-route", "manual");
    el.parentNode?.replaceChild(poly, el);
    out = poly;
  } else {
    return el;
  }

  // polyline bez fill:none wypełnia wielokąt (czarny trójkąt przy łamaniu)
  if (out.getAttribute("data-conn-id") || out.tagName.toLowerCase() === "polyline") {
    ensureWireStrokeOnly(out);
  }

  if (out.parentNode && out.getAttribute("data-conn-id")) {
    syncWireMarks(out.parentNode, out, mkEl, wireMarkMode);
  }
  return out;
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

function ptXY(p) {
  return { x: +(p.x != null ? p.x : p[0]), y: +(p.y != null ? p.y : p[1]) };
}

function asPair(p) {
  const q = ptXY(p);
  return [q.x, q.y];
}

/**
 * Krótki stub 45° od punktu na szynie w stronę celu.
 * Opcjonalny flowDir (N/E/S/W) ustala składową wzdłuż szyny — kierunek „skąd idą kable”.
 * @returns {{ attach: number[], tip: number[], trunkAxis: "H"|"V" }}
 */
export function obliqueStubPoints(attach, trunkAxis, towardXY, len, flowDir) {
  const ax = +(attach.x != null ? attach.x : attach[0]);
  const ay = +(attach.y != null ? attach.y : attach[1]);
  const tx = +(towardXY.x != null ? towardXY.x : towardXY[0]);
  const ty = +(towardXY.y != null ? towardXY.y : towardXY[1]);
  const dx = tx - ax;
  const dy = ty - ay;
  const s = Math.max(+len || 10, 1);
  const axis = trunkAxis === "H" ? "H" : "V";
  const flow = String(flowDir || "").toUpperCase();
  let tip;
  if (axis === "V") {
    const sx = dx >= 0 ? s : -s;
    let sy = dy >= 0 ? s : -s;
    if (flow === "S") sy = s;
    else if (flow === "N") sy = -s;
    tip = [ax + sx, ay + sy];
  } else {
    let sx = dx >= 0 ? s : -s;
    const sy = dy >= 0 ? s : -s;
    if (flow === "E") sx = s;
    else if (flow === "W") sx = -s;
    tip = [ax + sx, ay + sy];
  }
  return { attach: [ax, ay], tip, trunkAxis: axis };
}

/**
 * Pełna geometria odgałęzienia: attach → ukos → trasa ortogonalna do celu.
 * @param {(opts: object) => Array<{x:number,y:number}>|null} [routeFn] OrthogonalRouter.route
 * @param {string} [flowDir] kierunek wzdłuż szyny od źródła (N/E/S/W)
 * @param {string} [pinDir] kierunek podejścia do pinu (N/E/S/W) — styczność z wyprowadzeniem
 */
export function buildObliqueBranchPoints(attach, trunkAxis, endXY, step, routeFn, flowDir, pinDir) {
  const end = {
    x: +(endXY.x != null ? endXY.x : endXY[0]),
    y: +(endXY.y != null ? endXY.y : endXY[1]),
  };
  const len = Math.max((step || 5) * 2, 5);
  const stub = obliqueStubPoints(attach, trunkAxis, end, len, flowDir);
  const tip = { x: stub.tip[0], y: stub.tip[1] };
  const startDir = cardinalFromDelta(stub.tip[0] - stub.attach[0], stub.tip[1] - stub.attach[1]);
  const pin = String(pinDir || endXY?.dir || "").toUpperCase();
  const endDir =
    pin === "N" || pin === "E" || pin === "S" || pin === "W"
      ? pin
      : cardinalFromDelta(tip.x - end.x, tip.y - end.y);

  let routePts = [];
  // Tip już na osi pinu → prosta bez A*/jogów
  if (stub.trunkAxis === "V" && Math.abs(tip.y - end.y) < 0.51) {
    routePts = [
      [tip.x, tip.y],
      [end.x, end.y],
    ];
  } else if (stub.trunkAxis === "H" && Math.abs(tip.x - end.x) < 0.51) {
    routePts = [
      [tip.x, tip.y],
      [end.x, end.y],
    ];
  } else if (typeof routeFn === "function") {
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

/**
 * Punkt przyłączenia odgałęzienia na trunku (preferuj przecięcie osi z celem).
 * @returns {{ x: number, y: number, segmentIndex: number, trunkAxis: "H"|"V" } | null}
 */
export function attachPointOnTrunk(trunkPts, targetXY, minClear) {
  if (!trunkPts || trunkPts.length < 2 || !targetXY) return null;
  const tx = +(targetXY.x != null ? targetXY.x : targetXY[0]);
  const ty = +(targetXY.y != null ? targetXY.y : targetXY[1]);
  const clear = Math.max(+minClear || 0, 0);
  let best = null;

  const consider = (x, y, segmentIndex, trunkAxis, dist, kind) => {
    const cand = { x, y, segmentIndex, trunkAxis, dist, kind };
    if (!best || dist < best.dist || (dist === best.dist && kind === "axis" && best.kind !== "axis")) {
      best = cand;
    }
  };

  for (let i = 0; i < trunkPts.length - 1; i++) {
    const a = ptXY(trunkPts[i]);
    const b = ptXY(trunkPts[i + 1]);
    if (Math.abs(a.x - b.x) < 0.05) {
      const yMin = Math.min(a.y, b.y);
      const yMax = Math.max(a.y, b.y);
      if (ty >= yMin - 0.05 && ty <= yMax + 0.05) {
        const y = Math.max(yMin, Math.min(yMax, ty));
        consider(a.x, y, i, "V", Math.abs(tx - a.x), "axis");
      }
    }
    if (Math.abs(a.y - b.y) < 0.05) {
      const xMin = Math.min(a.x, b.x);
      const xMax = Math.max(a.x, b.x);
      if (tx >= xMin - 0.05 && tx <= xMax + 0.05) {
        const x = Math.max(xMin, Math.min(xMax, tx));
        consider(x, a.y, i, "H", Math.abs(ty - a.y), "axis");
      }
    }
    const hit = distPointToSegment(tx, ty, a.x, a.y, b.x, b.y);
    consider(hit.x, hit.y, i, segmentAxis([a.x, a.y], [b.x, b.y]), hit.dist, "near");
  }
  if (!best) return null;

  if (clear > 0) {
    const start = ptXY(trunkPts[0]);
    const end = ptXY(trunkPts[trunkPts.length - 1]);
    if (Math.hypot(best.x - start.x, best.y - start.y) < clear) {
      const pushed = pointAlongPolyline(trunkPts, clear);
      if (pushed) best = { ...best, x: pushed.x, y: pushed.y, segmentIndex: pushed.segmentIndex, trunkAxis: pushed.trunkAxis };
    } else if (Math.hypot(best.x - end.x, best.y - end.y) < clear) {
      const total = polylineLength(trunkPts);
      const pushed = pointAlongPolyline(trunkPts, Math.max(0, total - clear));
      if (pushed) best = { ...best, x: pushed.x, y: pushed.y, segmentIndex: pushed.segmentIndex, trunkAxis: pushed.trunkAxis };
    }
  }

  return { x: best.x, y: best.y, segmentIndex: best.segmentIndex, trunkAxis: best.trunkAxis };
}

function polylineLength(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = ptXY(pts[i - 1]);
    const b = ptXY(pts[i]);
    n += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return n;
}

function pointAlongPolyline(pts, dist) {
  if (!pts || pts.length < 2) return null;
  let left = Math.max(0, +dist || 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = ptXY(pts[i]);
    const b = ptXY(pts[i + 1]);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-9) continue;
    if (left <= len) {
      const t = left / len;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        segmentIndex: i,
        trunkAxis: segmentAxis([a.x, a.y], [b.x, b.y]),
      };
    }
    left -= len;
  }
  const last = ptXY(pts[pts.length - 1]);
  const prev = ptXY(pts[pts.length - 2]);
  return {
    x: last.x,
    y: last.y,
    segmentIndex: pts.length - 2,
    trunkAxis: segmentAxis([prev.x, prev.y], [last.x, last.y]),
  };
}

/** Prefiks trunku od startu do attach (włącznie), jako pary [x,y]. */
export function prefixPolylineToPoint(trunkPts, attachXY) {
  if (!trunkPts || trunkPts.length < 2 || !attachXY) return null;
  const attach = ptXY(attachXY);
  const out = [];
  for (let i = 0; i < trunkPts.length - 1; i++) {
    const a = ptXY(trunkPts[i]);
    const b = ptXY(trunkPts[i + 1]);
    out.push([a.x, a.y]);
    const hit = distPointToSegment(attach.x, attach.y, a.x, a.y, b.x, b.y);
    if (hit.dist < 0.5) {
      out.push([attach.x, attach.y]);
      return out;
    }
  }
  out.push(asPair(trunkPts[trunkPts.length - 1]));
  out.push([attach.x, attach.y]);
  return out;
}

/**
 * Attach na trunku tak, by tip stubu 45° wylądował na osi pinu (wcześniejszy zakręt).
 * @returns {{ x: number, y: number, segmentIndex: number, trunkAxis: "H"|"V" } | null}
 */
export function attachForObliqueAlign(trunkPts, destXY, step, flowDir) {
  const len = Math.max((step || 5) * 2, 5);
  const dest = ptXY(destXY);
  const seed = attachPointOnTrunk(trunkPts, dest, 0);
  if (!seed) return null;
  const stub = obliqueStubPoints(seed, seed.trunkAxis, dest, len, flowDir);
  const sx = stub.tip[0] - stub.attach[0];
  const sy = stub.tip[1] - stub.attach[1];
  const alignedTarget =
    seed.trunkAxis === "V" ? { x: dest.x, y: dest.y - sy } : { x: dest.x - sx, y: dest.y };
  const aligned = attachPointOnTrunk(trunkPts, alignedTarget, len);
  return aligned || attachPointOnTrunk(trunkPts, dest, len);
}

/**
 * Rozsuń attachy wzdłuż trunku, gdy bliżej niż `minGap` (czytelność równoległych odgałęzień).
 * @param {Array<{ x: number, y: number, trunkAxis: string, segmentIndex?: number }>} attaches
 * @returns {typeof attaches}
 */
export function spaceAttachesAlongTrunk(trunkPts, attaches, minGap) {
  if (!attaches?.length || !trunkPts?.length) return attaches || [];
  const gap = Math.max(+minGap || 0, 0);
  if (gap <= 0 || attaches.length < 2) return attaches.map((a) => ({ ...a }));

  const axis = attaches[0].trunkAxis || "V";
  const keyed = attaches.map((a, i) => ({
    i,
    a: { ...a },
    key: axis === "V" ? a.y : a.x,
  }));
  keyed.sort((p, q) => p.key - q.key || p.i - q.i);

  for (let k = 1; k < keyed.length; k++) {
    if (keyed[k].key - keyed[k - 1].key < gap) {
      keyed[k].key = keyed[k - 1].key + gap;
    }
  }

  return keyed
    .sort((p, q) => p.i - q.i)
    .map((row) => {
      const target = axis === "V" ? { x: row.a.x, y: row.key } : { x: row.key, y: row.a.y };
      const snapped = attachPointOnTrunk(trunkPts, target, 0);
      if (!snapped) return { ...row.a, ...(axis === "V" ? { y: row.key } : { x: row.key }) };
      return { ...row.a, x: snapped.x, y: snapped.y, segmentIndex: snapped.segmentIndex, trunkAxis: snapped.trunkAxis };
    });
}

/**
 * Trunk (common→dest through) + odgałęzienie 45° do celu bocznego.
 * Tip 45° ląduje na osi pinu → proste dojście bez jogów.
 * @returns {number[][]|null}
 */
export function buildFanoutBranchPoints(trunkPts, destXY, step, routeFn, flowDir, attachOverride) {
  const attach = attachOverride || attachForObliqueAlign(trunkPts, destXY, step, flowDir);
  if (!attach) return null;
  const prefix = prefixPolylineToPoint(trunkPts, attach);
  if (!prefix || prefix.length < 1) return null;
  const pinDir = destXY?.dir;
  const branch = buildObliqueBranchPoints(
    attach,
    attach.trunkAxis,
    destXY,
    step,
    routeFn,
    flowDir,
    pinDir
  );
  const out = prefix.map((p) => [p[0], p[1]]);
  branch.forEach((p, i) => {
    if (i === 0) return;
    const last = out[out.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.05) return;
    out.push([p[0], p[1]]);
  });
  return out;
}
