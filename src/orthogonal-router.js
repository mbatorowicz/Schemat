"use strict";

const DIRS = {
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
};

function snap(v, step) {
  return Math.round(v / step) * step;
}

function pointKey(x, y, dir) {
  return x + "," + y + "," + dir;
}

function inZone(x, y, z) {
  return x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height;
}

function blocked(x, y, obstacles, ignoreZones) {
  if (ignoreZones?.some((z) => inZone(x, y, z))) return false;
  return obstacles.some((r) => x > r.x && x < r.x + r.width && y > r.y && y < r.y + r.height);
}

export function simplify(points) {
  const out = [];
  points.forEach((p) => {
    const q = { x: +p.x, y: +p.y };
    if (out.length && out[out.length - 1].x === q.x && out[out.length - 1].y === q.y) return;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      if ((a.x === b.x && b.x === q.x) || (a.y === b.y && b.y === q.y)) {
        out[out.length - 1] = q;
        return;
      }
    }
    out.push(q);
  });
  return out;
}

function pathLength(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) {
    n += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
  }
  return n;
}

export function countTurns(points) {
  if (!points || points.length < 3) return 0;
  let n = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const ax = points[i].x - points[i - 1].x;
    const ay = points[i].y - points[i - 1].y;
    const bx = points[i + 1].x - points[i].x;
    const by = points[i + 1].y - points[i].y;
    if (Math.abs(ax * by - ay * bx) > 1e-9) n++;
  }
  return n;
}

function segmentBlocked(a, b, obstacles, step, ignoreZones) {
  const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  const count = Math.max(1, Math.ceil(length / step));
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (blocked(x, y, obstacles, ignoreZones)) return true;
  }
  return false;
}

function candidateClear(points, obstacles, step, ignoreZones) {
  for (let i = 1; i < points.length; i++) {
    if (segmentBlocked(points[i - 1], points[i], obstacles, step, ignoreZones)) return false;
  }
  return true;
}

export function escapePoint(point, dir, distance) {
  const d = DIRS[dir] || DIRS.E;
  return { x: point.x + d[0] * distance, y: point.y + d[1] * distance };
}

function escapeDistance(start, end, step) {
  const minEsc = step * 2;
  const prefer = step * 3;
  const span = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  if (span >= prefer * 2 + step) return prefer;
  return minEsc;
}

/** Mały kwadrat przy pinie — tylko lokalny keep-out symbolu, nie cała trasa. */
function pinTunnel(point, step) {
  const r = step * 2;
  return { x: point.x - r, y: point.y - r, width: r * 2, height: r * 2 };
}

/** Pierwszy odcinek wychodzi wzdłuż kierunku pinu (styczność). */
function leavesAlongDir(from, to, dir) {
  const d = DIRS[dir];
  if (!d) return true;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return false;
  if (dx !== 0 && dy !== 0) return false;
  if (d[0] !== 0) return dx * d[0] > 0;
  if (d[1] !== 0) return dy * d[1] > 0;
  return true;
}

/** Ostatni odcinek wchodzi w pin wzdłuż -endDir (endDir = na zewnątrz). */
function entersAlongDir(from, to, endDir) {
  const d = DIRS[endDir];
  if (!d) return true;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return false;
  if (dx !== 0 && dy !== 0) return false;
  if (d[0] !== 0) return dx * d[0] < 0;
  if (d[1] !== 0) return dy * d[1] < 0;
  return true;
}

function pathRespectsDirs(points, startDir, endDir, softEnter) {
  if (!points || points.length < 2) return false;
  if (!leavesAlongDir(points[0], points[1], startDir)) return false;
  if (softEnter) return true;
  return entersAlongDir(points[points.length - 2], points[points.length - 1], endDir);
}

