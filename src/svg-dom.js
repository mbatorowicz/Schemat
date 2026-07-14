import { SVGNS } from "./svg-constants.js";
import { fmt } from "./svg-utils.js";

export function mkEl(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, typeof attrs[k] === "number" ? fmt(attrs[k]) : attrs[k]);
  return e;
}

export function parsePoints(el) {
  const s = (el.getAttribute("points") || "").trim();
  if (!s) return [];
  const n = s.split(/[\s,]+/).map(Number);
  const out = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
}

export function simpleRotation(el) {
  const tr = (el.getAttribute("transform") || "").trim();
  const m = tr.match(/^rotate\(\s*([-+]?\d*\.?\d+)(?:[\s,]+([-+]?\d*\.?\d+)[\s,]+([-+]?\d*\.?\d+))?\s*\)$/);
  if (!m) return null;
  return { ang: parseFloat(m[1]), cx: m[2] == null ? 0 : parseFloat(m[2]), cy: m[3] == null ? 0 : parseFloat(m[3]) };
}

export function rotatePoint(x, y, cx, cy, deg) {
  const a = (deg * Math.PI) / 180;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

/** path → segmenty absolutne (M,L,Q,C,Z). H/V/relatywne konwertowane. */
export function parsePathAbs(d) {
  const toks = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  const segs = [];
  const rd = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    const t = toks[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "M") {
      let x = rd();
      let y = rd();
      if (rel) {
        x += cx;
        y += cy;
      }
      cx = x;
      cy = y;
      sx = x;
      sy = y;
      segs.push({ cmd: "M", pts: [{ x, y, role: "anchor" }] });
      while (i < toks.length && !/[a-zA-Z]/.test(toks[i])) {
        let x2 = rd();
        let y2 = rd();
        if (rel) {
          x2 += cx;
          y2 += cy;
        }
        cx = x2;
        cy = y2;
        segs.push({ cmd: "L", pts: [{ x: x2, y: y2, role: "anchor" }] });
      }
    } else if (C === "L") {
      while (i < toks.length && !/[a-zA-Z]/.test(toks[i])) {
        let x = rd();
        let y = rd();
        if (rel) {
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        segs.push({ cmd: "L", pts: [{ x, y, role: "anchor" }] });
      }
    } else if (C === "H") {
      while (i < toks.length && !/[a-zA-Z]/.test(toks[i])) {
        let x = rd();
        if (rel) x += cx;
        cx = x;
        segs.push({ cmd: "L", pts: [{ x, y: cy, role: "anchor" }] });
      }
    } else if (C === "V") {
      while (i < toks.length && !/[a-zA-Z]/.test(toks[i])) {
        let y = rd();
        if (rel) y += cy;
        cy = y;
        segs.push({ cmd: "L", pts: [{ x: cx, y, role: "anchor" }] });
      }
    } else if (C === "Q") {
      while (i < toks.length && !/[a-zA-Z]/.test(toks[i])) {
        let x1 = rd();
        let y1 = rd();
        let x = rd();
        let y = rd();
        if (rel) {
          x1 += cx;
          y1 += cy;
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        segs.push({ cmd: "Q", pts: [{ x: x1, y: y1, role: "ctrl" }, { x, y, role: "anchor" }] });
      }
    } else if (C === "C") {
      while (i < toks.length && !/[a-zA-Z]/.test(toks[i])) {
        let x1 = rd();
        let y1 = rd();
        let x2 = rd();
        let y2 = rd();
        let x = rd();
        let y = rd();
        if (rel) {
          x1 += cx;
          y1 += cy;
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        segs.push({
          cmd: "C",
          pts: [
            { x: x1, y: y1, role: "ctrl" },
            { x: x2, y: y2, role: "ctrl" },
            { x, y, role: "anchor" },
          ],
        });
      }
    } else if (C === "Z") {
      segs.push({ cmd: "Z", pts: [] });
      cx = sx;
      cy = sy;
    } else {
      i++;
    }
  }
  return segs;
}

export function buildD(segs, f = fmt) {
  return segs
    .map((s) => {
      if (s.cmd === "Z") return "Z";
      if (s.cmd === "M") return "M " + f(s.pts[0].x) + " " + f(s.pts[0].y);
      if (s.cmd === "L") return "L " + f(s.pts[0].x) + " " + f(s.pts[0].y);
      if (s.cmd === "Q") return "Q " + f(s.pts[0].x) + " " + f(s.pts[0].y) + " " + f(s.pts[1].x) + " " + f(s.pts[1].y);
      if (s.cmd === "C") return "C " + s.pts.map((p) => f(p.x) + " " + f(p.y)).join(" ");
      return "";
    })
    .join(" ");
}

export function rectCorner(el, i, num) {
  const x = num(el, "x");
  const y = num(el, "y");
  const w = num(el, "width");
  const h = num(el, "height");
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ][i];
}

export function setRectCorner(el, i, nx, ny, num) {
  const cur = [rectCorner(el, 0, num), rectCorner(el, 1, num), rectCorner(el, 2, num), rectCorner(el, 3, num)];
  const opp = cur[(i + 2) % 4];
  const x = Math.min(nx, opp[0]);
  const y = Math.min(ny, opp[1]);
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("width", Math.abs(nx - opp[0]).toFixed(2));
  el.setAttribute("height", Math.abs(ny - opp[1]).toFixed(2));
}
