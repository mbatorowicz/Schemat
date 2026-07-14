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

function blocked(x, y, obstacles) {
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

function segmentBlocked(a, b, obstacles, step) {
  const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  const count = Math.max(1, Math.ceil(length / step));
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (blocked(x, y, obstacles)) return true;
  }
  return false;
}

function candidateClear(points, obstacles, step) {
  for (let i = 1; i < points.length; i++) {
    if (segmentBlocked(points[i - 1], points[i], obstacles, step)) return false;
  }
  return true;
}

export function escapePoint(point, dir, distance) {
  const d = DIRS[dir] || DIRS.E;
  return { x: point.x + d[0] * distance, y: point.y + d[1] * distance };
}

function aStar(start, end, obstacles, step) {
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
      if (x < minX || x > maxX || y < minY || y > maxY || blocked(x, y, obstacles)) continue;
      const turn = cur.dir && cur.dir !== dir ? step * 2 : 0;
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

export function route(options) {
  const start = { x: +options.start.x, y: +options.start.y };
  const end = { x: +options.end.x, y: +options.end.y };
  const step = Math.max(1, +options.step || 5);
  const escape = step * 2;
  const obstacles = (options.obstacles || []).map((r) => ({
    x: r.x - step,
    y: r.y - step,
    width: r.width + 2 * step,
    height: r.height + 2 * step,
  }));
  const a = escapePoint(start, options.startDir, escape);
  const b = escapePoint(end, options.endDir, escape);
  const c1 = simplify([start, a, { x: b.x, y: a.y }, b, end]);
  const c2 = simplify([start, a, { x: a.x, y: b.y }, b, end]);
  const clear = [c1, c2].filter((c) => candidateClear(c, obstacles, step)).sort((x, y) => pathLength(x) - pathLength(y));
  if (clear.length) return clear[0];
  const middle = aStar(a, b, obstacles, step);
  return middle ? simplify([start, ...middle, end]) : c1;
}

export const OrthogonalRouter = { route, simplify, escapePoint };