function aStar(start, end, obstacles, step, ignoreZones) {
  const xs = [start.x, end.x];
  const ys = [start.y, end.y];
  obstacles.forEach((r) => {
    xs.push(r.x, r.x + r.width);
    ys.push(r.y, r.y + r.height);
  });
  const margin = step * 12;
  const minX = snap(Math.min(...xs) - margin, step);
  const maxX = snap(Math.max(...xs) + margin, step);
  const minY = snap(Math.min(...ys) - margin, step);
  const maxY = snap(Math.max(...ys) + margin, step);
  const open = [{ x: snap(start.x, step), y: snap(start.y, step), dir: "", g: 0, f: 0, key: "" }];
  const best = new Map();
  const parent = new Map();
  const nodes = new Map();
  open[0].key = pointKey(open[0].x, open[0].y, "");
  best.set(open[0].key, 0);
  nodes.set(open[0].key, open[0]);
  let goal = null;
  let guard = 0;
  const turnPenalty = step * 3;
  while (open.length && guard++ < 50000) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.x === snap(end.x, step) && cur.y === snap(end.y, step)) {
      goal = cur;
      break;
    }
    for (const dir of Object.keys(DIRS)) {
      const d = DIRS[dir];
      const x = cur.x + d[0] * step;
      const y = cur.y + d[1] * step;
      if (x < minX || x > maxX || y < minY || y > maxY || blocked(x, y, obstacles, ignoreZones)) continue;
      const turn = cur.dir && cur.dir !== dir ? turnPenalty : 0;
      const g = cur.g + step + turn;
      const key = pointKey(x, y, dir);
      if (best.has(key) && best.get(key) <= g) continue;
      const node = { x, y, dir, g, f: g + Math.abs(x - end.x) + Math.abs(y - end.y), key };
      best.set(key, g);
      parent.set(key, cur.key);
      nodes.set(key, node);
      open.push(node);
    }
  }
  if (!goal) return null;
  const result = [];
  let key = goal.key;
  while (key) {
    const n = nodes.get(key);
    if (!n) break;
    result.push({ x: n.x, y: n.y });
    key = parent.get(key);
  }
  result.push({ x: start.x, y: start.y });
  return simplify(result.reverse());
}

function pickBestClear(candidates, obstacles, step, ignoreZones, startDir, endDir) {
  const clear = [];
  for (const raw of candidates) {
    if (!raw || raw.length < 2) continue;
    // Kierunki na surowej ścieżce (przed simplify, które może „zjeść” stub podejścia)
    if (!pathRespectsDirs(raw, startDir, endDir, false)) continue;
    if (!candidateClear(raw, obstacles, step, ignoreZones)) continue;
    const c = simplify(raw);
    if (c.length < 2) continue;
    if (!leavesAlongDir(c[0], c[1], startDir)) continue;
    clear.push(c);
  }
  if (!clear.length) return null;
  clear.sort((x, y) => {
    const dt = countTurns(x) - countTurns(y);
    if (dt !== 0) return dt;
    return pathLength(x) - pathLength(y);
  });
  return clear[0];
}

function perpOffsets(dir, step) {
  const d = String(dir || "E").toUpperCase();
  if (d === "N" || d === "S") return [step, -step, step * 2, -step * 2];
  return [step, -step, step * 2, -step * 2];
}

