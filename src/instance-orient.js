/**
 * Orientacja instancji <use>: kąt + lokalne lustro (scale ±1).
 * p_sheet = R(θ) · S(sx,sy) · p_local + (ux,uy)
 */

import { rotatePoint } from "./svg-dom.js";
import { normalizeAngleDeg } from "./selection-flip.js";

function fmtOri(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  const t = Math.round(n * 1000) / 1000;
  return String(t);
}

/** @returns {{ ang: number, flipH: boolean, flipV: boolean }} */
export function readUseOrient(el) {
  if (!el) return { ang: 0, flipH: false, flipV: false };
  return {
    ang: parseFloat(el.getAttribute("data-ang") || "0") || 0,
    flipH: el.getAttribute("data-flip-h") === "1",
    flipV: el.getAttribute("data-flip-v") === "1",
  };
}

export function orientScales(orient) {
  return {
    sx: orient?.flipH ? -1 : 1,
    sy: orient?.flipV ? -1 : 1,
  };
}

/**
 * Transform SVG: translate(ux,uy) rotate(θ) scale(sx,sy) translate(-ux,-uy)
 * (kolejność SVG prawo→lewo = najpierw scale lokalnie, potem rotate — jak mapLocalToSheet).
 */
export function buildUseTransform(ux, uy, orient) {
  const ang = Number(orient?.ang) || 0;
  const { sx, sy } = orientScales(orient);
  const x = fmtOri(ux);
  const y = fmtOri(uy);
  const a = fmtOri(ang);
  if (sx === 1 && sy === 1) {
    return `rotate(${a} ${x} ${y})`;
  }
  return `translate(${x} ${y}) rotate(${a}) scale(${sx} ${sy}) translate(${fmtOri(-ux)} ${fmtOri(-uy)})`;
}

/** Zapisz data-ang / data-flip-* oraz transform na <use>. */
export function writeUseOrient(el, orient, x, y) {
  if (!el) return;
  const ux = x != null ? Number(x) : parseFloat(el.getAttribute("x") || "0") || 0;
  const uy = y != null ? Number(y) : parseFloat(el.getAttribute("y") || "0") || 0;
  const ang = normalizeAngleDeg(orient?.ang ?? 0);
  const flipH = !!orient?.flipH;
  const flipV = !!orient?.flipV;
  el.setAttribute("data-ang", fmtOri(ang));
  if (flipH) el.setAttribute("data-flip-h", "1");
  else el.removeAttribute("data-flip-h");
  if (flipV) el.setAttribute("data-flip-v", "1");
  else el.removeAttribute("data-flip-v");
  el.setAttribute("transform", buildUseTransform(ux, uy, { ang, flipH, flipV }));
}

/** Alias: przebuduj sam transform z bieżących atrybutów / podanego orient. */
export function writeUseTransform(el, orient, x, y) {
  writeUseOrient(el, orient || readUseOrient(el), x, y);
}

/**
 * Odbicie w układzie arkusza (osie równoległe do X/Y) wokół punktu wstawienia.
 * H: θ→−θ, toggle flipH; V: θ→−θ, toggle flipV.
 */
export function composeSheetFlip(orient, axis) {
  const base = orient || { ang: 0, flipH: false, flipV: false };
  return {
    ang: normalizeAngleDeg(-(Number(base.ang) || 0)),
    flipH: axis === "h" ? !base.flipH : !!base.flipH,
    flipV: axis === "v" ? !base.flipV : !!base.flipV,
  };
}

/** Lokalny punkt definicji → arkusz. */
export function mapLocalToSheet(ux, uy, orient, x, y) {
  const { sx, sy } = orientScales(orient);
  const lx = sx * (Number(x) || 0);
  const ly = sy * (Number(y) || 0);
  const ang = Number(orient?.ang) || 0;
  return rotatePoint((Number(ux) || 0) + lx, (Number(uy) || 0) + ly, Number(ux) || 0, Number(uy) || 0, ang);
}

/** Arkusz → lokalny punkt definicji (odwrotność mapLocalToSheet). */
export function mapSheetToLocal(ux, uy, orient, sx, sy) {
  const ox = Number(ux) || 0;
  const oy = Number(uy) || 0;
  const ang = Number(orient?.ang) || 0;
  const [rx, ry] = rotatePoint(Number(sx) || 0, Number(sy) || 0, ox, oy, -ang);
  const { sx: sX, sy: sY } = orientScales(orient);
  return [(rx - ox) / sX, (ry - oy) / sY];
}

const DIR_ORDER = ["N", "E", "S", "W"];

export function rotateDir(dir, angle) {
  const i = DIR_ORDER.indexOf(dir);
  if (i < 0) return "E";
  return DIR_ORDER[(i + (Math.round((+angle || 0) / 90) % 4) + 4) % 4];
}

/** Kierunek pinu po lustro lokalne + obrót. */
export function flipDirWithOrient(dir, orient) {
  let d = DIR_ORDER.includes(dir) ? dir : "E";
  const { sx, sy } = orientScales(orient);
  if (sx < 0) {
    if (d === "E") d = "W";
    else if (d === "W") d = "E";
  }
  if (sy < 0) {
    if (d === "N") d = "S";
    else if (d === "S") d = "N";
  }
  return rotateDir(d, orient?.ang || 0);
}

export { fmtOri };
