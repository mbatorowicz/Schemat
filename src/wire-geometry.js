/**
 * Geometria przewodów SVG (line / polyline) — końce, adopt, orphan/bare.
 */

export function isWireGeometry(el) {
  if (!el?.tagName) return false;
  const t = el.tagName.toLowerCase();
  return t === "line" || t === "polyline";
}

export function wireConnId(el) {
  return (el?.getAttribute?.("data-conn-id") || "").trim();
}

/** Geometria przewodu po id — bez tekstów oznaczników (`data-role=wire-mark`). */
export function findWireByConnId(root, connId) {
  if (!root?.querySelectorAll || connId == null || connId === "") return null;
  const want = String(connId);
  return (
    [...root.querySelectorAll("line[data-conn-id], polyline[data-conn-id]")].find(
      (el) => el.getAttribute("data-conn-id") === want
    ) || null
  );
}

/** @returns {{ a: {x:number,y:number}, b: {x:number,y:number}, points: Array<{x:number,y:number}> } | null} */
export function wireEndpoints(el) {
  if (!isWireGeometry(el)) return null;
  const tag = el.tagName.toLowerCase();
  if (tag === "line") {
    const a = { x: +el.getAttribute("x1") || 0, y: +el.getAttribute("y1") || 0 };
    const b = { x: +el.getAttribute("x2") || 0, y: +el.getAttribute("y2") || 0 };
    return { a, b, points: [a, b] };
  }
  const raw = (el.getAttribute("points") || "").trim();
  if (!raw) return null;
  const nums = raw
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  const points = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
  if (points.length < 2) return null;
  return { a: points[0], b: points[points.length - 1], points };
}

export function nearPoint(p, q, tol) {
  if (!p || !q) return false;
  return Math.hypot(p.x - q.x, p.y - q.y) <= tol;
}

/**
 * Czy końce geometrii leżą przy pinach from/to (kolejność dowolna).
 */
export function wireMatchesEndpoints(el, fromXY, toXY, tol) {
  const ends = wireEndpoints(el);
  if (!ends || !fromXY || !toXY) return false;
  const t = tol ?? 8;
  const direct = nearPoint(ends.a, fromXY, t) && nearPoint(ends.b, toXY, t);
  const swapped = nearPoint(ends.a, toXY, t) && nearPoint(ends.b, fromXY, t);
  return direct || swapped;
}

/**
 * Health geometrii względem spisu.
 * @returns {{ orphans: Element[], bare: Element[], missing: string[] }}
 */
export function analyzeSheetWires(sheetNode, connections, opts) {
  const tol = opts?.tol ?? 8;
  const resolveXY = opts?.resolveXY; // (endpoint) => {x,y}|null
  const orphans = [];
  const bare = [];
  const ids = new Set((connections || []).map((c) => String(c.id)));
  const covered = new Set();
  if (!sheetNode) return { orphans, bare, missing: [...ids] };

  [...sheetNode.querySelectorAll("line, polyline")].forEach((el) => {
    const cid = wireConnId(el);
    if (cid) {
      if (!ids.has(cid) && !/^NEW/i.test(cid)) orphans.push(el);
      else if (ids.has(cid)) covered.add(cid);
      return;
    }
    // bare — potencjalny kandydat do promocji (ma klasę przewodu lub styka się z pinami)
    const cls = el.getAttribute("class") || "";
    if (/\bw(L|N|PE|24|48|0v|safe|enc|sig)\b/.test(cls) || el.getAttribute("data-from")) {
      bare.push(el);
      return;
    }
    if (typeof resolveXY === "function" && connections?.length) {
      for (const c of connections) {
        const from = resolveXY(c.from);
        const to = resolveXY(c.to);
        if (from && to && wireMatchesEndpoints(el, from, to, tol)) {
          bare.push(el);
          break;
        }
      }
    }
  });

  const missing = [...ids].filter((id) => !covered.has(id));
  return { orphans, bare, missing };
}

/** Trasa to tylko obrys — SVG polyline domyślnie wypełnia wielokąt (czarny trójkąt przy łamaniu). */
export function ensureWireStrokeOnly(el) {
  if (!el) return;
  el.setAttribute("fill", "none");
  if (el.style) el.style.fill = "none";
}

export function applyConnMetaToWire(el, record, routeKind) {
  if (!el || !record) return;
  const cls = record._wireClass || null;
  el.setAttribute("data-conn-id", record.id);
  el.setAttribute("data-route", routeKind || "manual");
  el.setAttribute("data-from", record.from?.raw || "");
  el.setAttribute("data-to", record.to?.raw || "");
  if (record.net != null) el.setAttribute("data-net", record.net);
  if (record.wire != null) el.setAttribute("data-wire", record.wire);
  if (record.length != null) {
    if (record.length) el.setAttribute("data-length", record.length);
    else el.removeAttribute("data-length");
  }
  el.removeAttribute("data-signal");
  if (record.notes != null) el.setAttribute("data-notes", record.notes);
  if (cls) el.setAttribute("class", cls);
  ensureWireStrokeOnly(el);
}

export function markWireManual(el) {
  if (!el) return;
  el.setAttribute("data-route", "manual");
}
