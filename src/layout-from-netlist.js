/**
 * Propozycja rozstawienia instancji ze spisu połączeń — bez DOM.
 */
import { normalizeRef } from "./netlist-model.js";
import { splitInstanceRef } from "./instance-refs.js";
import { snapToGrid } from "./sheet-lanes.js";

export const LANE_PREFIXES = {
  power: ["G", "WD", "F", "Q"],
  control: ["SK", "A", "K", "SB", "S", "B", "Y", "R"],
  drive: ["T", "M"],
  terminals: ["X"],
};

const POWER_NET_RANK = {
  L: 0,
  L1: 0,
  L2: 0,
  L3: 0,
  N: 1,
  PE: 2,
  PEN: 2,
  "+24V": 3,
  "24V": 3,
};

/** Węzły N* i junctiony J* nie są instancjami symboli. */
export function isSkippedLayoutRef(ref) {
  return /^[NJ]\d+$/i.test(normalizeRef(ref));
}

export function uniqueRefsFromConnections(connections) {
  const out = [];
  const seen = new Set();
  (connections || []).forEach((c) => {
    [c?.from, c?.to].forEach((ep) => {
      const r = normalizeRef(ep?.ref);
      if (!r || seen.has(r) || isSkippedLayoutRef(r)) return;
      seen.add(r);
      out.push(r);
    });
  });
  return out;
}

export function existingRefsOnSheet(sheetNode) {
  const refs = new Set();
  if (!sheetNode?.querySelectorAll) return refs;
  sheetNode.querySelectorAll("[data-ref]").forEach((el) => {
    const r = normalizeRef(el.getAttribute("data-ref"));
    if (r) refs.add(r);
  });
  return refs;
}

export function missingRefs(connections, sheetNode) {
  const existing = existingRefsOnSheet(sheetNode);
  return uniqueRefsFromConnections(connections).filter((r) => !existing.has(r));
}

export function laneForRef(ref) {
  const { prefix } = splitInstanceRef(ref);
  const p = String(prefix || "").toUpperCase();
  for (const [lane, prefixes] of Object.entries(LANE_PREFIXES)) {
    if (prefixes.includes(p)) return lane;
  }
  return "control";
}

function powerRank(net) {
  const n = String(net || "")
    .trim()
    .toUpperCase();
  if (n in POWER_NET_RANK) return POWER_NET_RANK[n];
  return 10;
}

export function sortConnectionsForRouting(connections) {
  return (connections || []).slice().sort((a, b) => {
    const d = powerRank(a?.net) - powerRank(b?.net);
    if (d) return d;
    return String(a?.id || "").localeCompare(String(b?.id || ""), "pl", { numeric: true });
  });
}

function tooClose(a, b, gap) {
  return Math.abs(a.x - b.x) < gap && Math.abs(a.y - b.y) < gap;
}

function slotsInLane(rect, count, step, occupied) {
  const s = Math.max(1, +step || 5);
  const gap = s * 14;
  const xs = [snapToGrid(rect.x + rect.width * 0.42, s), snapToGrid(rect.x + rect.width * 0.72, s)];
  const y0 = snapToGrid(rect.y + s * 8, s);
  const yMax = rect.y + rect.height - s * 8;
  const spots = [];
  for (const x of xs) {
    let y = y0;
    while (spots.length < count && y <= yMax) {
      const cand = { x, y };
      if (!occupied.some((p) => tooClose(p, cand, gap))) {
        spots.push(cand);
        occupied.push(cand);
      }
      y = snapToGrid(y + gap, s);
    }
  }
  while (spots.length < count) {
    const y = snapToGrid(y0 + spots.length * gap, s);
    spots.push({ x: xs[0], y });
  }
  return spots;
}

/**
 * @param {{
 *   toPlace: Array<{ ref: string, symbolId: string }>,
 *   existingPositions?: Array<{ x: number, y: number }>,
 *   lanes: Record<string, { x: number, y: number, width: number, height: number }>,
 *   step?: number,
 * }} opts
 */
export function proposePlacements(opts) {
  const toPlace = opts.toPlace || [];
  const lanes = opts.lanes || {};
  const step = opts.step || 5;
  const occupied = (opts.existingPositions || []).map((p) => ({ x: +p.x, y: +p.y }));
  const byLane = { power: [], control: [], drive: [], terminals: [] };
  toPlace.forEach((item) => {
    const lane = laneForRef(item.ref);
    (byLane[lane] || byLane.control).push(item);
  });
  const out = [];
  Object.keys(byLane).forEach((lane) => {
    const items = byLane[lane];
    if (!items.length) return;
    const rect = lanes[lane] || lanes.control;
    if (!rect) return;
    const spots = slotsInLane(rect, items.length, step, occupied);
    items.forEach((item, i) => {
      out.push({ ...item, x: spots[i].x, y: spots[i].y, lane });
    });
  });
  return out;
}
