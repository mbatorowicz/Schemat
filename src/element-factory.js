import { fmt } from "./svg-utils.js";
import { mkEl } from "./svg-dom.js";
import { SVGNS } from "./svg-constants.js";

/** Tworzenie elementów SVG i uchwytów edycji (ARCHITECTURE: element-factory.js). */

export function mkText(x, y, cls, txt, anchor) {
  const t = mkEl("text", { x, y, class: cls });
  if (anchor) t.setAttribute("text-anchor", anchor);
  t.textContent = txt == null ? "" : String(txt);
  return t;
}

export function mkChromeEl(tag, attrs) {
  const e = mkEl(tag, attrs);
  e.setAttribute("data-sheet-chrome", "1");
  return e;
}

export function mkChromeText(x, y, cls, txt, anchor) {
  const t = mkText(x, y, cls, txt, anchor);
  t.setAttribute("data-sheet-chrome", "1");
  return t;
}

export function mkHandle(get, set, kind, el) {
  return { get, set, kind, el };
}

export function mkPrev(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) {
    e.setAttribute(k, typeof attrs[k] === "number" ? fmt(attrs[k]) : attrs[k]);
  }
  e.setAttribute("fill", "none");
  e.setAttribute("stroke", "#2563eb");
  e.setAttribute("stroke-width", "1.2");
  e.setAttribute("stroke-dasharray", "4 2");
  e.setAttribute("vector-effect", "non-scaling-stroke");
  e.style.pointerEvents = "none";
  return e;
}