function buildCandidates(start, end, startDir, endDir, step, escape) {
  const a = escapePoint(start, startDir, escape);
  const b = escapePoint(end, endDir, escape);
  const aS = escapePoint(start, startDir, step);
  const bS = escapePoint(end, endDir, step);
  const a2 = escapePoint(start, startDir, step * 2);
  const b2 = escapePoint(end, endDir, step * 2);

  const out = [];
  // Minimalne L (1 łamanie) — bez długiego escape
  out.push([start, { x: end.x, y: start.y }, end]);
  out.push([start, { x: start.x, y: end.y }, end]);
  // Krótki stub + jedno L
  out.push([start, aS, { x: end.x, y: aS.y }, end]);
  out.push([start, aS, { x: aS.x, y: end.y }, end]);
  out.push([start, { x: bS.x, y: start.y }, bS, end]);
  out.push([start, { x: start.x, y: bS.y }, bS, end]);
  out.push([start, aS, { x: bS.x, y: aS.y }, bS, end]);
  out.push([start, aS, { x: aS.x, y: bS.y }, bS, end]);
  out.push([start, a2, { x: b2.x, y: a2.y }, b2, end]);
  out.push([start, a2, { x: a2.x, y: b2.y }, b2, end]);
  // Pełny escape + L / early-align
  out.push([start, a, { x: b.x, y: a.y }, b, end]);
  out.push([start, a, { x: a.x, y: b.y }, b, end]);
  out.push([start, a, { x: a.x, y: end.y }, { x: b.x, y: end.y }, b, end]);
  out.push([start, a, { x: end.x, y: a.y }, { x: end.x, y: b.y }, b, end]);

  // Lane offsets — równoległe korytarze (N vs L)
  const offs = perpOffsets(startDir, step);
  for (const off of offs) {
    const horiz = String(startDir).toUpperCase() === "N" || String(startDir).toUpperCase() === "S";
    if (horiz) {
      // offset w X
      out.push([start, aS, { x: aS.x + off, y: aS.y }, { x: aS.x + off, y: bS.y }, { x: bS.x, y: bS.y }, bS, end]);
      out.push([start, a2, { x: a2.x + off, y: a2.y }, { x: a2.x + off, y: b2.y }, b2, end]);
      out.push([start, a, { x: a.x + off, y: a.y }, { x: a.x + off, y: b.y }, b, end]);
    } else {
      // offset w Y
      out.push([start, aS, { x: aS.x, y: aS.y + off }, { x: bS.x, y: aS.y + off }, bS, end]);
      out.push([start, a2, { x: a2.x, y: a2.y + off }, { x: b2.x, y: a2.y + off }, b2, end]);
      out.push([start, a, { x: a.x, y: a.y + off }, { x: b.x, y: a.y + off }, b, end]);
    }
  }
  return out;
}

export function route(options) {
  const start = { x: +options.start.x, y: +options.start.y };
  const end = { x: +options.end.x, y: +options.end.y };
  const step = Math.max(1, +options.step || 5);
  const startDir = options.startDir || "E";
  const endDir = options.endDir || "W";
  const escape = escapeDistance(start, end, step);
  const obstacles = (options.obstacles || []).map((r) => ({
    x: r.x - step,
    y: r.y - step,
    width: r.width + 2 * step,
    height: r.height + 2 * step,
  }));
  const ignoreZones = [pinTunnel(start, step), pinTunnel(end, step)];

  const candidates = buildCandidates(start, end, startDir, endDir, step, escape);
  const best = pickBestClear(candidates, obstacles, step, ignoreZones, startDir, endDir);
  if (best) return best;

  const a = escapePoint(start, startDir, escape);
  const b = escapePoint(end, endDir, escape);
  const middle = aStar(a, b, obstacles, step, ignoreZones);
  if (middle) {
    const withStubs = [start, ...middle, end];
    if (candidateClear(withStubs, obstacles, step, ignoreZones)) {
      const full = simplify(withStubs);
      if (full.length >= 2 && leavesAlongDir(full[0], full[1], startDir)) return full;
      if (candidateClear(full, obstacles, step, ignoreZones)) return full;
    }
  }

  // Dodatkowa runda lane z większym offsetem
  const extra = [];
  for (const mult of [3, 4]) {
    const off = step * mult;
    const aS = escapePoint(start, startDir, step);
    const bS = escapePoint(end, endDir, step);
    const horiz = String(startDir).toUpperCase() === "N" || String(startDir).toUpperCase() === "S";
    for (const sign of [1, -1]) {
      const o = off * sign;
      if (horiz) {
        extra.push([start, aS, { x: aS.x + o, y: aS.y }, { x: aS.x + o, y: bS.y }, bS, end]);
      } else {
        extra.push([start, aS, { x: aS.x, y: aS.y + o }, { x: bS.x, y: aS.y + o }, bS, end]);
      }
    }
  }
  const laneBest = pickBestClear(extra, obstacles, step, ignoreZones, startDir, endDir);
  if (laneBest) return laneBest;

  return null;
}

export const OrthogonalRouter = { route, simplify, escapePoint, countTurns };
